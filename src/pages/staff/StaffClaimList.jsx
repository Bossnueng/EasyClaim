import React, { useState } from "react";
import { Tag, Input, Empty } from "antd";
import { useNavigate } from "react-router-dom";
import { SearchOutlined, RightOutlined, CodeSandboxOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const STATUS_PRIORITY = {
  "สร้างรายการเคลม": 1,
  "รอการพิจารณา": 2,
  "มีสิทธิ์เคลม": 3,
  "รับสินค้าจริงแล้ว": 4,
  "อนุมัติเคลมสินค้า": 5,
  "กำลังดำเนินการเปลี่ยนสินค้า": 6,
  "กำลังจัดส่งสินค้าเคลม": 7,
  "จัดส่งสินค้าเคลมสำเร็จ": 8,
  "ไม่มีสิทธิ์เคลม": 9,
  "ไม่อนุมัติเคลมสินค้า": 10,
};

const FILTER_OPTIONS = [
  "ทั้งหมด",
  "สร้างรายการเคลม",
  "รอการพิจารณา",
  "มีสิทธิ์เคลม",
  "รับสินค้าจริงแล้ว",
  "อนุมัติเคลมสินค้า",
  "กำลังดำเนินการเปลี่ยนสินค้า",
  "กำลังจัดส่งสินค้าเคลม",
  "จัดส่งสินค้าเคลมสำเร็จ",
  "ไม่อนุมัติเคลมสินค้า",
];

const StaffClaimList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ทั้งหมด");

  const claims = JSON.parse(localStorage.getItem("claims")) || [];

  // คำนวณจำนวนรายการของแต่ละสถานะ
  const statusCounts = claims.reduce((acc, claim) => {
    acc[claim.status] = (acc[claim.status] || 0) + 1;
    return acc;
  }, {});

  // กรองข้อมูลตามสถานะ และ คำค้นหา
  const filteredClaims = claims
    .filter((claim) => {
      const matchesStatus =
        selectedStatus === "ทั้งหมด" || claim.status === selectedStatus;

      const searchLower = searchTerm.toLowerCase();
      const matchesProduct = claim.productName?.toLowerCase().includes(searchLower);
      const matchesId = claim.claimId?.toLowerCase().includes(searchLower);

      return matchesStatus && (matchesProduct || matchesId);
    })
    .sort((a, b) => {
      const priorityA = STATUS_PRIORITY[a.status] || 99;
      const priorityB = STATUS_PRIORITY[b.status] || 99;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      const dateA = dayjs(a.createdDate);
      const dateB = dayjs(b.createdDate);
      return dateB.valueOf() - dateA.valueOf();
    });

  const getStatusTag = (currentStatus) => {
    switch (currentStatus) {
      case "สร้างรายการเคลม":
        return <Tag color="default" style={{ margin: 0 }}>สร้างรายการเคลม</Tag>;
      case "รอการพิจารณา":
        return <Tag color="processing" style={{ margin: 0 }}>รอการพิจารณา</Tag>;
      case "มีสิทธิ์เคลม":
        return <Tag color="cyan" style={{ margin: 0 }}>มีสิทธิ์เคลม</Tag>;
      case "รับสินค้าจริงแล้ว":
        return <Tag color="purple" style={{ margin: 0 }}>รับสินค้าจริงแล้ว</Tag>;
      case "อนุมัติเคลมสินค้า":
        return <Tag color="success" style={{ margin: 0 }}>อนุมัติเคลมสินค้า</Tag>;
      case "กำลังดำเนินการเปลี่ยนสินค้า":
        return <Tag color="blue" style={{ margin: 0 }}>กำลังดำเนินการเปลี่ยนสินค้า</Tag>;
      case "กำลังจัดส่งสินค้าเคลม":
        return <Tag color="warning" style={{ margin: 0 }}>กำลังจัดส่งสินค้าเคลม</Tag>;
      case "จัดส่งสินค้าเคลมสำเร็จ":
        return <Tag color="green" style={{ margin: 0 }}>จัดส่งสินค้าเคลมสำเร็จ</Tag>;
      case "ไม่มีสิทธิ์เคลม":
      case "ไม่อนุมัติเคลมสินค้า":
        return <Tag color="error" style={{ margin: 0 }}>{currentStatus}</Tag>;
      default:
        return <Tag color="default" style={{ margin: 0 }}>{currentStatus}</Tag>;
    }
  };

  return (
    <div
      className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8 overflow-hidden"
      style={{ boxSizing: "border-box", width: "100%" }}
    >
      <div className="w-full flex flex-col gap-6" style={{ boxSizing: "border-box" }}>
        
        {/* ==================== Header ==================== */}
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 m-0">รายการเคลมสินค้า</h1>
          <p className="text-sm text-gray-500 m-0">ตรวจสอบและติดตามสถานะรายการเคลมทั้งหมดในระบบ</p>
        </header>

        {/* ==================== Search Bar & Filter Controls ==================== */}
        <div className="flex flex-col gap-4 w-full">
          {/* ช่องค้นหา */}
          <Input
            size="large"
            placeholder="ค้นหาตามชื่อสินค้า หรือ Claim ID..."
            prefix={<SearchOutlined className="text-gray-400 mr-2" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
            className="w-full rounded-xl border-gray-200 shadow-sm hover:border-emerald-500 focus:border-emerald-500 py-2.5 bg-white"
            style={{ boxSizing: "border-box" }}
          />

          {/* แถบกรองสถานะ */}
          <div className="w-full relative">
            <div 
              className="w-full overflow-x-auto flex items-center gap-2 py-1"
              style={{
                scrollbarWidth: "none", // Firefox
                msOverflowStyle: "none", // IE/Edge
                WebkitOverflowScrolling: "touch",
              }}
            >
              {/* Inline Style ซ่อน Scrollbar สำหรับ Chrome/Safari */}
              <style>{`.overflow-x-auto::-webkit-scrollbar {display: none;}`}</style>

              {FILTER_OPTIONS.map((status) => {
                const isActive = selectedStatus === status;
                const count =
                  status === "ทั้งหมด"
                    ? claims.length
                    : statusCounts[status] || 0;

                return (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    style={{
                      padding: "10px 20px",        
                      borderRadius: "8px",         
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "10px",                 
                      lineHeight: "1.5",           
                      cursor: "pointer",
                      border: isActive ? "1px solid #059669" : "1px solid #e5e7eb",
                      backgroundColor: isActive ? "#059669" : "#ffffff",
                      color: isActive ? "#ffffff" : "#334155",
                    }}
                  >
                    <span style={{ whiteSpace: "nowrap" }}>{status}</span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "bold",
                        backgroundColor: isActive ? "rgba(255, 255, 255, 0.2)" : "#f1f5f9",
                        color: isActive ? "#ffffff" : "#64748b",
                      }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ==================== Claim Cards Grid List ==================== */}
        {filteredClaims.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full">
            {filteredClaims.map((claim) => (
              <div
                key={claim.claimId}
                onClick={() => navigate(`/staff/update-claim/${claim.claimId}`)}
                style={{
                  boxSizing: "border-box",
                  padding: "20px",
                  overflow: "hidden",
                }}
                className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-500 transition-all cursor-pointer flex flex-col justify-between gap-5 w-full"
              >
                
                {/* === Header: ไอคอน + สถานะ === */}
                <div className="flex justify-between items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <CodeSandboxOutlined className="text-xl" />
                  </div>
                  <div className="shrink-0">{getStatusTag(claim.status)}</div>
                </div>

                {/* รายละเอียดสินค้า */}
                <div className="flex flex-col gap-1.5 min-w-0">
                  <h3 className="font-bold text-lg text-slate-800 m-0 truncate">
                    {claim.productName}
                  </h3>
                  <div className="flex justify-between items-center text-xs text-gray-400 font-mono flex-wrap gap-1">
                    <span className="truncate">ID: {claim.claimId}</span>
                    <span className="shrink-0">{claim.createdDate}</span>
                  </div>
                </div>

                {/* Footer: จำนวนสินค้า + ปุ่มนำทาง */}
                <div
                  className="pt-3 border-t border-gray-100 flex justify-between items-center gap-2" style={{ marginTop: "4px" }}>
                  <span className="font-bold text-slate-700 text-sm shrink-0">จำนวน: {claim.qty} ขวด</span>
                  <div className="flex items-center gap-1 text-emerald-600 font-semibold text-sm shrink-0">
                    <span>ดูรายละเอียด</span>
                    <RightOutlined style={{ fontSize: "11px" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center my-4 w-full">
            <Empty description="ไม่พบรายการเคลมสินค้า" />
          </div>
        )}

      </div>
    </div>
  );
};

export default StaffClaimList;