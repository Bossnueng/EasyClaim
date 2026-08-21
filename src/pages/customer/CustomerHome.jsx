import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Empty, message } from "antd";
import { PlusCircleOutlined, RightOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import CustomerClaimCard from "../../components/CustomerClaimCard";
import { STATUS_PRIORITY } from "../../constants/claimStatus";
import loginService from "../../services/loginService"; // 🟢 1. Import loginService

const CustomerHome = () => {
  const navigate = useNavigate();
  const [latestClaims, setLatestClaims] = useState([]);

  // 🟢 2. ดึงข้อมูล User ผ่าน loginService (เหมือนหน้า UserSettings)
  const user = loginService.getCurrentUser();

  // โหลดข้อมูลและจัดเรียง
  const loadClaims = () => {
    const savedClaims = JSON.parse(localStorage.getItem("claims")) || [];

    const sortedClaims = [...savedClaims].sort((a, b) => {
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
  };

  useEffect(() => {
    loadClaims();
  }, []);

  // ฟังก์ชั่นจัดการการลบรายการ
  const handleDeleteClaim = (e, claimId) => {
    e.stopPropagation();

    const savedClaims = JSON.parse(localStorage.getItem("claims")) || [];
    const updatedClaims = savedClaims.filter((item) => item.claimId !== claimId);

    localStorage.setItem("claims", JSON.stringify(updatedClaims));
    message.success("ลบรายการเคลมเรียบร้อยแล้ว");

    loadClaims();
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
            สวัสดี, คุณ {user?.full_name || "-"}
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

          {/* === Card List แนวตั้งแบบเดิม (flex flex-col gap-3.5) === */}
          {latestClaims.length > 0 ? (
            <div className="flex flex-col gap-3.5 w-full">
              {latestClaims.map((claim) => (
                <CustomerClaimCard
                  key={claim.claimId}
                  claim={claim}
                  onDelete={handleDeleteClaim}
                  hideDeleteWhenDisabled={true}
                  layout="horizontal"
                />
              ))}
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