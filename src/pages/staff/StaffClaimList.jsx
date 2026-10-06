// src/pages/staff/StaffClaimList.jsx
import React, { useState, useEffect } from "react";
import { Input, Empty, message, Spin, DatePicker, Button, Select } from "antd";
import { SearchOutlined, DownloadOutlined, CalendarOutlined, FilterOutlined, FileTextOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import StaffClaimCard from "../../components/StaffClaimCard";
import { STATUS_PRIORITY, FILTER_OPTIONS, CUSTOMER_FILTER_TABS, CUSTOMER_STATUS_GROUPS, getStatusName } from "../../constants/claimStatus";
import claimService from "../../services/claimService";
import itemService from "../../services/itemService";
import agentService from "../../services/agentService";
import userService from "../../services/userService";
import loginService from "../../services/loginService";
import { getAgentNameByUserId } from "../../utils/agentHelper";


const parseDataFromLogs = (logs) => {
  if (!logs || !Array.isArray(logs) || logs.length === 0) return {};
  
  let result = {};
  logs.forEach((log) => {
    if (log && log.remark && log.remark.includes("| DATA:")) {
      try {
        const jsonStr = log.remark.split("| DATA:")[1];
        const parsed = JSON.parse(jsonStr);
        result = { ...result, ...parsed, status_id: log.status || log.status_id };
      } catch (e) {
        console.error("Error parsing log data", e);
      }
    }
  });
  return result;
};

const StaffClaimList = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ทั้งหมด");
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [itemsMap, setItemsMap] = useState({});
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [agentsMap, setAgentsMap] = useState({});
  const [usersList, setUsersList] = useState([]);
  const [claimLogsMap, setClaimLogsMap] = useState({});
  const [agentsRawList, setAgentsRawList] = useState([]);

  useEffect(() => {
    fetchClaimsAndItems();
  }, []);

  const fetchClaimsAndItems = async () => {
    setLoading(true);
    try {
      const [resClaim, resItems, resAgents, resUsers, resLogs] = await Promise.all([
        claimService.getClaim(),
        itemService.getItems(),
        agentService.getAgent(),
        userService.getUsers(),
        claimService.getClaimStatusLogs(),
      ]);

      const aMap = {};
      const agentsData = Array.isArray(resAgents) ? resAgents : resAgents?.data || [];
      if (Array.isArray(agentsData)) {
        setAgentsRawList(agentsData); // เก็บข้อมูล Array ดั้งเดิมเอาไว้ใช้ Map รหัส
        
        agentsData.forEach((agent) => {
          const aId = String(agent.agent_id || agent.id || "");
          const aCode = String(agent.agent_code || agent.code || "");
          const name = agent.agent_name || agent.name;
          
          // เก็บชื่อ และ Object ข้อมูล Agent
          if (aId) aMap[aId] = name;
          if (aCode) aMap[aCode] = name;
        });
        setAgentsMap(aMap);
      }

      const usersData = resUsers?.data || resUsers || [];
      if (Array.isArray(usersData)) {
        setUsersList(usersData);
      }

      const itemMap = {};
      if (resItems && resItems.data) {
        resItems.data.forEach((item) => {
          itemMap[item.item_id] = item.item_name;
        });
        setItemsMap(itemMap);
      }

      const logsData = resLogs?.data || resLogs || [];
      if (Array.isArray(logsData)) {
        const lMap = {};
        logsData.forEach((log) => {
          const cId = String(log.claim_id);
          if (!lMap[cId]) lMap[cId] = [];
          lMap[cId].push(log);
        });
        setClaimLogsMap(lMap);
      }

      const rawClaims = resClaim && resClaim.status ? resClaim.data : [];

      // 2. ดึงข้อมูล User ปัจจุบัน
      const currentUser = loginService.getCurrentUser();
      const userAgentIds = (currentUser?.agent_ids || []).map((id) => String(id));
      const userRoleId = Number(currentUser?.role_id);

      // 3. กรองเฉพาะเคลมที่ agent_id ตรงกับ agent_ids ของ user (ยกเว้น Admin role_id === 1)
      const allowedClaims = (userRoleId === 1 || userAgentIds.length === 0 && userRoleId === 1)
        ? rawClaims
        : rawClaims.filter((claim) => userAgentIds.includes(String(claim.agent_id || "")));

      // ดึงรายละเอียด Item แต่ละรายการเพิ่ม เพื่อให้ Card แสดงผลได้ครบ
      const claimsWithItems = await Promise.all(
        allowedClaims.map(async (claim) => {
          try {
            const itemRes = await claimService.getClaimItems(claim.claim_id);
            const rawItems = Array.isArray(itemRes) ? itemRes : (itemRes?.data || []);
            const itemDetails = rawItems[0] || {};
            
            const totalQty = rawItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

            return {
              ...claim,
              items: rawItems,
              item_id: itemDetails.item_id || claim.item_id,
              qty: rawItems.length > 0 ? totalQty : (claim.qty ?? 0),
              qtychang: itemDetails.qtychang ?? claim.qtychang ?? 0,
              lot_no: itemDetails.lot_no || claim.lot_no || "-",
              remark: itemDetails.remark || claim.remark || "",
            };
          } catch {
            return claim;
          }
        })
      );

      setClaims(claimsWithItems);
    } catch (error) {
      message.error("ไม่สามารถดึงข้อมูลได้: " + (error.message || "เกิดข้อผิดพลาด"));
    } finally {
      setLoading(false);
    }
  };

  const getAgentNameForClaim = (claim) => {
    const creatorUserId = String(claim.user_id || claim.created_by || "");
    const claimAgentId = String(claim.agent_id || "");
    const claimAgentCode = String(claim.agent_code || "");

    const matchedAgentName =
      agentsMap[claimAgentId] ||
      agentsMap[claimAgentCode] ||
      getAgentNameByUserId(creatorUserId, usersList, agentsMap);

    return (matchedAgentName && matchedAgentName !== "-")
      ? matchedAgentName
      : (claim.agent_name || claim.agentName || "-");
  };

  const handleDeleteClaim = async (e, claimId) => {
    if (e) e.stopPropagation();

    try {
      const response = await claimService.delClaim(claimId);
      if (response && response.status) {
        message.success("ลบรายการเคลมเรียบร้อยแล้ว");
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

      // 1. Map ผู้ใช้งานสำหรับหาชื่อผู้แจ้งเคลม (created_by)
      const userMap = {};
      const safeUsersList = Array.isArray(usersList) ? usersList : (usersList?.data || []);
      safeUsersList.forEach((u) => {
        const uId = String(u.user_id || u.id || "");
        const uName = u.full_name || u.fullname || u.name || `${u.first_name || ""} ${u.last_name || ""}`.trim();
        if (uId) userMap[uId] = uName;
      });

      // 2. สร้าง Map สำหรับค้นหา agent_code จาก agentsRawList
      const agentCodeMap = {};
      if (Array.isArray(agentsRawList)) {
        agentsRawList.forEach((ag) => {
          if (!ag) return;
          const aId = String(ag.agent_id || ag.id || "");
          const aCode = ag.agent_code || ag.code || ag.agentCode;
          if (aId && aCode) {
            agentCodeMap[aId] = aCode;
          }
        });
      }

      // กำหนด Headers
      const headers = [
        "ลำดับ",
        "เลขที่เอกสารเคลม",
        "วันที่แจ้งเคลม",
        "ผู้แจ้งเคลม",
        "รหัสร้านค้า/Agent Code",
        "ชื่อร้านค้า/Customer Name",
        "ชื่อสินค้า",
        "รับจริง (ขวด/กระป๋อง)",
        "แตกจริง (ขวด/กระป๋อง)",
        "สาเหตุการแตก",
        "ชื่อ พขร. ที่รับสินค้า",
        "ทะเบียนรถรับสินค้า",
        "วันที่ พขร. รับสินค้า",
        "วันที่ คลังสินค้า รับสินค้า",
        "วันที่ อนุมัติเคลม",
        "วันที่ จัดส่งสินค้าเคลม",
        "วันที่ จัดส่งสำเร็จ",
        "ชื่อ พขร. ที่ส่งสินค้า",
        "ทะเบียนรถส่งสินค้า",
        "สถานะสินค้า",
      ];

      const csvRows = [headers.join(",")];

      const cleanStr = (val) => {
        if (val === null || val === undefined) return '""';
        return `"${String(val).replace(/"/g, '""').replace(/\n/g, " ")}"`;
      };

      const formatDate = (dateVal) => {
        if (!dateVal) return "-";
        const d = dayjs(dateVal);
        return d.isValid() ? d.format("DD/MM/YYYY HH:mm") : "-";
      };

      const safeParseJson = (data) => {
        if (!data) return {};
        if (typeof data === "object") return data;
        if (typeof data === "string" && data.trim().startsWith("{")) {
          try {
            return JSON.parse(data);
          } catch (e) {
            return {};
          }
        }
        return {};
      };

      let rowNum = 1;

      filteredClaims.forEach((claim) => {
        const claimIdStr = String(claim.claim_id || claim.id || "");
        const logs = claimLogsMap ? (claimLogsMap[claimIdStr] || []) : [];
        
        let logData = {};
        if (typeof parseDataFromLogs === "function") {
          try { logData = parseDataFromLogs(logs) || {}; } catch (e) { logData = {}; }
        }

        // ข้อมูลทั่วไปของเคลม
        const claimNo = claim.claim_no || logData.claimNoInput || claim.claim_id || "-";
        const createdByName = userMap[String(claim.created_by || claim.user_id || "")] || "-";

        // ดึง Agent ID และค้นหา Agent Code
        const claimAgentId = String(claim.agent_id || logData.agent_id || "");
        
        const agentCode = 
          claim.agent_code || 
          claim.agentCode ||
          logData.agent_code || 
          logData.agentCode || 
          agentCodeMap[claimAgentId] || 
          "-";

        const agentName = 
          (typeof getAgentNameForClaim === "function" ? getAgentNameForClaim(claim) : null) || 
          claim.agent_name || 
          "-";

        // ข้อมูล พขร. รับ-ส่ง
        const driverName = claim.driver_name || logData.driverName || "-";
        const truckPlate = claim.truck_plate || logData.truckPlate || "-";
        const deliveryDriver = claim.delivery_driver || logData.deliveryDriver || "-";
        const deliveryPlate = claim.delivery_plate || logData.deliveryPlate || "-";

        // ข้อมูลวันที่สถานะ Timeline
        const claimDate = formatDate(claim.claim_date || claim.created_at);
        const driverReceiveDate = formatDate(claim.driver_receive_date || logData.driverReceiveDate);
        const warehouseReceiveDate = formatDate(claim.warehouse_receive_date || logData.warehouseReceiveDate);
        const approveDate = formatDate(claim.approve_date || logData.approveDate);
        const deliveryDate = formatDate(claim.delivery_date || logData.deliveryDate);
        const receiveFinishDate = formatDate(claim.receive_finish_date || logData.receiveFinishDate);

        const displayStatusName = typeof getStatusName === "function" 
          ? getStatusName(claim.current_status || claim.status, "staff")
          : (claim.current_status || claim.status || "-");

        // ตรวจสอบรายการสินค้า
        const claimItemsList = Array.isArray(claim.items) && claim.items.length > 0 
          ? claim.items 
          : [claim];

        claimItemsList.forEach((item) => {
          const itemIdStr = String(item.item_id || "");
          const itemName = (itemsMap && itemsMap[itemIdStr]) || item.item_name || item.name || (itemIdStr ? `สินค้า ID: ${itemIdStr}` : "-");

          const parsedRemark = safeParseJson(item.itemRemark || item.remark || claim.remark);
          const parsedLogData = safeParseJson(logData);

          const receivedQty = 
            parsedRemark.receivedQty ?? 
            item.receivedQty ?? 
            parsedLogData.receivedQty ?? 
            logData.receivedQty ?? 
            claim.receivedQty ?? 
            item.qty ?? 
            0;

          const approvedQty = 
            parsedRemark.approvedQty ?? 
            item.approvedQty ?? 
            parsedLogData.approvedQty ?? 
            logData.approvedQty ?? 
            claim.approvedQty ?? 
            item.qtychang ?? 
            0;

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
            cleanStr(agentCode),
            cleanStr(agentName),
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
      link.setAttribute("download", `Claim_Report_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      message.success("ดาวน์โหลดรายงานเรียบร้อยแล้ว");
    } catch (err) {
      console.error("Export Report Error:", err);
      message.error(`เกิดข้อผิดพลาดขณะส่งออกรายงาน: ${err.message || "โปรดตรวจสอบข้อมูลในระบบ"}`);
    }
  };

  const handleExportLog = () => {
    let allLogs = [];
    Object.keys(claimLogsMap).forEach((cId) => {
      if (Array.isArray(claimLogsMap[cId])) {
        allLogs = allLogs.concat(claimLogsMap[cId]);
      }
    });

    if (allLogs.length === 0) {
      message.warning("ไม่พบข้อมูล Log สำหรับ Export");
      return;
    }

    // 1. สร้าง Map สำหรับแปลง user_id -> Name
    const userMap = {};
    usersList.forEach((u) => {
      const uId = String(u.user_id || u.id || "");
      const uName = u.full_name || u.fullname || u.name || `${u.first_name || ""} ${u.last_name || ""}`.trim();
      if (uId) userMap[uId] = uName;
    });

    // 2. สร้าง Map สำหรับค้นหา claim_no จาก claim_id (ในกรณีที่ log ไม่มี claim_no ติดมา)
    const claimMap = {};
    claims.forEach((c) => {
      const cId = String(c.claim_id || c.id || "");
      if (cId) claimMap[cId] = c;
    });

    // Header Column
    const headers = ["Log ID", "Claim No", "Status", "Remark", "Update By ID", "Update By Name", "Update Date"];
    const csvRows = [headers.join(",")];

    const cleanStr = (val) => {
      if (val === null || val === undefined) return '""';
      return `"${String(val).replace(/"/g, '""').replace(/\n/g, " ")}"`;
    };

    allLogs.forEach((log) => {
      const updateById = String(log.update_by || log.user_id || "");
      const updateByName = userMap[updateById] || "-";

      // ดึงค่า rawStatus แล้วแปลงเป็นชื่อสถานะภาษาไทย
      const rawStatus = log.status || log.status_id;
      const statusName = getStatusName(rawStatus, "staff");

      // ค้นหา claim_no โดยเช็คจาก log -> จากรายการ claims -> fallback ไปใช้ claim_id
      const claimIdStr = String(log.claim_id || "");
      const claimNo = log.claim_no || claimMap[claimIdStr]?.claim_no || claimIdStr || "-";

      const row = [
        cleanStr(log.log_id || "-"),
        cleanStr(claimNo), // แสดง เลขที่ใบเคลม (เช่น CLM-20261006200912)
        cleanStr(statusName),
        cleanStr(log.remark || "-"),
        cleanStr(updateById || "-"),
        cleanStr(updateByName),
        cleanStr(log.update_date ? dayjs(log.update_date).format("YYYY-MM-DD HH:mm:ss") : "-"),
      ];
      csvRows.push(row.join(","));
    });

    const dateStr = dayjs().format("YYYYMMDD_HHmmss");
    const csvContent = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Claim_Logs_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    message.success("ดาวน์โหลด Export Log เรียบร้อยแล้ว");
  };

  const currentUser = loginService.getCurrentUser();
  const userRoleId = Number(currentUser?.role_id);

  const tabCounts = claims.reduce((acc, claim) => {
    const rawStatus = claim.current_status || claim.status;
    const status = getStatusName(rawStatus);
    if (CUSTOMER_STATUS_GROUPS) {
      Object.keys(CUSTOMER_STATUS_GROUPS).forEach((tabName) => {
        if (CUSTOMER_STATUS_GROUPS[tabName].includes(rawStatus) || CUSTOMER_STATUS_GROUPS[tabName].includes(status)) {
          acc[tabName] = (acc[tabName] || 0) + 1;
        }
      });
    }
    return acc;
  }, {});

  const statusCounts = claims.reduce((acc, claim) => {
    const rawStatus = claim.current_status || claim.status;
    const status = getStatusName(rawStatus);
    if (status) {
      acc[status] = (acc[status] || 0) + 1;
    }
    return acc;
  }, {});

  const filteredClaims = claims
    .filter((claim) => {
      const rawStatus = claim.current_status || claim.status;
      const claimStatusName = getStatusName(rawStatus);
      let matchesStatus = false;

      if (selectedStatus === "ทั้งหมด") {
        matchesStatus = true;
      } else if (CUSTOMER_STATUS_GROUPS && CUSTOMER_STATUS_GROUPS[selectedStatus]) {
        const allowedStatuses = CUSTOMER_STATUS_GROUPS[selectedStatus] || [];
        matchesStatus = allowedStatuses.includes(rawStatus) || allowedStatuses.includes(claimStatusName);
      } else {
        matchesStatus = claimStatusName === selectedStatus || String(rawStatus) === String(selectedStatus);
      }

      const searchLower = searchTerm.toLowerCase();
      const itemName = itemsMap[claim.item_id] || claim.item_name || "";
      const agentName = getAgentNameForClaim(claim);

      const matchesProduct = itemName.toString().toLowerCase().includes(searchLower);
      const matchesId = (claim.claim_no || claim.claim_id || "")
        .toString()
        .toLowerCase()
        .includes(searchLower);
      const matchesAgent = agentName.toString().toLowerCase().includes(searchLower);

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

      return matchesStatus && (matchesProduct || matchesId || matchesAgent) && matchesDate;
    })
    .sort((a, b) => {
      const statusA = getStatusName(a.current_status || a.status);
      const statusB = getStatusName(b.current_status || b.status);
      const priorityA = STATUS_PRIORITY[statusA] || 99;
      const priorityB = STATUS_PRIORITY[statusB] || 99;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      const dateA = dayjs(a.claim_date || a.created_at || a.createdDate);
      const dateB = dayjs(b.claim_date || b.created_at || b.createdDate);
      return dateB.valueOf() - dateA.valueOf();
    });

  const filterTabs = CUSTOMER_FILTER_TABS || FILTER_OPTIONS;

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
              ตรวจสอบและติดตามสถานะรายการเคลมทั้งหมดในระบบ
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {userRoleId === 1 && (
              <Button
                type="default"
                size="small"
                style={{ paddingLeft: "16px", paddingRight: "16px" }}
                className="border-blue-500 text-blue-600 hover:text-blue-700 hover:border-blue-600 rounded-xl h-9 sm:h-10 shadow-sm flex items-center justify-center px-0 sm:px-5"
                onClick={handleExportLog}
              >
                <FileTextOutlined className="text-sm" />
                <span className="hidden sm:inline text-xs sm:text-sm font-medium ml-0 sm:ml-2">Export Log</span>
              </Button>
            )}
            <Button
              type="primary"
              size="small"
              style={{ paddingLeft: "16px", paddingRight: "16px" }}
              className="bg-emerald-600 hover:bg-emerald-700 border-none rounded-xl h-9 sm:h-10 shadow-sm flex items-center justify-center px-0 sm:px-5"
              onClick={handleExportReport}
            >
              <DownloadOutlined className="text-sm" />
              <span className="hidden sm:inline text-xs sm:text-sm font-medium ml-0 sm:ml-2">Report</span>
            </Button>
          </div>
        </header>

        {/* Filter Section */}
        <div className="flex flex-col lg:flex-row gap-2 w-full">
          <div className="flex-1 min-w-0">
            <Input
              placeholder="ค้นหาตามชื่อสินค้า, Claim ID หรือชื่อ Agent..."
              prefix={<SearchOutlined className="text-gray-400 mr-1 text-xs sm:text-sm" />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
              className="w-full rounded-lg border-gray-200 bg-white hover:border-emerald-500 focus:border-emerald-500 text-xs sm:text-sm h-9 sm:h-10 shadow-sm px-3"
            />
          </div>

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
                    : tabCounts[value] ?? statusCounts[value] ?? 0;
                return (
                  <div className="flex justify-between items-center w-full pr-1">
                    <span className="text-xs font-medium text-slate-700" style={{ paddingLeft: "4px" }}>
                      {value}
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full ml-1">
                      {count} รายการ
                    </span>
                  </div>
                );
              }}
              options={filterTabs.map((tab) => {
                const count =
                  tab === "ทั้งหมด"
                    ? claims.length
                    : tabCounts[tab] ?? statusCounts[tab] ?? 0;
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

{filteredClaims.map((claim) => {
  const agentName = getAgentNameForClaim(claim);

  // ฟังก์ชันดึงชื่อสินค้าทั้งหมดและเชื่อมด้วยเครื่องหมาย "+"
  const getDisplayProductName = () => {
    if (Array.isArray(claim.items) && claim.items.length > 0) {
      const names = claim.items
        .map((i) => {
          const idStr = String(i.item_id || "");
          return itemsMap[idStr] || i.item_name || i.name || (idStr ? `สินค้า ID: ${idStr}` : "");
        })
        .filter(Boolean);

      if (names.length > 0) return names.join(" + ");
    }

    const singleIdStr = String(claim.item_id || "");
    return (
      itemsMap[singleIdStr] ||
      claim.item_name ||
      (singleIdStr ? `สินค้า ID: ${singleIdStr}` : "ไม่พบข้อมูลสินค้า")
    );
  };

  return (
    <StaffClaimCard
      key={claim.claim_id || claim.claim_no}
      claim={{
        ...claim,
        current_status: getStatusName(claim.current_status || claim.status, "staff"),
        status: getStatusName(claim.status || claim.current_status, "staff"),
        item_name: getDisplayProductName(),
        agent_name: agentName,
      }}
      onDelete={handleDeleteClaim}
      hideDeleteWhenDisabled={true}
      layout="horizontal"
    />
  );
})}
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

export default StaffClaimList;