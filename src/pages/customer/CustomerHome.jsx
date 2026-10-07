// src/pages/customer/CustomerHome.jsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Empty, message, Spin } from "antd";
import { PlusCircleOutlined, RightOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import CustomerClaimCard from "../../components/CustomerClaimCard";
import { STATUS_PRIORITY, getStatusName } from "../../constants/claimStatus";
import loginService from "../../services/loginService";
import claimService from "../../services/claimService";
import itemService from "../../services/itemService";

const CustomerHome = () => {
  const navigate = useNavigate();
  const [latestClaims, setLatestClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [itemsMap, setItemsMap] = useState({});

  // ดึงข้อมูล User ผ่าน loginService
  const user = loginService.getCurrentUser();

  useEffect(() => {
    fetchClaimsAndItems();
  }, []);

  const fetchClaimsAndItems = async () => {
    const role = user?.role || user?.user_type;

    // 🟢 1. ถ้าผู้ใช้เป็น Staff/Admin ให้ส่งไปหน้า /staff ทันที
    if (role === "staff" || role === "admin") {
      navigate("/staff", { replace: true });
      return;
    }

    // 🟢 2. ถ้าเป็น Customer แต่ไม่มี agent_id ให้ล้าง Session และไปหน้า /login
    const agentId = user?.agent_id || (Array.isArray(user?.agent_ids) && user.agent_ids.length > 0 ? user.agent_ids[0] : null);

    if (!agentId) {
      loginService.logout();
      navigate("/login", { replace: true });
      return;
    }

    setLoading(true);
    try {
      // ดึง Master Items และ รายการ Claims เฉพาะ Agent
      const [resClaim, resItems] = await Promise.all([
        claimService.getClaimByAgent(agentId),
        itemService.getItems(),
      ]);

      if (resItems && resItems.data) {
        const map = {};
        resItems.data.forEach((item) => {
          map[item.item_id] = item.item_name;
        });
        setItemsMap(map);
      }

      if (resClaim.status && Array.isArray(resClaim.data)) {
        // 🟢 3. ดึง claim_items เพิ่มเติมเพื่อนำข้อมูล item_id, qty, remark มารวมกับแต่ละ claim
        const claimsWithItems = await Promise.all(
          resClaim.data.map(async (claim) => {
            try {
              const resItems = await claimService.getClaimItems(claim.claim_id);
              if (resItems && resItems.status && resItems.data?.length > 0) {
                const firstItem = resItems.data[0];
                return {
                  ...claim,
                  item_id: firstItem.item_id,
                  qty: firstItem.qty,
                  remark: firstItem.remark,
                  lot_no: firstItem.lot_no,
                  items: resItems.data,
                };
              }
            } catch (err) {
              console.error(`Error fetching items for claim ${claim.claim_id}`, err);
            }
            return claim;
          })
        );

        // 🟢 4. เรียงลำดับตามสถานะ Priority และ วันที่สร้าง
        const sortedClaims = claimsWithItems.sort((a, b) => {
          const statusA = a.current_status || a.status;
          const statusB = b.current_status || b.status;
          const priorityA = STATUS_PRIORITY[statusA] || STATUS_PRIORITY[getStatusName(statusA, "customer")] || 99;
          const priorityB = STATUS_PRIORITY[statusB] || STATUS_PRIORITY[getStatusName(statusB, "customer")] || 99;

          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }

          const dateA = dayjs(a.claim_date || a.created_at);
          const dateB = dayjs(b.claim_date || b.created_at);
          return dateB.valueOf() - dateA.valueOf();
        });

        // ดึงเฉพาะ 8 รายการล่าสุด
        setLatestClaims(sortedClaims.slice(0, 8));
      }
    } catch (error) {
      message.error("ไม่สามารถดึงข้อมูลได้: " + (error.message || "เกิดข้อผิดพลาด"));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClaim = async (e, claimId) => {
    if (e) e.stopPropagation();

    try {
      const response = await claimService.delClaim(claimId);
      if (response.status) {
        message.success("ลบรายการเคลมเรียบร้อยแล้ว");
        // อัปเดต State ลบรายการออกทันที
        setLatestClaims((prev) =>
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
      <div
        className="w-full flex flex-col gap-6"
        style={{ boxSizing: "border-box" }}
      >
        {/* ==================== Header ==================== */}
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 m-0">
            สวัสดี, คุณ{user?.full_name || user?.username || "-"}
          </h1>
          <p className="text-gray-500 text-sm m-0">
            ติดตามสถานะหรือแจ้งเคลมสินค้าใหม่ได้ง่ายๆ ที่นี่
          </p>
        </header>

        {/* ==================== Banner แจ้งเคลม ==================== */}
        <div
          style={{
            boxSizing: "border-box",
            padding: "24px 28px",
            overflow: "hidden",
          }}
          className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl shadow-sm text-white flex flex-col sm:flex-row justify-between items-center gap-4 w-full"
        >
          <div className="flex flex-col gap-1 text-center sm:text-left">
            <h3 className="text-lg sm:text-xl font-bold text-white m-0">
              แจ้งเคลมสินค้าใหม่ได้ทันที
            </h3>
            <p className="text-sm opacity-90 text-emerald-50 m-0">
              ใช้เวลาเพียงไม่กี่นาที เพื่อเริ่มต้นกระบวนการเคลมสินค้าของคุณ
            </p>
          </div>
          {/* ปุ่มแจ้งเคลมใหม่ */}
          <Button
            type="default"
            size="large"
            icon={<PlusCircleOutlined />}
            onClick={() => navigate("/customer/new-claim")}
            className="bg-white text-emerald-800 font-bold border-none hover:bg-emerald-50 rounded-full flex items-center justify-center shadow-sm shrink-0 h-11 px-6"
          >
            แจ้งเคลมสินค้าใหม่
          </Button>
        </div>

        {/* ==================== รายการเคลมล่าสุด (8) ==================== */}
        <section className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 m-0">
              รายการเคลมล่าสุด
            </h2>
            <Button
              type="link"
              onClick={() => navigate("/customer/list-claim")}
              className="text-emerald-700 font-semibold p-0 flex items-center gap-1 hover:text-emerald-800"
            >
              ดูทั้งหมด <RightOutlined style={{ fontSize: "11px" }} />
            </Button>
          </div>

          {/* === Card List แนวตั้ง/แนวนอน === */}
          {loading ? (
            <div className="bg-white rounded-2xl p-12 text-center w-full shadow-sm">
              <Spin size="large" tip="กำลังโหลดข้อมูล..." />
            </div>
          ) : latestClaims.length > 0 ? (
            <div className="flex flex-col gap-3.5 w-full">

              {latestClaims.map((claim) => {
                const dateVal = claim.claim_date || claim.created_at;
                const formattedDate = dateVal
                  ? dayjs(dateVal).format("DD/MM/YY HH:mm")
                  : "-";

                const getDisplayProductName = () => {
                  if (Array.isArray(claim.items) && claim.items.length > 0) {
                    return claim.items
                      .map((i) => itemsMap[i.item_id] || i.item_name || i.name || `สินค้า ID: ${i.item_id}`)
                      .join(" + ");
                  }
                  return (
                    itemsMap[claim.item_id] ||
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