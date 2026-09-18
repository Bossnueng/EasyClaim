import React, { useState, useEffect } from "react";
import { Input, Empty, message, Spin, DatePicker, Button, Select } from "antd";
import { SearchOutlined, DownloadOutlined, CalendarOutlined, FilterOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import StaffClaimCard from "../../components/StaffClaimCard";
import { STATUS_PRIORITY, FILTER_OPTIONS, CUSTOMER_FILTER_TABS, CUSTOMER_STATUS_GROUPS, getStatusName } from "../../constants/claimStatus";
import claimService from "../../services/claimService";
import itemService from "../../services/itemService";
import agentService from "../../services/agentService";
import userService from "../../services/userService";
import { getAgentNameByUserId } from "../../utils/agentHelper";

// 🔹 เพิ่ม Helper Function สำหรับแกะ DATA จาก remark ของ claimLogs
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
        agentsData.forEach((agent) => {
          const aId = String(agent.agent_id || agent.id || "");
          const aCode = String(agent.agent_code || "");
          const name = agent.agent_name || agent.name;
          if (aId) aMap[aId] = name;
          if (aCode) aMap[aCode] = name;
        });
        setAgentsMap(aMap);
      }

      const usersData = resUsers?.data || resUsers || [];
      if (Array.isArray(usersData)) {
        setUsersList(usersData);
      }

      if (resItems && resItems.data) {
        const map = {};
        resItems.data.forEach((item) => {
          map[item.item_id] = item.item_name;
        });
        setItemsMap(map);
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

      if (resClaim && resClaim.status) {
        setClaims(resClaim.data);
      }
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
    if (filteredClaims.length === 0) {
      message.warning("ไม่พบข้อมูลรายการเคลมสำหรับออกรายงาน");
      return;
    }

    let dateStr = "All_Time";
    if (startDate && endDate) {
      dateStr = `${dayjs(startDate).format("YYYYMMDD")}_to_${dayjs(endDate).format("YYYYMMDD")}`;
    }

    const headers = [
      "No",
      "คลังสินค้า",
      "Date",
      "เล่มที่",
      "เลขที่",
      "ชื่อ พขร. ที่รับสินค้า",
      "ทะเบียนรถ",
      "Customer_Category",
      "Customer_Name",
      "Item_Category",
      "Item_Describtion",
      "รับคืน (ขวด/กระป๋อง)",
      "แตก (ขวด/กระป๋อง)",
      "Category_Damage",
      "สาเหตุการแตก",
      "ส่วนงาน Case Pick กรอกวันที่เปลี่ยนสินค้า",
      "ส่วนงาน Case Pick กรอกเวลาเปลี่ยนสินค้า",
      "เลขที่ใบส่งของ",
      "วันที่ส่งคืนร้านค้า",
      "ชื่อ พขร. ที่นำสินค้าแตกส่งคืน",
      "ทะเบียนรถ2",
      "วันที่ส่งถึงลูกค้า",
      "สถานะสินค้า",
      "มูลค่า (บาท)"
    ];

    const csvRows = [headers.join(",")];

    const cleanStr = (val) => {
      if (val === null || val === undefined) return '""';
      return `"${String(val).replace(/"/g, '""').replace(/\n/g, " ")}"`;
    };

    filteredClaims.forEach((claim, index) => {
      const claimIdStr = String(claim.claim_id || claim.id || "");
      const logs = claimLogsMap[claimIdStr] || [];
      const logData = parseDataFromLogs(logs);

      const itemName = itemsMap[claim.item_id] || claim.item_name || "-";
      const agentName = getAgentNameForClaim(claim);

      const driverName = claim.driver_name || logData.driverName || "-";
      const truckPlate = claim.truck_plate || logData.truckPlate || "-";

      const deliveryDriver = claim.delivery_driver || logData.deliveryDriver || "-";
      const deliveryPlate = claim.delivery_plate || logData.deliveryPlate || "-";

      const withdrawVal = claim.withdraw_date || logData.withdrawDate;
      const withdrawDateTime = withdrawVal ? dayjs(withdrawVal) : null;
      const changeDate = withdrawDateTime && withdrawDateTime.isValid() ? withdrawDateTime.format("DD/MM/YYYY") : "-";
      const changeTime = withdrawDateTime && withdrawDateTime.isValid() ? withdrawDateTime.format("HH:mm") : "-";

      // 🔹 แปลงตัวเลขสถานะเป็นชื่อภาษาไทยที่อ่านง่ายด้วย getStatusName
      const displayStatusName = getStatusName(claim.current_status || claim.status, "staff");

      const row = [
        cleanStr(index + 1),                                                              // No
        cleanStr(claim.warehouse_name || claim.warehouse || "ศูนย์กระจายสินค้าภูมิภาค ขอนแก่น"), // คลังสินค้า
        cleanStr(claim.claim_date ? dayjs(claim.claim_date).format("M/D/YYYY") : "-"),    // Date
        cleanStr(claim.book_no || "-"),                                                  // เล่มที่
        cleanStr(claim.claim_no || logData.claimNoInput || claim.claim_id || "-"),        // เลขที่
        cleanStr(driverName),                                                             // ชื่อ พขร. ที่รับสินค้า (จาก Log)
        cleanStr(truckPlate),                                                             // ทะเบียนรถ (จาก Log)
        cleanStr(claim.customer_category || "CV เมือง 1 จ.ขอนแก่น"),                     // Customer_Category
        cleanStr(agentName),                                                             // Customer_Name
        cleanStr(claim.item_category || "GBeer"),                                        // Item_Category
        cleanStr(itemName),                                                              // Item_Describtion
        cleanStr(claim.returned_qty ?? logData.returnedQty ?? claim.qty ?? 0),           // รับคืน (ขวด/กระป๋อง)
        cleanStr(claim.approved_qty ?? logData.approvedQty ?? claim.qty ?? 0),           // แตก (ขวด/กระป๋อง)
        cleanStr(claim.category_damage || "AGENT"),                                      // Category_Damage
        cleanStr(claim.remark || claim.claim_reason || "-"),                             // สาเหตุการแตก
        cleanStr(changeDate),                                                            // ส่วนงาน Case Pick กรอกวันที่เปลี่ยนสินค้า
        cleanStr(changeTime),                                                            // ส่วนงาน Case Pick กรอกเวลาเปลี่ยนสินค้า
        cleanStr(claim.delivery_no || "-"),                                              // เลขที่ใบส่งของ
        cleanStr(claim.delivery_date ? dayjs(claim.delivery_date).format("DD/MM/YYYY") : "-"), // วันที่ส่งคืนร้านค้า
        cleanStr(deliveryDriver),                                                        // ชื่อ พขร. ที่นำสินค้าแตกส่งคืน
        cleanStr(deliveryPlate),                                                         // ทะเบียนรถ2
        cleanStr(claim.estimated_delivery_date || logData.estimatedDeliveryDate ? dayjs(claim.estimated_delivery_date || logData.estimatedDeliveryDate).format("DD/MM/YYYY") : "-"), // วันที่ส่งถึงลูกค้า
        cleanStr(displayStatusName),                                                     // สถานะสินค้า (เปลี่ยนตัวเลขเป็นภาษาไทยแล้ว)
        cleanStr(claim.amount || claim.price || 0)                                       // มูลค่า (บาท)
      ];

      csvRows.push(row.join(","));
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
  };

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
          <Button
            type="primary"
            size="small"
            style={{ paddingLeft: "16px", paddingRight: "16px" }}
            className="bg-emerald-600 hover:bg-emerald-700 border-none rounded-xl shrink-0 h-9 sm:h-10 shadow-sm flex items-center justify-center px-0 sm:px-5"
            onClick={handleExportReport}
          >
            <DownloadOutlined className="text-sm" />
            <span className="hidden sm:inline text-xs sm:text-sm font-medium ml-0 sm:ml-2">Report</span>
          </Button>
        </header>

        {/* Filter Section */}
        <div className="flex flex-col lg:flex-row gap-2 w-full">
          {/* ช่องค้นหา */}
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
                    : tabCounts[value] ?? statusCounts[value] ?? 0;
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

              return (
                <StaffClaimCard
                  key={claim.claim_id || claim.claim_no}
                  claim={{
                    ...claim,
                    // 🔹 แปลงค่าสถานะของรายการแต่ละตัวเป็นชื่อภาษาไทยที่อ่านง่ายก่อนส่งให้ Card
                    current_status: getStatusName(claim.current_status || claim.status, "staff"),
                    status: getStatusName(claim.status || claim.current_status, "staff"),
                    item_name:
                      itemsMap[claim.item_id] ||
                      claim.item_name ||
                      `สินค้า ID: ${claim.item_id}`,
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