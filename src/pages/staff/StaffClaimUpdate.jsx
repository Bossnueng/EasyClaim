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
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";

import { useClaimRealtime } from "../../hooks/useClaimRealtime";
import ClaimPrintModal from "../../components/ClaimPrintModal";
import ClaimStatusTag from "../../components/ClaimStatusTag";
import ClaimTimeline from "../../components/claim/ClaimTimeline";
import DeliveryModal from "../../components/claim/DeliveryModal";
import { STATUS_PRIORITY, getStatusName, getStatusId } from "../../constants/claimStatus";

import claimService from "../../services/claimService";
import itemService from "../../services/itemService";
import loginService from "../../services/loginService";
import { userService } from "../../services/userService";
import deliveryService from "../../services/deliveryService";
import agentService from "../../services/agentService";
import { getAgentNameByUserId } from "../../utils/agentHelper";
import { parseDateSafely } from "../../utils/dateUtils";

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

const getPreviousStatusName = (currentStatus) => {
  const normalizedCurrent = getStatusName(currentStatus);

  if (normalizedCurrent === "Rejected") return "Pending";
  if (normalizedCurrent === "Approved") return "Pending";
  if (normalizedCurrent === "Processing") return "Approved";
  if (normalizedCurrent === "Shipping") return "Processing";
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
    status: "สร้างรายการเคลม",
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

  // 🟢 อัปเดตจำนวน qty ของแต่ละรายการสินค้าใน Modal
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
          const allDeliveryData = Array.isArray(resDeliveries?.data) ? resDeliveries.data : Array.isArray(resDeliveries) ? resDeliveries : [];
          const matchedDeliveries = allDeliveryData.filter((d) => String(d.claim_id) === String(currentClaim.claim_id));
          setDeliveryDataList(matchedDeliveries);

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

          const currentStatusName = getStatusName(currentClaim.current_status || "สร้างรายการเคลม");

          if (!isModalOpenRef.current) {
            setFormData({
              status: currentStatusName,
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

  // 🟢 ปรับปรุงให้สถานะ Rejected สามารถเลือกเปลี่ยนสถานะไปยัง Shipping หรือเปลี่ยนสถานะถัดไปได้อีก
  const getNextStatusOptions = (currentStatus) => {
    const normalized = getStatusName(currentStatus);

    switch (normalized) {
      case "Pending":
        return [
          { value: "Approved", label: "2. Approved (อนุมัติเคลม)" },
          { value: "Rejected", label: "2. Rejected (ปฏิเสธ)" },
        ];
      case "Approved":
        return [
          { value: "Processing", label: "3. Processing (กำลังดำเนินการ)" },
          { value: "Rejected", label: "2. Rejected (ปฏิเสธ)" },
        ];
      case "Processing":
        return [
          { value: "Shipping", label: "4. Shipping (กำลังจัดส่ง)" },
          { value: "Rejected", label: "2. Rejected (ปฏิเสธ)" },
        ];
      case "Rejected": // 🟢 เมื่อสถานะเป็น Rejected จะสามารถสลับเปลี่ยนไป Shipping (ส่งคืนสินค้าปฏิเสธ) หรือ Processing ได้อีก
        return [
          { value: "Shipping", label: "4. Shipping (กำลังจัดส่งคืนสินค้า)" },
          { value: "Processing", label: "3. Processing (กำลังดำเนินการ)" },
          { value: "Approved", label: "2. Approved (อนุมัติเคลม)" },
        ];
      case "Shipping":
        return [
          { value: "Delivered", label: "5. Delivered (จัดส่งสำเร็จ)" },
          { value: "Rejected", label: "2. Rejected (ปฏิเสธ)" },
        ];
      default:
        return [];
    }
  };

  useClaimRealtime({
    claimId: claimId,
    isStaff: true,
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
    if (!deliveryForm.driver_id || !deliveryForm.truck_plate) {
      message.error("กรุณากรอก Driver ID และทะเบียนรถให้ครบถ้วน");
      return;
    }

    setSubmittingDelivery(true);
    try {
      await deliveryService.createDelivery({
        claim_id: String(data.claim_id),
        driver_id: String(deliveryForm.driver_id),
        delivery_status: String(deliveryForm.delivery_status || "8"),
        truck_plate: String(deliveryForm.truck_plate),
      });

      const rawStatusVal = data?.current_status || "1";
      await claimService.createClaimStatusLogs({
        claim_id: String(data.claim_id),
        status: String(getStatusId(rawStatusVal)),
        remark: `มอบหมายงาน พขร. (Delivery): Driver ID ${deliveryForm.driver_id}, ทะเบียนรถ ${deliveryForm.truck_plate}`,
        update_by: String(currentUserId),
        user_id: String(currentUserId),
      });

      message.success("สร้างรายการจัดส่งสินค้าเรียบร้อยแล้ว");
      setIsDeliveryModalOpen(false);
      setDeliveryForm({ driver_id: "", truck_plate: "", delivery_status: "8" });
      await fetchClaimDetail(false);
    } catch (err) {
      message.error("สร้างรายการจัดส่งไม่สำเร็จ: " + (err.message || "เกิดข้อผิดพลาด"));
    } finally {
      setSubmittingDelivery(false);
    }
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
    const previousStatusName = getPreviousStatusName(currentStatusInDB);
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

      await claimService.updateClaim({
        ...data,
        claim_id: realClaimId,
        current_status: statusId,
        update_by: currentUserId,
      });

      await claimService.createClaimStatusLogs({
        claim_id: String(realClaimId),
        status: statusId,
        remark: `ถอยสถานะย้อนกลับเป็น ${targetStatus}`,
        update_by: currentUserId,
        user_id: currentUserId,
      });

      message.success(`ถอยสถานะกลับเป็น "${targetStatus}" เรียบร้อยแล้ว`);
      await fetchClaimDetail(true);
    } catch (error) {
      message.error(error.message || "เกิดข้อผิดพลาดในการถอยสถานะ");
    } finally {
      setLoading(false);
    }
  };

  // 🟢 ฟังก์ชันหลักในการอัปเดตสถานะ
  const handleSaveStatus = async () => {
    const isRejectedStatus = ["Rejected", "2", "7", "ปฏิเสธ/ไม่อนุมัติเคลม", "ไม่อนุมัติเคลมสินค้า"].includes(formData.status);
    if (isRejectedStatus && !formData.rejectReason.trim()) {
      message.error("กรุณาระบุเหตุผลการปฏิเสธการเคลม");
      return;
    }

    setIsSubmitting(true);
    try {
      const realClaimId = data.claim_id;
      const targetStatusName = formData.status;
      const statusId = String(getStatusId(targetStatusName)); // เช่น "7", "8", "9", "10"

      const extraData = {
        driverName: formData.driverName,
        truckPlate: formData.truckPlate,
        deliveryDriver: formData.deliveryDriver,
        deliveryPlate: formData.deliveryPlate,
        estimatedDeliveryDate: formData.estimatedDeliveryDate ? dayjs(formData.estimatedDeliveryDate).format("YYYY-MM-DD") : "",
      };

      const fullRemark = isRejectedStatus
        ? `ปฏิเสธรายการเคลม: ${formData.rejectReason} | DATA:${JSON.stringify(extraData)}`
        : `เปลี่ยนสถานะเป็น ${targetStatusName} | DATA:${JSON.stringify(extraData)}`;

      // 🟢 1. อัปเดตรายการสินค้า: ถ้าเปน Rejected ให้ปรับ qty = 0 และ approved_qty = 0 ทั้งหมดอัตโนมัติ
      const updatedClaimItems = claimItems.map((ci) => {
        if (isRejectedStatus) {
          return { ...ci, qty: 0, approved_qty: 0 };
        }
        return { ...ci, qty: ci.qty ?? ci.approved_qty ?? 0 };
      });

      await claimService.updateClaim({
        claim_id: realClaimId,
        items: updatedClaimItems,
      });

      // 🟢 2. กำหนดคอลัมน์วันที่ตาม allowedColumns ใน Backend (claimController.js)
      let targetColumn = "approve_date";
      if (["Processing", "8"].includes(statusId) || targetStatusName === "Processing") {
        targetColumn = "warehouse_receive_date";
      }
      if (["Shipping", "9"].includes(statusId) || targetStatusName === "Shipping") {
        targetColumn = "delivery_date";
      }
      if (["Delivered", "10"].includes(statusId) || targetStatusName === "Delivered") {
        targetColumn = "receive_finish_date";
      }

      // 🟢 3. กรณีเลือกเป็น Rejected (ID: 7): ให้ยิง Auto-Stamp ขั้นตอน Processing (ID: 8) อัตโนมัติด้วย
      if (isRejectedStatus) {
        try {
          // Stamp Log ของ Processing (ID 8) เบื้องหลังทันที
          await claimService.createClaimStatusLogs({
            claim_id: String(realClaimId),
            status: "8",
            remark: `Auto-Stamp สถานะ Processing เนื่องจากการปฏิเสธรายการเคลม`,
            update_by: String(currentUserId),
            user_id: String(currentUserId),
          });

          // อัปเดตคอลัมน์ warehouse_receive_date
          if (claimService.updateClaimDate) {
            await claimService.updateClaimDate({
              claim_id: realClaimId,
              status: "Processing",
              columnname: "warehouse_receive_date",
            });
          }
        } catch (autoErr) {
          console.warn("Auto-stamp Processing log failed:", autoErr);
        }
      }

      // 🟢 4. บันทึก Delivery ก่อน (กรณีเปลี่ยนเป็น Shipping / 9)
      if (targetStatusName === "Shipping" || statusId === "9") {
        try {
          await deliveryService.createDelivery({
            claim_id: String(realClaimId),
            driver_id: String(formData.driverName || formData.deliveryDriver || data.delivery_driver || "70079126"),
            delivery_status: "9", // ส่งเป็น 9 เพื่อไม่ให้ Backend เขียนทับกลับเป็น 8 (Processing)
            truck_plate: String(formData.truckPlate || formData.deliveryPlate || data.delivery_plate || "-"),
          });
        } catch (deliveryErr) {
          console.error("Error creating delivery on Shipping status:", deliveryErr);
        }
      }

      // 🟢 5. อัปเดตสถานะหลักผ่าน updateClaimDate เป็นลำดับสุดท้าย
      if (claimService.updateClaimDate) {
        await claimService.updateClaimDate({
          claim_id: realClaimId,
          status: targetStatusName,
          columnname: targetColumn,
        });
      }

      // 🟢 6. บันทึก Log การเปลี่ยนสถานะหลัก
      await claimService.createClaimStatusLogs({
        claim_id: String(realClaimId),
        status: statusId,
        remark: fullRemark,
        update_by: String(currentUserId),
        user_id: String(currentUserId),
      });

      // 🟢 7. บันทึกประวัติอนุมัติ/ปฏิเสธ
      if (isRejectedStatus || targetStatusName === "Approved" || targetStatusName === "Processing") {
        await claimService.createClaimapproves({
          claim_id: String(realClaimId),
          approve_by: String(currentUserId),
          approve_status: isRejectedStatus ? "false" : "true",
          approve_remark: isRejectedStatus ? formData.rejectReason : `ดำเนินการสถานะ: ${targetStatusName}`,
        });
      }

      message.success(`อัปเดตสถานะเป็น ${targetStatusName} เรียบร้อยแล้ว`);
      setIsModalOpen(false);
      await fetchClaimDetail(false);
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

  const isFinalStatus = currentStatusInDB === "Delivered" || currentStatusInDB === "จัดส่งสินค้าเคลมสำเร็จ";
  const previousStatusName = getPreviousStatusName(currentStatusInDB);

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

  // 🟢 คำนวณ currentStepIndex รองรับเคสที่ผ่านการ Rejected แต่เดินทางต่อเข้าสู่ Shipping / Delivered
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
      description: getLogDate(6) !== "-" ? getLogDate(6) : getLogDate(7),
    },
    {
      title: "3. Processing",
      description: getLogDate(8),
    },
    {
      title: "4. Shipping",
      description: getLogDate(9),
    },
    {
      title: "5. Delivered",
      description: getLogDate(10),
    },
  ];

  const creatorUserId = String(data.user_id || data.created_by || "");
  const matchedAgentName = agentsMap[String(data.agent_id)] || agentsMap[String(data.agent_code)] || getAgentNameByUserId(creatorUserId, usersList, agentsMap);
  const agentNameDisplay = (matchedAgentName && matchedAgentName !== "-") ? matchedAgentName : (data.agent_name || data.agentName || "-");
  const reporterNameDisplay = usersMap[creatorUserId] || data.created_by || data.reporter || "-";
  const latestDelivery = deliveryDataList.length > 0 ? deliveryDataList[deliveryDataList.length - 1] : null;

  const itemColumns = [
    { title: "ลำดับ", key: "index", width: 60, align: "center", render: (_, __, index) => index + 1 },
    { title: "ชื่อสินค้า", dataIndex: "item_name", key: "item_name", render: (text) => <span className="font-medium text-slate-800 break-words">{text}</span> },
    { title: "จำนวนรับคืน", dataIndex: "qtychang", key: "qtychang", width: 110, align: "right", render: (qty) => <span className="font-semibold text-slate-700">{qty ?? "-"}</span> },
    { title: "จำนวนแตก/อนุมัติ", dataIndex: "qty", key: "qty", width: 120, align: "right", render: (appQty, record) => <span className="font-semibold text-emerald-600">{appQty ?? record.approved_qty ?? "-"}</span> },
    { title: "จำนวนส่งคืน", dataIndex: "qtyreceived", key: "qtyreceived", width: 110, align: "right", render: (retQty, record) => <span className="font-semibold text-amber-600">{retQty ?? record.returned_qty ?? "-"}</span> },
    {
      title: "สาเหตุ",
      dataIndex: "item_remark",
      key: "item_remark",
      render: (text) => <div className="text-xs text-slate-600 whitespace-pre-wrap break-words">{text || "-"}</div>,
    },
  ];

  return (
    <div className="w-full flex flex-col gap-6 font-normal p-4 sm:p-6" style={{ boxSizing: "border-box" }}>
      {/* Header Card */}
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

            {STATUS_PRIORITY[currentStatusInDB] >= 4 && (
              <div>
                <Button
                  type="default"
                  icon={<PrinterOutlined />}
                  className="border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl h-10"
                  onClick={() => setIsPreviewModalOpen(true)}
                >
                  พิมพ์ / ดาวน์โหลดเอกสาร
                </Button>
                <ClaimPrintModal
                  open={isPreviewModalOpen}
                  onClose={() => setIsPreviewModalOpen(false)}
                  isStaff={true}
                  data={{
                    ...data,
                    claimNo: data.claim_no || data.claim_id,
                    agentName: agentNameDisplay,
                    reporter: reporterNameDisplay,
                    items: claimItems,
                  }}
                />
              </div>
            )}

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

            <Button
              type="primary"
              icon={<SaveOutlined />}
              className="bg-blue-600 hover:bg-blue-700 rounded-xl h-10 shadow-md"
              onClick={() => setIsModalOpen(true)}
            >
              อัปเดตสถานะ
            </Button>
          </div>
        </div>
      </Card>

      {/* 🟢 Steps Timeline Card */}
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
              <div className="flex justify-between items-center w-full">
                <span className="font-medium text-slate-800">ข้อมูลการจัดส่งสินค้าเคลม (Delivery)</span>
                <Button type="primary" icon={<PlusOutlined />} size="small" className="bg-blue-600 rounded-lg text-xs" onClick={() => setIsDeliveryModalOpen(true)}>
                  มอบหมายงาน พขร. (บันทึก Delivery)
                </Button>
              </div>
            }
            className="rounded-2xl shadow-sm border-gray-200 w-full"
            styles={{ body: { padding: "24px" } }}
          >
            <Descriptions column={1} bordered size="middle">
              <Descriptions.Item label="Driver ID (พขร.)">{latestDelivery?.driver_id || data.delivery_driver || "-"}</Descriptions.Item>
              <Descriptions.Item label="ทะเบียนรถจัดส่ง">{latestDelivery?.truck_plate || data.delivery_plate || "-"}</Descriptions.Item>
            </Descriptions>
          </Card>
        </div>

        <div className="xl:col-span-1 flex flex-col gap-6 w-full">
          <Card title={<span className="font-medium text-slate-800">รูปภาพหลักฐานทั้งหมด ({allImages.length})</span>} className="rounded-2xl shadow-sm border-gray-200 w-full" styles={{ body: { padding: "24px" } }}>
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

          <Card title={<span className="font-medium text-slate-800">ประวัติการพิจารณาอนุมัติ</span>} className="rounded-2xl shadow-sm border-gray-200 w-full" styles={{ body: { padding: "16px" } }}>
            {approveLogs.length > 0 ? (
              <div className="flex flex-col gap-2">
                {approveLogs.map((item, idx) => (
                  <div key={idx} className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs flex flex-col gap-1">
                    <div className="flex justify-between font-medium">
                      <span>{item.approve_status === "true" || item.approve_status === "1" ? "อนุมัติ" : "ไม่อนุมัติ"}</span>
                      <span className="text-gray-400 font-mono">{formatDateString(item.approve_date)}</span>
                    </div>
                    {item.approve_remark && <div className="text-gray-500 italic">หมายเหตุ: {item.approve_remark}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-400 italic text-center py-4 text-xs">ยังไม่มีประวัติการพิจารณาอนุมัติ</div>
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
            styles={{ body: { padding: "16px" } }}
          >
            <ClaimTimeline
              statusLogs={statusLogs.filter((l) => l.remark && !l.remark.startsWith("[MSG]"))}
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
            กลับหน้ารายการคลังสินค้า
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
      />

      {/* 🟢 Modal อัปเดตสถานะ */}
      <Modal
        width={650}
        title="อัปเดตสถานะการเคลมสินค้า"
        open={isModalOpen}
        onOk={handleSaveStatus}
        confirmLoading={isSubmitting}
        onCancel={() => !isSubmitting && setIsModalOpen(false)}
        okText="บันทึกเปลี่ยนสถานะ"
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

          {/* 🟢 ส่วนกรอกจำนวนสินค้าเมื่อเลือกเป็น Processing */}
          {["Processing", "กำลังดำเนินการ"].includes(formData.status) && (
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
              <label className="block text-sm font-medium text-slate-800 mb-2">
                ระบุจำนวนสินค้าที่อนุมัติเปลี่ยนเคลมจริง (Processing Qty):
              </label>
              <Table
                dataSource={claimItems}
                pagination={false}
                size="small"
                columns={[
                  { title: "ชื่อสินค้า", dataIndex: "item_name", key: "item_name" },
                  { title: "จำนวนแจ้งเคลม", dataIndex: "qtychang", key: "qtychang", width: 110, align: "right" },
                  {
                    title: "จำนวนอนุมัติเปลี่ยน",
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
            <span>ประวัติการบันทึกสถานะทั้งหมด (Log History)</span>
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