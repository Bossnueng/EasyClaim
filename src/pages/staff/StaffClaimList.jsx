// src/pages/staff/StaffClaimList.jsx

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom"; // 🟢 เพิ่ม useLocation
import { Input, Empty, message, Spin, DatePicker, Button, Select } from "antd";
import { 
  SearchOutlined, 
  DownloadOutlined, 
  CalendarOutlined, 
  FileTextOutlined, 
  FilterOutlined,
  DownOutlined,
  UpOutlined,
  ClearOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import StaffClaimCard from "../../components/StaffClaimCard";
import { FILTER_OPTIONS, CUSTOMER_FILTER_TABS, CUSTOMER_STATUS_GROUPS, getStatusName, getStatusId } from "../../constants/claimStatus";
import claimService from "../../services/claimService";
import deliveryService from "../../services/deliveryService";
import { getDriverAssignments, needsDriverAssignment } from "../../utils/claimFlow";
import { runAutoConfirms } from "../../hooks/useAutoConfirm";
import itemService from "../../services/itemService";
import agentService from "../../services/agentService";
import userService from "../../services/userService";
import loginService from "../../services/loginService";
import { getAgentNameByUserId } from "../../utils/agentHelper";
import { useClaimRealtime, isStatusChangeEvent } from "../../hooks/useClaimRealtime";
import { parseExtraDataFromLogs } from "../../utils/logPaser";

const StaffClaimList = () => {
  const location = useLocation(); // 🟢 อ่านค่า Query parameter
  const searchParams = new URLSearchParams(location.search);
  const cardFilterParam = searchParams.get("filter");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ทั้งหมด");
  const [selectedAgent, setSelectedAgent] = useState("ALL");
  const [claims, setClaims] = useState([]);
  const [sortOrder, setSortOrder] = useState("oldest");
  const [loading, setLoading] = useState(false);
  const [itemsMap, setItemsMap] = useState({});
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [agentsMap, setAgentsMap] = useState({});
  const [usersList, setUsersList] = useState([]);
  const [claimLogsMap, setClaimLogsMap] = useState({});
  const [agentsRawList, setAgentsRawList] = useState([]);

  // State สำหรับเปิด-ปิด ตัวกรองเพิ่มเติม
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  useEffect(() => {
    if (cardFilterParam === "pending") {
      setSelectedStatus("Pending");
    } else if (cardFilterParam === "processing") {
      setSelectedStatus("Processing");
    } else if (cardFilterParam === "delivered") {
      setSelectedStatus("Delivered");
    }
  }, [cardFilterParam]);
  
  const currentUser = loginService.getCurrentUser();
  const userRoleId = Number(currentUser?.role_id);
  const currentUserId = currentUser?.user_id || currentUser?.id;

  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const fetchClaimsAndItems = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const activeUser = currentUserRef.current;
      const [resClaim, resItems, resAgents, resUsers, resLogs, resDeliveries] = await Promise.all([
        claimService.getClaim().catch((err) => {
          console.error("Fetch claims error:", err);
          return { status: false, data: [] };
        }),
        itemService.getItems().catch(() => ({ data: [] })),
        agentService.getAgent().catch(() => ({ data: [] })),
        userService.getUsers().catch(() => ({ data: [] })),
        claimService.getClaimStatusLogs().catch(() => ({ data: [] })),
        deliveryService.getDelivery().catch(() => ({ data: [] })),
      ]);

      const aMap = {};
      const agentsData = Array.isArray(resAgents) ? resAgents : resAgents?.data || [];
      if (Array.isArray(agentsData)) {
        setAgentsRawList(agentsData);
        agentsData.forEach((agent) => {
          const aId = String(agent.agent_id || agent.id || "");
          const aCode = String(agent.agent_code || agent.code || "");
          const name = agent.agent_name || agent.name;
          if (aId) aMap[aId] = name;
          if (aCode) aMap[aCode] = name;
        });
        setAgentsMap(aMap);
      }

      const usersData = resUsers?.data || resUsers || [];
      if (Array.isArray(usersData)) setUsersList(usersData);

      const itemMap = {};
      const masterItems = resItems?.data || resItems || [];
      if (Array.isArray(masterItems)) {
        masterItems.forEach((item) => {
          itemMap[String(item.item_id)] = item.item_name;
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

      const rawClaims = Array.isArray(resClaim?.data)
        ? resClaim.data
        : Array.isArray(resClaim)
        ? resClaim
        : [];

      const userAgentIdentifiers = [];
      if (Array.isArray(activeUser?.agent_ids)) {
        activeUser.agent_ids.forEach((id) => userAgentIdentifiers.push(String(id)));
      } else if (activeUser?.agent_id) {
        userAgentIdentifiers.push(String(activeUser.agent_id));
      }

      if (Array.isArray(agentsData) && userAgentIdentifiers.length > 0) {
        agentsData.forEach((agent) => {
          const aId = String(agent.agent_id || agent.id || "");
          const aCode = String(agent.agent_code || agent.code || "");
          if (userAgentIdentifiers.includes(aId) && aCode) {
            userAgentIdentifiers.push(aCode);
          }
        });
      }

      const allowedClaims = userAgentIdentifiers.length > 0
        ? rawClaims.filter((claim) => {
            const claimAgentIdStr = String(claim.agent_id || "");
            const claimAgentCodeStr = String(claim.agent_code || "");
            return userAgentIdentifiers.includes(claimAgentIdStr) || userAgentIdentifiers.includes(claimAgentCodeStr);
          })
        : rawClaims;

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

      const deliveriesData = Array.isArray(resDeliveries?.data) ? resDeliveries.data : Array.isArray(resDeliveries) ? resDeliveries : [];
      const claimsWithFlags = claimsWithItems.map((claim) => ({
        ...claim,
        needsDriverAssign: needsDriverAssignment(
          getStatusName(claim.current_status || claim.status),
          getDriverAssignments(deliveriesData, claim.claim_id).length > 0
        ),
      }));

      setClaims(claimsWithFlags);

      const allLogs = Array.isArray(logsData) ? logsData : [];
      const staffId = activeUser?.user_id || activeUser?.id;
      claimsWithFlags.slice(0, 200).reduce(async (prev, claim) => {
        const count = await prev;
        if (count >= 20) return count;
        const written = await runAutoConfirms({
          claim,
          logs: allLogs.filter((l) => String(l.claim_id) === String(claim.claim_id)),
          deliveries: deliveriesData,
          statusName: getStatusName(claim.current_status || claim.status),
          updateBy: staffId,
        }).catch(() => 0);
        return count + written;
      }, Promise.resolve(0));
    } catch (error) {
      console.error("fetchClaimsAndItems Error:", error);
      message.error("ไม่สามารถดึงข้อมูลได้: " + (error.message || "เกิดข้อผิดพลาด"));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useClaimRealtime({
    isStaff: true,
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
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchClaimsAndItems]);

  const getAgentNameForClaim = useCallback((claim) => {
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
  }, [agentsMap, usersList]);

  const handleDeleteClaim = async (e, claimId) => {
    if (e) e.stopPropagation();
    try {
      const response = await claimService.delClaim(claimId);
      if (response?.status) {
        message.success("ลบรายการเคลมเรียบร้อยแล้ว");
        setClaims((prev) => prev.filter((item) => item.claim_id !== claimId && item.claim_no !== claimId));
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
        const uId = String(u.user_id || u.id || "");
        const uName = u.full_name || u.fullname || u.name || `${u.first_name || ""} ${u.last_name || ""}`.trim();
        if (uId) userMap[uId] = uName;
      });

      const agentCodeMap = {};
      if (Array.isArray(agentsRawList)) {
        agentsRawList.forEach((ag) => {
          if (!ag) return;
          const aId = String(ag.agent_id || ag.id || "");
          const aCode = ag.agent_code || ag.code || ag.agentCode;
          if (aId && aCode) agentCodeMap[aId] = aCode;
        });
      }

      const headers = [
        "ลำดับ", "เลขที่เอกสารเคลม", "วันที่แจ้งเคลม", "ผู้แจ้งเคลม", "รหัสร้านค้า/Agent Code",
        "ชื่อร้านค้า/Customer Name", "ชื่อสินค้า", "รับจริง (ขวด/กระป๋อง)", "แตกจริง (ขวด/กระป๋อง)",
        "สาเหตุการแตก", "ชื่อ พขร. ที่รับสินค้า", "ทะเบียนรถรับสินค้า", "วันที่ พขร. รับสินค้า",
        "วันที่ คลังสินค้า รับสินค้า", "วันที่ อนุมัติเคลม", "วันที่ จัดส่งสินค้าเคลม", "วันที่ จัดส่งสำเร็จ",
        "ชื่อ พขร. ที่ส่งสินค้า", "ทะเบียนรถส่งสินค้า", "สถานะสินค้า"
      ];

      const csvRows = [headers.join(",")];
      const cleanStr = (val) => (val === null || val === undefined ? '""' : `"${String(val).replace(/"/g, '""').replace(/\n/g, " ")}"`);
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
        const createdByName = userMap[String(claim.created_by || claim.user_id || "")] || "-";
        const claimAgentId = String(claim.agent_id || logData.agent_id || "");
        
        const agentCode = claim.agent_code || claim.agentCode || logData.agent_code || logData.agentCode || agentCodeMap[claimAgentId] || "-";
        const agentName = getAgentNameForClaim(claim) || claim.agent_name || "-";

        const driverName = claim.driver_name || logData.driverName || "-";
        const truckPlate = claim.truck_plate || logData.truckPlate || "-";
        const deliveryDriver = claim.delivery_driver || logData.deliveryDriver || "-";
        const deliveryPlate = claim.delivery_plate || logData.deliveryPlate || "-";

        const claimDate = formatDate(claim.claim_date || claim.created_at);
        const driverReceiveDate = formatDate(claim.driver_receive_date || logData.driverReceiveDate);
        const warehouseReceiveDate = formatDate(claim.warehouse_receive_date || logData.warehouseReceiveDate);
        const approveDate = formatDate(claim.approve_date || logData.approveDate);
        const deliveryDate = formatDate(claim.delivery_date || logData.deliveryDate);
        const receiveFinishDate = formatDate(claim.receive_finish_date || logData.receiveFinishDate);

        const displayStatusName = getStatusName(claim.current_status || claim.status, "staff");
        const claimItemsList = Array.isArray(claim.items) && claim.items.length > 0 ? claim.items : [claim];

        claimItemsList.forEach((item) => {
          const itemIdStr = String(item.item_id || "");
          const itemName = (itemsMap && itemsMap[itemIdStr]) || item.item_name || item.name || (itemIdStr ? `สินค้า ID: ${itemIdStr}` : "-");

          const parsedRemark = safeParseJson(item.itemRemark || item.remark || claim.remark);
          const parsedLogData = safeParseJson(logData);

          const receivedQty = parsedRemark.receivedQty ?? item.receivedQty ?? parsedLogData.receivedQty ?? logData.receivedQty ?? claim.receivedQty ?? item.qty ?? 0;
          const approvedQty = parsedRemark.approvedQty ?? item.approvedQty ?? parsedLogData.approvedQty ?? logData.approvedQty ?? claim.approvedQty ?? item.qtychang ?? 0;

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

    const userMap = {};
    usersList.forEach((u) => {
      const uId = String(u.user_id || u.id || "");
      const uName = u.full_name || u.fullname || u.name || `${u.first_name || ""} ${u.last_name || ""}`.trim();
      if (uId) userMap[uId] = uName;
    });

    const claimMap = {};
    claims.forEach((c) => {
      const cId = String(c.claim_id || c.id || "");
      if (cId) claimMap[cId] = c;
    });

    const headers = ["Log ID", "Claim No", "Status", "Remark", "Update By ID", "Update By Name", "Update Date"];
    const csvRows = [headers.join(",")];
    const cleanStr = (val) => (val === null || val === undefined ? '""' : `"${String(val).replace(/"/g, '""').replace(/\n/g, " ")}"`);

    allLogs.forEach((log) => {
      const updateById = String(log.update_by || log.user_id || "");
      const updateByName = userMap[updateById] || "-";
      const rawStatus = log.status || log.status_id;
      const statusName = getStatusName(rawStatus, "staff");
      const claimIdStr = String(log.claim_id || "");
      const claimNo = log.claim_no || claimMap[claimIdStr]?.claim_no || claimIdStr || "-";

      const row = [
        cleanStr(log.log_id || "-"),
        cleanStr(claimNo),
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

  const tabCounts = claims.reduce((acc, claim) => {
    const rawStatus = claim.current_status || claim.status;
    const nameStatus = getStatusName(rawStatus);

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
      const statusId = String(getStatusId(rawStatus) || rawStatus);
      let matchesStatus = false;

      // 🟢 รองรับการกรองตาม Card เพิ่มเติม
      if (cardFilterParam === "overdue") {
      // เช็กสถานะว่ายังไม่สำเร็จ (ไม่เป็น 10 หรือ Delivered)
      const isNotDelivered = statusId !== "10" && 
                             claimStatusName !== "Delivered" && 
                             claimStatusName !== "จัดส่งสำเร็จ" && 
                             claimStatusName !== "จัดส่งสินค้าเคลมสำเร็จ";
                             
      const createdDate = claim?.created_at || claim?.claim_date || claim?.createdDate;
      
      // 🟢 เปลี่ยนจาก >= 7 เป็น >= 3 วัน
      const isOver3Days = createdDate && dayjs().diff(dayjs(createdDate), "day") >= 3;
      
      matchesStatus = isNotDelivered && isOver3Days;
     } else if (cardFilterParam === "processing" && selectedStatus === "Processing") {
        // ครอบคลุม Approved, Rejected, Processing, Shipping
        matchesStatus = ["6", "7", "8", "9", "Approved", "Rejected", "Processing", "Shipping"].includes(statusId) ||
                        ["6", "7", "8", "9", "Approved", "Rejected", "Processing", "Shipping"].includes(claimStatusName);
      } else if (selectedStatus === "ทั้งหมด") {
        matchesStatus = true;
      } else if (CUSTOMER_STATUS_GROUPS && CUSTOMER_STATUS_GROUPS[selectedStatus]) {
        const allowedStatuses = CUSTOMER_STATUS_GROUPS[selectedStatus] || [];
        matchesStatus = allowedStatuses.includes(rawStatus) || allowedStatuses.includes(claimStatusName);
      } else {
        matchesStatus = claimStatusName === selectedStatus || String(rawStatus) === String(selectedStatus);
      }

      const currentClaimAgentName = getAgentNameForClaim(claim);

      let matchesAgentFilter = true;
      if (selectedAgent !== "ALL") {
        const selectedAgentObj = agentsRawList.find((ag) => {
          const aId = String(ag.agent_id || ag.id || "");
          const aCode = String(ag.agent_code || ag.code || "");
          const aName = ag.agent_name || ag.name || "";
          return selectedAgent === aId || selectedAgent === aCode || selectedAgent === aName;
        });

        const targetAgentId = String(selectedAgentObj?.agent_id || selectedAgentObj?.id || selectedAgent);
        const targetAgentCode = String(selectedAgentObj?.agent_code || selectedAgentObj?.code || "");
        const targetAgentName = String(selectedAgentObj?.agent_name || selectedAgentObj?.name || "").toLowerCase();

        const claimAgentIdStr = String(claim.agent_id || "");
        const claimAgentCodeStr = String(claim.agent_code || "");
        const claimAgentNameStr = String(claim.agent_name || claim.agentName || "").toLowerCase();
        const matchedNameStr = String(currentClaimAgentName || "").toLowerCase();

        matchesAgentFilter =
          (targetAgentId && claimAgentIdStr === targetAgentId) ||
          (targetAgentCode && claimAgentCodeStr === targetAgentCode) ||
          (targetAgentName && (claimAgentNameStr.includes(targetAgentName) || matchedNameStr.includes(targetAgentName)));
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

     return matchesStatus && matchesAgentFilter && (matchesProduct || matchesId || matchesAgent) && matchesDate;
    })
    .sort((a, b) => {
      const dateA = dayjs(a.claim_date || a.created_at || a.createdDate);
      const dateB = dayjs(b.claim_date || b.created_at || b.createdDate);
      const timeA = dateA.isValid() ? dateA.valueOf() : 0;
      const timeB = dateB.isValid() ? dateB.valueOf() : 0;

      return sortOrder === "oldest" ? timeA - timeB : timeB - timeA;
    });

  const filterTabs = CUSTOMER_FILTER_TABS || FILTER_OPTIONS;

  const activeAdvancedFilterCount = [
    selectedAgent !== "ALL",
    startDate !== null,
    endDate !== null,
    sortOrder !== "oldest"
  ].filter(Boolean).length;

  const handleResetAdvanced = () => {
    setSelectedAgent("ALL");
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
              จัดการคำร้องขอเคลม
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 m-0 mt-1">
              ตรวจสอบ กรองข้อมูลการเคลม และบริหารจัดการสถานะประจำวัน
            </p>
          </div>
          <div className="flex gap-2.5 shrink-0">
            {userRoleId === 1 && (
              <Button
                type="default"
                icon={<FileTextOutlined className="text-sm" />}
                className="border-blue-500 text-blue-600 hover:bg-blue-50 rounded-xl h-10 px-4 font-medium shadow-xs inline-flex items-center gap-1.5"
                onClick={handleExportLog}
              >
                ส่งออก Log
              </Button>
            )}
            <Button
              type="primary"
              icon={<DownloadOutlined className="text-sm" />}
              className="bg-blue-600 hover:bg-blue-700 border-none rounded-xl h-10 px-5 shadow-xs font-medium inline-flex items-center gap-1.5"
              onClick={handleExportReport}
            >
              ส่งออกรายงาน
            </Button>
          </div>
        </header>

        {/* 🟢 FILTER AREA */}
        <div className="flex flex-col gap-3 w-full">
          
          {/* Row 1: Search Input & Main Status Select */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-8">
              <Input
                placeholder="ค้นหาด่วน (Claim ID, ชื่อสินค้า, ชื่อ Agent/ร้านค้า)..."
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
                onChange={(val) => setSelectedStatus(val)}
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
                  const count = value === "ทั้งหมด" ? claims.length : tabCounts[value] ?? statusCounts[value] ?? 0;
                  return (
                    <div className="flex justify-between items-center w-full px-2">
                      <span className="text-sm font-medium text-slate-700">{`${value}`}</span>
                      <span className="text-xs font-semibold text-blue-600 ml-2">
                        {count}
                      </span>
                    </div>
                  );
                }}
                options={filterTabs.map((tab) => {
                  const count = tab === "ทั้งหมด" ? claims.length : tabCounts[tab] ?? statusCounts[tab] ?? 0;
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

          {/* Row 3: Advanced Filters Grid */}
          {isAdvancedOpen && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-12 gap-3 pt-1">
              
              {/* Agent Select */}
              <div className="lg:col-span-4 flex flex-col gap-1.5">
                <label className="text-[11px] font-normal text-gray-500 px-1">กรองตามชื่อ Agent / ร้านค้า:</label>
                <Select
                  value={selectedAgent}
                  onChange={(val) => setSelectedAgent(val)}
                  className="w-full h-10 text-sm rounded-xl shadow-2xs"
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
                    { value: "ALL", label: "Agent ทั้งหมด" },
                    ...agentsRawList.map((ag) => {
                      const aId = String(ag.agent_id || ag.id || "");
                      const aCode = String(ag.agent_code || ag.code || "");
                      const aName = ag.agent_name || ag.name || "";
                      return {
                        value: aId || aCode || aName, 
                        label: aName || aCode || `Agent ${aId}`,
                        agentObj: ag,
                      };
                    }),
                  ]}
                />
              </div>

              {/* Date Range Inputs */}
              <div className="lg:col-span-5 flex flex-col gap-1.5">
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

              {/* Sort Order Select */}
              <div className="lg:col-span-3 flex flex-col gap-1.5">
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
            {filteredClaims.map((claim) => {
              const agentName = getAgentNameForClaim(claim);

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
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center w-full">
            <Empty description="ไม่พบรายการเคลมสินค้า" />
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffClaimList;