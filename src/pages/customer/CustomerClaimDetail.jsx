// src/pages/customer/CustomerClaimDetail.jsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  Descriptions,
  Button,
  Steps,
  ConfigProvider,
  Spin,
  message,
  Alert,
  Table,
  Modal,
  Popconfirm,
  Input,
} from "antd";
import {
  ArrowLeftOutlined,
  PrinterOutlined,
  EllipsisOutlined,
  UserOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";

import { useClaimRealtime } from "../../hooks/useClaimRealtime";
import ClaimStatusTag from "../../components/ClaimStatusTag";
import ClaimPrintModal from "../../components/ClaimPrintModal";
import ClaimTimeline from "../../components/claim/ClaimTimeline";
import { STATUS_PRIORITY, getStatusName, getStatusId } from "../../constants/claimStatus";
import claimService from "../../services/claimService";
import loginService from "../../services/loginService";
import itemService from "../../services/itemService";
import userService from "../../services/userService";
import agentService from "../../services/agentService";
import { parseDateSafely } from "../../utils/dateUtils";
import { parseExtraDataFromLogs, getRejectReasonText } from "../../utils/logPaser";

function convertstatusClaim(staus) {
  switch (String(staus)) {
    case "5":
      return "Pending";
    case "6":
      return "Approved";
    case "7":
      return "Rejected";
    case "8":
      return "Processing";
    case "9":
      return "Shipping";
    case "10":
      return "Delivered";
    default:
      return staus;
  }
}

const formatDate = (date) => {
  const parsed = parseDateSafely(date);
  if (!parsed) return "-";

  return (
    <div className="flex flex-col text-[10px] leading-tight text-slate-500 font-mono">
      <span>{parsed.format("DD/MM/YYYY")}</span>
      <span className="text-[9px] text-slate-400">{parsed.format("HH:mm")}</span>
    </div>
  );
};

const CustomerClaimDetail = () => {
  const navigate = useNavigate();
  const { claimId } = useParams();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [claimItems, setClaimItems] = useState([]);
  const [statusLogs, setStatusLogs] = useState([]);
  const [approveLogs, setApproveLogs] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [agentsMap, setAgentsMap] = useState({});
  const [, setUsersList] = useState([]);
  const [allImages, setAllImages] = useState([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // State ตรวจสอบว่าลูกค้ายืนยันแล้วหรือยัง
  const [hasConfirmedSubmit, setHasConfirmedSubmit] = useState(false);
  const [hasConfirmedDelivery, setHasConfirmedDelivery] = useState(false);

  // Private Comments
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  const user = loginService.getCurrentUser();

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const isExecutingAutoStampRef = useRef(false);

  // 🟢 ฟังก์ชันสำหรับลูกค้ายืนยันส่งเคลม (Pending)
  const handleConfirmClaimSubmit = async (remarkText = "ลูกค้ากดยืนยันการส่งเคลมสินค้าเรียบร้อยแล้ว", isAuto = false) => {
    try {
      const userId = user?.user_id || user?.id || "";
      await claimService.createClaimStatusLogs({
        claim_id: String(data.claim_id),
        status: "5",
        remark: remarkText,
        update_by: String(userId),
      });
      setHasConfirmedSubmit(true);
      if (!isAuto) message.success("ยืนยันการส่งเคลมเรียบร้อยแล้ว");
      fetchClaimDetail(false);
    } catch (err) {
      if (!isAuto) message.error("เกิดข้อผิดพลาดในการยืนยันรายการ");
    }
  };

  // 🟢 ฟังก์ชันสำหรับลูกค้ายืนยันรับสินค้า (Delivered)
  const handleConfirmDelivery = async (remarkText = "ลูกค้ายืนยันรับสินค้าเรียบร้อยแล้ว", isAuto = false) => {
    try {
      const userId = user?.user_id || user?.id || "";
      await claimService.createClaimStatusLogs({
        claim_id: String(data.claim_id),
        status: "10",
        remark: remarkText,
        update_by: String(userId),
      });
      setHasConfirmedDelivery(true);
      if (!isAuto) message.success("ยืนยันการรับสินค้าเรียบร้อยแล้ว");
      fetchClaimDetail(false);
    } catch (err) {
      if (!isAuto) message.error("เกิดข้อผิดพลาดในการบันทึกยืนยันรับสินค้า");
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    const messageToSend = newMessage.trim();
    setSendingMsg(true);
    try {
      const userId = String(user?.user_id || user?.id || "");
      const realClaimId = data.claim_id;
      const formattedRemark = `[MSG] [CUSTOMER] ${messageToSend}`;

      const rawStatusVal = data?.current_status || "1";
      const targetStatusId = Number(getStatusId(rawStatusVal)) || 1;

      await claimService.createClaimStatusLogs({
        claim_id: String(realClaimId),
        status: String(targetStatusId),
        remark: formattedRemark,
        update_by: userId,
        user_id: userId,
      });

      setNewMessage("");
      message.success("ส่งข้อความเรียบร้อยแล้ว");
      await fetchClaimDetail(false);
    } catch (err) {
      message.error("ส่งข้อความไม่สำเร็จ: " + (err.message || "เกิดข้อผิดพลาด"));
    } finally {
      setSendingMsg(false);
    }
  };

  const fetchClaimDetail = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      try {
        const [resClaim, resMasterItems, resLogs, resApproves, resUsers, resAgents] = await Promise.all([
          claimService.getClaim().catch(() => ({ data: [] })),
          itemService.getItems().catch(() => ({ data: [] })),
          claimService.getClaimStatusLogs().catch(() => ({ data: [] })),
          claimService.getclaimapproves().catch(() => ({ data: [] })),
          userService.getUsers().catch(() => ({ data: [] })),
          agentService.getAgent().catch(() => ({ data: [] })),
        ]);

        const masterItemsMap = {};
        const masterItemsData = Array.isArray(resMasterItems?.data)
          ? resMasterItems.data
          : Array.isArray(resMasterItems)
          ? resMasterItems
          : [];
        masterItemsData.forEach((item) => {
          const code = item.item_code || "";
          const name = item.item_name || "";
          const fullName = code && name ? `${code} - ${name}` : name || code;

          if (item.item_id) masterItemsMap[String(item.item_id)] = { code, name, fullName };
          if (code) masterItemsMap[String(code)] = { code, name, fullName };
        });

        const aMap = {};
        const agentsData = Array.isArray(resAgents) ? resAgents : resAgents?.data || [];
        if (Array.isArray(agentsData)) {
          agentsData.forEach((agent) => {
            const aId = String(agent.agent_id || agent.id);
            const aCode = String(agent.agent_code || "");
            if (aId) aMap[aId] = agent.agent_name || agent.name;
            if (aCode) aMap[aCode] = agent.agent_name || agent.name;
          });
          setAgentsMap(aMap);
        }

        const usersData = resUsers?.data || resUsers || [];
        const uMap = {};
        if (Array.isArray(usersData)) {
          setUsersList(usersData);
          usersData.forEach((u) => {
            const uId = String(u.user_id || u.id);
            const name = u.full_name || u.fullname || u.name || `${u.first_name || ""} ${u.last_name || ""}`.trim();
            uMap[uId] = name || `User ID: ${uId}`;
          });
          setUsersMap(uMap);
        }

        const rawClaims = Array.isArray(resClaim?.data)
          ? resClaim.data
          : Array.isArray(resClaim)
          ? resClaim
          : [];

        if (rawClaims.length > 0) {
          const targetId = String(claimId || "").trim();

          const currentClaim = rawClaims.find((item) => {
            const itemClaimId = String(item.claim_id || "").trim();
            const itemClaimNo = String(item.claim_no || "").trim();
            return itemClaimId === targetId || itemClaimNo === targetId;
          });

          if (currentClaim) {
            const logsData = resLogs?.data || resLogs || [];
            const filteredLogs = Array.isArray(logsData)
              ? logsData.filter((log) => String(log.claim_id) === String(currentClaim.claim_id))
              : [];
            setStatusLogs(filteredLogs);

            const extraLogData = parseExtraDataFromLogs(filteredLogs) || {};

            let rawImages = [];
            const currentHost = window.location.hostname;
            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || `http://${currentHost}:5001`;

            try {
              const resImages = await claimService.getClaimImages(currentClaim.claim_id);
              if (resImages?.data && Array.isArray(resImages.data)) {
                rawImages = resImages.data.map((img) => {
                  let formattedUrl = img.image_url || "";
                  if (formattedUrl) {
                    formattedUrl = formattedUrl.replace("localhost", currentHost);
                  } else if (img.image_path) {
                    let path = img.image_path.startsWith("/") ? img.image_path : `/${img.image_path}`;
                    if (!path.startsWith("/uploads")) {
                      path = `/uploads/claims${path}`;
                    }
                    formattedUrl = `${apiBaseUrl}${path}`;
                  }

                  return { ...img, formattedUrl };
                });
              }
            } catch (imgErr) {
              console.error("ดึงรูปภาพไม่สำเร็จ:", imgErr);
            }
            setAllImages(rawImages);

            let itemsList = [];
            try {
              const resClaimItems = await claimService.getClaimItems(currentClaim.claim_id);
              if (resClaimItems?.data && Array.isArray(resClaimItems.data)) {
                itemsList = resClaimItems.data.map((ci, idx) => {
                  let parsedItemData = {};
                  if (ci.remark) {
                    try {
                      parsedItemData = JSON.parse(ci.remark);
                    } catch {
                      parsedItemData = { itemRemark: ci.remark };
                    }
                  }

                  const itemInfo = masterItemsMap[String(ci.item_id)] || masterItemsMap[String(ci.item_code)] || {};
                  const itemCode = ci.item_code || itemInfo.code || String(ci.item_id || "");
                  const itemNameOnly = itemInfo.name || ci.item_name || "";

                  const itemFullName = itemInfo.fullName
                    ? itemInfo.fullName
                    : itemCode && itemNameOnly
                    ? `${itemCode} - ${itemNameOnly}`
                    : itemNameOnly || itemCode || `สินค้า ID: ${ci.item_id}`;

                  return {
                    key: ci.claim_item_id || idx,
                    ...ci,
                    item_code: itemCode,
                    item_name: itemFullName,
                    images: rawImages.map((i) => i.formattedUrl),
                    qtyreceived: ci.qtyreceived ?? parsedItemData.receivedQty ?? ci.qty,
                    qtychang: ci.qtychang ?? parsedItemData.returnedQty ?? ci.qty,
                    received_qty: ci.qtyreceived ?? parsedItemData.receivedQty ?? ci.qty,
                    returned_qty: ci.qtychang ?? parsedItemData.returnedQty ?? ci.qty,
                    approved_qty: parsedItemData.approvedQty ?? ci.qty,
                    item_remark:
                      parsedItemData.itemRemark ||
                      (typeof ci.remark === "string" && !ci.remark.startsWith("{") ? ci.remark : ""),
                  };
                });
              }
            } catch (err) {
              console.error("เกิดข้อผิดพลาดในการโหลด items:", err);
            }
            setClaimItems(itemsList);

            setData({
              ...currentClaim,
              images: rawImages.map((i) => i.formattedUrl),
              driver_name: currentClaim.driver_name || extraLogData.driverName || "",
              truck_plate: currentClaim.truck_plate || extraLogData.truckPlate || "",
              delivery_driver: currentClaim.delivery_driver || extraLogData.deliveryDriver || "",
              delivery_plate: currentClaim.delivery_plate || extraLogData.deliveryPlate || "",
              estimated_delivery_date: currentClaim.estimated_delivery_date || extraLogData.estimatedDeliveryDate || null,
            });

            const approvesData = resApproves?.data || resApproves || [];
            if (Array.isArray(approvesData)) {
              setApproveLogs(approvesData.filter((app) => String(app.claim_id) === String(currentClaim.claim_id)));
            }

            // 🟢 ตรวจสอบว่าเคยมี Log Stamp การยืนยันของลูกค้ารอบนี้แล้วหรือไม่
            const isSubmitStamped = filteredLogs.some(
              (log) => log.remark && log.remark.includes("ยืนยันการส่งเคลม")
            );

            const isDeliveryStamped = filteredLogs.some(
              (log) => log.remark && log.remark.includes("ลูกค้ายืนยันรับสินค้า")
            );

            setHasConfirmedSubmit(isSubmitStamped);
            setHasConfirmedDelivery(isDeliveryStamped);

            // 🟢 แปลง Log ข้อความ [MSG] เป็นรายการ Private Comments
            const msgs = filteredLogs
              .filter((log) => log.remark && log.remark.startsWith("[MSG]"))
              .map((log) => {
                const cleanRemark = log.remark.replace("[MSG]", "").trim();
                const senderRole = log.remark.includes("[STAFF]") ? "staff" : "customer";
                return {
                  id: log.log_id || log.id || Math.random(),
                  senderRole,
                  senderName: uMap[String(log.update_by || log.user_id)] || (senderRole === "staff" ? "เจ้าหน้าที่ (Staff)" : "ลูกค้า (Customer)"),
                  message: cleanRemark.replace("[STAFF]", "").replace("[CUSTOMER]", "").trim(),
                  time: log.update_date || log.created_at || log.created_date,
                };
              });
            setChatMessages(msgs);
          }
        }
      } catch (error) {
        if (showLoading) message.error("ไม่สามารถดึงข้อมูลได้: " + (error.message || "เกิดข้อผิดพลาด"));
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [claimId]
  );

  // 🟢 AUTO STAMP TIMER (นับถอยหลัง 10 วินาที เมื่อเข้าสถานะ Pending หรือ Delivered)
  useEffect(() => {
    if (!data) return;

    const rawStatus = String(data.current_status || data.status || "");
    const statusId = String(getStatusId(rawStatus));

    // 1. auto-stamp สถานะ Pending (5)
    if (["1", "5"].includes(statusId) && !hasConfirmedSubmit && !isExecutingAutoStampRef.current) {
      const timer = setTimeout(() => {
        if (!isExecutingAutoStampRef.current && !hasConfirmedSubmit) {
          isExecutingAutoStampRef.current = true;
          handleConfirmClaimSubmit("ลูกค้ากดยืนยันการส่งเคลมสินค้าเรียบร้อยแล้ว (ระบบ Stamp อัตโนมัติ 10 วินาที)", true)
            .finally(() => { isExecutingAutoStampRef.current = false; });
        }
      }, 10000);

      return () => clearTimeout(timer);
    }

    // 2. auto-stamp สถานะ Delivered (10)
    if (statusId === "10" && !hasConfirmedDelivery && !isExecutingAutoStampRef.current) {
      const timer = setTimeout(() => {
        if (!isExecutingAutoStampRef.current && !hasConfirmedDelivery) {
          isExecutingAutoStampRef.current = true;
          handleConfirmDelivery("ลูกค้ายืนยันรับสินค้าเรียบร้อยแล้ว (ระบบ Stamp อัตโนมัติ 10 วินาที)", true)
            .finally(() => { isExecutingAutoStampRef.current = false; });
        }
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [data?.current_status, data?.status, hasConfirmedSubmit, hasConfirmedDelivery]);

  useClaimRealtime({
    claimId,
    isStaff: false,
    onStatusUpdated: () => fetchClaimDetail(false),
    onCommentCreated: (newLog) => {
      if (newLog && newLog.remark && newLog.remark.startsWith("[MSG]")) {
        const cleanRemark = newLog.remark.replace("[MSG]", "").trim();
        const senderRole = newLog.remark.includes("[STAFF]") ? "staff" : "customer";

        const formattedMsg = {
          id: newLog.log_id || Math.random(),
          senderRole,
          senderName: usersMap[String(newLog.update_by)] || (senderRole === "staff" ? "เจ้าหน้าที่ (Staff)" : "ลูกค้า (Customer)"),
          message: cleanRemark.replace("[STAFF]", "").replace("[CUSTOMER]", "").trim(),
          time: newLog.update_date || new Date(),
        };

        setChatMessages((prevMsgs) => [...prevMsgs, formattedMsg]);
      }
    },
  });

  useEffect(() => {
    fetchClaimDetail(true);

    const interval = setInterval(() => {
      fetchClaimDetail(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [claimId, fetchClaimDetail]);

  if (loading) {
    return (
      <div className="w-full h-64 flex justify-center items-center">
        <Spin size="large" description="กำลังโหลดข้อมูล..." />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-10 bg-white rounded-2xl m-6">
        <p className="text-gray-500 mb-4">ไม่พบข้อมูลรายการเคลม</p>
        <Button onClick={() => navigate("/customer/list-claim")}>กลับหน้ารายการ</Button>
      </div>
    );
  }

  const rawStatusVal = String(data?.current_status || data?.status || data?.status_id || "");
  const currentStatusInDB = convertstatusClaim(rawStatusVal);

  const hasRejectInLogs = statusLogs.some(
    (log) => log.remark && (log.remark.includes("ปฏิเสธรายการเคลม") || String(log.status) === "7")
  );

  const hasRejectInApproves = approveLogs.some(
    (app) => String(app.approve_status) === "false" || String(app.approve_status) === "0"
  );

  const isRejectedInDB =
    hasRejectInLogs ||
    hasRejectInApproves ||
    ["7", "rejected", "ไม่อนุมัติเคลมสินค้า"].includes(rawStatusVal.toLowerCase());

  const getLogDate = (targetStatusId) => {
    const targetId = String(targetStatusId);
    if (["1", "5", "Pending"].includes(targetId)) {
      return formatDate(data?.created_at || data?.created_date || data?.claim_date);
    }

    const matchingLogs = statusLogs.filter((log) => String(log.status || log.status_id) === targetId);
    if (matchingLogs.length > 0) {
      const lastLog = matchingLogs[matchingLogs.length - 1];
      return formatDate(lastLog.update_date || lastLog.created_at || lastLog.created_date);
    }

    if (targetId === "6" || targetId === "7") return formatDate(data.approve_date || data.updated_at);
    if (targetId === "8") return formatDate(data.withdraw_date);
    if (targetId === "9") return formatDate(data.delivery_date);
    if (targetId === "10") return formatDate(data.receive_finish_date);

    return "-";
  };

  const rejectReasonDisplay = getRejectReasonText(statusLogs, approveLogs, data) || "เนื่องจากสินค้าไม่อยู่ในเงื่อนไขการเคลม";

  const getCurrentStepIndex = () => {
    const statusStr = rawStatusVal.trim().toLowerCase();
    const statusNameStr = String(currentStatusInDB || "").trim().toLowerCase();

    const hasApprovedLog = statusLogs.some((l) => ["6", "7"].includes(String(l.status || l.status_id)));
    const hasProcessingLog = statusLogs.some((l) => String(l.status || l.status_id) === "8");
    const hasShippingLog = statusLogs.some((l) => String(l.status || l.status_id) === "9");
    const hasDeliveredLog = statusLogs.some((l) => String(l.status || l.status_id) === "10");

    if (["10", "delivered", "จัดส่งสำเร็จ"].includes(statusStr) || statusNameStr.includes("delivered") || hasDeliveredLog) {
      return 4;
    }

    if (["9", "shipping", "กำลังจัดส่ง"].includes(statusStr) || statusNameStr.includes("shipping") || hasShippingLog) {
      return 3;
    }

    if (["8", "processing", "กำลังดำเนินการ"].includes(statusStr) || statusNameStr.includes("processing") || hasProcessingLog) {
      return 2;
    }

    if (
      ["6", "7", "approved", "rejected", "อนุมัติ", "ปฏิเสธ"].includes(statusStr) ||
      statusNameStr.includes("approved") ||
      statusNameStr.includes("rejected") ||
      hasApprovedLog
    ) {
      return 1;
    }

    return 0;
  };

  const currentStep = getCurrentStepIndex();

  const stepItems = [
    {
      title: "1. Pending",
      description: formatDate(data?.created_at || data?.created_date || data?.claim_date),
    },
    {
      title: isRejectedInDB ? "2. Rejected" : "2. Approved",
      description: (
        <div className="text-xs">
          <div>{getLogDate(6) !== "-" ? getLogDate(6) : getLogDate(7)}</div>
          {isRejectedInDB && rejectReasonDisplay && (
            <div className="text-red-500 font-medium break-words mt-0.5">{rejectReasonDisplay}</div>
          )}
        </div>
      ),
    },
    {
      title: "3. Processing",
      description: isRejectedInDB ? "-" : getLogDate(8),
    },
    {
      title: "4. Shipping",
      description: isRejectedInDB ? "-" : getLogDate(9),
    },
    {
      title: "5. Delivered",
      description: isRejectedInDB ? "-" : getLogDate(10),
    },
  ];

  const creatorUserId = data ? String(data.user_id || data.created_by || "") : "";
  const agentNameDisplay = agentsMap[String(data?.agent_id)] || data?.agent_name || "-";
  const reporterNameDisplay = usersMap[creatorUserId] || data?.created_by || "-";
  const statusIdNum = Number(getStatusId(data?.current_status || data?.status));
  const isProcessingOrHigher = currentStep >= 2 || [8, 9, 10].includes(statusIdNum);
  const isShippingOrHigher = currentStep >= 3 || [9, 10].includes(statusIdNum);

  return (
    <div className="w-full flex flex-col gap-6 font-normal p-4 sm:p-6" style={{ boxSizing: "border-box" }}>
      <Card styles={{ body: { padding: "24px" } }} className="rounded-2xl shadow-sm border-gray-200 w-full overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
          <div className="flex flex-col gap-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-medium text-slate-800 m-0 truncate">รายละเอียดการเคลมสินค้า</h1>
            <p className="text-sm text-gray-500 m-0 truncate">
              Claim ID : <b className="text-slate-800 font-mono font-normal">{data.claim_no || data.claim_id}</b>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto justify-start md:justify-end">
            <div className="shrink-0">
              <ClaimStatusTag status={data.current_status || data.status} />
            </div>

            {STATUS_PRIORITY[currentStatusInDB] >= 4 && (
              <div>
                <Button
                  type="default"
                  icon={<PrinterOutlined />}
                  className="border-slate-300 text-slate-700 hover:text-slate-900 rounded-xl h-10 shadow-sm"
                  onClick={() => setIsPreviewModalOpen(true)}
                >
                  พิมพ์ / ดาวน์โหลดเอกสาร
                </Button>
                <ClaimPrintModal
                  open={isPreviewModalOpen}
                  onClose={() => setIsPreviewModalOpen(false)}
                  isStaff={false}
                  data={{
                    ...data,
                    claimNo: data.claim_no,
                    items: claimItems,
                    agentName: agentNameDisplay,
                    reporter: reporterNameDisplay,
                  }}
                />
              </div>
            )}

            {/* 🟢 ปุ่มยืนยันส่งเคลม (เมื่อสถานะเป็น Pending และยังไม่ถูกยืนยัน) */}
            {["1", "5"].includes(String(getStatusId(data.current_status))) && !hasConfirmedSubmit && (
              <Popconfirm
                title="ยืนยันการส่งเคลม"
                description="คุณต้องการยืนยันการส่งเคลมสินค้ารายการนี้ใช่หรือไม่?"
                onConfirm={() => handleConfirmClaimSubmit()}
                okText="ยืนยัน"
                cancelText="ยกเลิก"
              >
                <Button type="primary" size="large" className="bg-blue-600 hover:bg-blue-700 rounded-xl h-11">
                  ยืนยันการส่งเคลมสินค้า
                </Button>
              </Popconfirm>
            )}

            {/* 🟢 ปุ่มยืนยันรับสินค้าเคลม (เมื่อสถานะเป็น Delivered และยังไม่ถูกยืนยัน) */}
            {String(getStatusId(data.current_status)) === "10" && !hasConfirmedDelivery && (
              <Popconfirm
                title="ยืนยันรับสินค้าเคลมแล้ว"
                description="คุณได้รับสินค้าเคลมถูกต้องและครบถ้วนแล้วใช่หรือไม่?"
                onConfirm={() => handleConfirmDelivery()}
                okText="ยืนยันรับสินค้า"
                cancelText="ยกเลิก"
              >
                <Button type="primary" size="large" className="bg-emerald-600 hover:bg-emerald-700 rounded-xl h-11">
                  ยืนยันรับสินค้าเคลมแล้ว
                </Button>
              </Popconfirm>
            )}
          </div>
        </div>
      </Card>

      {isRejectedInDB && (
        <Alert
          title="คำร้องขอเคลมสินค้าถูกปฏิเสธ"
          description={`เหตุผล: ${rejectReasonDisplay}`}
          type="error"
          showIcon
          className="rounded-2xl border-red-200 break-words"
        />
      )}

      {/* 🟢 Steps Timeline Card */}
      <Card
        title={<span className="font-medium text-slate-800">มุมมองไทม์ไลน์สถานะ</span>}
        className="rounded-2xl shadow-sm border-gray-200 w-full overflow-hidden"
        styles={{ body: { padding: "20px 12px", overflow: "hidden" } }}
      >
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: isRejectedInDB ? "#ef4444" : "#059669",
              colorError: "#ef4444",
            },
          }}
        >
          <Steps
            responsive={true}
            current={currentStep}
            status={isRejectedInDB ? "error" : "process"}
            items={stepItems}
          />
        </ConfigProvider>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full">
        <div className="xl:col-span-2 flex flex-col gap-6 w-full">
          <Card title={<span className="font-medium text-slate-800">ข้อมูลคำร้องขอเคลม</span>} className="rounded-2xl shadow-sm border-gray-200 w-full">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="วันที่แจ้ง">{data.claim_date ? dayjs(data.claim_date).format("DD/MM/YYYY") : "-"}</Descriptions.Item>
              <Descriptions.Item label="ชื่อ Agent">{agentNameDisplay}</Descriptions.Item>
              <Descriptions.Item label="ผู้แจ้งส่งคืน">{reporterNameDisplay}</Descriptions.Item>
              <Descriptions.Item label="จำนวนรวมทั้งหมด">{claimItems.length} รายการ</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title={<span className="font-medium text-slate-800">รายการสินค้าที่ขอเคลม</span>} className="rounded-2xl shadow-sm border-gray-200 w-full">
            <Table
              dataSource={claimItems}
              columns={[
                { 
                  title: "ลำดับ", 
                  key: "index", 
                  width: 60, 
                  align: "center", 
                  render: (_, __, index) => index + 1 
                },
                { 
                  title: "ชื่อสินค้า", 
                  dataIndex: "item_name", 
                  key: "item_name" 
                },
                { 
                  title: "จำนวนรับคืน", 
                  dataIndex: "qtychang", 
                  key: "qtychang", 
                  width: 110, 
                  align: "right",
                  render: (qty) => <span className="font-semibold text-slate-700">{qty ?? "-"}</span>
                },
                
                { 
                  title: "จำนวนส่งคืน", 
                  dataIndex: "qtyreceived", 
                  key: "qtyreceived", 
                  width: 110, 
                  align: "right",
                  render: (qty, record) => {
                    // 🟢 แสดงเมื่อถึง Shipping แล้วเท่านั้น
                    if (!isShippingOrHigher) return "-";
                    const val = qty ?? record.returned_qty;
                    return <span className="font-semibold text-amber-600">{val ?? "-"}</span>;
                  }
                },
                {
                  title: "สาเหตุ",
                  dataIndex: "item_remark",
                  key: "item_remark",
                  render: (text) => <div className="text-xs text-slate-600 whitespace-pre-wrap break-words">{text || "-"}</div>,
                },
              ]}
              pagination={false}
              scroll={{ x: 650 }}
            />
          </Card>
        </div>

        <div className="xl:col-span-1 flex flex-col gap-6 w-full">
          <Card
            title={
              <div className="flex justify-between items-center w-full">
                <span className="font-medium text-slate-800">ประวัติการบันทึกสถานะ</span>
                <Button type="text" icon={<EllipsisOutlined />} onClick={() => setIsLogModalOpen(true)} />
              </div>
            }
            className="rounded-2xl shadow-sm border-gray-200 w-full"
          >
            <ClaimTimeline
              statusLogs={statusLogs.filter((l) => l.remark && !l.remark.startsWith("[MSG]")).slice(-4)}
              usersMap={usersMap}
            />
          </Card>

          {/* 🟢 Private Comments Card สำหรับ Customer */}
          <Card className="rounded-2xl shadow-sm border border-slate-300 w-full bg-[#f0f4f9]/60" styles={{ body: { padding: "20px" } }}>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <UserOutlined className="text-slate-700" />
                <span className="font-semibold text-slate-800 text-sm">{chatMessages.length} Private Comments</span>
              </div>

              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                    <div className="flex justify-between text-slate-500 font-medium mb-1">
                      <span>{msg.senderName}</span>
                      <span className="font-mono">{dayjs(msg.time).format("DD/MM/YYYY HH:mm")}</span>
                    </div>
                    <div className="text-slate-800">{msg.message}</div>
                  </div>
                ))}
              </div>

              <Input.TextArea
                autoSize={{ minRows: 2, maxRows: 4 }}
                placeholder="เพิ่มความคิดเห็นถึงเจ้าหน้าที่..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="rounded-xl border-slate-300 text-sm"
              />

              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={sendingMsg}
                disabled={!newMessage.trim()}
                onClick={handleSendMessage}
                className="bg-blue-500 hover:bg-blue-600 rounded-xl text-sm font-medium h-9 border-none"
              >
                ส่งข้อความ
              </Button>
            </div>
          </Card>

          <Button icon={<ArrowLeftOutlined />} className="w-full rounded-xl border-gray-300 h-11" onClick={() => navigate("/customer/list-claim")}>
            กลับหน้ารายการเคลม
          </Button>
        </div>
      </div>

      <Modal
        title="ประวัติการบันทึกสถานะทั้งหมด (Log History)"
        open={isLogModalOpen}
        onCancel={() => setIsLogModalOpen(false)}
        footer={[<Button key="close" onClick={() => setIsLogModalOpen(false)}>ปิด</Button>]}
        width={650}
      >
        <div className="py-4 max-h-[500px] overflow-y-auto px-2">
          <ClaimTimeline
            statusLogs={statusLogs.filter((log) => log.remark && !log.remark.startsWith("[MSG]"))}
            usersMap={usersMap}
          />
        </div>
      </Modal>
    </div>
  );
};

export default CustomerClaimDetail;