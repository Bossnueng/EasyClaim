import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Tag, Button, Empty } from "antd";
import {  PlusCircleOutlined,  InboxOutlined,  RightOutlined,} from "@ant-design/icons";
import dayjs from "dayjs";

// ลำดับความสำคัญในการเรียงลำดับรายการ
const STATUS_PRIORITY = {
  สร้างรายการเคลม: 1,
  รอการพิจารณา: 2,
  มีสิทธิ์เคลม: 3,
  รับสินค้าจริงแล้ว: 4,
  อนุมัติเคลมสินค้า: 5,
  กำลังดำเนินการเปลี่ยนสินค้า: 6,
  กำลังจัดส่งสินค้าเคลม: 7,
  จัดส่งสินค้าเคลมสำเร็จ: 8,
  ไม่มีสิทธิ์เคลม: 9,
  ไม่อนุมัติเคลมสินค้า: 10,
};

const CustomerHome = () => {
  const navigate = useNavigate();
  const [latestClaims, setLatestClaims] = useState([]);
  const savedUser = localStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;

  useEffect(() => {
    // 1. ดึงข้อมูลรายการเคลมจาก localStorage
    const savedClaims = JSON.parse(localStorage.getItem("claims")) || [];

    // 2. เรียงลำดับตามความสำคัญของสถานะ -> หากเท่ากัน ให้เรียงตามวันที่สร้าง (ล่าสุดขึ้นก่อน)
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

    // 3. ดึงรายการหลังจาก Sort เรียบร้อยแล้ว
    setLatestClaims(sortedClaims.slice(0, 8));
  }, []);

  // ใส่สี Card ตามสถานะงานเคลม
  const getStatusTag = (currentStatus) => {
    switch (currentStatus) {
      case "สร้างรายการเคลม":
        return (
          <Tag color="default" style={{ margin: 0 }}>
            สร้างรายการเคลม
          </Tag>
        );
      case "รอการพิจารณา":
        return (
          <Tag color="processing" style={{ margin: 0 }}>
            รอการพิจารณา
          </Tag>
        );
      case "มีสิทธิ์เคลม":
        return (
          <Tag color="cyan" style={{ margin: 0 }}>
            มีสิทธิ์เคลม
          </Tag>
        );
      case "รับสินค้าจริงแล้ว":
        return (
          <Tag color="purple" style={{ margin: 0 }}>
            รับสินค้าจริงแล้ว
          </Tag>
        );
      case "อนุมัติเคลมสินค้า":
        return (
          <Tag color="success" style={{ margin: 0 }}>
            อนุมัติเคลมสินค้า
          </Tag>
        );
      case "กำลังดำเนินการเปลี่ยนสินค้า":
        return (
          <Tag color="blue" style={{ margin: 0 }}>
            กำลังดำเนินการเปลี่ยนสินค้า
          </Tag>
        );
      case "กำลังจัดส่งสินค้าเคลม":
        return (
          <Tag color="warning" style={{ margin: 0 }}>
            กำลังจัดส่งสินค้าเคลม
          </Tag>
        );
      case "จัดส่งสินค้าเคลมสำเร็จ":
        return (
          <Tag color="green" style={{ margin: 0 }}>
            จัดส่งสินค้าเคลมสำเร็จ
          </Tag>
        );
      case "ไม่มีสิทธิ์เคลม":
      case "ไม่อนุมัติเคลมสินค้า":
        return (
          <Tag color="error" style={{ margin: 0 }}>
            {currentStatus}
          </Tag>
        );
      default:
        return (
          <Tag color="default" style={{ margin: 0 }}>
            {currentStatus}
          </Tag>
        );
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
            สวัสดี, คุณ {user?.name || "-"}
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
          {/* ปุ่มแจ้งเคลมใหม่ */}
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

        {/* ==================== รายการเคลมล่าสุด (8)==================== */}
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

          {/* === Card List === */}
          {latestClaims.length > 0 ? (
            //=== ถ้ามีรายการให้แสดง ===
            <div className="flex flex-col gap-3.5 w-full">
              {latestClaims.map((claim) => (
                <div
                  key={claim.claimId}
                  onClick={() =>
                    navigate(`/customer/detail-claim/${claim.claimId}`)
                  }
                  style={{
                    boxSizing: "border-box",
                    padding: "20px",
                    overflow: "hidden",
                  }}
                  className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-500 transition-all cursor-pointer flex justify-between items-center gap-4 w-full"
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <h4 className="font-bold text-base text-slate-800 m-0 truncate">
                      {claim.productName}
                    </h4>
                    <p className="text-xs text-gray-400 font-mono m-0 truncate">
                      ID: {claim.claimId}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {getStatusTag(claim.status)}
                    <span className="text-xs text-gray-400">
                      {claim.createdDate}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            //=== ถ้าไม่มีรายการให้แสดง ===
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
