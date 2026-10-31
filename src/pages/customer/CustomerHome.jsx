// src/pages/customer/CustomerHome.jsx

import dayjs from "dayjs";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Empty, message, Spin } from "antd";
import { RightOutlined, ClockCircleOutlined, WarningOutlined, CheckCircleOutlined, FileAddOutlined } from "@ant-design/icons";
import CustomerClaimCard from "../../components/CustomerClaimCard";
import loginService from "../../services/loginService";
import claimService from "../../services/claimService";
import itemService from "../../services/itemService";
import agentService from "../../services/agentService";
import { useClaimRealtime, isStatusChangeEvent } from "../../hooks/useClaimRealtime";
// [QA-FIX 2026-10-31] Test Case 1.1 / 4.1 / 4.2 — ใช้ตัวช่วยกลาง (ตรวจสิทธิ์เคลม / สรุปการ์ด / เรียง 8 รายการล่าสุด / cache รายการสินค้า)
import { filterClaimsForUser } from "../../utils/claimAccess";
import { getDashboardSummary, getLatestClaims, enrichClaimsWithItems } from "../../utils/claimDashboard";

// [QA-FIX 2026-10-31] Socket แจ้งการเปลี่ยนสถานะทันทีแล้ว — polling เหลือไว้เป็นทางสำรอง (เดิม 5 วินาที)
const POLL_INTERVAL_MS = 15000;

const CustomerHome = () => {
  const navigate = useNavigate();
  const [latestClaims, setLatestClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [itemsMap, setItemsMap] = useState({});
  const [allClaims, setAllClaims] = useState([]);

  const user = loginService.getCurrentUser();
  const currentUserId = user?.user_id || user?.id;

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // [QA-FIX 2026-10-31] Test Case 4.2 — ยอดการ์ดคำนวณจากตัวช่วยกลาง (กลุ่มไม่ทับซ้อน: ใหม่ + ดำเนินการ + สำเร็จ = ทั้งหมด)
  // เดิมมีการ์ด "กำลังดำเนินการ" (รวม Pending) / "จัดส่งแล้ว" / "ค้างเกิน 3 วัน" / "ค้างเกิน 7 วัน" ไม่มี "รายการใหม่" ตามสเปก
  const summary = getDashboardSummary(allClaims);

  // [QA-FIX 2026-10-31] cache claim_items ต่อเคลม (เดิมยิง /getClaimItems ทุกใบทุกครั้งที่ polling)
  const itemsCacheRef = useRef(new Map());

  const fetchClaimsAndItems = useCallback(async (showLoading = true) => {
    const activeUser = userRef.current;
    const activeRole = activeUser?.role || activeUser?.user_type;

    if (activeRole === "staff" || activeRole === "admin") {
      navigate("/staff", { replace: true });
      return;
    }

    if (showLoading) setLoading(true);
    try {
      const [resClaim, resItems, resAgents] = await Promise.all([
        claimService.getClaim().catch(() => ({ data: [] })),
        itemService.getItems().catch(() => ({ data: [] })),
        agentService.getAgent().catch(() => []),
      ]);

      if (resItems?.data) {
        const map = {};
        resItems.data.forEach((item) => {
          map[String(item.item_id)] = item.item_name;
        });
        setItemsMap(map);
      }

      // [QA-FIX 2026-10-31] Test Case 1.1 — กรองสิทธิ์ด้วยตัวช่วยกลาง (แก้ created_by เทียบ String กับ Number และ agent_id ชน agent_code)
      const agentsData = Array.isArray(resAgents) ? resAgents : resAgents?.data || [];
      const rawClaims = resClaim?.data || (Array.isArray(resClaim) ? resClaim : []);
      const allowedClaims = filterClaimsForUser(rawClaims, activeUser, agentsData);

      const claimsWithItems = await enrichClaimsWithItems(
        allowedClaims,
        (id) => claimService.getClaimItems(id),
        itemsCacheRef.current
      );

      setAllClaims(claimsWithItems);
      // [QA-FIX 2026-10-31] Test Case 4.2 — เดิมเรียงเก่า → ใหม่แล้วตัด 8 = ได้ 8 รายการ "เก่าสุด"
      // ตอนนี้เรียงตาม Priority สถานะ (Pending ก่อน) แล้วตามวันที่สร้าง ใหม่ → เก่า
      setLatestClaims(getLatestClaims(claimsWithItems, 8));
    } catch (error) {
      message.error("ไม่สามารถดึงข้อมูลได้: " + (error.message || "เกิดข้อผิดพลาด"));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [navigate]);

  // [QA-FIX 2026-10-31] Test Case 3.1 — join ห้องของทุกเคลมที่แสดง แล้วรีเฟรชทันทีเมื่อมี Log เปลี่ยนสถานะ
  // (backend ไม่ส่ง "claim:status_updated" แต่ส่ง "claim:comment_created" ทุกครั้งที่เปลี่ยนสถานะ)
  useClaimRealtime({
    isStaff: false,
    userId: currentUserId,
    claimIds: allClaims.map((c) => c.claim_id),
    onCreated: () => fetchClaimsAndItems(false),
    onStatusUpdated: () => fetchClaimsAndItems(false),
    onCommentCreated: (log) => {
      if (isStatusChangeEvent(log)) fetchClaimsAndItems(false);
    },
  });

  useEffect(() => {
    fetchClaimsAndItems(true);
    const interval = setInterval(() => {
      fetchClaimsAndItems(false);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchClaimsAndItems]);

  const handleDeleteClaim = async (e, claimId) => {
    if (e) e.stopPropagation();

    try {
      const response = await claimService.delClaim(claimId);
      if (response?.status) {
        message.success("ลบรายการเคลมเรียบร้อยแล้ว");
        setLatestClaims((prev) => prev.filter((item) => (item.claim_id || item.claim_no) !== claimId));
        setAllClaims((prev) => prev.filter((item) => (item.claim_id || item.claim_no) !== claimId));
      }
    } catch (error) {
      message.error(error.message || "เกิดข้อผิดพลาดในการลบรายการ");
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-gray-100 min-h-screen flex flex-col gap-6" style={{ boxSizing: "border-box", width: "100%" }}>
      <div className="w-full flex flex-col gap-6" style={{ boxSizing: "border-box" }}>
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 m-0">
            สวัสดี, คุณ{user?.full_name || user?.username || "-"}
          </h1>
          <p className="text-gray-500 text-sm m-0">
            ติดตามสถานะเคลมสินค้าใหม่ได้ง่ายๆ ที่นี่
          </p>
        </header>

        {/* Dashboard 4 Summary Cards */}
        {/* [QA-FIX 2026-10-31] Test Case 4.2 — การ์ดตามสเปก: รายการใหม่ / กำลังดำเนินการ / สำเร็จ / ค้างเกิน 3 วัน
            (เคลมค้างเกิน 7 วันยังเน้นกรอบแดงบนการ์ดเคลมเหมือนเดิม และเปิดดูได้ที่ /customer/list-claim?filter=overdue7)
            Responsive: padding การ์ดใช้ class (เดิม inline 24px 28px ทำให้เนื้อหาเหลือ ~100px บนจอ 360px) */}
        <div className="w-full grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            {
              key: "new",
              to: "/customer/list-claim?filter=new",
              label: "รายการใหม่",
              value: summary.new,
              hint: "Pending รอพิจารณา",
              icon: <FileAddOutlined />,
              tone: { text: "text-blue-600", sub: "text-blue-500", bg: "bg-blue-50", hover: "hover:border-blue-300" },
            },
            {
              key: "processing",
              to: "/customer/list-claim?filter=processing",
              label: "กำลังดำเนินการ",
              value: summary.processing,
              hint: "Approved ➔ Shipping",
              icon: <ClockCircleOutlined />,
              tone: { text: "text-amber-600", sub: "text-amber-500", bg: "bg-amber-50", hover: "hover:border-amber-300" },
            },
            {
              key: "delivered",
              to: "/customer/list-claim?filter=delivered",
              label: "สำเร็จ",
              value: summary.delivered,
              hint: "Delivered แล้ว",
              icon: <CheckCircleOutlined />,
              tone: { text: "text-emerald-600", sub: "text-emerald-500", bg: "bg-emerald-50", hover: "hover:border-emerald-300" },
            },
            {
              key: "overdue3",
              to: "/customer/list-claim?filter=overdue3",
              label: "ค้างเกิน 3 วัน",
              value: summary.overdue3,
              hint: `ยังไม่ Delivered (เกิน 7 วัน ${summary.overdue7})`,
              icon: <WarningOutlined />,
              tone: { text: "text-rose-600", sub: "text-rose-500", bg: "bg-rose-50", hover: "hover:border-rose-300" },
            },
          ].map((card) => (
            <div
              key={card.key}
              role="button"
              tabIndex={0}
              onClick={() => navigate(card.to)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") navigate(card.to);
              }}
              className={`bg-white p-4 sm:px-7 sm:py-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-2 cursor-pointer hover:shadow-md ${card.tone.hover} transition-all min-w-0`}
              style={{ boxSizing: "border-box", overflow: "hidden" }}
            >
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-xs sm:text-sm font-medium text-gray-500 truncate">{card.label}</span>
                <span className={`text-3xl sm:text-4xl font-extrabold ${card.tone.text} font-sans tracking-tight`}>
                  {card.value}
                </span>
                <span className={`text-[11px] sm:text-xs ${card.tone.sub} font-medium leading-snug`}>{card.hint}</span>
              </div>
              <div
                className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl ${card.tone.bg} ${card.tone.text} flex items-center justify-center text-base sm:text-xl shrink-0`}
              >
                {card.icon}
              </div>
            </div>
          ))}
        </div>

        <section className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 m-0">รายการเคลมล่าสุด</h2>
            <Button
              type="link"
              onClick={() => navigate("/customer/list-claim")}
              className="text-emerald-700 font-semibold p-0 flex items-center gap-1 hover:text-emerald-800"
            >
              ดูทั้งหมด <RightOutlined style={{ fontSize: "11px" }} />
            </Button>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl p-12 text-center w-full shadow-sm">
              <Spin size="large" description="กำลังโหลดข้อมูล..." />
            </div>
          ) : latestClaims.length > 0 ? (
            <div className="flex flex-col gap-3.5 w-full">
              {latestClaims.map((claim) => {
                const dateVal = claim.claim_date || claim.created_at;
                const formattedDate = dateVal ? dayjs(dateVal).format("DD/MM/YY HH:mm") : "-";

                const getDisplayProductName = () => {
                  if (Array.isArray(claim.items) && claim.items.length > 0) {
                    return claim.items
                      .map((i) => itemsMap[String(i.item_id)] || i.item_name || i.name || `สินค้า ID: ${i.item_id}`)
                      .join(" + ");
                  }
                  return (
                    itemsMap[String(claim.item_id)] ||
                    claim.item_name ||
                    (claim.item_id ? `สินค้า ID: ${claim.item_id}` : "ไม่พบข้อมูลสินค้า")
                  );
                };

                return (
                  <CustomerClaimCard
                    key={claim.claim_id || claim.claim_no}
                    claim={{
                      ...claim,
                      current_status: claim.current_status || claim.status,
                      agent_name: claim.agent_name || claim.agent_id || "-",
                      item_name: getDisplayProductName(),
                      created_at_formatted: formattedDate,
                    }}
                    onDelete={handleDeleteClaim}
                    hideDeleteWhenDisabled={true}
                    layout="horizontal"
                    /* [QA-FIX 2026-10-31] ส่ง Master สินค้าให้การ์ด (เดิมการ์ดทุกใบเรียก /getitem เอง) */
                    itemsMap={itemsMap}
                  />
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center my-4 w-full">
              <Empty description="ไม่พบรายการเคลมสินค้า" />
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default CustomerHome;