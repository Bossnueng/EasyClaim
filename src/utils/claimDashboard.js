import dayjs from "dayjs";
import { getStatusName, STATUS_PRIORITY } from "../constants/claimStatus";

export const statusNameOf = (claim) =>
  getStatusName(String(claim?.current_status ?? claim?.status_id ?? claim?.status ?? "").trim() || "5");

export const isDeliveredClaim = (claim) => statusNameOf(claim) === "Delivered";

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

export const isOverdueClaim = (claim, days, now = dayjs()) => {
  if (isDeliveredClaim(claim)) return false;
  const t = claimTime(claim);
  if (!t) return false;
  return dayjs(now).diff(dayjs(t), "day") >= days;
};

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

export const sortByPriorityThenNewest = (claims = []) =>
  [...(Array.isArray(claims) ? claims : [])].sort((a, b) => {
    const pa = STATUS_PRIORITY[statusNameOf(a)] ?? 99;
    const pb = STATUS_PRIORITY[statusNameOf(b)] ?? 99;
    if (pa !== pb) return pa - pb;
    return claimTime(b) - claimTime(a);
  });

export const getLatestClaims = (claims = [], limit = 8) => sortByPriorityThenNewest(claims).slice(0, limit);

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

export const getDisplayQty = (item) => {
  if (!item) return 0;
  const picked = [item.qtyreceived, item.qtychang, item.qty].find((v) => Number(v) > 0);
  return picked !== undefined ? Number(picked) : Number(item.qty ?? 0) || 0;
};

export const getLotLabel = (claim) => {
  const items = Array.isArray(claim?.items) && claim.items.length > 0 ? claim.items : [claim];
  const lots = [...new Set(items.map((i) => String(i?.lot_no ?? "").trim()).filter(Boolean))];
  return lots.join(", ");
};

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
