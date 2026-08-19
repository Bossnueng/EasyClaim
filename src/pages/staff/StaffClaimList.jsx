import React, { useState } from "react";
import { Input, Empty, message } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import ClaimCard from "../../components/StaffClaimCard";
import { STATUS_PRIORITY,FILTER_OPTIONS } from "../../constants/claimStatus";


const StaffClaimList = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ทั้งหมด");
  const [claims, setClaims] = useState(() => {
    return JSON.parse(localStorage.getItem("claims")) || [];
  });
  const handleDeleteClaim = (e, claimId) => {
    e.stopPropagation();
    const updatedClaims = claims.filter((item) => item.claimId !== claimId);
    setClaims(updatedClaims);
    localStorage.setItem("claims", JSON.stringify(updatedClaims));
    message.success("ลบรายการเคลมเรียบร้อยแล้ว");
  };
  const statusCounts = claims.reduce((acc, claim) => {
    acc[claim.status] = (acc[claim.status] || 0) + 1;
    return acc;
  }, {});
  const filteredClaims = claims
    .filter((claim) => {
      const matchesStatus = selectedStatus === "ทั้งหมด" || claim.status === selectedStatus;
      const searchLower = searchTerm.toLowerCase();
      const matchesProduct = claim.productName ?.toLowerCase().includes(searchLower);
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

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8 overflow-hidden" style={{ boxSizing: "border-box", width: "100%" }}>
      <div className="w-full flex flex-col gap-6" style={{ boxSizing: "border-box" }}>
      
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 m-0">รายการเคลมสินค้า</h1>
          <p className="text-sm text-gray-500 m-0">ตรวจสอบและติดตามสถานะรายการเคลมทั้งหมดในระบบ</p>
        </header>

        {/* Search & Filter */}
        <div className="flex flex-col gap-4 w-full">
          <Input size="large"
            placeholder="ค้นหาตามชื่อสินค้า หรือ Claim ID..."
            prefix={<SearchOutlined className="text-gray-400 mr-2" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
            className="w-full rounded-xl border-gray-200 shadow-sm hover:border-emerald-500 focus:border-emerald-500 py-2.5 bg-white"
            style={{ boxSizing: "border-box" }}/>

          <div className="w-full relative">
            <div className="w-full overflow-x-auto flex items-center gap-2 py-1"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                WebkitOverflowScrolling: "touch",
              }}
            >
              <style>{`.overflow-x-auto::-webkit-scrollbar {display: none;}`}</style>
              {FILTER_OPTIONS.map((status) => {
                const isActive = selectedStatus === status;
                const count = status === "ทั้งหมด" ? claims.length : statusCounts[status] || 0;

                return (
                  <button key={status}
                    onClick={() => setSelectedStatus(status)}
                    style={{padding: "10px 20px",
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
                    <span style={{ padding: "2px 8px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "bold",
                        backgroundColor: isActive ? "rgba(255, 255, 255, 0.2)" : "#f1f5f9",
                        color: isActive ? "#ffffff" : "#64748b",
                      }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Claim Cards List */}
        {filteredClaims.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full">
            {filteredClaims.map((claim) => (
              <ClaimCard key={claim.claimId}
                claim={claim}
                onDelete={handleDeleteClaim}
                hideDeleteWhenDisabled={true} // กำหนด true หากต้องการเอาปุ่มลบออกไปเลย
              />
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