// src/utils/claimDashboard.js
// [QA-FIX 2026-10-31] Test Case 4.1–4.3 — ตัวช่วยกลางสำหรับ Dashboard / ตัวกรอง / การ์ดเคลมฝั่งลูกค้า
// เดิมแต่ละหน้าคำนวณเอง: CustomerHome เรียงเก่า→ใหม่แล้วตัด 8 รายการ (ได้ 8 รายการ "เก่าสุด"),
// ไม่มีการเรียงตาม Priority สถานะ, การ์ดไม่มี "รายการใหม่", และนับไม่ตรงกับหน้า List
import dayjs from "dayjs";
import { getStatusName, STATUS_PRIORITY } from "../constants/claimStatus";

/** ชื่อสถานะมาตรฐาน (Pending / Approved / Rejected / Processing / Shipping / Delivered) */
export const statusNameOf = (claim) =>
  getStatusName(String(claim?.current_status ?? claim?.status_id ?? claim?.status ?? "").trim() || "5");

export const isDeliveredClaim = (claim) => statusNameOf(claim) === "Delivered";

/**
 * กลุ่มของการ์ดสรุป (ไม่ทับซ้อนกัน รวมกันได้ = ทั้งหมด)
 *  - new        : Pending (รายการใหม่ รอพิจารณา)
 *  - processing : Approved / Rejected / Processing / Shipping (กำลังดำเนินการ)
 *  - delivered  : Delivered (สำเร็จ)
 */
export const getClaimGroup = (claim) => {
  const name = statusNameOf(claim);
  if (name === "Delivered") return "delivered";
  if (name === "Pending") return "new";
  return "processing";
};

const claimTime = (claim) => {
  const d = dayjs(claim?.created_at || claim?.claim_date || claim?.createdDate);
  return d.isValid() ? d.valueOf() : 0;
};

/** ค้างเกิน N วัน = ยังไม่ Delivered และสร้างมาแล้ว >= N วัน */
export const isOverdueClaim = (claim, days, now = dayjs()) => {
  if (isDeliveredClaim(claim)) return false;
  const t = claimTime(claim);
  if (!t) return false;
  return dayjs(now).diff(dayjs(t), "day") >= days;
};

/** สรุปยอดการ์ดหน้า CustomerHome */
export const getDashboardSummary = (claims = [], now = dayjs()) => {
  const list = Array.isArray(claims) ? claims : [];
  const summary = { total: list.length, new: 0, processing: 0, delivered: 0, overdue3: 0, overdue7: 0 };
  list.forEach((c) => {
    summary[getClaimGroup(c)] += 1;
    if (isOverdueClaim(c, 3, now)) summary.overdue3 += 1;
    if (isOverdueClaim(c, 7, now)) summary.overdue7 += 1;
  });
  return summary;
};

/** เรียงตาม Priority สถานะ (Pending ก่อน … Delivered, Rejected ท้าย) แล้วตามวันที่สร้าง ใหม่ → เก่า */
export const sortByPriorityThenNewest = (claims = []) =>
  [...(Array.isArray(claims) ? claims : [])].sort((a, b) => {
    const pa = STATUS_PRIORITY[statusNameOf(a)] ?? 99;
    const pb = STATUS_PRIORITY[statusNameOf(b)] ?? 99;
    if (pa !== pb) return pa - pb;
    return claimTime(b) - claimTime(a);
  });

/** 8 รายการล่าสุดสำหรับหน้า Home */
export const getLatestClaims = (claims = [], limit = 8) => sortByPriorityThenNewest(claims).slice(0, limit);

/** ค้นหาแบบไม่สนตัวพิมพ์ — เลขใบเคลม (claim_no และ claim_id) + ชื่อ/รหัสสินค้าทุกรายการในใบเคลม + lot_no */
export const matchesClaimSearch = (claim, searchTerm, itemsMap = {}) => {
  const q = String(searchTerm || "").trim().toLowerCase();
  if (!q) return true;

  const haystack = [claim?.claim_no, claim?.claim_id, claim?.item_name];
  const items = Array.isArray(claim?.items) && claim.items.length > 0 ? claim.items : [claim];
  items.forEach((i) => {
    const id = i?.item_id ?? i?.item_code;
    haystack.push(itemsMap[String(id)], i?.item_name, i?.name, id, i?.lot_no);
  });

  return haystack.some((v) => v !== null && v !== undefined && String(v).toLowerCase().includes(q));
};

/**
 * จำนวนที่แสดงบนการ์ด — ใช้ค่าแรกที่ > 0 ตามลำดับ รับจริง → อนุมัติเปลี่ยน → จำนวนที่แจ้ง
 * เดิมใช้ `qtyreceived ?? qtychang ?? qty` แต่ backend บันทึก 0 (ไม่ใช่ NULL) ตอนสร้าง → เคลมใหม่แสดง 0 ทุกใบ
 */
export const getDisplayQty = (item) => {
  if (!item) return 0;
  const picked = [item.qtyreceived, item.qtychang, item.qty].find((v) => Number(v) > 0);
  return picked !== undefined ? Number(picked) : Number(item.qty ?? 0) || 0;
};

/** ป้าย Lot ของทุกรายการในใบเคลม (ไม่ซ้ำ) */
export const getLotLabel = (claim) => {
  const items = Array.isArray(claim?.items) && claim.items.length > 0 ? claim.items : [claim];
  const lots = [...new Set(items.map((i) => String(i?.lot_no ?? "").trim()).filter(Boolean))];
  return lots.join(", ");
};

/**
 * ดึง claim_items ของแต่ละเคลมแบบมี cache — เดิมเรียก /getClaimItems ทุกใบทุกครั้งที่ polling (N+1 ทุก 5 วินาที)
 * cache key = claim_id + สถานะ + updated_at (จำนวนสินค้าเปลี่ยนเฉพาะตอนเปลี่ยนสถานะ Processing / Rejected)
 */
export const enrichClaimsWithItems = async (claims, fetchItems, cache) => {
  const store = cache instanceof Map ? cache : new Map();
  return Promise.all(
    (Array.isArray(claims) ? claims : []).map(async (claim) => {
      const key = `${claim.claim_id}|${claim.current_status ?? ""}|${claim.updated_at ?? ""}`;
      let rawItems = store.get(key);
      if (!rawItems) {
        try {
          const res = await fetchItems(claim.claim_id);
          rawItems = Array.isArray(res) ? res : res?.data || [];
          store.set(key, rawItems);
        } catch (err) {
          console.error(`Error fetching items for claim ${claim.claim_id}`, err);
          rawItems = [];
        }
      }
      if (rawItems.length === 0) return claim;
      const first = rawItems[0];
      return {
        ...claim,
        item_id: first.item_id,
        qty: first.qty,
        remark: first.remark,
        lot_no: first.lot_no,
        items: rawItems,
      };
    })
  );
};
