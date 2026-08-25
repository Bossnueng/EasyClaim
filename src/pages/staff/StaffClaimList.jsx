import React, { useState, useEffect } from "react";
import { Input, Empty, message, Spin } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import StaffClaimCard from "../../components/StaffClaimCard";
import {
  STATUS_PRIORITY,
  FILTER_OPTIONS,
  CUSTOMER_FILTER_TABS,
  CUSTOMER_STATUS_GROUPS,
} from "../../constants/claimStatus";
import claimService from "../../services/claimService";
import itemService from "../../services/itemService";

const StaffClaimList = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ทั้งหมด");
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [itemsMap, setItemsMap] = useState({});

  useEffect(() => {
    fetchClaimsAndItems();
  }, []);

  // 🟢 ดึงข้อมูลรายการเคลมทั้งหมด (Staff) และ ข้อมูลสินค้า
  const fetchClaimsAndItems = async () => {
    setLoading(true);
    try {
      const [resClaim, resItems] = await Promise.all([
        claimService.getClaim(),
        itemService.getItems(),
      ]);

      // แปลงรายการสินค้าเป็น Object Lookup Map { item_id: item_name }
      if (resItems && resItems.data) {
        const map = {};
        resItems.data.forEach((item) => {
          map[item.item_id] = item.item_name;
        });
        setItemsMap(map);
      }

      if (resClaim && resClaim.status) {
        setClaims(resClaim.data);
      }
    } catch (error) {
      message.error("ไม่สามารถดึงข้อมูลได้: " + (error.message || "เกิดข้อผิดพลาด"));
    } finally {
      setLoading(false);
    }
  };

  // 🟢 ฟังก์ชั่นลบรายการเคลมผ่าน API
  const handleDeleteClaim = async (e, claimId) => {
    if (e) e.stopPropagation();

    try {
      const response = await claimService.delClaim(claimId);
      if (response && response.status) {
        message.success("ลบรายการเคลมเรียบร้อยแล้ว");
        // อัปเดต State ลบรายการออกจากหน้าจอทันที
        setClaims((prevClaims) =>
          prevClaims.filter(
            (item) => item.claim_id !== claimId && item.claim_no !== claimId
          )
        );
      }
    } catch (error) {
      message.error(error.message || "เกิดข้อผิดพลาดในการลบรายการ");
    }
  };

  // 🟢 คำนวณจำนวนรายการแบ่งตามแท็บกลุ่มสถานะ
  const tabCounts = claims.reduce((acc, claim) => {
    const status = claim.current_status || claim.status;
    if (CUSTOMER_STATUS_GROUPS) {
      Object.keys(CUSTOMER_STATUS_GROUPS).forEach((tabName) => {
        if (CUSTOMER_STATUS_GROUPS[tabName].includes(status)) {
          acc[tabName] = (acc[tabName] || 0) + 1;
        }
      });
    }
    return acc;
  }, {});

  // คำนวณจำนวนรายการแต่ละสถานะเดี่ยว (เผื่อใช้งาน FILTER_OPTIONS เดิม)
  const statusCounts = claims.reduce((acc, claim) => {
    const status = claim.current_status || claim.status;
    if (status) {
      acc[status] = (acc[status] || 0) + 1;
    }
    return acc;
  }, {});

  // 🟢 กรองข้อมูลตามสถานะ และ คำค้นหา
  const filteredClaims = claims
    .filter((claim) => {
      const claimStatus = claim.current_status || claim.status;
      let matchesStatus = false;

      if (selectedStatus === "ทั้งหมด") {
        matchesStatus = true;
      } else if (CUSTOMER_STATUS_GROUPS && CUSTOMER_STATUS_GROUPS[selectedStatus]) {
        const allowedStatuses = CUSTOMER_STATUS_GROUPS[selectedStatus] || [];
        matchesStatus = allowedStatuses.includes(claimStatus);
      } else {
        matchesStatus = claimStatus === selectedStatus;
      }

      const searchLower = searchTerm.toLowerCase();
      const itemName = itemsMap[claim.item_id] || claim.item_name || "";
      const matchesProduct = itemName.toString().toLowerCase().includes(searchLower);
      const matchesId = (claim.claim_no || claim.claim_id || "")
        .toString()
        .toLowerCase()
        .includes(searchLower);

      return matchesStatus && (matchesProduct || matchesId);
    })
    .sort((a, b) => {
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

  // เลือกใช้ Tabs ตาม CustomerClaimList (หากไม่มี CUSTOMER_FILTER_TABS จะสลับไปใช้ FILTER_OPTIONS)
  const filterTabs = CUSTOMER_FILTER_TABS || FILTER_OPTIONS;

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
            รายการเคลมสินค้า
          </h1>
          <p className="text-sm text-gray-500 m-0">
            ตรวจสอบและติดตามสถานะรายการเคลมทั้งหมดในระบบ
          </p>
        </header>

        {/* ==================== Search Bar & Filter Controls ==================== */}
        <div className="flex flex-col gap-4 w-full">
          {/* ช่องค้นหา */}
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

              {filterTabs.map((tab) => {
                const isActive = selectedStatus === tab;
                const count =
                  tab === "ทั้งหมด"
                    ? claims.length
                    : tabCounts[tab] ?? statusCounts[tab] ?? 0;

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

        {/* ==================== Claim Cards List ==================== */}
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center w-full">
            <Spin size="large" tip="กำลังโหลดข้อมูล..." />
          </div>
        ) : filteredClaims.length > 0 ? (
          <div className="flex flex-col gap-3 w-full">
            {filteredClaims.map((claim) => (
              <StaffClaimCard
                key={claim.claim_id || claim.claim_no}
                claim={{
                  ...claim,
                  item_name:
                    itemsMap[claim.item_id] ||
                    claim.item_name ||
                    `สินค้า ID: ${claim.item_id}`,
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

export default StaffClaimList;