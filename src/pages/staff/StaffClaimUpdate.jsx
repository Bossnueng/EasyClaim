// src/pages/staff/StaffClaimUpdate.jsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  Descriptions,
  Button,
  Steps,
  Image,
  ConfigProvider,
  Select,
  Input,
  Modal,
  message,
  Spin,
  Table,
  InputNumber,
  Alert,
} from "antd";
import {
  SaveOutlined,
  PrinterOutlined,
  UndoOutlined,
  SendOutlined,
  UserOutlined,
  EllipsisOutlined,
  HistoryOutlined,
  PlusOutlined,
  ArrowLeftOutlined,
  CheckCircleFilled, // [UI-FIX 2026-10-31] ใช้ในการ์ดประวัติการพิจารณาอนุมัติ
  CloseCircleFilled, // [UI-FIX 2026-10-31] ใช้ในการ์ดประวัติการพิจารณาอนุมัติ
  AuditOutlined, // [UI-FIX 2026-10-31] ไอคอนหัวการ์ด/สถานะว่าง
  CarOutlined, // [FLOW-FIX 2026-10-31] แจ้งเตือนมอบหมาย พขร.
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";

import { useClaimRealtime } from "../../hooks/useClaimRealtime";
import ClaimPrintModal from "../../components/ClaimPrintModal";
import ClaimStatusTag from "../../components/ClaimStatusTag";
import ClaimTimeline from "../../components/claim/ClaimTimeline";
import DeliveryModal from "../../components/claim/DeliveryModal";
import { getStatusName, getStatusId } from "../../constants/claimStatus";

import claimService from "../../services/claimService";
import itemService from "../../services/itemService";
import loginService from "../../services/loginService";
import { userService } from "../../services/userService";
import deliveryService from "../../services/deliveryService";
import agentService from "../../services/agentService";
import { getAgentNameByUserId } from "../../utils/agentHelper";
import { parseDateSafely } from "../../utils/dateUtils";
import { getRejectReasonText } from "../../utils/logPaser";
import { useAutoConfirm } from "../../hooks/useAutoConfirm"; // [DOC-FIX 2026-10-31]
// [FLOW-FIX 2026-10-31] ตัวช่วยกลางคำนวณสถานะ/ไทม์ไลน์/การมอบหมาย พขร.
import {
  sortLogs,
  getStatusStampDate,
  getLatestDecision,
  getStepIndex,
  isRejectedFlow,
  getDriverAssignments,
  getDeliveryDateByStatus,
  needsDriverAssignment,
  STATUS_DATE_COLUMN,
} from "../../utils/claimFlow";

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

const formatDateString = (date) => {
  if (!date) return "-";
  const parsed = dayjs(date);
  if (!parsed.isValid()) return "-";
  return parsed.format("DD/MM/YYYY HH:mm");
};

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

const parseExtraDataFromLogs = (logs) => {
  if (!logs || !Array.isArray(logs) || logs.length === 0) return {};

  for (let i = logs.length - 1; i >= 0; i--) {
    const log = logs[i];
    if (log && log.remark && log.remark.includes("| DATA:")) {
      try {
        const jsonStr = log.remark.split("| DATA:")[1];
        return JSON.parse(jsonStr);
      } catch (e) {
        console.error("Error parsing extra data from log remark", e);
      }
    }
  }
  return {};
};

// [FLOW-FIX 2026-10-31] เพิ่มพารามิเตอร์ rejectedFlow: เคลมที่ไม่อนุมัติ (Rejected → Shipping)
// เมื่อถอยจาก Shipping ต้องกลับไป "Rejected" ไม่ใช่ "Processing"
const getPreviousStatusName = (currentStatus, rejectedFlow = false) => {
  const normalizedCurrent = getStatusName(currentStatus);

  if (normalizedCurrent === "Rejected") return "Pending";
  if (normalizedCurrent === "Approved") return "Pending";
  if (normalizedCurrent === "Processing") return "Approved";
  if (normalizedCurrent === "Shipping") return rejectedFlow ? "Rejected" : "Processing";
  if (normalizedCurrent === "Delivered") return "Shipping";

  return null;
};

const StaffClaimUpdate = () => {
  const navigate = useNavigate();
  
  const { claimId } = useParams();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [claimItems, setClaimItems] = useState([]);
  const [allImages, setAllImages] = useState([]);
  const [statusLogs, setStatusLogs] = useState([]);
  const [approveLogs, setApproveLogs] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [agentsMap, setAgentsMap] = useState({});
  const [agentsList, setAgentsList] = useState([]); // [DOC-FIX R4] ใช้หา User ตัวแทน Agent ในเอกสาร
  const [usersList, setUsersList] = useState([]);

  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [submittingDelivery, setSubmittingDelivery] = useState(false);
  const [deliveryDataList, setDeliveryDataList] = useState([]);
  const [deliveryForm, setDeliveryForm] = useState({
    driver_id: "",
    truck_plate: "",
    delivery_status: "8",
  });

  const currentUser = loginService.getCurrentUser();
  const currentUserId = currentUser?.user_id || currentUser?.id;
  const userRoleId = Number(currentUser?.role_id);

  const canRevertOrEdit = [1, 4].includes(userRoleId);

  const [formData, setFormData] = useState({
    status: "Approved",
    rejectReason: "",
    driverName: "",
    truckPlate: "",
    claimNoInput: "",
    fullReceive: "",
    deliveryDriver: "",
    deliveryPlate: "",
    estimatedDeliveryDate: null,
  });

  const isModalOpenRef = useRef(isModalOpen);
  useEffect(() => {
    isModalOpenRef.current = isModalOpen;
  }, [isModalOpen]);

  const isDeliveryModalOpenRef = useRef(isDeliveryModalOpen);
  useEffect(() => {
    isDeliveryModalOpenRef.current = isDeliveryModalOpen;
  }, [isDeliveryModalOpen]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemQtyChange = (key, val) => {
    setClaimItems((prevItems) =>
      prevItems.map((item) => {
        if (item.key === key || item.claim_item_id === key) {
          return {
            ...item,
            qty: val,
            approved_qty: val,
          };
        }
        return item;
      })
    );
  };

  const fetchClaimDetail = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [resClaim, resMasterItems, resLogs, resApproves, resUsers, resAgents, resDeliveries] = await Promise.all([
        claimService.getClaim().catch(() => ({ data: [] })),
        itemService.getItems().catch(() => ({ data: [] })),
        claimService.getClaimStatusLogs().catch(() => ({ data: [] })),
        claimService.getclaimapproves().catch(() => ({ data: [] })),
        userService.getUsers().catch(() => ({ data: [] })),
        agentService.getAgent().catch(() => ({ data: [] })),
        deliveryService.getDelivery ? deliveryService.getDelivery().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ]);

      const masterItemsMap = {};
      const masterItemsData = Array.isArray(resMasterItems?.data) ? resMasterItems.data : Array.isArray(resMasterItems) ? resMasterItems : [];
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
        setAgentsList(agentsData); // [DOC-FIX R4]
      }

      const usersData = resUsers?.data || resUsers || [];
      let uMap = {};
      if (Array.isArray(usersData)) {
        setUsersList(usersData);
        usersData.forEach((u) => {
          const uId = String(u.user_id || u.id);
          const name = u.full_name || u.fullname || u.name || `${u.first_name || ""} ${u.last_name || ""}`.trim();
          uMap[uId] = name || `User ID: ${uId}`;
        });
        setUsersMap(uMap);
      }

      const claimsList = Array.isArray(resClaim?.data) ? resClaim.data : Array.isArray(resClaim) ? resClaim : [];

      if (claimsList.length > 0) {
        const targetId = String(claimId || "").trim();
        const currentClaim = claimsList.find((item) => {
          const itemClaimId = String(item.claim_id || "").trim();
          const itemClaimNo = String(item.claim_no || "").trim();
          return itemClaimId === targetId || itemClaimNo === targetId;
        });

        if (currentClaim) {
          const allDeliveryData = Array.isArray(resDeliveries?.data) 
            ? resDeliveries.data 
            : Array.isArray(resDeliveries) 
            ? resDeliveries 
            : [];

          const matchedDeliveries = allDeliveryData.filter(
            (d) => String(d.claim_id) === String(currentClaim.claim_id)
          );

          setDeliveryDataList(matchedDeliveries);

          const logsData = resLogs?.data || resLogs || [];
          // [FLOW-FIX 2026-10-31] เรียง Log เก่า → ใหม่ (API ไม่ได้ ORDER BY ทำให้ "Log ล่าสุด" ผิดตัวได้)
          const filteredLogs = Array.isArray(logsData)
            ? sortLogs(logsData.filter((log) => String(log.claim_id) === String(currentClaim.claim_id)))
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
                  try { parsedItemData = JSON.parse(ci.remark); } catch (e) { parsedItemData = { itemRemark: ci.remark }; }
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
                  qtyreceived: ci.qtyreceived,
                  qtychang: ci.qtychang,
                  qty: ci.qty,
                  received_qty: ci.qtyreceived ?? parsedItemData.receivedQty ?? ci.qty,
                  returned_qty: ci.qtychang ?? parsedItemData.returnedQty ?? ci.qty,
                  approved_qty: parsedItemData.approvedQty ?? ci.qty,
                  item_remark: parsedItemData.itemRemark || (typeof ci.remark === "string" && !ci.remark.startsWith("{") ? ci.remark : ""),
                };
              });
            }
          } catch (itemsErr) {
            console.warn("ไม่สามารถดึงรายการสินค้าเคลมได้:", itemsErr);
          }
          setClaimItems(itemsList);

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

          const mergedClaimData = {
            ...currentClaim,
            images: rawImages.map((i) => i.formattedUrl),
            driver_name: currentClaim.driver_name || extraLogData.driverName || "",
            truck_plate: currentClaim.truck_plate || extraLogData.truckPlate || "",
            full_receive: currentClaim.full_receive || extraLogData.fullReceive || "",
            delivery_driver: currentClaim.delivery_driver || extraLogData.deliveryDriver || "",
            delivery_plate: currentClaim.delivery_plate || extraLogData.deliveryPlate || "",
            estimated_delivery_date: currentClaim.estimated_delivery_date || extraLogData.estimatedDeliveryDate || null,
          };

          setData(mergedClaimData);

          const currentStatusName = convertstatusClaim(currentClaim.current_status || "5");

          if (!isModalOpenRef.current) {
            setFormData({
              // [FLOW-FIX 2026-10-31] ค่าเริ่มต้น = สถานะถัดไปตัวแรก (เดิมใช้สถานะปัจจุบัน ทำให้กดบันทึกซ้ำสถานะเดิมได้)
              status: getNextStatusOptions(currentStatusName)[0]?.value || "",
              rejectReason: currentClaim.reject_reason || "",
              driverName: mergedClaimData.driver_name,
              truckPlate: mergedClaimData.truck_plate,
              claimNoInput: mergedClaimData.claim_no || "",
              fullReceive: mergedClaimData.full_receive,
              deliveryDriver: mergedClaimData.delivery_driver,
              deliveryPlate: mergedClaimData.delivery_plate,
              estimatedDeliveryDate: mergedClaimData.estimated_delivery_date ? dayjs(mergedClaimData.estimated_delivery_date) : null,
            });
          }

          const approvesData = resApproves?.data || resApproves || [];
          if (Array.isArray(approvesData)) {
            setApproveLogs(approvesData.filter((app) => String(app.claim_id) === String(currentClaim.claim_id)));
          }

          const rawApprovesData = resApproves?.data || resApproves || [];
          const approvesArray = Array.isArray(rawApprovesData) ? rawApprovesData : [];

          const matchedApproves = approvesArray.filter(
            (app) => String(app.claim_id).trim() === String(currentClaim.claim_id).trim()
          );

          setApproveLogs(matchedApproves);
        } else {
          message.error(`ไม่พบข้อมูลรายการเคลมรหัส: ${claimId}`);
        }
      }
    } catch (error) {
      message.error("ไม่สามารถดึงข้อมูลได้: " + (error.message || "เกิดข้อผิดพลาด"));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [claimId]);

  // 🟢 ตัวเลือกสถานะถัดไป
  // [FLOW-FIX 2026-10-31] ปรับให้ตรงกับกระบวนการ:
  //   Pending → Approved / Rejected
  //   Approved → Processing
  //   Rejected → Shipping (ข้าม Processing ทันที)
  //   Processing → Shipping, Shipping → Delivered (ปกติ พขร. เปลี่ยนจากอีกแพลตฟอร์ม — เก็บไว้เป็นทางสำรองให้ Staff)
  // เดิม: Approved/Processing/Shipping เลือก Rejected ได้ และ Rejected เลือก Processing/Approved ได้ (ผิดลำดับ)
  //       หากต้องการแก้ไขการพิจารณา ให้ใช้ปุ่ม "ถอยสถานะ" แทน
  function getNextStatusOptions(currentStatus) {
    const normalized = getStatusName(currentStatus);

    switch (normalized) {
      case "Pending":
        return [
          { value: "Approved", label: "2. Approved (อนุมัติเคลม)" },
          { value: "Rejected", label: "2. Rejected (ไม่อนุมัติ)" },
        ];
      case "Approved":
        return [{ value: "Processing", label: "3. Processing (เปลี่ยนสินค้า)" }];
      case "Processing":
        return [{ value: "Shipping", label: "4. Shipping (กำลังจัดส่ง)" }];
      case "Rejected":
        return [{ value: "Shipping", label: "4. Shipping (ส่งคืนสินค้า)" }];
      case "Shipping":
        return [{ value: "Delivered", label: "5. Delivered (จัดส่งสำเร็จ)" }];
      default:
        return [];
    }
  }

  // [DOC-FIX 2026-10-31] ยืนยันส่งเคลม/รับสินค้าแทนลูกค้าเมื่อครบกำหนด แม้ลูกค้าไม่เปิดหน้าเว็บ
  useAutoConfirm({
    claim: data,
    logs: statusLogs,
    deliveries: deliveryDataList,
    statusName: data ? getStatusName(String(data.current_status || "5")) : "",
    updateBy: currentUserId,
    onStamped: () => fetchClaimDetail(false),
  });

  useClaimRealtime({
    claimId: claimId,
    isStaff: true,
    onStatusUpdated: () => fetchClaimDetail(false),
    onCommentCreated: (newLog) => {
      // [FLOW-FIX 2026-10-31] backend ไม่ได้ส่ง event "claim:status_updated" แต่ทุกการเปลี่ยนสถานะจะสร้าง Log
      // และส่ง "claim:comment_created" → ถ้าไม่ใช่ข้อความแชท ให้รีเฟรชทันที (เดิมต้องรอ polling 3–5 วินาที)
      if (newLog && !String(newLog.remark || "").startsWith("[MSG]")) {
        fetchClaimDetail(false);
        return;
      }
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
    if (!claimId) return;

    fetchClaimDetail(true);

    const interval = setInterval(() => {
      if (!isModalOpenRef.current && !isDeliveryModalOpenRef.current) {
        fetchClaimDetail(false);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [claimId, fetchClaimDetail]);

  const handleSaveDelivery = async () => {
    // [FLOW-FIX 2026-10-31] ตัดช่องว่าง + ตรวจค่าว่าง
    const driverId = String(deliveryForm.driver_id || "").trim();
    const truckPlate = String(deliveryForm.truck_plate || "").trim();
    if (!driverId || !truckPlate) {
      message.error("กรุณากรอก Driver ID และทะเบียนรถให้ครบถ้วน");
      return;
    }

    setSubmittingDelivery(true);
    try {
      const statusBefore = getStatusName(data?.current_status || "5");

      // [FLOW-FIX 2026-10-31] เปลี่ยน พขร.: ลบรายการมอบหมายเดิม (สถานะ 8) ของเคลมนี้ก่อน
      // เดิมสร้างแถวใหม่ซ้อน → พขร. คนเดิมยังเห็นงานในแอปของตัวเอง
      const oldAssignments = getDriverAssignments(deliveryDataList, data.claim_id);
      for (const old of oldAssignments) {
        if (old.delivery_id) {
          try {
            await deliveryService.delDelivery(old.delivery_id);
          } catch (delErr) {
            console.warn("ลบรายการมอบหมาย พขร. เดิมไม่สำเร็จ:", delErr);
          }
        }
      }

      const resDelivery = await deliveryService.createDelivery({
        claim_id: String(data.claim_id),
        driver_id: driverId,
        delivery_status: "8",
        truck_plate: truckPlate,
      });

      // [FLOW-FIX 2026-10-31] backend /createDelivery (สถานะ 8) จะเขียน current_status = "Processing" เสมอ
      // ถ้าเคลมนี้ "Rejected" (รอส่งคืนสินค้า) ต้องคืนสถานะเป็น Rejected ไม่ให้กลายเป็น Processing
      if (statusBefore === "Rejected") {
        await claimService.updateClaimDate({
          claim_id: data.claim_id,
          status: "Rejected",
          columnname: "warehouse_receive_date",
        });
      }

      const rawStatusVal = data?.current_status || "1";
      await claimService.createClaimStatusLogs({
        claim_id: String(data.claim_id),
        status: String(getStatusId(rawStatusVal)),
        // ⚠️ รูปแบบข้อความนี้ถูก parse ใน getLatestDeliveryFromLogs — ห้ามเปลี่ยน
        remark: `มอบหมายงาน พขร. (Delivery): Driver ID ${driverId}, ทะเบียนรถ ${truckPlate}`,
        update_by: String(currentUserId),
        user_id: String(currentUserId),
      });

      const newDeliveryItem = {
        delivery_id: resDelivery?.delivery_id || Date.now(),
        claim_id: data.claim_id,
        driver_id: driverId,
        truck_plate: truckPlate,
        delivery_status: "8",
        created_at: new Date().toISOString(),
      };

      setDeliveryDataList((prev) => [
        ...prev.filter((d) => !oldAssignments.some((o) => o.delivery_id === d.delivery_id)),
        newDeliveryItem,
      ]);

      setData((prev) => ({
        ...prev,
        delivery_driver: driverId,
        delivery_plate: truckPlate,
      }));

      message.success(
        oldAssignments.length > 0
          ? "เปลี่ยน พขร. เรียบร้อยแล้ว"
          : "มอบหมาย พขร. เรียบร้อยแล้ว — พขร. จะเห็นงานนี้ในแอปเพื่อรับสินค้าไปส่งคืน"
      );
      setIsDeliveryModalOpen(false);
      setDeliveryForm({ driver_id: "", truck_plate: "", delivery_status: "8" });
      await fetchClaimDetail(false);
    } catch (err) {
      message.error("มอบหมาย พขร. ไม่สำเร็จ: " + (err.message || "เกิดข้อผิดพลาด"));
    } finally {
      setSubmittingDelivery(false);
    }
  };

  // [FLOW-FIX 2026-10-31] เปิดหน้าต่างมอบหมาย พขร. พร้อมเติมข้อมูล พขร. เดิม (ถ้ามี)
  const openDeliveryModal = () => {
    const current = getDriverAssignments(deliveryDataList, data?.claim_id)[0];
    setDeliveryForm({
      driver_id: current?.driver_id || "",
      truck_plate: current?.truck_plate || "",
      delivery_status: "8",
    });
    setIsDeliveryModalOpen(true);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    const messageToSend = newMessage.trim();
    setSendingMsg(true);
    try {
      const userId = String(currentUserId || "");
      const realClaimId = data.claim_id;
      const formattedRemark = `[MSG] [STAFF] ${messageToSend}`;

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

  const handleStepBack = () => {
    const previousStatusName = getPreviousStatusName(currentStatusInDB, rejectedFlow);
    if (!previousStatusName) {
      message.warning("อยู่ที่สถานะแรกสุดแล้ว ไม่สามารถถอยได้อีก");
      return;
    }

    Modal.confirm({
      title: "ยืนยันการถอยสถานะ",
      content: `คุณต้องการถอยสถานะกลับไปเป็น "${previousStatusName}" ใช่หรือไม่?`,
      okText: "ยืนยันถอยสถานะ",
      cancelText: "ยกเลิก",
      okButtonProps: { danger: true },
      onOk: async () => {
        await processStatusChange(previousStatusName);
      },
    });
  };

  const processStatusChange = async (targetStatus) => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const realClaimId = data.claim_id;
      const statusId = String(getStatusId(targetStatus));

      // [FLOW-FIX 2026-10-31] เดิมเรียก claimService.updateClaim({...data}) ซึ่ง backend /updateClaim
      // อัปเดตเฉพาะรายการสินค้าและต้องมี items → ตอบ 400 "items ต้องเป็น Array" ทุกครั้ง (ถอยสถานะไม่ได้เลย)
      // แก้: ใช้ /updateClaimDate ซึ่งเป็น endpoint เดียวที่เปลี่ยน current_status ได้
      await claimService.updateClaimDate({
        claim_id: realClaimId,
        status: targetStatus,
        columnname: STATUS_DATE_COLUMN[targetStatus] || "approve_date",
      });

      await claimService.createClaimStatusLogs({
        claim_id: String(realClaimId),
        status: statusId,
        remark: `ถอยสถานะย้อนกลับเป็น ${targetStatus}`,
        update_by: String(currentUserId),
        user_id: String(currentUserId),
      });

      message.success(`ถอยสถานะกลับเป็น "${targetStatus}" เรียบร้อยแล้ว`);
      await fetchClaimDetail(true);
    } catch (error) {
      message.error(error.message || "เกิดข้อผิดพลาดในการถอยสถานะ");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStatus = async () => {
    const targetStatusName = formData.status;
    const statusBefore = getStatusName(data?.current_status || "5");
    const allowedTargets = getNextStatusOptions(statusBefore).map((o) => o.value);

    // [FLOW-FIX 2026-10-31] กันการบันทึกสถานะที่ไม่ใช่ขั้นถัดไป (เช่น กดบันทึกสถานะเดิมซ้ำ)
    if (!targetStatusName || !allowedTargets.includes(targetStatusName)) {
      message.error("กรุณาเลือกสถานะถัดไปที่ถูกต้อง");
      return;
    }

    const isRejectedStatus = targetStatusName === "Rejected";
    if (isRejectedStatus && !formData.rejectReason.trim()) {
      message.error("กรุณาระบุเหตุผลการปฏิเสธการเคลม");
      return;
    }

    // [FLOW-FIX 2026-10-31] Processing ต้องกรอกจำนวนที่ใช้เปลี่ยนจริงครบทุกรายการ
    if (targetStatusName === "Processing") {
      const missingQty = claimItems.some((ci) => {
        const v = ci.qty ?? ci.approved_qty;
        return v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) || Number(v) < 0;
      });
      if (missingQty) {
        message.error("กรุณากรอกจำนวนที่อนุมัติเปลี่ยนจริงให้ครบทุกรายการ");
        return;
      }
    }

    // [FLOW-FIX 2026-10-31] Shipping (กรณี Staff เปลี่ยนแทน พขร.) ต้องมอบหมาย พขร. ก่อน
    const currentAssignment = getDriverAssignments(deliveryDataList, data?.claim_id)[0];
    if (targetStatusName === "Shipping" && !currentAssignment) {
      message.warning("กรุณามอบหมาย พขร. ก่อนเปลี่ยนเป็น Shipping");
      return;
    }

    setIsSubmitting(true);
    try {
      const realClaimId = data.claim_id;
      const statusId = String(getStatusId(targetStatusName));

      const extraData = {
        driverName: formData.driverName,
        truckPlate: formData.truckPlate,
        deliveryDriver: formData.deliveryDriver,
        deliveryPlate: formData.deliveryPlate,
        estimatedDeliveryDate: formData.estimatedDeliveryDate ? dayjs(formData.estimatedDeliveryDate).format("YYYY-MM-DD") : "",
      };

      const fullRemark = isRejectedStatus
        ? `ปฏิเสธรายการเคลม: ${formData.rejectReason.trim()} | DATA:${JSON.stringify(extraData)}`
        : `เปลี่ยนสถานะเป็น ${targetStatusName} | DATA:${JSON.stringify(extraData)}`;

      // [FLOW-FIX 2026-10-31] อัปเดตจำนวนสินค้าเฉพาะตอน Processing (จำนวนเปลี่ยนจริง) และ Rejected (เปลี่ยน = 0)
      // เดิมเรียกทุกสถานะ ถ้ารายการสินค้ามีค่าว่างจะทำให้การเปลี่ยนสถานะทั้งหมดล้มเหลว
      if (targetStatusName === "Processing" || isRejectedStatus) {
        const updatedClaimItems = claimItems.map((ci) => {
          if (isRejectedStatus) {
            return { ...ci, qty: 0, approved_qty: 0 };
          }
          return { ...ci, qty: Number(ci.qty ?? ci.approved_qty ?? 0) };
        });

        await claimService.updateClaim({
          claim_id: realClaimId,
          items: updatedClaimItems,
        });
      }

      const targetColumn = STATUS_DATE_COLUMN[targetStatusName] || "approve_date";

      // [FLOW-FIX 2026-10-31] ลบการ "Auto-Stamp Processing" ตอน Rejected
      // เดิมสร้าง Log สถานะ 8 ปลอม → ไทม์ไลน์ขึ้นว่าผ่าน Processing แล้ว ทั้งที่ Rejected ต้องข้ามไป Shipping
      // คงไว้เฉพาะการ Stamp คอลัมน์ warehouse_receive_date (รายงานเดิมใช้คอลัมน์นี้) โดยไม่เปลี่ยนสถานะเป็น Processing
      if (isRejectedStatus) {
        try {
          await claimService.updateClaimDate({
            claim_id: realClaimId,
            status: "Rejected",
            columnname: "warehouse_receive_date",
          });
        } catch (autoErr) {
          console.warn("Stamp warehouse_receive_date failed:", autoErr);
        }
      }

      if (targetStatusName === "Shipping") {
        try {
          // [FLOW-FIX 2026-10-31] ใช้ พขร. ที่มอบหมายไว้ก่อน (เดิมใช้ driverName = พขร. ที่แจ้งเคลมเข้ามาก่อน ซึ่งผิดคน)
          const activeDriverId = currentAssignment?.driver_id || data?.delivery_driver || formData.deliveryDriver || "";
          const activeTruckPlate = currentAssignment?.truck_plate || data?.delivery_plate || formData.deliveryPlate || "-";

          if (activeDriverId) {
            await deliveryService.createDelivery({
              claim_id: String(realClaimId),
              driver_id: String(activeDriverId),
              delivery_status: "9",
              truck_plate: String(activeTruckPlate),
            });
          }
        } catch (deliveryErr) {
          console.error("Error creating delivery on Shipping status:", deliveryErr);
        }
      }

      await claimService.updateClaimDate({
        claim_id: realClaimId,
        status: targetStatusName,
        columnname: targetColumn,
      });

      await claimService.createClaimStatusLogs({
        claim_id: String(realClaimId),
        status: statusId,
        remark: fullRemark,
        update_by: String(currentUserId),
        user_id: String(currentUserId),
      });

      // [FLOW-FIX 2026-10-31] ประวัติการพิจารณาอนุมัติ Stamp เฉพาะ Approved / Rejected (เดิม Stamp ตอน Processing ด้วย)
      if (isRejectedStatus || targetStatusName === "Approved") {
        await claimService.createClaimapproves({
          claim_id: String(realClaimId),
          approve_by: String(currentUserId),
          approve_status: isRejectedStatus ? "false" : "true",
          approve_remark: isRejectedStatus ? formData.rejectReason.trim() : "อนุมัติเคลม",
        });
      }

      message.success(`อัปเดตสถานะเป็น ${targetStatusName} เรียบร้อยแล้ว`);
      setIsModalOpen(false);
      await fetchClaimDetail(false);

      // [FLOW-FIX 2026-10-31] ขั้นตอนถัดไปของ Processing / Rejected คือส่งคืนสินค้า → ชวนมอบหมาย พขร. ทันที
      // (ไม่บังคับ — กดยกเลิกได้ และยังมีแถบเตือนบนหน้าจนกว่าจะมอบหมาย)
      if ((targetStatusName === "Processing" || isRejectedStatus) && !currentAssignment) {
        message.info("ขั้นตอนถัดไป: มอบหมาย พขร. เพื่อส่งสินค้าคืนลูกค้า");
        openDeliveryModal();
      }
    } catch (error) {
      console.error("Save Status Error:", error);
      message.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + (error.message || "โปรดตรวจสอบการเชื่อมต่อ Backend"));
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <Button onClick={() => navigate("/staff/list-claim")}>กลับหน้ารายการ</Button>
      </div>
    );
  }

  const rawStatusVal = String(data?.current_status || data?.status || data?.status_id || "");
  const currentStatusInDB = convertstatusClaim(rawStatusVal);

  // [FLOW-FIX 2026-10-31] คำนวณจาก "สถานะปัจจุบัน" + Log ที่เป็นการเปลี่ยนสถานะจริงเท่านั้น
  // เดิม: เคยมี Log Rejected ครั้งเดียว = แดงตลอดไป (แม้ถอยสถานะแล้ว) และไทม์ไลน์ดูจาก "เคยมี Log"
  const statusName = getStatusName(rawStatusVal || "5");
  const rejectedFlow = isRejectedFlow(statusName, statusLogs);
  const latestDecision = getLatestDecision(statusLogs);
  const isRejectedInDB = rejectedFlow || (statusName === "Rejected");
  const rejectReasonDisplay = getRejectReasonText(statusLogs, approveLogs, data) || "-";

  const isFinalStatus = currentStatusInDB === "Delivered" || currentStatusInDB === "จัดส่งสินค้าเคลมสำเร็จ";
  const previousStatusName = getPreviousStatusName(currentStatusInDB, rejectedFlow);

  // [FLOW-FIX 2026-10-31] การมอบหมาย พขร. (Delivery สถานะ 8) — พขร. จะเห็นงานในแอปก็ต่อเมื่อมีรายการนี้
  const driverAssignments = getDriverAssignments(deliveryDataList, data.claim_id);
  const currentAssignment = driverAssignments[0] || null;
  const mustAssignDriver = needsDriverAssignment(statusName, Boolean(currentAssignment));
  const canAssignDriver = ["Processing", "Rejected"].includes(statusName);

  const currentStep = getStepIndex(statusName);

  // [FLOW-FIX 2026-10-31] เวลา Stamp ของแต่ละขั้น (ไม่นับ Log แชท/มอบหมาย/ลูกค้ายืนยัน)
  // Shipping / Delivered ที่ พขร. เปลี่ยนจากอีกแพลตฟอร์มจะไม่มี Log → ใช้วันที่จากตาราง Delivery / claims แทน
  const stampOf = (stepIdx, statusIds, ...fallbacks) => {
    if (stepIdx > currentStep) return "-";
    const fromLog = getStatusStampDate(statusLogs, statusIds);
    const value = fromLog || fallbacks.find(Boolean);
    return value ? formatDate(value) : "-";
  };

  const pendingStamp = formatDate(data?.claim_date || data?.created_at || data?.created_date);
  const decisionStamp = stampOf(1, latestDecision === "Rejected" ? ["7"] : ["6"], data?.approve_date);
  const processingStamp = stampOf(2, ["8"], data?.warehouse_receive_date);
  const shippingStamp = stampOf(3, ["9"], getDeliveryDateByStatus(deliveryDataList, data.claim_id, 9), data?.delivery_date);
  const deliveredStamp = stampOf(4, ["10"], getDeliveryDateByStatus(deliveryDataList, data.claim_id, 10), data?.receive_finish_date);

  const stepNote = (text, tone = "slate") => (
    <div className={`text-[11px] leading-snug mt-0.5 break-words ${tone === "amber" ? "text-amber-600" : tone === "red" ? "text-red-500" : "text-slate-500"}`}>
      {text}
    </div>
  );

  const stepItems = [
    {
      title: "1. Pending",
      description: pendingStamp,
    },
    {
      title: isRejectedInDB ? "2. Rejected" : "2. Approved",
      description: (
        <div>
          {decisionStamp}
          {isRejectedInDB && rejectReasonDisplay !== "-" && stepNote(rejectReasonDisplay, "red")}
        </div>
      ),
    },
    {
      title: "3. Processing",
      // [FLOW-FIX 2026-10-31] เส้นทาง Rejected ข้ามขั้นนี้
      ...(rejectedFlow ? { status: "wait" } : {}),
      description: rejectedFlow ? stepNote("ข้าม (ไม่อนุมัติ)") : processingStamp,
    },
    {
      title: "4. Shipping",
      description: (
        <div>
          {shippingStamp}
          {canAssignDriver &&
            (currentAssignment
              ? stepNote(`พขร.: ${currentAssignment.driver_id}`)
              : stepNote("รอมอบหมาย พขร.", "amber"))}
        </div>
      ),
    },
    {
      title: "5. Delivered",
      description: deliveredStamp,
    },
  ];

  const creatorUserId = String(data.user_id || data.created_by || "");
  const matchedAgentName = agentsMap[String(data.agent_id)] || agentsMap[String(data.agent_code)] || getAgentNameByUserId(creatorUserId, usersList, agentsMap);
  const agentNameDisplay = (matchedAgentName && matchedAgentName !== "-") ? matchedAgentName : (data.agent_name || data.agentName || "-");
  const reporterNameDisplay = usersMap[creatorUserId] || data.created_by || data.reporter || "-";
  const statusIdNum = Number(getStatusId(data?.current_status || data?.status));
  const isProcessingOrHigher = (currentStep >= 2 && !rejectedFlow) || [8, 9, 10].includes(statusIdNum);
  const isShippingOrHigher = currentStep >= 3 || [9, 10].includes(statusIdNum);

  const itemColumns = [
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
      key: "item_name", 
      render: (text) => <span className="font-medium text-slate-800 break-words">{text}</span> 
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
      title: "จำนวนเปลี่ยน", 
      dataIndex: "qty", 
      key: "qty", 
      width: 120, 
      align: "right", 
      render: (appQty, record) => {
        if (!isProcessingOrHigher) return "-";
        const val = appQty ?? record.approved_qty;
        return <span className="font-semibold text-emerald-600">{val ?? "-"}</span>;
      }
    },
    { 
      title: "จำนวนส่งคืน", 
      dataIndex: "qtyreceived", 
      key: "qtyreceived", 
      width: 110, 
      align: "right", 
      render: (retQty, record) => {
        if (!isShippingOrHigher) return "-";
        const val = retQty ?? record.returned_qty;
        return <span className="font-semibold text-amber-600">{val ?? "-"}</span>;
      }
    },
    {
      title: "สาเหตุ",
      dataIndex: "item_remark",
      key: "item_remark",
      render: (text) => <div className="text-xs text-slate-600 whitespace-pre-wrap break-words">{text || "-"}</div>,
    },
  ];

  const getLatestDeliveryFromLogs = (logs) => {
    if (!logs || !Array.isArray(logs)) return null;
    const deliveryLogs = logs.filter(
      (l) => l.remark && l.remark.includes("มอบหมายงาน พขร. (Delivery):")
    );
    if (deliveryLogs.length === 0) return null;

    const lastLog = deliveryLogs[deliveryLogs.length - 1];
    const matchDriver = lastLog.remark.match(/Driver ID ([^,]+)/);
    const matchPlate = lastLog.remark.match(/ทะเบียนรถ (.+)/);

    return {
      driver_id: matchDriver ? matchDriver[1].trim() : null,
      truck_plate: matchPlate ? matchPlate[1].trim() : null,
    };
  };

  const deliveryFromLog = getLatestDeliveryFromLogs(statusLogs);

  const processingDeliveries = deliveryDataList.filter(
    (d) => String(d.delivery_status) === "8" || Number(d.delivery_status) === 8
  );

  const latestDeliveryStatus8 = processingDeliveries.length > 0
    ? processingDeliveries.sort((a, b) => Number(b.delivery_id || 0) - Number(a.delivery_id || 0))[0]
    : null;

  return (
    <div className="w-full flex flex-col gap-6 font-normal p-4 sm:p-6" style={{ boxSizing: "border-box" }}>
      <Card className="rounded-2xl shadow-sm border-gray-200 w-full overflow-hidden" styles={{ body: { padding: "24px" } }}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
          <div className="flex flex-col gap-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-medium text-slate-800 m-0 truncate">จัดการการเคลม</h1>
            <p className="text-sm text-gray-500 m-0 truncate">
              Claim ID : <b className="text-slate-800 font-mono font-normal">{data.claim_no || data.claim_id}</b>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto justify-start md:justify-end">
            <ClaimStatusTag status={currentStatusInDB} />

            {/* [DOC-FIX 2026-10-31] พิมพ์เอกสารได้ทุกสถานะ (เดิมเฉพาะ Shipping ขึ้นไป) — ข้อมูลที่ยังไม่ถึงขั้นจะเว้นว่าง */}
            <Button
              type="default"
              icon={<PrinterOutlined />}
              className="rounded-xl h-10"
              onClick={() => setIsPreviewModalOpen(true)}
            >
              พิมพ์เอกสาร
            </Button>
            <ClaimPrintModal
              open={isPreviewModalOpen}
              onClose={() => setIsPreviewModalOpen(false)}
              isStaff={true}
              claim={data}
              items={claimItems}
              statusLogs={statusLogs}
              approveLogs={approveLogs}
              deliveries={deliveryDataList}
              usersMap={usersMap}
              users={usersList}
              agents={agentsList}
              agentName={agentNameDisplay}
            />

            {canRevertOrEdit && !isFinalStatus && previousStatusName && (
              <Button
                type="default"
                icon={<UndoOutlined />}
                onClick={handleStepBack}
                className="border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl h-10"
              >
                ถอยสถานะ
              </Button>
            )}

            {/* [FLOW-FIX 2026-10-31] ค่าเริ่มต้น = สถานะถัดไปตัวแรก และซ่อนปุ่มเมื่อไม่มีสถานะถัดไป (Delivered) */}
            {getNextStatusOptions(statusName).length > 0 && (
              <Button
                type="primary"
                icon={<SaveOutlined />}
                className="bg-blue-600 hover:bg-blue-700 rounded-xl h-10 shadow-md"
                onClick={() => {
                  const defaultNextStatus = getNextStatusOptions(statusName)[0]?.value || "";
                  setFormData((prev) => ({ ...prev, status: defaultNextStatus, rejectReason: "" }));
                  setIsModalOpen(true);
                }}
              >
                อัปเดตสถานะ
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* [FLOW-FIX 2026-10-31] แจ้งเหตุผลการไม่อนุมัติให้ฝั่ง Staff เห็นชัดเจน (ฝั่ง Customer มีอยู่แล้ว) */}
      {rejectedFlow && (
        <Alert
          type="error"
          showIcon
          title="คำร้องขอเคลมนี้ไม่ได้รับการอนุมัติ"
          description={`เหตุผล: ${rejectReasonDisplay}`}
          className="rounded-2xl break-words"
        />
      )}

      {/* [FLOW-FIX 2026-10-31] เตือนให้มอบหมาย พขร. ก่อนขั้น Shipping
          พขร. จะเห็นงานในแอปของตัวเอง (และเปลี่ยนเป็น Shipping ได้) ก็ต่อเมื่อถูกมอบหมายแล้วเท่านั้น
          ไม่ปิดกั้นการทำงานอื่น — แถบนี้หายเองเมื่อมอบหมายแล้ว */}
      {mustAssignDriver && (
        <Alert
          type="warning"
          showIcon
          icon={<CarOutlined />}
          title="ยังไม่ได้มอบหมาย พขร. สำหรับส่งสินค้าคืนลูกค้า"
          description="พขร. จะยังไม่เห็นงานนี้ในแอป และเปลี่ยนสถานะเป็น Shipping ไม่ได้ จนกว่าจะมอบหมาย"
          action={
            <Button type="primary" icon={<CarOutlined />} onClick={openDeliveryModal}>
              มอบหมาย พขร.
            </Button>
          }
          className="rounded-2xl flex-wrap gap-3"
        />
      )}

      <Card title={<span className="font-medium text-slate-800">มุมมองไทม์ไลน์สถานะ</span>} className="rounded-2xl shadow-sm border-gray-200 w-full overflow-hidden" styles={{ body: { padding: "20px 12px" } }}>
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
            status={isRejectedInDB && currentStep === 1 ? "error" : "process"}
            items={stepItems}
          />
        </ConfigProvider>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full">
        <div className="xl:col-span-2 flex flex-col gap-6 w-full">
          <Card title={<span className="font-medium text-slate-800">ข้อมูลคำร้องขอเคลม</span>} className="rounded-2xl shadow-sm border-gray-200 w-full" styles={{ body: { padding: "24px" } }}>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="วันที่แจ้ง">{data.claim_date ? dayjs(data.claim_date).format("DD/MM/YYYY") : "-"}</Descriptions.Item>
              <Descriptions.Item label="ชื่อ Agent">{agentNameDisplay}</Descriptions.Item>
              <Descriptions.Item label="ผู้แจ้งส่งคืน">{reporterNameDisplay}</Descriptions.Item>
              <Descriptions.Item label="จำนวนรวมทั้งหมด">{claimItems.length} รายการ</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title={<span className="font-medium text-slate-800">รายการสินค้าที่ขอเคลม</span>} className="rounded-2xl shadow-sm border-gray-200 w-full" styles={{ body: { padding: "16px" } }}>
            <Table dataSource={claimItems} columns={itemColumns} pagination={false} scroll={{ x: 650 }} size="middle" className="rounded-xl overflow-hidden border border-slate-100" />
          </Card>

          <Card
            title={
              /* [UI-FIX 2026-10-31 R2] ย่อหัวการ์ด + ปุ่ม และให้ตัดบรรทัดได้บนจอแคบ (เดิมปุ่มถูกตัดขาด) */
              <div className="flex flex-wrap justify-between items-center w-full gap-2 py-1">
                <span className="font-medium text-slate-800">ข้อมูลการจัดส่ง</span>
                
                {/* [FLOW-FIX 2026-10-31] แสดงได้ทั้ง Processing และ Rejected (ต้องส่งคืนสินค้าทั้งสองกรณี)
                    เดิมแสดงเฉพาะ Processing ขึ้นไป → เคลมที่ Rejected มอบหมาย พขร. ไม่ได้
                    และซ่อนเมื่อ Shipping แล้ว (พขร. รับงานไปแล้ว) */}
                {canAssignDriver && (
                  <Button 
                    type={currentAssignment ? "default" : "primary"} 
                    icon={currentAssignment ? <CarOutlined /> : <PlusOutlined />} 
                    size="small" 
                    className="rounded-lg text-xs" 
                    onClick={openDeliveryModal}
                  >
                    {currentAssignment ? "เปลี่ยน พขร." : "มอบหมาย พขร."}
                  </Button>
                )}
              </div>
            }
            className="rounded-2xl shadow-sm border-gray-200 w-full"
            styles={{ body: { padding: "24px" } }}
          >
            <Descriptions column={1} bordered size="middle">
              <Descriptions.Item label="Driver ID (พขร.)">
                {latestDeliveryStatus8?.driver_id ||
                  deliveryFromLog?.driver_id ||
                  data?.delivery_driver ||
                  "-"}
              </Descriptions.Item>
              <Descriptions.Item label="ทะเบียนรถจัดส่ง">
                {latestDeliveryStatus8?.truck_plate ||
                  deliveryFromLog?.truck_plate ||
                  data?.delivery_plate ||
                  "-"}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </div>

        <div className="xl:col-span-1 flex flex-col gap-6 w-full">
          <Card title={<span className="font-medium text-slate-800">รูปภาพหลักฐาน ({allImages.length})</span>} className="rounded-2xl shadow-sm border-gray-200 w-full" styles={{ body: { padding: "24px" } }}>
            {allImages.length > 0 ? (
              <Image.PreviewGroup>
                <div className="grid grid-cols-2 gap-2">
                  {allImages.map((imgObj, idx) => (
                    <Image key={idx} width="100%" height={110} style={{ objectFit: "cover" }} className="rounded-lg border border-gray-200" src={imgObj.formattedUrl} />
                  ))}
                </div>
              </Image.PreviewGroup>
            ) : (
              <div className="text-gray-400 italic py-6 text-center">ไม่มีรูปภาพแนบ</div>
            )}
          </Card>

          {/* [UI-FIX 2026-10-31] ปรับดีไซน์การ์ด "ประวัติการพิจารณาอนุมัติ" ให้เข้ากับธีมหลัก
              - เดิม: พื้นหลังเขียว/แดงทั้งกล่อง, ตัวอักษร 11px, ฟอนต์ mono, สัญลักษณ์ ✓/✕ แบบข้อความ
              - ใหม่: การ์ดขาว + เส้นไทม์ไลน์แบบเดียวกับ "ประวัติการบันทึกสถานะ", ไอคอนสถานะสี,
                Tag แบบ rounded-full, ตัวอักษร 12–13px อ่านง่าย, หมายเหตุอยู่ในกล่องเทาอ่อน */}
          <Card
            title={
              <div className="flex justify-between items-center w-full gap-2">
                <span className="font-medium text-slate-800">ประวัติการพิจารณาอนุมัติ</span>
                {approveLogs.length > 0 && (
                  <span className="text-xs font-normal text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">
                    {approveLogs.length} รายการ
                  </span>
                )}
              </div>
            }
            className="rounded-2xl shadow-sm border-gray-200 w-full"
            styles={{ body: { padding: "20px 24px" } }}
          >
            {approveLogs.length > 0 ? (
              <ol className="relative flex flex-col gap-5 m-0 p-0 list-none">
                {approveLogs.map((item, idx) => {
                  const isApproved = String(item.approve_status) === "true" || String(item.approve_status) === "1";
                  const approverName = usersMap[String(item.approve_by)] || item.approve_by || "ไม่ระบุผู้พิจารณา";
                  const isLast = idx === approveLogs.length - 1;

                  return (
                    <li key={item.approve_id || idx} className="relative flex gap-3">
                      {/* เส้นเชื่อมไทม์ไลน์ */}
                      {!isLast && (
                        <span
                          aria-hidden="true"
                          className="absolute left-[11px] top-7 -bottom-5 w-px bg-slate-200"
                        />
                      )}

                      {/* ไอคอนสถานะ */}
                      <span
                        className={`relative z-10 flex items-center justify-center w-6 h-6 rounded-full bg-white shrink-0 text-lg leading-none ${
                          isApproved ? "text-emerald-600" : "text-red-500"
                        }`}
                      >
                        {isApproved ? <CheckCircleFilled /> : <CloseCircleFilled />}
                      </span>

                      <div className="flex flex-col gap-1.5 min-w-0 flex-1 pt-px">
                        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium border ${
                              isApproved
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }`}
                          >
                            {isApproved ? "อนุมัติเคลม" : "ไม่อนุมัติ (Rejected)"}
                          </span>
                          <span className="text-xs text-slate-400 whitespace-nowrap">
                            {formatDateString(item.approve_date)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[13px] min-w-0">
                          <UserOutlined className="text-slate-400 text-xs shrink-0" />
                          <span className="text-slate-500 shrink-0">ผู้พิจารณา:</span>
                          <span className="text-slate-800 font-medium truncate">{approverName}</span>
                        </div>

                        {item.approve_remark && (
                          <div className="text-[13px] leading-relaxed text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 break-words">
                            <span className="text-slate-500">หมายเหตุ: </span>
                            {item.approve_remark}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <AuditOutlined className="text-2xl text-slate-300" />
                <span className="text-sm text-slate-400">ยังไม่มีประวัติการพิจารณาอนุมัติ</span>
              </div>
            )}
          </Card>

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
                placeholder="เพิ่มความคิดเห็นส่วนตัว..."
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

          <Button icon={<ArrowLeftOutlined />} className="w-full rounded-xl border-gray-300 h-11" onClick={() => navigate("/staff/list-claim")}>
            {/* [UI-FIX 2026-10-31 R2] เดิม "กลับหน้ารายการคลังสินค้า" */}
            กลับหน้ารายการเคลม
          </Button>
        </div>
      </div>

      <DeliveryModal
        open={isDeliveryModalOpen}
        onCancel={() => !submittingDelivery && setIsDeliveryModalOpen(false)}
        onSave={handleSaveDelivery}
        submitting={submittingDelivery}
        deliveryForm={deliveryForm}
        setDeliveryForm={setDeliveryForm}
        claimId={data?.claim_id || claimId}
        isReassign={Boolean(currentAssignment)}
      />

      {/* 🟢 Modal อัปเดตสถานะ */}
      <Modal
        width={650}
        title="อัปเดตสถานะเคลม" /* [UI-FIX 2026-10-31 R2] เดิม "อัปเดตสถานะการเคลมสินค้า" */
        open={isModalOpen}
        onOk={handleSaveStatus}
        confirmLoading={isSubmitting}
        onCancel={() => !isSubmitting && setIsModalOpen(false)}
        okText="บันทึกสถานะ" /* [UI-FIX 2026-10-31 R2] เดิม "บันทึกเปลี่ยนสถานะ" */
        cancelText="ยกเลิก"
      >
        <div className="flex flex-col gap-4 py-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">เลือกสถานะใหม่ <span className="text-red-500">*</span>:</label>
            <Select
              className="w-full"
              value={formData.status}
              onChange={(val) => handleInputChange("status", val)}
              options={getNextStatusOptions(currentStatusInDB)}
              notFoundContent="ไม่มีสถานะถัดไปให้ดำเนินการ"
            />
          </div>

          {/* [FLOW-FIX 2026-10-31] Shipping ต้องมี พขร. ที่มอบหมายแล้ว */}
          {formData.status === "Shipping" && !currentAssignment && (
            <Alert
              type="warning"
              showIcon
              title="ยังไม่ได้มอบหมาย พขร."
              description="ปกติ พขร. จะเปลี่ยนเป็น Shipping เองจากแอป — กรุณามอบหมาย พขร. ก่อน"
              action={
                <Button size="small" onClick={() => { setIsModalOpen(false); openDeliveryModal(); }}>
                  มอบหมาย
                </Button>
              }
              className="rounded-xl"
            />
          )}

          {formData.status === "Shipping" && currentAssignment && (
            <div className="text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
              พขร. ที่มอบหมาย: <span className="font-medium text-slate-800">{currentAssignment.driver_id}</span>
              {currentAssignment.truck_plate ? ` · ทะเบียน ${currentAssignment.truck_plate}` : ""}
            </div>
          )}

          {["Processing", "กำลังดำเนินการ"].includes(formData.status) && (
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
              <label className="block text-sm font-medium text-slate-800 mb-2">
                {/* [UI-FIX 2026-10-31 R2] เดิม "ระบุจำนวนสินค้าที่อนุมัติเปลี่ยนเคลมจริง (Processing Qty):" */}
                จำนวนที่อนุมัติเปลี่ยนจริง:
              </label>
              <Table
                dataSource={claimItems}
                pagination={false}
                size="small"
                columns={[
                  { title: "ชื่อสินค้า", dataIndex: "item_name", key: "item_name" },
                  { title: "แจ้งเคลม", dataIndex: "qtychang", key: "qtychang", width: 90, align: "right" },
                  {
                    title: "อนุมัติ", // [UI-FIX 2026-10-31 R2] เดิม "จำนวนอนุมัติเปลี่ยน"
                    key: "approved_qty",
                    width: 140,
                    align: "center",
                    render: (_, record) => (
                      <InputNumber
                        min={0}
                        max={record.qtychang || 9999}
                        value={record.qty ?? record.approved_qty}
                        onChange={(val) => handleItemQtyChange(record.key || record.claim_item_id, val)}
                        className="w-24 text-center font-semibold"
                      />
                    ),
                  },
                ]}
              />
            </div>
          )}

          {["Rejected", "2", "7"].includes(formData.status) && (
            <div>
              <label className="block text-sm font-medium text-red-700 mb-1">เหตุผลการปฏิเสธ <span className="text-red-500">*</span>:</label>
              <Input.TextArea
                rows={3}
                placeholder="ระบุเหตุผลการปฏิเสธการเคลม..."
                value={formData.rejectReason}
                onChange={(e) => handleInputChange("rejectReason", e.target.value)}
              />
            </div>
          )}
        </div>
      </Modal>

      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800 font-medium">
            <HistoryOutlined />
            <span>ประวัติสถานะทั้งหมด</span>
          </div>
        }
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

export default StaffClaimUpdate;