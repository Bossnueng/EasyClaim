import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Empty, message, Spin } from "antd";
import { RightOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import ClaimCard from "../../components/StaffClaimCard";
import { STATUS_PRIORITY } from "../../constants/claimStatus";
import loginService from "../../services/loginService";
import claimService from "../../services/claimService";
import itemService from "../../services/itemService";

const StaffHome = () => {
  const navigate = useNavigate();
  const [latestClaims, setLatestClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [itemsMap, setItemsMap] = useState({});

  const user = loginService.getCurrentUser();

  useEffect(() => {
    fetchClaimsAndItems();
  }, []);

  const fetchClaimsAndItems = async () => {
    setLoading(true);
    try {
      // 🟢 ดึงข้อมูลรายการเคลมทั้งหมดของลูกค้าทุกคน และข้อมูลรายการสินค้า
      const [resClaim, resItems] = await Promise.all([
        claimService.getClaim(),
        itemService.getItems(),
      ]);

      // Map ชื่อสินค้า item_id -> item_name
      const map = {};
      if (resItems && resItems.data) {
        resItems.data.forEach((item) => {
          map[item.item_id] = item.item_name;
        });
        setItemsMap(map);
      }

      if (resClaim && resClaim.data) {
        // 🟢 กรองเฉพาะรายการที่ยังไม่จบกระบวนการ (ตัด priority 8, 9, 10 ออก)
        const pendingClaims = resClaim.data.filter((item) => {
          const currentStatus = item.current_status || item.status;
          const priority = STATUS_PRIORITY[currentStatus];
          return priority !== 8 && priority !== 9 && priority !== 10;
        });

        // จัดเรียงตาม Priority และ วันที่สร้างล่าสุด
        const sortedClaims = pendingClaims.sort((a, b) => {
          const statusA = a.current_status || a.status;
          const statusB = b.current_status || b.status;
          const priorityA = STATUS_PRIORITY[statusA] || 99;
          const priorityB = STATUS_PRIORITY[statusB] || 99;

          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }

          const dateA = dayjs(a.claim_date || a.created_at || a.createdDate);
          const dateB = dayjs(b.claim_date || b.created_at || b.createdDate);
          return dateB.valueOf() - dateA.valueOf();
        });

        setLatestClaims(sortedClaims.slice(0, 8));
      }
    } catch (error) {
      message.error("ไม่สามารถดึงข้อมูลรายการเคลมได้: " + (error.message || "เกิดข้อผิดพลาด"));
    } finally {
      setLoading(false);
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
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 m-0">
            สวัสดี, คุณ {user?.full_name || user?.name || "-"}
          </h1>
          <p className="text-gray-500 text-sm m-0">
            ติดตามสถานะการแจ้งเคลมสินค้าใหม่ได้ที่นี่
          </p>
        </header>

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
              {latestClaims.map((claim) => (
                <ClaimCard
                  key={claim.claim_id || claim.claim_no || claim.claimId}
                  claim={{
                    ...claim,
                    item_name: itemsMap[claim.item_id] || claim.item_name || `สินค้า ID: ${claim.item_id}`,
                  }}
                  variant="compact"
                />
              ))}
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