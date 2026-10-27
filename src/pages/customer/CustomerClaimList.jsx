// src/pages/customer/CustomerClaimList.jsx

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Input, Empty, message, DatePicker, Button, Spin, Select } from "antd";
import { SearchOutlined, DownloadOutlined, CalendarOutlined, FilterOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import CustomerClaimCard from "../../components/CustomerClaimCard";
import { 
  CUSTOMER_FILTER_TABS, 
  CUSTOMER_STATUS_GROUPS,
  getStatusName 
} from "../../constants/claimStatus";
import claimService from "../../services/claimService";
import loginService from "../../services/loginService";
import itemService from "../../services/itemService";
import userService from "../../services/userService";
import agentService from "../../services/agentService";
import { useClaimRealtime } from "../../hooks/useClaimRealtime";
import { parseExtraDataFromLogs } from "../../utils/logPaser";

const CustomerClaimList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ทั้งหมด");
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [itemsMap, setItemsMap] = useState({});
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [claimLogsMap, setClaimLogsMap] = useState({});
  const [sortOrder, setSortOrder] = useState("oldest");

  const user = loginService.getCurrentUser();
  const role = user?.role || user?.user_type;
  const currentUserId = user?.user_id || user?.id;

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const fetchClaimsAndItems = useCallback(async (showLoading = true) => {
    const activeUser = userRef.current;
    const activeRole = activeUser?.role || activeUser?.user_type;
    const activeUserId = activeUser?.user_id || activeUser?.id;

    if (activeRole === "staff" || activeRole === "admin") {
      navigate("/staff", { replace: true });
      return;
    }

    if (showLoading) setLoading(true);
    try {
      const [resClaim, resItems, resUsers, resLogs, resAgents] = await Promise.all([
        claimService.getClaim().catch(() => ({ data: [] })),
        itemService.getItems().catch(() => ({ data: [] })),
        userService.getUsers().catch(() => []),
        claimService.getClaimStatusLogs().catch(() => []),
        agentService.getAgent().catch(() => []),
      ]);

      const usersData = resUsers?.data || resUsers || [];
      if (Array.isArray(usersData)) {
        setUsersList(usersData);
      }

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
          map[String(item.item_id)] = item.item_name;
        });
        setItemsMap(map);
      }

      const userAgentIdentifiers = [];
      if (Array.isArray(activeUser?.agent_ids)) {
        activeUser.agent_ids.forEach((id) => userAgentIdentifiers.push(String(id)));
      }
      if (activeUser?.agent_id) {
        userAgentIdentifiers.push(String(activeUser.agent_id));
      }

      const agentsData = Array.isArray(resAgents) ? resAgents : resAgents?.data || [];
      if (Array.isArray(agentsData)) {
        agentsData.forEach((agent) => {
          const aId = String(agent.agent_id || agent.id || "");
          const aCode = String(agent.agent_code || agent.code || "");
          if (userAgentIdentifiers.includes(aId) && aCode) {
            userAgentIdentifiers.push(aCode);
          }
        });
      }

      const rawClaims = resClaim?.data || (Array.isArray(resClaim) ? resClaim : []);
      const allowedClaims = rawClaims.filter((claim) => {
        const claimAgentIdStr = String(claim.agent_id || "");
        const claimAgentCodeStr = String(claim.agent_code || "");
        const claimCreatedByStr = String(claim.created_by || claim.user_id || "");

        const isAgentMatch =
          userAgentIdentifiers.length > 0 &&
          (userAgentIdentifiers.includes(claimAgentIdStr) || userAgentIdentifiers.includes(claimAgentCodeStr));
        const isUserMatch = activeUserId && claimCreatedByStr === activeUserId;

        return isAgentMatch || isUserMatch;
      });

      const claimsWithItems = await Promise.all(
        allowedClaims.map(async (claim) => {
          try {
            const resItems = await claimService.getClaimItems(claim.claim_id);
            const rawItems = Array.isArray(resItems) ? resItems : resItems?.data || [];
            if (rawItems.length > 0) {
              const firstItem = rawItems[0];
              return {
                ...claim,
                item_id: firstItem.item_id,
                qty: firstItem.qty,
                remark: firstItem.remark,
                lot_no: firstItem.lot_no,
                items: rawItems,
              };
            }
          } catch (err) {
            console.error(`Error fetching items for claim ${claim.claim_id}`, err);
          }
          return claim;
        })
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
    onCreated: () => fetchClaimsAndItems(false),
    onStatusUpdated: () => fetchClaimsAndItems(false),
  });

  useEffect(() => {
    fetchClaimsAndItems(true);
    const interval = setInterval(() => {
      fetchClaimsAndItems(false);
    }, 5000);
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

        const driverName = claim.driver_name || claim.driverName || claim.pickup_driver_name || logData.driver_name || logData.driverName || logData.pickupDriverName || "-";
        const truckPlate = claim.truck_plate || claim.truckPlate || claim.license_plate || claim.licensePlate || logData.truck_plate || logData.truckPlate || logData.licensePlate || "-";
        const deliveryDriver = claim.delivery_driver || claim.deliveryDriver || claim.shipping_driver_name || logData.delivery_driver || logData.deliveryDriver || "-";
        const deliveryPlate = claim.delivery_plate || claim.deliveryPlate || claim.shipping_license_plate || logData.delivery_plate || logData.deliveryPlate || "-";

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
      const dateA = dayjs(a.claim_date || a.created_at);
      const dateB = dayjs(b.claim_date || b.created_at);
      const timeA = dateA.isValid() ? dateA.valueOf() : 0;
      const timeB = dateB.isValid() ? dateB.valueOf() : 0;

      return sortOrder === "oldest" ? timeA - timeB : timeB - timeA;
    });

  return (
    <div className="min-h-screen bg-gray-50/50 p-2.5 sm:p-4 md:p-6 w-full max-w-full overflow-hidden box-border">
      <div className="w-full flex flex-col gap-4 sm:gap-6">
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

        <div className="flex flex-col lg:flex-row gap-2 w-full">
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

          <div className="sm:col-span-1 lg:col-span-3">
            <Select
              value={sortOrder}
              onChange={(val) => setSortOrder(val)}
              className="w-full h-9 sm:h-10 shadow-sm rounded-lg text-xs"
              options={[
                { value: "oldest", label: "🕒 เก่าสุด ➔ ใหม่สุด" },
                { value: "newest", label: "🆕 ใหม่สุด ➔ เก่าสุด" },
              ]}
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
                const count = value === "ทั้งหมด" ? claims.length : tabCounts[value] ?? 0;
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
              options={CUSTOMER_FILTER_TABS.map((tab) => {
                const count = tab === "ทั้งหมด" ? claims.length : tabCounts[tab] ?? 0;
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

        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center w-full shadow-sm">
            <Spin size="large" description="กำลังโหลดข้อมูล..." />
          </div>
        ) : filteredClaims.length > 0 ? (
          <div className="flex flex-col gap-2.5 sm:gap-3 w-full">
            {filteredClaims.map((claim) => {
              const getDisplayProductName = () => {
                if (Array.isArray(claim.items) && claim.items.length > 0) {
                  return claim.items
                    .map((i) => itemsMap[i.item_id] || i.item_name || i.name || `สินค้า ID: ${i.item_id}`)
                    .join(" + ");
                }
                return (
                  itemsMap[claim.item_id] ||
                  claim.item_name ||
                  (claim.item_id ? `สินค้า ID: ${claim.item_id}` : "ไม่พบข้อมูลสินค้า")
                );
              };

              return (
                <CustomerClaimCard
                  key={claim.claim_id || claim.claim_no}
                  claim={{
                    ...claim,
                    current_status: claim.current_status || claim.status,
                    agent_name: claim.agent_name || claim.agent_id || "-",
                    item_name: getDisplayProductName(),
                    created_at_formatted: dayjs(claim.claim_date || claim.created_at).format("DD/MM/YY HH:mm"),
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

export default CustomerClaimList;