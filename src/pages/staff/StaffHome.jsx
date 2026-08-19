import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Empty } from "antd";
import { RightOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import ClaimCard from "../../components/StaffClaimCard";
import { STATUS_PRIORITY } from "../../constants/claimStatus";

const StaffHome = () => {
  const savedUser = localStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;
  const navigate = useNavigate();
  const [latestClaims, setLatestClaims] = useState([]);
  useEffect(() => {
    const savedClaims = JSON.parse(localStorage.getItem("claims")) || [];
    const pendingClaims = savedClaims.filter((item) => {
      const priority = STATUS_PRIORITY[item.status];
      return priority !== 8 && priority !== 9 && priority !== 10;
    });

    const sortedClaims = pendingClaims.sort((a, b) => {
      const priorityA = STATUS_PRIORITY[a.status] || 99;
      const priorityB = STATUS_PRIORITY[b.status] || 99;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      const dateA = dayjs(a.createdDate);
      const dateB = dayjs(b.createdDate);
      return dateB.valueOf() - dateA.valueOf();
    });

    setLatestClaims(sortedClaims.slice(0, 8));
  }, []);

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
            สวัสดี, คุณ {user?.name || "-"}
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

          {latestClaims.length > 0 ? (
            <div className="flex flex-col gap-3.5 w-full">
              {latestClaims.map((claim) => (
                <ClaimCard
                  key={claim.claimId}
                  claim={claim}
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
