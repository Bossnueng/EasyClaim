// src/pages/staff/StaffHome.jsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Empty, message, Spin } from "antd";
import { RightOutlined, CheckCircleOutlined, FileSearchOutlined, ClockCircleOutlined, WarningOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { getStatusName } from "../../constants/claimStatus";
import StaffClaimCard from "../../components/StaffClaimCard";
import loginService from "../../services/loginService";
import claimService from "../../services/claimService";
import itemService from "../../services/itemService";
import agentService from "../../services/agentService";
import userService from "../../services/userService";
import { getAgentNameByUserId } from "../../utils/agentHelper";
import { useClaimRealtime } from "../../hooks/useClaimRealtime";

const StaffHome = () => {
  const navigate = useNavigate();
  const currentUser = loginService.getCurrentUser();
  const userRoleId = Number(currentUser?.role_id);
  const currentUserId = currentUser?.user_id || currentUser?.id;

  const [allClaims, setAllClaims] = useState([]);
  const [latestClaims, setLatestClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [itemsMap, setItemsMap] = useState({});
  const [agentsMap, setAgentsMap] = useState({});
  const [usersList, setUsersList] = useState([]);

  useClaimRealtime({
    isStaff: true,
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
  }, []);

  // 🟢 ตรวจสอบสถานะ Pending (รอการพิจารณา)
  const checkIsPending = (item) => {
    const rawStatus = String(item?.current_status || item?.status_id || item?.status || "").trim().toLowerCase();
    const statusName = String(getStatusName(rawStatus) || "").trim().toLowerCase();

    return (
      ["1", "5", "pending", "รอการพิจารณา", "สร้างรายการเคลม"].includes(rawStatus) ||
      ["1", "5", "pending", "รอการพิจารณา", "สร้างรายการเคลม"].includes(statusName)
    );
  };

  // 🟢 ตรวจสอบสถานะ กำลังดำเนินการ (Approved, Rejected, Processing, Shipping)
  const checkIsProcessing = (item) => {
    const rawStatus = String(item?.current_status || item?.status_id || item?.status || "").trim().toLowerCase();
    const statusName = String(getStatusName(rawStatus) || "").trim().toLowerCase();

    return (
      ["6", "7", "8", "9", "approved", "rejected", "processing", "shipping", "มีสิทธิ์เคลม", "ไม่มีสิทธิ์เคลม", "อนุมัติเคลมสินค้า", "ไม่อนุมัติเคลมสินค้า", "กำลังดำเนินการ", "อยู่ระหว่างจัดส่ง"].includes(rawStatus) ||
      ["6", "7", "8", "9", "approved", "rejected", "processing", "shipping", "มีสิทธิ์เคลม", "ไม่มีสิทธิ์เคลม", "อนุมัติเคลมสินค้า", "ไม่อนุมัติเคลมสินค้า", "กำลังดำเนินการ", "อยู่ระหว่างจัดส่ง"].includes(statusName)
    );
  };

  // 🟢 ตรวจสอบสถานะ จัดส่งแล้ว (Delivered)
  const checkIsDelivered = (item) => {
    const rawStatus = String(item?.current_status || item?.status_id || item?.status || "").trim().toLowerCase();
    const statusName = String(getStatusName(rawStatus) || "").trim().toLowerCase();

    return (
      ["10", "delivered", "จัดส่งสำเร็จ", "จัดส่งสินค้าเคลมสำเร็จ"].includes(rawStatus) ||
      ["10", "delivered", "จัดส่งสำเร็จ", "จัดส่งสินค้าเคลมสำเร็จ"].includes(statusName)
    );
  };

  const pendingClaims = allClaims.filter(checkIsPending);
  const processingClaims = allClaims.filter(checkIsProcessing);
  const deliveredClaims = allClaims.filter(checkIsDelivered);

  const overdueClaims = allClaims.filter((item) => {
    if (checkIsDelivered(item)) return false;

    const createdDate = item?.created_at || item?.claim_date || item?.createdDate;
    if (!createdDate) return false;

    const parsedDate = dayjs(createdDate);
    if (!parsedDate.isValid()) return false;

    return dayjs().diff(parsedDate, "day") >= 3;
  });

  const fetchClaimsAndItems = async (showLoading = true) => {
    if (showLoading) setLoading(true);

    try {
      let userAgentIdentifiers = [];

      const [resClaim, resItems, resAgents, resUsers] = await Promise.all([
        claimService.getClaim(),
        itemService.getItems(),
        agentService.getAgent(),
        userService.getUsers(),
      ]);

      const aMap = {};
      const agentsData = Array.isArray(resAgents) ? resAgents : resAgents?.data || [];
      if (Array.isArray(agentsData)) {
        agentsData.forEach((agent) => {
          const aId = String(agent.agent_id || agent.id || "");
          const aCode = String(agent.agent_code || "");
          const name = agent.agent_name || agent.name;
          if (aId) aMap[aId] = name;
          if (aCode) aMap[aCode] = name;
        });
        setAgentsMap(aMap);
      }

      const usersData = resUsers?.data || resUsers || [];
      if (Array.isArray(usersData)) {
        setUsersList(usersData);
      }

      const itemsData = resItems?.data || resItems || [];
      const map = {};
      if (Array.isArray(itemsData)) {
        itemsData.forEach((item) => {
          if (item && item.item_id) {
            map[String(item.item_id)] = item.item_name;
          }
        });
        setItemsMap(map);
      }

      const claimData = Array.isArray(resClaim) ? resClaim : resClaim?.data || [];

      if (Array.isArray(currentUser?.agent_ids)) {
        currentUser.agent_ids.forEach((id) => {
          userAgentIdentifiers.push(String(id));
        });
      } else if (currentUser?.agent_id) {
        userAgentIdentifiers.push(String(currentUser.agent_id));
      }

      if (Array.isArray(agentsData)) {
        agentsData.forEach((agent) => {
          const aId = String(agent.agent_id || agent.id || "");
          const aCode = String(agent.agent_code || agent.code || "");
          if (userAgentIdentifiers.includes(aId) && aCode) {
            userAgentIdentifiers.push(aCode);
          }
        });
      }

      const allowedClaims = (userRoleId === 1 || userAgentIdentifiers.length === 0)
        ? claimData
        : claimData.filter((claim) => {
            const claimAgentIdStr = String(claim.agent_id || "");
            const claimAgentCodeStr = String(claim.agent_code || "");
            return userAgentIdentifiers.includes(claimAgentIdStr) || userAgentIdentifiers.includes(claimAgentCodeStr);
          });

      const claimWithDetails = await Promise.all(
        allowedClaims.map(async (claim) => {
          try {
            const itemRes = await claimService.getClaimItems(claim.claim_id);
            const rawItems = Array.isArray(itemRes) ? itemRes : itemRes?.data || [];
            const itemDetails = rawItems[0] || {};
            const totalQty = rawItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

            return {
              ...claim,
              items: rawItems,
              item_id: itemDetails.item_id || claim.item_id,
              qty: rawItems.length > 0 ? totalQty : (claim.qty ?? 0),
              qtychang: itemDetails.qtychang ?? claim.qtychang ?? 0,
              lot_no: itemDetails.lot_no || claim.lot_no || "-",
              remark: itemDetails.remark || claim.remark || "",
            };
          } catch {
            return claim;
          }
        })
      );

      setAllClaims(claimWithDetails);

      if (claimWithDetails.length > 0) {
        const sortedClaims = [...claimWithDetails].sort((a, b) => {
          const parsedA = dayjs(a.claim_date || a.created_at || a.createdDate);
          const parsedB = dayjs(b.claim_date || b.created_at || b.createdDate);
          
          const timeA = parsedA.isValid() ? parsedA.valueOf() : 0;
          const timeB = parsedB.isValid() ? parsedB.valueOf() : 0;

          return timeA - timeB;
        });

        setLatestClaims(sortedClaims.slice(0, 8));
      } else {
        setLatestClaims([]);
      }
    } catch (error) {
      message.error("ไม่สามารถดึงข้อมูลรายการเคลมได้: " + (error?.message || "เกิดข้อผิดพลาด"));
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  return (
    <div
      className="p-4 sm:p-6 md:p-8 bg-gray-100 min-h-screen flex flex-col gap-6"
      style={{ boxSizing: "border-box", width: "100%" }}
    >
      <div className="w-full flex flex-col gap-6" style={{ boxSizing: "border-box" }}>
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 m-0">
            สวัสดี, คุณ{currentUser?.full_name || currentUser?.name || "-"}
          </h1>
          <p className="text-gray-500 text-sm m-0">
            ติดตามสถานะการแจ้งเคลมสินค้าใหม่ได้ที่นี่
          </p>
        </header>

        {/* Dashboard Summary Cards */}
        <div className="w-full grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Card 1: รายการรออนุมัติ (Pending) */}
          <div
            onClick={() => navigate("/staff/list-claim?filter=pending")}
            className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
            style={{ boxSizing: "border-box", padding: "24px 28px", overflow: "hidden" }}
          >
            <div className="flex flex-col gap-1">
              <span className="text-xs sm:text-sm font-medium text-gray-500">
                รายการรออนุมัติ
              </span>
              <span className="text-3xl sm:text-4xl font-extrabold text-blue-600 font-sans tracking-tight">
                {pendingClaims.length}
              </span>
              <span className="text-xs text-blue-500 font-medium">
                รอการพิจารณา (Pending)
              </span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg sm:text-xl shrink-0">
              <FileSearchOutlined />
            </div>
          </div>

          {/* Card 2: รายการกำลังดำเนินการ */}
          <div
            onClick={() => navigate("/staff/list-claim?filter=processing")}
            className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-amber-300 transition-all"
            style={{ boxSizing: "border-box", padding: "24px 28px", overflow: "hidden" }}
          >
            <div className="flex flex-col gap-1">
              <span className="text-xs sm:text-sm font-medium text-gray-500">
                รายการกำลังดำเนินการ
              </span>
              <span className="text-3xl sm:text-4xl font-extrabold text-amber-600 font-sans tracking-tight">
                {processingClaims.length}
              </span>
              <span className="text-xs text-amber-500 font-medium">
                อยู่ระหว่างการจัดการ
              </span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg sm:text-xl shrink-0">
              <ClockCircleOutlined />
            </div>
          </div>

          {/* Card 3: รายการที่จัดส่งแล้ว */}
          <div
            onClick={() => navigate("/staff/list-claim?filter=delivered")}
            className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-emerald-300 transition-all"
            style={{ boxSizing: "border-box", padding: "24px 28px", overflow: "hidden" }}
          >
            <div className="flex flex-col gap-1">
              <span className="text-xs sm:text-sm font-medium text-gray-500">
                รายการที่จัดส่งแล้ว
              </span>
              <span className="text-3xl sm:text-4xl font-extrabold text-emerald-600 font-sans tracking-tight">
                {deliveredClaims.length}
              </span>
              <span className="text-xs text-emerald-500 font-medium">
                จัดส่งเรียบร้อยแล้ว (Delivered)
              </span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg sm:text-xl shrink-0">
              <CheckCircleOutlined />
            </div>
          </div>

          {/* Card 4: รายการค้างเกิน 3 วัน */}
          <div
            onClick={() => navigate("/staff/list-claim?filter=overdue")}
            className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-rose-300 transition-all"
            style={{ boxSizing: "border-box", padding: "24px 28px", overflow: "hidden" }}
          >
            <div className="flex flex-col gap-1">
              <span className="text-xs sm:text-sm font-medium text-gray-500">
                รายการค้างเกิน 3 วัน
              </span>
              <span className="text-3xl sm:text-4xl font-extrabold text-rose-600 font-sans tracking-tight">
                {overdueClaims.length}
              </span>
              <span className="text-xs text-rose-500 font-medium">
                ยังไม่ Delivered ใน 3 วัน
              </span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-lg sm:text-xl shrink-0">
              <WarningOutlined />
            </div>
          </div>
        </div>

        {/* Section รายการเคลมล่าสุด */}
        <section className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 m-0">
              รายการเคลมล่าสุด
            </h2>
            <Button
              type="link"
              onClick={() => navigate("/staff/list-claim")}
              className="text-emerald-700 font-semibold p-0 flex items-center gap-1 hover:text-emerald-800"
            >
              ดูทั้งหมด
              <RightOutlined style={{ fontSize: "11px" }} />
            </Button>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl p-12 text-center w-full">
              <Spin size="large" tip="กำลังโหลดข้อมูล..." />
            </div>
          ) : latestClaims.length > 0 ? (
            <div className="flex flex-col gap-3.5 w-full">
              {latestClaims.map((claim) => {
                const creatorUserId = String(claim.user_id || claim.created_by || "");
                const claimAgentId = String(claim.agent_id || "");
                const claimAgentCode = String(claim.agent_code || "");

                const matchedAgentName =
                  agentsMap[claimAgentId] ||
                  agentsMap[claimAgentCode] ||
                  getAgentNameByUserId(creatorUserId, usersList, agentsMap);

                const agentName =
                  matchedAgentName && matchedAgentName !== "-"
                    ? matchedAgentName
                    : claim.agent_name || claim.agentName || "-";

                const getDisplayProductName = () => {
                  if (Array.isArray(claim.items) && claim.items.length > 0) {
                    const names = claim.items
                      .map((i) => {
                        const idStr = String(i.item_id || "");
                        return itemsMap[idStr] || i.item_name || i.name || (idStr ? `สินค้า ID: ${idStr}` : "");
                      })
                      .filter(Boolean);

                    if (names.length > 0) return names.join(" + ");
                  }

                  const singleIdStr = String(claim.item_id || "");
                  return (
                    itemsMap[singleIdStr] ||
                    claim.item_name ||
                    (singleIdStr ? `สินค้า ID: ${singleIdStr}` : "ไม่พบข้อมูลสินค้า")
                  );
                };

                return (
                  <StaffClaimCard
                    key={claim.claim_id || claim.claim_no}
                    claim={{
                      ...claim,
                      item_name: getDisplayProductName(),
                      agent_name: agentName,
                    }}
                    layout="horizontal"
                  />
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center my-4 w-full">
              <Empty description="ไม่พบรายการเคลมสินค้าใหม่หรือกำลังดำเนินการ" />
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default StaffHome;