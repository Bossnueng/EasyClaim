// src/pages/customer/CustomerClaimList.jsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input, Empty, message, DatePicker, Button, Spin, Select } from "antd";
import { SearchOutlined, DownloadOutlined, CalendarOutlined, FilterOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import CustomerClaimCard from "../../components/CustomerClaimCard";
import { 
  STATUS_PRIORITY, 
  CUSTOMER_FILTER_TABS, 
  CUSTOMER_STATUS_GROUPS,
  getStatusName 
} from "../../constants/claimStatus";
import claimService from "../../services/claimService";
import loginService from "../../services/loginService";
import itemService from "../../services/itemService";

const CustomerClaimList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ทั้งหมด");
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [itemsMap, setItemsMap] = useState({});
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  useEffect(() => {
    fetchClaimsAndItems();
  }, []);

  const fetchClaimsAndItems = async () => {
    const user = loginService.getCurrentUser();
    const role = user?.role || user?.user_type;

    if (role === "staff" || role === "admin") {
      navigate("/staff", { replace: true });
      return;
    }

    const agentId = user?.agent_id;
    if (!agentId) {
      loginService.logout();
      navigate("/login", { replace: true });
      return;
    }

    setLoading(true);
    try {
      const [resClaim, resItems] = await Promise.all([
        claimService.getClaimByAgent(agentId),
        itemService.getItems(),
      ]);

      if (resItems && resItems.data) {
        const map = {};
        resItems.data.forEach((item) => {
          map[item.item_id] = item.item_name;
        });
        setItemsMap(map);
      }

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
    if (e) e.stopPropagation();

    try {
      const response = await claimService.delClaim(claimId);
      if (response.status) {
        message.success("ลบรายการเคลมเรียบร้อยแล้ว");
        setClaims((prevClaims) =>
          prevClaims.filter((claim) => claim.claim_id !== claimId)
        );
      }
    } catch (error) {
      message.error(error.message || "เกิดข้อผิดพลาดในการลบรายการ");
    }
  };

  const handleExportReport = () => {
    if (filteredClaims.length === 0) {
      message.warning("ไม่พบข้อมูลรายการเคลมสำหรับออกรายงาน");
      return;
    }

    let dateStr = "All_Time";
    if (startDate && endDate) {
      dateStr = `${dayjs(startDate).format("YYYYMMDD")}_to_${dayjs(endDate).format("YYYYMMDD")}`;
    }

    const headers = [
      "เลขที่ใบเคลม",
      "วันที่แจ้งเคลม",
      "รหัสสินค้า (Item ID)",
      "ชื่อสินค้า",
      "หมายเลข Lot",
      "จำนวน",
      "เหตุผล/รายละเอียด",
      "สถานะปัจจุบัน",
    ];

    const csvRows = [headers.join(",")];

    filteredClaims.forEach((claim) => {
      const itemName = itemsMap[claim.item_id] || claim.item_name || "-";
      const cleanRemark = (claim.remark || "").replace(/"/g, '""').replace(/\n/g, " ");

      // 🔹 แปลงรหัสสถานะเป็นชื่อภาษาไทยสำหรับมุมมองลูกค้า
      const displayStatus = getStatusName(claim.current_status || claim.status, "customer");

      const row = [
        `"${claim.claim_no || claim.claim_id || ""}"`,
        `"${dayjs(claim.claim_date || claim.created_at).format("DD/MM/YYYY HH:mm")}"`,
        `"${claim.item_id || ""}"`,
        `"${itemName.replace(/"/g, '""')}"`,
        `"${claim.lot_no || ""}"`,
        `"${claim.qty || 0}"`,
        `"${cleanRemark}"`,
        `"${displayStatus}"`,
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `My_Claim_Report_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    message.success("ดาวน์โหลดรายงานเรียบร้อยแล้ว");
  };

  const tabCounts = claims.reduce((acc, claim) => {
    const rawStatus = claim.current_status || claim.status;
    const nameStatus = getStatusName(rawStatus, "customer");

    if (CUSTOMER_STATUS_GROUPS) {
      Object.keys(CUSTOMER_STATUS_GROUPS).forEach((groupName) => {
        const allowedStatuses = CUSTOMER_STATUS_GROUPS[groupName];
        if (
          allowedStatuses.includes(rawStatus) ||
          allowedStatuses.includes(String(rawStatus)) ||
          allowedStatuses.includes(nameStatus)
        ) {
          acc[groupName] = (acc[groupName] || 0) + 1;
        }
      });
    }
    return acc;
  }, {});

  const filteredClaims = claims
    .filter((claim) => {
      const rawStatus = claim.current_status || claim.status;
      const nameStatus = getStatusName(rawStatus, "customer");
      let matchesStatus = false;

      if (selectedStatus === "ทั้งหมด") {
        matchesStatus = true;
      } else if (CUSTOMER_STATUS_GROUPS && CUSTOMER_STATUS_GROUPS[selectedStatus]) {
        const allowedStatuses = CUSTOMER_STATUS_GROUPS[selectedStatus] || [];
        matchesStatus =
          allowedStatuses.includes(rawStatus) ||
          allowedStatuses.includes(String(rawStatus)) ||
          allowedStatuses.includes(nameStatus);
      } else {
        matchesStatus = rawStatus === selectedStatus || nameStatus === selectedStatus;
      }

      const searchLower = searchTerm.toLowerCase();
      const itemName = itemsMap[claim.item_id] || claim.item_name || "";
      const matchesProduct = itemName.toString().toLowerCase().includes(searchLower);
      const matchesId = (claim.claim_no || claim.claim_id || "")
        .toString()
        .toLowerCase()
        .includes(searchLower);

      let matchesDate = true;
      if (startDate && endDate) {
        const claimDate = dayjs(claim.claim_date || claim.created_at);
        matchesDate =
          claimDate.isAfter(dayjs(startDate).startOf("day")) &&
          claimDate.isBefore(dayjs(endDate).endOf("day"));
      } else if (startDate) {
        const claimDate = dayjs(claim.claim_date || claim.created_at);
        matchesDate = claimDate.isAfter(dayjs(startDate).startOf("day"));
      } else if (endDate) {
        const claimDate = dayjs(claim.claim_date || claim.created_at);
        matchesDate = claimDate.isBefore(dayjs(endDate).endOf("day"));
      }

      return matchesStatus && (matchesProduct || matchesId) && matchesDate;
    })
    .sort((a, b) => {
      const statusA = a.current_status || a.status;
      const statusB = b.current_status || b.status;
      const priorityA = STATUS_PRIORITY[statusA] || STATUS_PRIORITY[getStatusName(statusA, "customer")] || 99;
      const priorityB = STATUS_PRIORITY[statusB] || STATUS_PRIORITY[getStatusName(statusB, "customer")] || 99;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      const dateA = dayjs(a.claim_date || a.created_at);
      const dateB = dayjs(b.claim_date || b.created_at);
      return dateB.valueOf() - dateA.valueOf();
    });

  return (
    <div className="min-h-screen bg-gray-50/50 p-2.5 sm:p-4 md:p-6 w-full max-w-full overflow-hidden box-border">
      <div className="w-full flex flex-col gap-4 sm:gap-6">
        
        {/* Header */}
        <header className="flex flex-row justify-between items-center gap-2 w-full">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-slate-800 m-0">
              รายการการเคลมสินค้า
            </h1>
            <p className="text-[11px] sm:text-sm text-gray-500 m-0 mt-0.5">
              ตรวจสอบและติดตามสถานะรายการเคลมทั้งหมดของคุณ
            </p>
          </div>
          <Button
            type="primary"
            style={{ paddingLeft: "16px", paddingRight: "16px" }}
            className="bg-emerald-600 hover:bg-emerald-700 border-none rounded-xl shrink-0 h-9 sm:h-10 shadow-sm flex items-center justify-center"
            onClick={handleExportReport}
          >
            <DownloadOutlined className="text-sm" />
            <span className="hidden sm:inline text-xs sm:text-sm font-medium ml-2">Report</span>
          </Button>
        </header>

        {/* Filter Section */}
        <div className="flex flex-col lg:flex-row gap-2 w-full">
          {/* ช่องค้นหา */}
          <div className="flex-1 min-w-0">
            <Input
              placeholder="ค้นหาตามชื่อสินค้า หรือ Claim ID..."
              prefix={<SearchOutlined className="text-gray-400 mr-1 text-xs sm:text-sm" />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
              className="w-full rounded-lg border-gray-200 bg-white hover:border-emerald-500 focus:border-emerald-500 text-xs sm:text-sm h-9 sm:h-10 shadow-sm px-3"
            />
          </div>

          {/* ช่วงวันที่ */}
          <div className="flex gap-2 lg:w-80 shrink-0">
            <DatePicker
              placeholder="เริ่มวันไหน"
              suffixIcon={<CalendarOutlined className="text-gray-400 text-xs" />}
              format="DD/MM/YYYY"
              value={startDate}
              onChange={(date) => setStartDate(date)}
              disabledDate={(current) => endDate && current && current.isAfter(endDate, "day")}
              style={{ paddingLeft: "8px", paddingRight: "8px" }}
              className="w-full rounded-lg border-gray-200 bg-white h-9 sm:h-10 text-xs shadow-sm"
            />
            <DatePicker
              placeholder="ถึงวันไหน"
              suffixIcon={<CalendarOutlined className="text-gray-400 text-xs" />}
              format="DD/MM/YYYY"
              value={endDate}
              onChange={(date) => setEndDate(date)}
              disabledDate={(current) => startDate && current && current.isBefore(startDate, "day")}
              style={{ paddingLeft: "8px", paddingRight: "8px" }}
              className="w-full rounded-lg border-gray-200 bg-white h-9 sm:h-10 text-xs shadow-sm"
            />
          </div>

          {/* Dropdown เลือกสถานะ */}
          <div className="lg:w-56 shrink-0">
            <Select
              value={selectedStatus}
              onChange={(val) => setSelectedStatus(val)}
              className="w-full h-9 sm:h-10 shadow-sm rounded-lg text-xs"
              suffixIcon={
                <div style={{ paddingRight: "4px" }}>
                  <FilterOutlined className="text-gray-400 text-xs" />
                </div>
              }
              labelRender={({ value }) => {
                const count =
                  value === "ทั้งหมด"
                    ? claims.length
                    : tabCounts[value] ?? 0;
                return (
                  <div className="flex justify-between items-center w-full pr-1">
                    <span 
                      className="text-xs font-medium text-slate-700"
                      style={{ paddingLeft: "4px" }}
                    >
                      {value}
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full ml-1">
                      {count} รายการ
                    </span>
                  </div>
                );
              }}
              options={CUSTOMER_FILTER_TABS.map((tab) => {
                const count =
                  tab === "ทั้งหมด"
                    ? claims.length
                    : tabCounts[tab] ?? 0;
                return {
                  value: tab,
                  label: (
                    <div className="flex justify-between items-center w-full px-0.5">
                      <span className="text-xs font-medium text-slate-700">{tab}</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {count} รายการ
                      </span>
                    </div>
                  ),
                };
              })}
            />
          </div>
        </div>

        {/* Claim Cards List */}
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center w-full shadow-sm">
            <Spin size="large" tip="กำลังโหลดข้อมูล..." />
          </div>
        ) : filteredClaims.length > 0 ? (
          <div className="flex flex-col gap-2.5 sm:gap-3 w-full">
            {filteredClaims.map((claim) => (
              <CustomerClaimCard
                key={claim.claim_id || claim.claim_no}
                claim={{
                  ...claim,
                  // 🔹 แปลงรหัสสถานะเป็นชื่อภาษาไทยที่อ่านง่ายก่อนส่งให้ Card
                  current_status: getStatusName(claim.current_status || claim.status, "customer"),
                  status: getStatusName(claim.status || claim.current_status, "customer"),
                  agent_name: claim.agent_name || claim.agent_id || "-",
                  item_name:
                    itemsMap[claim.item_id] ||
                    claim.item_name ||
                    `สินค้า ID: ${claim.item_id}`,
                  created_at_formatted: dayjs(claim.claim_date || claim.created_at).format("DD/MM/YY HH:mm"),
                }}
                onDelete={handleDeleteClaim}
                hideDeleteWhenDisabled={true}
                layout="horizontal"
              />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-8 sm:p-12 text-center my-2 w-full">
            <Empty description="ไม่พบรายการเคลมสินค้า" />
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerClaimList;