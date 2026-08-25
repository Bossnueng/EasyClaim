import React, { useState, useEffect } from "react";
import { Input, Empty, message } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import CustomerClaimCard from "../../components/CustomerClaimCard";
import { STATUS_PRIORITY, FILTER_OPTIONS, CUSTOMER_FILTER_TABS, CUSTOMER_STATUS_GROUPS } from "../../constants/claimStatus";
import claimService from "../../services/claimService";
import loginService from "../../services/loginService";
import itemService from "../../services/itemService";

const CustomerClaimList = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ทั้งหมด");
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [itemsMap, setItemsMap] = useState({});
  
  useEffect(() => {
    fetchClaimsAndItems();
  }, []);

  const fetchClaimsAndItems = async () => {
    setLoading(true);
    try {
      const user = loginService.getCurrentUser();
      const agentId = user?.agent_id;

      if (!agentId) {
        message.error("ไม่พบข้อมูลผู้ใช้งาน กรุณาล็อกอินใหม่");
        return;
      }

      const [resClaim, resItems] = await Promise.all([
        claimService.getClaimByAgent(agentId),
        itemService.getItems(),
      ]);

      //แปลงรายการสินค้าเป็น Object Lookup Map เช่น { 1: "สินค้า A", 2: "สินค้า B" }
      if (resItems && resItems.data) {
        const map = {};
        resItems.data.forEach((item) => {
          map[item.item_id] = item.item_name; 
        });
        setItemsMap(map);
      }

      //เก็บรายการเคลมเข้า state
      if (resClaim.status) {
        setClaims(resClaim.data);
      }
    } catch (error) {
      message.error("ไม่สามารถดึงข้อมูลได้: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClaim = async (e, claimId) => {
    if (e) e.stopPropagation(); // ป้องกัน Event Bubbling
    
    try {
      const response = await claimService.delClaim(claimId);
      if (response.status) {
        message.success("ลบรายการเคลมเรียบร้อยแล้ว");
        
        // 🟢 อัปเดต State เพื่อลบรายการออกจากหน้าจอทันทีโดยไม่ต้อง Refresh
        setClaims((prevClaims) =>
          prevClaims.filter((claim) => claim.claim_id !== claimId)
        );
      }
    } catch (error) {
      message.error(error.message || "เกิดข้อผิดพลาดในการลบรายการ");
    }
  };

  // 🟢 คำนวณจำนวนรายการแบ่งตามแท็บกลุ่มสถานะ Shopee
  const tabCounts = claims.reduce((acc, claim) => {
    const status = claim.current_status;
    Object.keys(CUSTOMER_STATUS_GROUPS).forEach((tabName) => {
      if (CUSTOMER_STATUS_GROUPS[tabName].includes(status)) {
        acc[tabName] = (acc[tabName] || 0) + 1;
      }
    });
    return acc;
  }, {});

  // คำนวณจำนวนรายการแต่ละสถานะ
  const statusCounts = claims.reduce((acc, claim) => {
    acc[claim.current_status] = (acc[claim.current_status] || 0) + 1;
    return acc;
  }, {});

  // กรองข้อมูลตามสถานะ และ คำค้นหา
  const filteredClaims = claims
  
  .filter((claim) => {
    let matchesStatus = false;
      if (selectedStatus === "ทั้งหมด") {
        matchesStatus = true;
      } else {
        const allowedStatuses = CUSTOMER_STATUS_GROUPS[selectedStatus] || [];
        matchesStatus = allowedStatuses.includes(claim.current_status);
      }
    
    const searchLower = searchTerm.toLowerCase();
    // ดึงชื่อสินค้าจาก Map
    const itemName = itemsMap[claim.item_id] || "";
    const matchesProduct = itemName.toString().toLowerCase().includes(searchLower);
    const matchesId = claim.claim_no?.toLowerCase().includes(searchLower);
      return matchesStatus && (matchesProduct || matchesId);
  })

  .sort((a, b) => {
    const priorityA = STATUS_PRIORITY[a.current_status] || 99;
    const priorityB = STATUS_PRIORITY[b.current_status] || 99;
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    return dayjs(b.claim_date).valueOf() - dayjs(a.claim_date).valueOf();
  });

    
  return (
    <div
      className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8 overflow-hidden"
      style={{ boxSizing: "border-box", width: "100%" }}
    >
      <div
        className="w-full flex flex-col gap-6"
        style={{ boxSizing: "border-box" }}
      >
        {/* ==================== Header รายการเคลมสินค้า ==================== */}
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 m-0">
            รายการการเคลมสินค้า
          </h1>
          <p className="text-sm text-gray-500 m-0">
            ตรวจสอบและติดตามสถานะรายการเคลมทั้งหมดของคุณ
          </p>
        </header>

        {/* ==================== Search Bar & Filter Controls ==================== */}
        <div className="flex flex-col gap-4 w-full">
          <div className="p-3 sm:p-4 border-b border-gray-100">
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
          </div>
          {/* ช่องค้นหา */}
         

          {/* แถบกรองสถานะ */}
          <div className="w-full relative">
            <div
              className="w-full grid grid-flow-col sm:grid-cols-6 auto-cols-max sm:auto-cols-auto gap-2 py-1 overflow-x-auto"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                WebkitOverflowScrolling: "touch",
              }}
            >
              <style>{`.overflow-x-auto::-webkit-scrollbar {display: none;}`}</style>

              {CUSTOMER_FILTER_TABS.map((tab) => {

                //แก้ไขการเช็ก isActive โดยใช้ status ตรงๆ (ไม่ใช่ status.value)
                const isActive = selectedStatus === tab;
                
                //แก้ไขการนับจำนวน count ให้ตรงกับสถานะ
                const count =
                  tab === "ทั้งหมด"
                    ? claims.length
                    : tabCounts[tab] || 0;

              return (
                <button
                  key={tab}
                  onClick={() => setSelectedStatus(tab)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border transition-all cursor-pointer text-xs sm:text-sm"
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "10px",
                    lineHeight: "1.5",
                    cursor: "pointer",
                    border: isActive
                      ? "1px solid #059669"
                      : "1px solid #e5e7eb",
                    backgroundColor: isActive ? "#059669" : "#ffffff",
                    color: isActive ? "#ffffff" : "#334155",
                  }}
                >
                  <span className="whitespace-nowrap font-medium">{tab}</span>

                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-bold shrink-0"
                    style={{
                      padding: "2px 8px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      backgroundColor: isActive
                        ? "rgba(255, 255, 255, 0.2)"
                        : "#f1f5f9",
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
          <div className="flex flex-col gap-3 w-full">
            {filteredClaims.map((claim) => (
              <CustomerClaimCard
                key={claim.claim_id}
                claim={{
                  ...claim,
                  item_name: itemsMap[claim.item_id] || `สินค้า ID: ${claim.item_id}`
                }}
                onDelete={handleDeleteClaim}
                hideDeleteWhenDisabled={true}
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

export default CustomerClaimList;