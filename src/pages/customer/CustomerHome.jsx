// src/pages/customer/CustomerHome.jsx

import dayjs from "dayjs";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Empty, message, Spin } from "antd";
import { RightOutlined, ClockCircleOutlined, WarningOutlined, CheckCircleOutlined, AlertOutlined } from "@ant-design/icons";
import { getStatusName, getStatusId } from "../../constants/claimStatus";
import CustomerClaimCard from "../../components/CustomerClaimCard";
import loginService from "../../services/loginService";
import claimService from "../../services/claimService";
import itemService from "../../services/itemService";
import agentService from "../../services/agentService";
import { useClaimRealtime } from "../../hooks/useClaimRealtime";

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

  // 🟢 ตรวจสอบสถานะ Delivered
  const checkIsDelivered = useCallback((item) => {
    const rawStatus = String(item?.current_status || item?.status_id || item?.status || "").trim().toLowerCase();
    const statusName = String(getStatusName(rawStatus, "customer") || "").trim().toLowerCase();
    const statusId = String(getStatusId ? getStatusId(rawStatus) : rawStatus);

    return (
      ["10", "delivered", "จัดส่งสำเร็จ", "จัดส่งสินค้าเคลมสำเร็จ"].includes(rawStatus) ||
      ["10", "delivered", "จัดส่งสำเร็จ", "จัดส่งสินค้าเคลมสำเร็จ"].includes(statusName) ||
      statusId === "10"
    );
  }, []);

  // 🟢 1. รายการกำลังดำเนินการ (Pending, Approved, Rejected, Processing, Shipping)
  const processingClaims = allClaims.filter((item) => {
    const rawStatus = String(item?.current_status || item?.status_id || item?.status || "").trim().toLowerCase();
    const statusName = String(getStatusName(rawStatus, "customer") || "").trim().toLowerCase();
    const statusId = String(getStatusId ? getStatusId(rawStatus) : rawStatus);

    const isProcessing = [
      "1", "5", "6", "7", "8", "9",
      "pending", "approved", "rejected", "processing", "shipping",
      "สร้างรายการเคลม", "รอการพิจารณา", "มีสิทธิ์เคลม", "ไม่มีสิทธิ์เคลม", 
      "อนุมัติเคลมสินค้า", "ไม่อนุมัติเคลมสินค้า", "กำลังดำเนินการ", "อยู่ระหว่างจัดส่ง"
    ].some((s) => s === rawStatus || s === statusName || s === statusId);

    return isProcessing && !checkIsDelivered(item);
  });

  // 🟢 2. รายการที่จัดส่งแล้ว (Delivered)
  const deliveredClaims = allClaims.filter(checkIsDelivered);

  // 🟢 3. รายการค้างเกิน 3 วัน
  const overdue3DaysClaims = allClaims.filter((item) => {
    if (checkIsDelivered(item)) return false;
    const createdDate = item?.created_at || item?.claim_date || item?.createdDate;
    if (!createdDate) return false;
    const parsedDate = dayjs(createdDate);
    if (!parsedDate.isValid()) return false;
    return dayjs().diff(parsedDate, "day") >= 3;
  });

  // 🟢 4. รายการค้างเกิน 7 วัน
  const overdue7DaysClaims = allClaims.filter((item) => {
    if (checkIsDelivered(item)) return false;
    const createdDate = item?.created_at || item?.claim_date || item?.createdDate;
    if (!createdDate) return false;
    const parsedDate = dayjs(createdDate);
    if (!parsedDate.isValid()) return false;
    return dayjs().diff(parsedDate, "day") >= 7;
  });

  const fetchClaimsAndItems = useCallback(async (showLoading = true) => {
    const activeUser = userRef.current;
    const activeRole = activeUser?.role || activeUser?.user_type;
    const activeUserId = activeUser?.user_id || activeUser?.id;

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

      const userAgentIdentifiers = [];
      if (Array.isArray(activeUser?.agent_ids)) {
        activeUser.agent_ids.forEach((id) => userAgentIdentifiers.push(String(id)));
      }
      if (activeUser?.agent_id) {
        userAgentIdentifiers.push(String(activeUser.agent_id));
      }

      const agentsData = Array.isArray(resAgents) ? resAgents : resAgents?.data || [];
      if (Array.isArray(agentsData)) {
        agentsData.forEach((agent) => {
          const aId = String(agent.agent_id || agent.id || "");
          const aCode = String(agent.agent_code || agent.code || "");
          if (userAgentIdentifiers.includes(aId) && aCode) {
            userAgentIdentifiers.push(aCode);
          }
        });
      }

      const rawClaims = resClaim?.data || (Array.isArray(resClaim) ? resClaim : []);
      const allowedClaims = rawClaims.filter((claim) => {
        const claimAgentIdStr = String(claim.agent_id || "");
        const claimAgentCodeStr = String(claim.agent_code || "");
        const claimCreatedByStr = String(claim.created_by || claim.user_id || "");

        const isAgentMatch =
          userAgentIdentifiers.length > 0 &&
          (userAgentIdentifiers.includes(claimAgentIdStr) || userAgentIdentifiers.includes(claimAgentCodeStr));
        const isUserMatch = activeUserId && claimCreatedByStr === activeUserId;

        return isAgentMatch || isUserMatch;
      });

      if (allowedClaims.length > 0) {
        const claimsWithItems = await Promise.all(
          allowedClaims.map(async (claim) => {
            try {
              const resItems = await claimService.getClaimItems(claim.claim_id);
              const rawItems = Array.isArray(resItems) ? resItems : resItems?.data || [];
              if (rawItems.length > 0) {
                const firstItem = rawItems[0];
                return {
                  ...claim,
                  item_id: firstItem.item_id,
                  qty: firstItem.qty,
                  remark: firstItem.remark,
                  lot_no: firstItem.lot_no,
                  items: rawItems,
                };
              }
            } catch (err) {
              console.error(`Error fetching items for claim ${claim.claim_id}`, err);
            }
            return claim;
          })
        );

        setAllClaims(claimsWithItems);

        const sortedClaims = [...claimsWithItems].sort((a, b) => {
          const dateA = dayjs(a.claim_date || a.created_at);
          const dateB = dayjs(b.claim_date || b.created_at);
          return dateA.valueOf() - dateB.valueOf();
        });

        setLatestClaims(sortedClaims.slice(0, 8));
      } else {
        setAllClaims([]);
        setLatestClaims([]);
      }
    } catch (error) {
      message.error("ไม่สามารถดึงข้อมูลได้: " + (error.message || "เกิดข้อผิดพลาด"));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [navigate]);

  useClaimRealtime({
    isStaff: false,
    userId: currentUserId,
    onCreated: () => fetchClaimsAndItems(false),
    onStatusUpdated: () => fetchClaimsAndItems(false),
  });

  useEffect(() => {
    fetchClaimsAndItems(true);
    const interval = setInterval(() => {
      fetchClaimsAndItems(false);
    }, 5000);
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
            ติดตามสถานะหรือแจ้งเคลมสินค้าใหม่ได้ง่ายๆ ที่นี่
          </p>
        </header>

        {/* Dashboard 4 Summary Cards */}
        <div className="w-full grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Card 1: รายการกำลังดำเนินการ */}
          <div
            onClick={() => navigate("/customer/list-claim?filter=processing")}
            className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-amber-300 transition-all"
            style={{ boxSizing: "border-box", padding: "24px 28px", overflow: "hidden" }}
          >
            <div className="flex flex-col gap-1">
              <span className="text-xs sm:text-sm font-medium text-gray-500">รายการกำลังดำเนินการ</span>
              <span className="text-3xl sm:text-4xl font-extrabold text-amber-600 font-sans tracking-tight">
                {processingClaims.length}
              </span>
              <span className="text-xs text-amber-500 font-medium">Pending ➔ Shipping</span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg sm:text-xl shrink-0">
              <ClockCircleOutlined />
            </div>
          </div>

          {/* Card 2: รายการที่จัดส่งแล้ว */}
          <div
            onClick={() => navigate("/customer/list-claim?filter=delivered")}
            className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-emerald-300 transition-all"
            style={{ boxSizing: "border-box", padding: "24px 28px", overflow: "hidden" }}
          >
            <div className="flex flex-col gap-1">
              <span className="text-xs sm:text-sm font-medium text-gray-500">รายการที่จัดส่งแล้ว</span>
              <span className="text-3xl sm:text-4xl font-extrabold text-emerald-600 font-sans tracking-tight">
                {deliveredClaims.length}
              </span>
              <span className="text-xs text-emerald-500 font-medium">Delivered แล้ว</span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg sm:text-xl shrink-0">
              <CheckCircleOutlined />
            </div>
          </div>

          {/* Card 3: รายการค้างเกิน 3 วัน */}
          <div
            onClick={() => navigate("/customer/list-claim?filter=overdue3")}
            className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-rose-300 transition-all"
            style={{ boxSizing: "border-box", padding: "24px 28px", overflow: "hidden" }}
          >
            <div className="flex flex-col gap-1">
              <span className="text-xs sm:text-sm font-medium text-gray-500">รายการค้างเกิน 3 วัน</span>
              <span className="text-3xl sm:text-4xl font-extrabold text-rose-600 font-sans tracking-tight">
                {overdue3DaysClaims.length}
              </span>
              <span className="text-xs text-rose-500 font-medium">ยังไม่ Delivered ใน 3 วัน</span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-lg sm:text-xl shrink-0">
              <WarningOutlined />
            </div>
          </div>

          {/* Card 4: รายการค้างเกิน 7 วัน */}
          <div
            onClick={() => navigate("/customer/list-claim?filter=overdue7")}
            className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-red-400 transition-all"
            style={{ boxSizing: "border-box", padding: "24px 28px", overflow: "hidden" }}
          >
            <div className="flex flex-col gap-1">
              <span className="text-xs sm:text-sm font-medium text-gray-500">รายการค้างเกิน 7 วัน</span>
              <span className="text-3xl sm:text-4xl font-extrabold text-red-600 font-sans tracking-tight">
                {overdue7DaysClaims.length}
              </span>
              <span className="text-xs text-red-500 font-medium">ยังไม่ Delivered ใน 7 วัน</span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-lg sm:text-xl shrink-0">
              <AlertOutlined />
            </div>
          </div>

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