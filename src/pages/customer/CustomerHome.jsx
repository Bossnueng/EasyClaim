// src/pages/customer/CustomerHome.jsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Empty, message, Spin } from "antd";
import { RightOutlined, FileSearchOutlined, ClockCircleOutlined, WarningOutlined, CheckCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import CustomerClaimCard from "../../components/CustomerClaimCard";
import { STATUS_PRIORITY, getStatusName } from "../../constants/claimStatus";
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
  const role = user?.role || user?.user_type;
  const currentUserId = user?.user_id || user?.id;

  useClaimRealtime({
    isStaff: false,
    userId: currentUserId,
    onCreated: () => fetchClaimsAndItems(false),
    onStatusUpdated: () => fetchClaimsAndItems(false),
  });
  
  // 🟢 1. ตั้งเวลาดึงข้อมูลเบื้องหลังนุ่มนวลทุกๆ 5 วินาที
  useEffect(() => {
    fetchClaimsAndItems(true); // โหลดครั้งแรกขึ้น Spin ปกติ

    const interval = setInterval(() => {
      fetchClaimsAndItems(false); // รอบถัดไปดึงเบื้องหลังเงียบๆ ไม่ขึ้น Spin
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getPriority = (item) => {
    if (!item) return 99;
    const statusVal = item?.current_status || item?.status;
    const statusName = getStatusName(statusVal, "customer");
    return STATUS_PRIORITY[statusVal] || STATUS_PRIORITY[statusName] || 99;
  };

  // 🟢 2. ปรับฟังก์ชัน fetchClaimsAndItems ให้รับพารามิเตอร์ showLoading
  const fetchClaimsAndItems = async (showLoading = true) => {
    if (role === "staff" || role === "admin") {
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

      if (resItems && resItems.data) {
        const map = {};
        resItems.data.forEach((item) => {
          map[String(item.item_id)] = item.item_name;
        });
        setItemsMap(map);
      }

      let userAgentIdentifiers = [];

      if (Array.isArray(user?.agent_ids)) {
        user.agent_ids.forEach((id) => userAgentIdentifiers.push(String(id)));
      }
      if (user?.agent_id) {
        userAgentIdentifiers.push(String(user.agent_id));
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
        const isUserMatch = currentUserId && claimCreatedByStr === currentUserId;

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

        const sortedClaims = claimsWithItems.sort((a, b) => {
          const priorityA = getPriority(a);
          const priorityB = getPriority(b);

          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }

          const dateA = dayjs(a.claim_date || a.created_at);
          const dateB = dayjs(b.claim_date || b.created_at);
          return dateB.valueOf() - dateA.valueOf();
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
  };

  const handleDeleteClaim = async (e, claimId) => {
    if (e) e.stopPropagation();

    try {
      const response = await claimService.delClaim(claimId);
      if (response.status) {
        message.success("ลบรายการเคลมเรียบร้อยแล้ว");
        setLatestClaims((prev) =>
          prev.filter((item) => (item.claim_id || item.claim_no) !== claimId)
        );
        setAllClaims((prev) =>
          prev.filter((item) => (item.claim_id || item.claim_no) !== claimId)
        );
      }
    } catch (error) {
      message.error(error.message || "เกิดข้อผิดพลาดในการลบรายการ");
    }
  };

  return (
    <div
      className="p-4 sm:p-6 md:p-8 bg-gray-100 min-h-screen flex flex-col gap-6"
      style={{ boxSizing: "border-box", width: "100%" }}
    >
      <div className="w-full flex flex-col gap-6" style={{ boxSizing: "border-box" }}>
        {/* Header */}
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 m-0">
            สวัสดี, คุณ{user?.full_name || user?.username || "-"}
          </h1>
          <p className="text-gray-500 text-sm m-0">
            ติดตามสถานะหรือแจ้งเคลมสินค้าใหม่ได้ง่ายๆ ที่นี่
          </p>
        </header>

        {/* Dashboard Cards */}
        <div className="w-full grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between" style={{ boxSizing: "border-box", padding: "24px 28px", overflow: "hidden" }}>
            <div className="flex flex-col gap-1">
              <span className="text-xs sm:text-sm font-medium text-gray-500">รายการเคลมใหม่</span>
              <span className="text-3xl sm:text-4xl font-extrabold text-blue-600 font-sans tracking-tight">
                {allClaims.filter((item) => getPriority(item) <= 2).length}
              </span>
              <span className="text-xs text-blue-500 font-medium">รอการพิจารณา</span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg sm:text-xl shrink-0">
              <FileSearchOutlined />
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between" style={{ boxSizing: "border-box", padding: "24px 28px", overflow: "hidden" }}>
            <div className="flex flex-col gap-1">
              <span className="text-xs sm:text-sm font-medium text-gray-500">รายการกำลังดำเนินการ</span>
              <span className="text-3xl sm:text-4xl font-extrabold text-amber-600 font-sans tracking-tight">
                {allClaims.filter((item) => {
                  const p = getPriority(item);
                  return p >= 3 && p <= 7;
                }).length}
              </span>
              <span className="text-xs text-amber-500 font-medium">อยู่ระหว่างการจัดการ</span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg sm:text-xl shrink-0">
              <ClockCircleOutlined />
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between" style={{ boxSizing: "border-box", padding: "24px 28px", overflow: "hidden" }}>
            <div className="flex flex-col gap-1">
              <span className="text-xs sm:text-sm font-medium text-gray-500">รายการที่สำเร็จ</span>
              <span className="text-3xl sm:text-4xl font-extrabold text-emerald-600 font-sans tracking-tight">
                {allClaims.filter((item) => getPriority(item) === 8).length}
              </span>
              <span className="text-xs text-emerald-500 font-medium">จัดส่ง/เสร็จสิ้นแล้ว</span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg sm:text-xl shrink-0">
              <CheckCircleOutlined />
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between" style={{ boxSizing: "border-box", padding: "24px 28px", overflow: "hidden" }}>
            <div className="flex flex-col gap-1">
              <span className="text-xs sm:text-sm font-medium text-gray-500">รายการค้างเกิน 3 วัน</span>
              <span className="text-3xl sm:text-4xl font-extrabold text-rose-600 font-sans tracking-tight">
                {allClaims.filter((item) => {
                  const priority = getPriority(item);
                  if (priority === 8 || priority === 9 || priority === 10) return false;
                  const rawDate = item?.updated_at || item?.approved_at || item?.claim_date || item?.created_at;
                  if (!rawDate) return false;
                  const parsedDate = dayjs(rawDate);
                  return parsedDate.isValid() && dayjs().diff(parsedDate, "day") >= 3;
                }).length}
              </span>
              <span className="text-xs text-rose-500 font-medium">ต้องเร่งดำเนินการ</span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-lg sm:text-xl shrink-0">
              <WarningOutlined />
            </div>
          </div>
        </div>

        {/* List Section */}
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