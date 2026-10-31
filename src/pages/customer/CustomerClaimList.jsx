// src/pages/customer/CustomerClaimList.jsx

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom"; // 🟢 เพิ่ม useLocation
import { Input, Empty, message, DatePicker, Button, Spin, Select } from "antd";
import { 
  SearchOutlined, 
  DownloadOutlined, 
  CalendarOutlined, 
  FilterOutlined,
  DownOutlined,
  UpOutlined,
  ClearOutlined,
  CloseOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import CustomerClaimCard from "../../components/CustomerClaimCard";
import { 
  CUSTOMER_FILTER_TABS, 
  CUSTOMER_STATUS_GROUPS,
  getStatusName,
} from "../../constants/claimStatus";
import claimService from "../../services/claimService";
import loginService from "../../services/loginService";
import itemService from "../../services/itemService";
import userService from "../../services/userService";
import agentService from "../../services/agentService";
import deliveryService from "../../services/deliveryService";
import { getClaimReportPeople, getReportQuantities } from "../../utils/claimReport";
import { useClaimRealtime, isStatusChangeEvent } from "../../hooks/useClaimRealtime";
import { filterClaimsForUser } from "../../utils/claimAccess";
import { enrichClaimsWithItems, matchesClaimSearch, getClaimGroup, isOverdueClaim } from "../../utils/claimDashboard";

const POLL_INTERVAL_MS = 15000;

const CARD_FILTER_LABELS = {
  processing: "กำลังดำเนินการ (Approved ➔ Shipping)",
  overdue3: "ค้างเกิน 3 วัน",
  overdue7: "ค้างเกิน 7 วัน",
};
const CARD_FILTER_TO_TAB = { new: "Pending", delivered: "Delivered" };
import { parseExtraDataFromLogs } from "../../utils/logPaser";

const CustomerClaimList = () => {
  const navigate = useNavigate();
  const location = useLocation(); // 🟢 อ่าน Query parameter จาก URL
  const searchParams = new URLSearchParams(location.search);
  const urlFilterParam = searchParams.get("filter");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ทั้งหมด");
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [itemsMap, setItemsMap] = useState({});
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [claimLogsMap, setClaimLogsMap] = useState({});
  const [deliveriesList, setDeliveriesList] = useState([]);
  const [agentsList, setAgentsList] = useState([]);
  const [sortOrder, setSortOrder] = useState("oldest");

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const [cardFilter, setCardFilter] = useState(null);
  useEffect(() => {
    if (CARD_FILTER_TO_TAB[urlFilterParam]) {
      setSelectedStatus(CARD_FILTER_TO_TAB[urlFilterParam]);
      setCardFilter(null);
    } else if (CARD_FILTER_LABELS[urlFilterParam]) {
      setSelectedStatus("ทั้งหมด");
      setCardFilter(urlFilterParam);
    } else {
      setCardFilter(null);
    }
  }, [urlFilterParam]);

  const clearCardFilter = () => {
    setCardFilter(null);
    if (urlFilterParam) navigate(location.pathname, { replace: true });
  };

  const handleStatusChange = (val) => {
    setSelectedStatus(val);
    clearCardFilter();
  };

  const user = loginService.getCurrentUser();
  const currentUserId = user?.user_id || user?.id;

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const itemsCacheRef = useRef(new Map());

  const fetchClaimsAndItems = useCallback(async (showLoading = true) => {
    const activeUser = userRef.current;
    const activeRole = activeUser?.role || activeUser?.user_type;

    if (activeRole === "staff" || activeRole === "admin") {
      navigate("/staff", { replace: true });
      return;
    }

    if (showLoading) setLoading(true);
    try {
      const [resClaim, resItems, resUsers, resLogs, resAgents, resDeliveries] = await Promise.all([
        claimService.getClaim().catch(() => ({ data: [] })),
        itemService.getItems().catch(() => ({ data: [] })),
        userService.getUsers().catch(() => []),
        claimService.getClaimStatusLogs().catch(() => []),
        agentService.getAgent().catch(() => []),
        deliveryService.getDelivery().catch(() => ({ data: [] })),
      ]);

      const deliveriesData = Array.isArray(resDeliveries?.data) ? resDeliveries.data : Array.isArray(resDeliveries) ? resDeliveries : [];
      setDeliveriesList(deliveriesData);

      const usersData = resUsers?.data || resUsers || [];
      if (Array.isArray(usersData)) setUsersList(usersData);

      const logsData = resLogs?.data || resLogs || [];
      if (Array.isArray(logsData)) {
        const lMap = {};
        logsData.forEach((log) => {
          const cId = String(log.claim_id || log.claimId || "");
          if (cId) {
            if (!lMap[cId]) lMap[cId] = [];
            lMap[cId].push(log);
          }
        });
        setClaimLogsMap(lMap);
      }

      if (resItems?.data) {
        const map = {};
        resItems.data.forEach((item) => {
          const name = item.item_name;
          if (item.item_id !== null && item.item_id !== undefined) map[String(item.item_id).trim()] = name;
          if (item.item_code) map[String(item.item_code).trim()] = name;
        });
        setItemsMap(map);
      }

      const agentsData = Array.isArray(resAgents) ? resAgents : resAgents?.data || [];
      setAgentsList(agentsData);
      const rawClaims = resClaim?.data || (Array.isArray(resClaim) ? resClaim : []);
      const allowedClaims = filterClaimsForUser(rawClaims, activeUser, agentsData);

      const claimsWithItems = await enrichClaimsWithItems(
        allowedClaims,
        (id) => claimService.getClaimItems(id),
        itemsCacheRef.current
      );

      setClaims(claimsWithItems);
    } catch (error) {
      message.error("ไม่สามารถดึงข้อมูลได้: " + (error.message || "เกิดข้อผิดพลาด"));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [navigate]);

  useClaimRealtime({
    isStaff: false,
    userId: currentUserId,
    claimIds: claims.map((c) => c.claim_id),
    onCreated: () => fetchClaimsAndItems(false),
    onStatusUpdated: () => fetchClaimsAndItems(false),
    onCommentCreated: (log) => {
      if (isStatusChangeEvent(log)) fetchClaimsAndItems(false);
    },
  });

  useEffect(() => {
    fetchClaimsAndItems(true);
    const interval = setInterval(() => {
      fetchClaimsAndItems(false);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchClaimsAndItems]);

  const handleDeleteClaim = async (e, claimId) => {
    if (e) e.stopPropagation();
    try {
      const response = await claimService.delClaim(claimId);
      if (response?.status) {
        message.success("ลบรายการเคลมเรียบร้อยแล้ว");
        setClaims((prev) => prev.filter((claim) => claim.claim_id !== claimId));
      }
    } catch (error) {
      message.error(error.message || "เกิดข้อผิดพลาดในการลบรายการ");
    }
  };

  const handleExportReport = () => {
    try {
      if (!filteredClaims || filteredClaims.length === 0) {
        message.warning("ไม่พบข้อมูลรายการเคลมสำหรับออกรายงาน");
        return;
      }

      let dateStr = "All_Time";
      if (startDate && endDate) {
        dateStr = `${dayjs(startDate).format("YYYYMMDD")}_to_${dayjs(endDate).format("YYYYMMDD")}`;
      }

      const userMap = {};
      const safeUsersList = Array.isArray(usersList) ? usersList : (usersList?.data || []);
      safeUsersList.forEach((u) => {
        if (!u) return;
        const uName = u.full_name || u.fullname || u.name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username || u.email;
        const idKeys = [u.user_id, u.id, u.userId, u.user_code].filter(Boolean);
        idKeys.forEach((key) => { userMap[String(key)] = uName; });
      });

      const currentUser = loginService.getCurrentUser() || {};
      const currentUserName = currentUser.full_name || currentUser.fullname || currentUser.name || currentUser.username || "-";

      const headers = [
        "ลำดับ", "เลขที่เอกสารเคลม", "วันที่แจ้งเคลม", "ผู้แจ้งเคลม", "ชื่อสินค้า",
        "รับจริง (ขวด/กระป๋อง)", "แตกจริง (ขวด/กระป๋อง)", "สาเหตุการแตก", "ชื่อ พขร. ที่รับสินค้า",
        "ทะเบียนรถรับสินค้า", "วันที่ พขร. รับสินค้า", "วันที่ คลังสินค้า รับสินค้า", "วันที่ อนุมัติเคลม",
        "วันที่ จัดส่งสินค้าเคลม", "วันที่ จัดส่งสำเร็จ", "ชื่อ พขร. ที่ส่งสินค้า", "ทะเบียนรถส่งสินค้า", "สถานะสินค้า"
      ];

      const csvRows = [headers.join(",")];
      const cleanStr = (val) => (val === null || val === undefined || val === "" ? '"-"' : `"${String(val).replace(/"/g, '""').replace(/\n/g, " ")}"`);
      const formatDate = (dateVal) => (dateVal && dayjs(dateVal).isValid() ? dayjs(dateVal).format("DD/MM/YYYY HH:mm") : "-");

      const safeParseJson = (data) => {
        if (!data) return {};
        if (typeof data === "object") return data;
        if (typeof data === "string" && data.trim().startsWith("{")) {
          try { return JSON.parse(data); } catch { return {}; }
        }
        return {};
      };

      let rowNum = 1;

      filteredClaims.forEach((claim) => {
        const claimIdStr = String(claim.claim_id || claim.id || "");
        const logs = claimLogsMap ? (claimLogsMap[claimIdStr] || []) : [];
        const logData = parseExtraDataFromLogs(logs) || {};

        const claimNo = claim.claim_no || logData.claimNoInput || claim.claim_id || "-";
        const createdById = String(claim.created_by || claim.user_id || claim.createdBy || claim.userId || "");
        const createdByName = userMap[createdById] || claim.created_by_name || claim.createdByName || claim.user_name || claim.userName || (createdById && createdById !== "undefined" ? currentUserName : "-");

        const people = getClaimReportPeople({
          claim,
          logs,
          deliveries: deliveriesList,
          users: safeUsersList,
          agents: agentsList,
          logData,
        });
        const driverName = people.pickup.name || "-";
        const truckPlate = people.pickup.plate || "-";
        const deliveryDriver = people.delivery.name || "-";
        const deliveryPlate = people.delivery.plate || "-";

        const claimDate = formatDate(claim.claim_date || claim.created_at);
        const driverReceiveDate = formatDate(claim.driver_receive_date || logData.driverReceiveDate || logData.driver_receive_date);
        const warehouseReceiveDate = formatDate(claim.warehouse_receive_date || logData.warehouseReceiveDate || logData.warehouse_receive_date);
        const approveDate = formatDate(claim.approve_date || logData.approveDate || logData.approve_date);
        const deliveryDate = formatDate(claim.delivery_date || logData.deliveryDate || logData.delivery_date);
        const receiveFinishDate = formatDate(claim.receive_finish_date || logData.receiveFinishDate || logData.receive_finish_date);

        const displayStatusName = getStatusName(claim.current_status || claim.status, "customer");
        const claimItemsList = Array.isArray(claim.items) && claim.items.length > 0 ? claim.items : [claim];

        claimItemsList.forEach((item) => {
          const itemIdStr = String(item.item_id || "");
          const itemName = (itemsMap && itemsMap[itemIdStr]) || item.item_name || item.name || (itemIdStr ? `สินค้า ID: ${itemIdStr}` : "-");

          const parsedRemark = safeParseJson(item.itemRemark || item.remark || claim.remark);

          const reportQty = getReportQuantities({ item, claim, logs });
          const receivedQty = reportQty.received;
          const approvedQty = reportQty.broken;

          let rawReason = parsedRemark.itemRemark || parsedRemark.remark || item.itemRemark || item.remark || claim.remark || claim.claim_reason || "-";
          if (typeof rawReason === "string" && rawReason.trim().startsWith("{")) {
            const innerJson = safeParseJson(rawReason);
            rawReason = innerJson.itemRemark || innerJson.remark || "-";
          }

          const row = [
            cleanStr(rowNum++),
            cleanStr(claimNo),
            cleanStr(claimDate),
            cleanStr(createdByName),
            cleanStr(itemName),
            cleanStr(receivedQty),
            cleanStr(approvedQty),
            cleanStr(rawReason),
            cleanStr(driverName),
            cleanStr(truckPlate),
            cleanStr(driverReceiveDate),
            cleanStr(warehouseReceiveDate),
            cleanStr(approveDate),
            cleanStr(deliveryDate),
            cleanStr(receiveFinishDate),
            cleanStr(deliveryDriver),
            cleanStr(deliveryPlate),
            cleanStr(displayStatusName),
          ];

          csvRows.push(row.join(","));
        });
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
    } catch (err) {
      console.error("Export Report Error:", err);
      message.error(`เกิดข้อผิดพลาดขณะส่งออกรายงาน: ${err.message || "โปรดตรวจสอบข้อมูลในระบบ"}`);
    }
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

    if (cardFilter === "processing") {
      matchesStatus = getClaimGroup(claim) === "processing";
    } else if (cardFilter === "overdue3" || cardFilter === "overdue7") {
      matchesStatus = isOverdueClaim(claim, cardFilter === "overdue7" ? 7 : 3);
    }
    else if (selectedStatus === "ทั้งหมด") {
      matchesStatus = true;
    }
    else if (CUSTOMER_STATUS_GROUPS && CUSTOMER_STATUS_GROUPS[selectedStatus]) {
      const allowedStatuses = CUSTOMER_STATUS_GROUPS[selectedStatus] || [];
      matchesStatus =
        allowedStatuses.includes(rawStatus) ||
        allowedStatuses.includes(String(rawStatus)) ||
        allowedStatuses.includes(nameStatus);
    } else {
      matchesStatus = rawStatus === selectedStatus || nameStatus === selectedStatus;
    }

    const matchesSearch = matchesClaimSearch(claim, searchTerm, itemsMap);

    let matchesDate = true;
    if (startDate || endDate) {
      const claimDate = dayjs(claim.claim_date || claim.created_at);
      if (startDate && endDate) {
        const start = dayjs(startDate).startOf("day").valueOf();
        const end = dayjs(endDate).endOf("day").valueOf();
        const current = claimDate.valueOf();
        matchesDate = current >= start && current <= end;
      } else if (startDate) {
        const start = dayjs(startDate).startOf("day").valueOf();
        matchesDate = claimDate.valueOf() >= start;
      } else if (endDate) {
        const end = dayjs(endDate).endOf("day").valueOf();
        matchesDate = claimDate.valueOf() <= end;
      }
    }

    return matchesStatus && matchesSearch && matchesDate;
  })
    .sort((a, b) => {
      const dateA = dayjs(a.claim_date || a.created_at);
      const dateB = dayjs(b.claim_date || b.created_at);
      const timeA = dateA.isValid() ? dateA.valueOf() : 0;
      const timeB = dateB.isValid() ? dateB.valueOf() : 0;

      return sortOrder === "oldest" ? timeA - timeB : timeB - timeA;
    });

  const activeAdvancedFilterCount = [
    startDate !== null,
    endDate !== null,
    sortOrder !== "oldest"
  ].filter(Boolean).length;

  const handleResetAdvanced = () => {
    setStartDate(null);
    setEndDate(null);
    setSortOrder("oldest");
  };

  return (
    <div className="min-h-screen bg-gray-50/60 p-4 sm:p-6 md:p-8 w-full box-border">
      {/* 🟢 CSS OVERRIDES บังคับปลดล็อค inset-inline-start และยึด Padding ขอบซ้าย-ขวา ทั้งหมด */}
      <style>{`
        .ant-select-single .ant-select-selection-item,
        .ant-select-single .ant-select-selection-placeholder,
        .ant-select-single .ant-select-selection-search {
          inset-inline-start: 14px !important;
          left: 14px !important;
          padding-left: 0 !important;
        }
        .ant-select-single .ant-select-selector {
          padding-left: 14px !important;
          padding-right: 36px !important;
        }
        .ant-select-single .ant-select-arrow {
          right: 14px !important;
          inset-inline-end: 14px !important;
        }
        .ant-select-single .ant-select-selection-item > div {
          width: 100%;
        }
        .ant-picker {
          padding-left: 16px !important;
          padding-right: 16px !important;
        }
        .ant-picker {
          padding-left: 10px !important;
          padding-right: 10px !important;
        }
        .ant-picker .ant-picker-input > input {
          font-size: 13px !important;
        }
      `}</style>

      <div className="w-full flex flex-col gap-5">
        
        {/* Header Section */}
        <header className="flex flex-row flex-wrap justify-between items-start md:items-center gap-4 w-full">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 m-0">
              รายการการเคลมสินค้า
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 m-0 mt-1">
              ตรวจสอบและติดตามสถานะรายการเคลมทั้งหมดของคุณ
            </p>
          </div>
          <Button
            type="primary"
            icon={<DownloadOutlined className="text-sm" />}
            className="bg-blue-600 hover:bg-blue-700 border-none rounded-xl h-10 px-5 shadow-xs font-medium inline-flex items-center gap-1.5"
            onClick={handleExportReport}
          >
            ส่งออกรายงาน
          </Button>
        </header>

        {/* 🟢 FILTER AREA */}
        <div className="flex flex-col gap-3 w-full">
          
          {/* Row 1: Search Bar & Main Status Filter */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-8">
              <Input
                placeholder="ค้นหาตามชื่อสินค้า หรือ Claim ID..."
                prefix={<SearchOutlined className="text-gray-400 mr-2 text-sm" />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                allowClear
                className="w-full rounded-xl border-gray-200 bg-white hover:border-blue-500 focus:border-blue-500 text-sm h-10 px-4 shadow-2xs"
              />
            </div>
            <div className="lg:col-span-4">
              <Select
                value={selectedStatus}
                onChange={handleStatusChange}
                className="w-full h-10 text-sm rounded-xl shadow-2xs"
                style={{
                  paddingLeft: '12px',
                  paddingRight: '12px',
                }}
                suffixIcon={
                  <FilterOutlined 
                    className="text-gray-400 text-xs" 
                    style={{ marginRight: '6px' }}
                  />
                }
                labelRender={({ value }) => {
                  const count = value === "ทั้งหมด" ? claims.length : tabCounts[value] ?? 0;
                  return (
                    <div className="flex justify-between items-center w-full px-2">
                      <span className="text-sm font-medium text-slate-700">{`${value}`}</span>
                      <span className="text-xs font-semibold text-blue-600 ml-2">
                        {count}
                      </span>
                    </div>
                  );
                }}
                options={CUSTOMER_FILTER_TABS.map((tab) => {
                  const count = tab === "ทั้งหมด" ? claims.length : tabCounts[tab] ?? 0;
                  return {
                    value: tab,
                    label: (
                      <div className="flex justify-between items-center w-full px-1">
                        <span className="text-sm font-medium text-slate-700">{tab}</span>
                        <span className="text-xs font-semibold text-slate-400 ml-2">
                          {count}
                        </span>
                      </div>
                    ),
                  };
                })}
              />
            </div>
          </div>

          {cardFilter && (
            <div className="flex flex-wrap items-center gap-2 px-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full pl-3 pr-1 py-1 max-w-full">
                <span className="truncate">ตัวกรองจากหน้าแรก: {CARD_FILTER_LABELS[cardFilter]}</span>
                <button
                  type="button"
                  onClick={clearCardFilter}
                  aria-label="ล้างตัวกรองจากหน้าแรก"
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full border-none bg-transparent text-blue-600 hover:bg-blue-100 cursor-pointer shrink-0"
                >
                  <CloseOutlined className="text-[10px]" />
                </button>
              </span>
              <span className="text-xs text-gray-500">{filteredClaims.length} รายการ</span>
            </div>
          )}

          {/* Row 2: Collapsible Toggle Button */}
          <div className="flex flex-wrap justify-between items-center gap-2 px-1 pt-1">
            <button
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-blue-600 transition-colors cursor-pointer border-none bg-transparent p-0 whitespace-nowrap shrink-0"
            >
              <span>ตัวกรองเพิ่มเติม</span>
              {activeAdvancedFilterCount > 0 && (
                <span className="text-xs font-semibold text-blue-600">
                  ({activeAdvancedFilterCount})
                </span>
              )}
              {isAdvancedOpen ? (
                <UpOutlined className="text-[10px] text-slate-500 ml-0.5" />
              ) : (
                <DownOutlined className="text-[10px] text-slate-500 ml-0.5" />
              )}
            </button>

            {activeAdvancedFilterCount > 0 && isAdvancedOpen && (
              <button
                onClick={handleResetAdvanced}
                style={{ color: '#3b82f6' }}
                className="inline-flex items-center gap-1 text-xs font-normal bg-transparent border-none cursor-pointer p-0 whitespace-nowrap ml-auto transition-colors hover:opacity-80"
              >
                <ClearOutlined className="text-xs" style={{ color: '#3b82f6' }} />
                <span style={{ color: '#3b82f6' }}>ล้างตัวกรอง</span>
              </button>
            )}
          </div>

          {/* Row 3: Collapsible Advanced Filter Fields */}
          {isAdvancedOpen && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 pt-1">
              
              {/* Date Range Inputs */}
              <div className="lg:col-span-8 flex flex-col gap-1.5">
                <label className="text-[11px] font-normal text-gray-500 px-1">ช่วงวันที่เคลม:</label>
                <div className="flex gap-2 w-full">
                  <DatePicker
                    placeholder="เริ่มวันไหน"
                    suffixIcon={<CalendarOutlined className="text-gray-400 text-xs" />}
                    format="DD/MM/YYYY"
                    value={startDate}
                    onChange={(date) => setStartDate(date)}
                    disabledDate={(current) => endDate && current && current.isAfter(endDate, "day")}
                    className="w-full rounded-xl border-gray-200 bg-white h-10 text-sm shadow-2xs"
                  />
                  <DatePicker
                    placeholder="ถึงวันไหน"
                    suffixIcon={<CalendarOutlined className="text-gray-400 text-xs" />}
                    format="DD/MM/YYYY"
                    value={endDate}
                    onChange={(date) => setEndDate(date)}
                    disabledDate={(current) => startDate && current && current.isBefore(startDate, "day")}
                    className="w-full rounded-xl border-gray-200 bg-white h-10 text-sm shadow-2xs"
                  />
                </div>
              </div>

              {/* Sort Order */}
              <div className="lg:col-span-4 flex flex-col gap-1.5">
                <label className="text-[11px] font-normal text-gray-500 px-1">เรียงลำดับเวลา:</label>
                <Select
                  value={sortOrder}
                  onChange={(val) => setSortOrder(val)}
                  className="w-full h-10 text-xs rounded-xl shadow-2xs"
                  style={{
                    paddingLeft: '12px',
                    paddingRight: '12px',
                  }}
                  suffixIcon={
                    <DownOutlined 
                      className="text-gray-400 text-[10px]" 
                      style={{ marginRight: '6px' }}
                    />
                  }
                  options={[
                    { value: "oldest", label: "เก่าสุด ➔ ใหม่สุด" },
                    { value: "newest", label: "ใหม่สุด ➔ เก่าสุด" },
                  ]}
                />
              </div>
            </div>
          )}
        </div>

        {/* Claim Cards List */}
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center w-full shadow-xs">
            <Spin size="large" description="กำลังโหลดข้อมูล..." />
          </div>
        ) : filteredClaims.length > 0 ? (
          <div className="flex flex-col gap-3 w-full">
            {filteredClaims.map((claim) => (
              <CustomerClaimCard
                key={claim.claim_id || claim.claim_no}
                claim={{
                  ...claim,
                  current_status: claim.current_status || claim.status,
                  agent_name: claim.agent_name || claim.agent_id || "-",
                  item_name: itemsMap[claim.item_id] || claim.item_name || "ไม่พบข้อมูลสินค้า",
                  created_at_formatted: dayjs(claim.claim_date || claim.created_at).format("DD/MM/YY HH:mm"),
                }}
                onDelete={handleDeleteClaim}
                hideDeleteWhenDisabled={true}
                layout="horizontal"
                itemsMap={itemsMap}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center w-full">
            <Empty description="ไม่พบรายการเคลมสินค้า" />
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerClaimList;