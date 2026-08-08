import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Tag, Button } from "antd";
import {
  PlusCircleOutlined,
  InboxOutlined,
  RightOutlined,
} from "@ant-design/icons";

const StaffHome = () => {

  const navigate = useNavigate();
  const [latestClaims, setLatestClaims] = useState([]);
  
  useEffect(() => {
      // ดึงข้อมูลรายการเคลมจาก localStorage
      const savedClaims = JSON.parse(localStorage.getItem("claims")) || [];
      // ดึงเฉพาะ 3 รายการล่าสุด
      setLatestClaims(savedClaims.slice(0, 3));
  }, []);

  // กำหนดสี Tag ให้ตรงกับ Ant Design Theme
  const getStatusTag = (status) => {
      switch (status) {
        case "รอการตรวจสอบ":
        case "Processing":
          return <Tag color="processing" style={{ margin: 0 }}>Processing</Tag>;
        case "อนุมัติ":
        case "Approved":
          return <Tag color="success" style={{ margin: 0 }}>Approved</Tag>;
        case "ปฏิเสธ":
        case "Rejected":
          return <Tag color="error" style={{ margin: 0 }}>Rejected</Tag>;
        default:
          return <Tag color="blue" style={{ margin: 0 }}>{status || "Processing"}</Tag>;
      }
  };

  return (
    <div 
          className="p-4 sm:p-6 md:p-8 bg-gray-100 min-h-screen flex flex-col gap-6"
          style={{ boxSizing: "border-box", width: "100%" }}
        >
          {/* Container หลัก: ขยายเต็มพื้นที่อย่างสมดุล */}
          <div className="w-full flex flex-col gap-6" style={{ boxSizing: "border-box" }}>
            
            {/* 1. Header Greeting */}
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 m-0">
                สวัสดี, Staff
              </h1>           
            </div>
    
            {/* 3. รายการเคลมล่าสุด */}
            <section className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg sm:text-xl font-bold text-slate-800 m-0">
                  รายการเคลมล่าสุดที่แจ้งเข้ามา
                </h2>
                <Button
                  type="link"
                  onClick={() => navigate("/history")}
                  className="text-emerald-700 font-semibold p-0 flex items-center gap-1 hover:text-emerald-800"
                >
                  ดูทั้งหมด <RightOutlined style={{ fontSize: "11px" }} />
                </Button>
              </div>
    
              {/* Card List ธีมเดียวกับ ClaimList */}
              {latestClaims.length > 0 ? (
                <div className="flex flex-col gap-3.5 w-full">
                  {latestClaims.map((claim) => (
                    <div
                      key={claim.claimId}
                      onClick={() => navigate(`/staff/update-claim/${claim.claimId}`)}
                      style={{
                        boxSizing: "border-box",
                        padding: "20px", // ระยะห่างขอบในการ์ดรายการ
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
                /* Empty State กรณีไม่มีข้อมูล */
                <Card className="rounded-2xl text-center py-10 text-gray-400 border-dashed border-gray-300">
                  <InboxOutlined className="text-4xl text-gray-300 mb-2" />
                  <p className="m-0 text-sm">ยังไม่มีรายการเคลมสินค้า</p>
                </Card>
              )}
            </section>
    
          </div>
        </div>
  )
}

export default StaffHome