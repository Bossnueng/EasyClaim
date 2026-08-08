import React, { useState } from "react";
import { Tag, Input, Empty } from "antd";
import { useNavigate } from "react-router-dom";
import {
  SearchOutlined,
  RightOutlined,
  CodeSandboxOutlined,
} from "@ant-design/icons";

const CustomerClaimList = () => {
 
 
   const navigate = useNavigate();
   const [searchTerm, setSearchTerm] = useState("");
   const claims = JSON.parse(localStorage.getItem("claims")) || [];
   const filteredClaims = claims.filter((claim) => {
     const searchLower = searchTerm.toLowerCase();
     const matchesProduct = claim.productName?.toLowerCase().includes(searchLower);
     const matchesId = claim.claimId?.toLowerCase().includes(searchLower);
     return matchesProduct || matchesId;
   });
 
   const getStatusTag = (status) => {
     switch (status) {
       case "อนุมัติแล้ว":
       case "Approved":
       case "อนุมัติ":
         return <Tag color="success" style={{ margin: 0 }}>อนุมัติแล้ว</Tag>;
       case "รอการตรวจสอบ":
       case "Processing":
         return <Tag color="processing" style={{ margin: 0 }}>รอการตรวจสอบ</Tag>;
       case "ปฏิเสธ":
       case "Rejected":
         return <Tag color="error" style={{ margin: 0 }}>ปฏิเสธ</Tag>;
       default:
         return <Tag color="blue" style={{ margin: 0 }}>{status || "รอการตรวจสอบ"}</Tag>;
     }
   };
 
   return (
     <div 
       className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8"
       style={{ boxSizing: "border-box", width: "100%" }}
     >
       <div className="w-full flex flex-col gap-6" style={{ boxSizing: "border-box" }}>
         
         {/* Header */}
         <header className="flex flex-col gap-1">
           <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 m-0">
             ประวัติการเคลม (Claim History)
           </h1>
           <p className="text-sm text-gray-500 m-0">
             ตรวจสอบและติดตามสถานะรายการเคลมทั้งหมดของคุณ
           </p>
         </header>
 
         {/* Search Bar */}
         <div className="w-full">
           <Input
             size="large"
             placeholder="ค้นหาตามชื่อสินค้า หรือ Claim ID..."
             prefix={<SearchOutlined className="text-gray-400 mr-2" />}
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             allowClear
             className="w-full rounded-xl border-gray-300 shadow-sm hover:border-emerald-500 focus:border-emerald-500"
             style={{ boxSizing: "border-box" }}
           />
         </div>
 
         {/* Claim Cards Grid List */}
         {filteredClaims.length > 0 ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full">
             {filteredClaims.map((claim) => (
               <div
                 key={claim.claimId}
                 onClick={() => navigate(`/customer/detail-claim/${claim.claimId}`)}
                 style={{
                   boxSizing: "border-box",
                   padding: "20px", // กำหนด ระยะห่างขอบใน (Padding) ให้ชัดเจน
                   overflow: "hidden",
                 }}
                 className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-500 transition-all cursor-pointer flex flex-col justify-between gap-5 w-full"
               >
                 {/* Header การ์ด: ไอคอน + สถานะ */}
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
 
                 {/* Footer การ์ด: จำนวนสินค้า + ปุ่มนำทาง */}
                 <div 
                   className="pt-3 border-t border-gray-100 flex justify-between items-center gap-2"
                   style={{ marginTop: "4px" }}
                 >
                   <span className="font-bold text-slate-700 text-sm shrink-0">
                     จำนวน: {claim.qty} ขวด
                   </span>
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
}

export default CustomerClaimList