// src/pages/staff/StaffClaimUpdate.jsx

import React, { useState, useEffect } from "react";
import {
  Card,
  Descriptions,
  Button,
  Steps,
  Image,
  ConfigProvider,
  Select,
  Input,
  DatePicker,
  Modal,
  message,
  Spin,
  Table,
  Tag,
  InputNumber,
  Timeline,
} from "antd";
import {
  CheckCircleOutlined,
  FileSearchOutlined,
  CloseCircleOutlined,
  CarOutlined,
  SmileOutlined,
  SaveOutlined,
  PrinterOutlined,
  UndoOutlined,
  PictureOutlined,
  SendOutlined,
  UserOutlined,
  EllipsisOutlined,
  HistoryOutlined,
  PlusOutlined,
  MinusCircleOutlined, ArrowLeftOutlined
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { useClaimRealtime } from "../../hooks/useClaimRealtime";
import dayjs from "dayjs";
import ClaimPrintModal from "../../components/ClaimPrintModal";
import ClaimStatusTag from "../../components/ClaimStatusTag";
import { STATUS_PRIORITY, getStatusName, getStatusId } from "../../constants/claimStatus";
import claimService from "../../services/claimService";
import itemService from "../../services/itemService";
import loginService from "../../services/loginService";
import { userService } from "../../services/userService";
import deliveryService from "../../services/deliveryService";
import agentService from "../../services/agentService";
import { getAgentNameByUserId } from "../../utils/agentHelper";

const formatDateString = (date) => {
  if (!date) return "-";
  const parsed = dayjs(date);
  if (!parsed.isValid()) return "-";
  return parsed.format("DD/MM/YYYY HH:mm");
};

const formatDate = (date) => {
  if (!date) return "-";
  const parsed = dayjs(date);
  if (!parsed.isValid()) return "-";

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

const isValidStatusTransition = (currentStatus, newStatus) => {
  if (currentStatus === newStatus) return true;
  
  let normalizedCurrent = getStatusName(currentStatus);
  let normalizedNew = getStatusName(newStatus);

  if (normalizedCurrent === "Pending" || normalizedCurrent === "รอการพิจารณา") {
    if (
      normalizedNew === "Approved" || 
      normalizedNew === "Rejected" ||
      normalizedNew === "อนุมัติเคลมสินค้า" || 
      normalizedNew === "ไม่อนุมัติเคลมสินค้า"
    ) {
      return true;
    }
  }

  if (
    (normalizedCurrent === "Approved" || normalizedCurrent === "อนุมัติเคลมสินค้า") &&
    (normalizedNew === "Processing" || normalizedNew === "Shipping" || normalizedNew === "Rejected")
  ) {
    return true;
  }

  // 🟢 จาก Rejected สามารถไป Shipping (จัดส่งคืนของปฏิเสธ) หรือ ย้อนกลับไป Approved ได้
  if (normalizedCurrent === "Rejected" || normalizedCurrent === "ไม่อนุมัติเคลมสินค้า") {
    if (
      normalizedNew === "Shipping" || 
      normalizedNew === "กำลังจัดส่งสินค้าเคลม" ||
      normalizedNew === "Approved" || 
      normalizedNew === "อนุมัติเคลมสินค้า"
    ) {
      return true;
    }
  }

  if (normalizedCurrent === "Processing" && (normalizedNew === "Shipping" || normalizedNew === "Approved")) return true;
  if (normalizedCurrent === "Shipping" && (normalizedNew === "Delivered" || normalizedNew === "Processing" || normalizedNew === "Rejected")) return true;

  return true;
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

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === "status" && (value === "Processing" || value === "กำลังดำเนินการเปลี่ยนสินค้า")) {
      setClaimItems((prevItems) =>
        prevItems.map((item) => ({
          ...item,
          approved_qty: item.approved_qty ?? item.qtychang ?? item.qty,
        }))
      );
    }
  };

  const handleItemChange = (index, field, value) => {
    setClaimItems((prevItems) => {
      const updated = [...prevItems];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  useClaimRealtime({
    claimId: claimId,
    isStaff: true,
    onStatusUpdated: () => {
      fetchClaimDetail(false);
    },
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
      if (!isModalOpen && !isDeliveryModalOpen) {
        fetchClaimDetail(false);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [claimId, isModalOpen, isDeliveryModalOpen]);

  const fetchClaimDetail = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [resClaim, resMasterItems, resLogs, resApproves, resUsers, resAgents, resDeliveries] = await Promise.all([
        claimService.getClaim(),
        itemService.getItems(),
        claimService.getClaimStatusLogs(),
        claimService.getclaimapproves(),
        userService.getUsers(),
        agentService.getAgent(),
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

      const claimsList = Array.isArray(resClaim?.data)
        ? resClaim.data
        : Array.isArray(resClaim)
        ? resClaim
        : [];

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

          let userAgentIdentifiers = [];

          if (Array.isArray(currentUser?.agent_ids)) {
            currentUser.agent_ids.forEach((id) => {
              userAgentIdentifiers.push(String(id));
            });
          } else if (currentUser?.agent_id) {
            userAgentIdentifiers.push(String(currentUser.agent_id));
          }

          if (Array.isArray(agentsData)) {
            agentsData.forEach((agent) => {
              const aId = String(agent.agent_id || agent.id || "");
              const aCode = String(agent.agent_code || agent.code || "");
              
              if (userAgentIdentifiers.includes(aId) && aCode) {
                userAgentIdentifiers.push(aCode);
              }
            });
          } 
          const claimAgentId = String(currentClaim.agent_id || "");
          const claimAgentCode = String(currentClaim.agent_code || "");

          if (
            userRoleId !== 1 &&
            userAgentIdentifiers.length > 0 &&
            !userAgentIdentifiers.includes(claimAgentId) &&
            !userAgentIdentifiers.includes(claimAgentCode)
          ) {
            message.error("คุณไม่มีสิทธิ์เข้าถึงรายการเคลมนี้");
            navigate("/staff/list-claim");
            return;
          }
          
          const logsData = resLogs?.data || resLogs || [];
          const filteredLogs = Array.isArray(logsData)
            ? logsData.filter((log) => String(log.claim_id) === String(currentClaim.claim_id))
            : [];
          setStatusLogs(filteredLogs);

          const extraLogData = parseExtraDataFromLogs(filteredLogs) || {};
          const extraItemsMap = {};
          if (Array.isArray(extraLogData.items)) {
            extraLogData.items.forEach((eItem) => {
              if (eItem.itemName) {
                extraItemsMap[eItem.itemName] = eItem;
              }
            });
          }

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
                return {
                  ...img,
                  formattedUrl,
                };
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
                  withdraw_date: ci.withdraw_date ? dayjs(ci.withdraw_date) : null,
                  lot_no_change: ci.lot_no_change || "",
                  mfg_date_change: ci.mfg_date_change ? dayjs(ci.mfg_date_change) : null,
                };
              });
            }
          } catch (itemsErr) {
            console.warn("ไม่สามารถดึงรายการสินค้าเคลมได้:", itemsErr);
            if (currentClaim.item_id) {
              const fallbackItemName = masterItemsMap[currentClaim.item_id] || `สินค้า ID: ${currentClaim.item_id}`;
              const extraItem = extraItemsMap[fallbackItemName] || extraLogData.items?.[0] || {};
              const fallbackReceivedQty = extraItem.receivedQty ?? currentClaim.qty;
              const fallbackReturnedQty = extraItem.returnedQty ?? currentClaim.qty;
              const fallbackApprovedQty = extraItem.approvedQty ?? currentClaim.qty;

              itemsList = [
                {
                  key: 1,
                  item_id: currentClaim.item_id,
                  item_name: fallbackItemName,
                  lot_no: currentClaim.lot_no || currentClaim.lot,
                  mfg_date: currentClaim.mfg_date,
                  expire_date: currentClaim.exp_date || currentClaim.expire_date,
                  qty: currentClaim.qty, 
                  qtyreceived: currentClaim.qtyreceived,
                  qtychang: currentClaim.qtychang, 
                  approved_qty: fallbackApprovedQty,
                  returned_qty: fallbackReturnedQty,
                  withdraw_date: currentClaim.withdraw_date ? dayjs(currentClaim.withdraw_date) : null,
                  lot_no_change: currentClaim.lot_no_change || "",
                  mfg_date_change: currentClaim.mfg_date_change ? dayjs(currentClaim.mfg_date_change) : null,
                  remark: currentClaim.remark || currentClaim.claim_reason || currentClaim.detail,
                  images: rawImages.map((i) => i.formattedUrl),
                },
              ];
            }
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

          if (!isModalOpen) {
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
            const filteredApproves = approvesData.filter(
              (app) => String(app.claim_id) === String(currentClaim.claim_id)
            );
            setApproveLogs(filteredApproves);
          }
        } else {
          message.error(`ไม่พบข้อมูลรายการเคลมรหัส: ${claimId}`);
        }
      } else {
        message.error("ไม่พบข้อมูลรายการเคลมในระบบ");
      }
    } catch (error) {
      message.error("ไม่สามารถดึงข้อมูลได้: " + (error.message || "เกิดข้อผิดพลาด"));
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // 🟢 ฟังก์ชัน handleSaveDelivery ฉบับปรับปรุง (ยิง /createDelivery + บันทึก Status Log)
  const handleSaveDelivery = async () => {
    if (!deliveryForm.driver_id || !deliveryForm.truck_plate) {
      message.error("กรุณากรอก Driver ID และทะเบียนรถให้ครบถ้วน");
      return;
    }

    setSubmittingDelivery(true);
    try {
      const payload = {
        claim_id: String(data.claim_id),
        driver_id: String(deliveryForm.driver_id),
        delivery_status: String(deliveryForm.delivery_status || "8"),
        truck_plate: String(deliveryForm.truck_plate),
      };

      // 1. บันทึกข้อมูลลงตาราง Delivery
      await deliveryService.createDelivery(payload);

      // 2. 🟢 เพิ่มส่วนนี้: บันทึกประวัติลงตาราง claim_status_logs
      const rawStatusVal = data?.current_status || data?.status || "1";
      const targetStatusId = String(getStatusId(rawStatusVal));
      const logRemark = `มอบหมายงาน พขร. (Delivery): Driver ID ${deliveryForm.driver_id}, ทะเบียนรถ ${deliveryForm.truck_plate}`;

      await claimService.createClaimStatusLogs({
        claim_id: String(data.claim_id),
        status: targetStatusId,
        remark: logRemark,
        update_by: String(currentUserId),
        user_id: String(currentUserId),
      });

      message.success("สร้างรายการจัดส่งสินค้า (มอบหมาย พขร.) และบันทึก Log เรียบร้อยแล้ว");
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
      const userId = String(currentUserId || currentUser?.user_id || currentUser?.id || "");
      const realClaimId = data.claim_id;
      const formattedRemark = `[MSG] [STAFF] ${messageToSend}`;

      const rawStatusVal = data?.current_status || data?.status || data?.status_id || "1";
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
    } catch (err) {
      message.error("ส่งข้อความไม่สำเร็จ: " + (err.message || "เกิดข้อผิดพลาด"));
    } finally {
      setSendingMsg(false);
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

  const lastStatusLog = statusLogs
    .filter((l) => l.remark && !l.remark.startsWith("[MSG]"))
    .slice(-1)[0];

  const hasRejectInLogs = statusLogs.some(
    (log) => log.remark && (log.remark.includes("ปฏิเสธรายการเคลม") || String(log.status) === "2" || String(log.status) === "7")
  );
  
  const hasRejectInApproves = approveLogs.some(
    (app) => String(app.approve_status) === "false" || String(app.approve_status) === "0"
  );

  const rawStatus = data?.current_status || lastStatusLog?.status || "1";
  const rawStatusId = String(getStatusId(rawStatus));

  const isRejectedInDB =
    hasRejectInLogs ||
    hasRejectInApproves ||
    ["2", "3", "7", "rejected", "ไม่อนุมัติเคลมสินค้า", "ไม่มีสิทธิ์เคลม"].includes(String(rawStatus).toLowerCase()) ||
    ["2", "3", "7"].includes(rawStatusId);

  const currentStatusInDB = (rawStatus === "pending" || rawStatus === "5")
    ? "รอการพิจารณา"
    : getStatusName(rawStatus);

  const currentStatusId = String(getStatusId(rawStatus));
  // ใช้สถานะปัจจุบันสำหรับสี Timeline และตัวเลือกขั้นตอนถัดไป
  // ไม่ใช้ประวัติการ Reject อย่างเดียว เพราะเมื่อเปลี่ยนเป็น Shipping แล้ว
  // ผู้ใช้ต้องสามารถไป Delivered ต่อได้ตามปกติ
  const isCurrentStatusRejected =
    [
      "Rejected",
      "ไม่อนุมัติเคลมสินค้า",
      "ไม่มีสิทธิ์เคลม",
      "ปฏิเสธ/ไม่อนุมัติเคลม",
      "ปฏิเสธรายการเคลม",
    ].includes(String(currentStatusInDB).trim()) ||
    [
      "rejected",
      "ไม่อนุมัติเคลมสินค้า",
      "ไม่มีสิทธิ์เคลม",
      "ปฏิเสธ/ไม่อนุมัติเคลม",
      "ปฏิเสธรายการเคลม",
    ].includes(String(rawStatus).trim().toLowerCase()) ||
    // บางรายการเก็บสถานะเป็นตัวเลข ไม่ใช่คำว่า Rejected
    (isRejectedInDB && ["2", "3", "7"].includes(String(rawStatus).trim()) &&
      !["8", "9", "10"].includes(String(currentStatusId)));

  const isModalStatusRejected = 
    formData.status === "Rejected" || 
    formData.status === "2" || 
    formData.status === "7" || 
    formData.status === "ปฏิเสธ/ไม่อนุมัติเคลม" || 
    formData.status === "ไม่อนุมัติเคลมสินค้า" || 
    formData.status === "ไม่มีสิทธิ์เคลม";

  const isFinalStatus = currentStatusInDB === "จัดส่งสินค้าเคลมสำเร็จ";
  const previousStatusName = getPreviousStatusName(currentStatusInDB);

  const getLogRawDateString = (statusTarget) => {
    const targetId = String(statusTarget);

    if (targetId === "1" || targetId === "5") return formatDateString(data?.created_at || data?.claim_date);

    const matchingLogs = statusLogs.filter(
      (item) => String(item.status || item.status_id) === targetId
    );

    if (matchingLogs.length > 0) {
      const lastLog = matchingLogs[matchingLogs.length - 1];
      const rawDate = lastLog.update_date || lastLog.created_at || lastLog.created_date;
      return formatDateString(rawDate);
    }

    if (targetId === "2" || targetId === "6") return formatDateString(data.approve_date);
    if (targetId === "4") return formatDateString(data.driver_receive_date || data.warehouse_receive_date);
    if (targetId === "8") return formatDateString(data.withdraw_date);
    if (targetId === "9") return formatDateString(data.delivery_date);
    if (targetId === "10") return formatDateString(data.receive_finish_date);

    return "-";
  };

  const getLogDate = (targetStatusId) => {
    const targetId = String(targetStatusId);
    
    if (["1", "5", "Pending"].includes(targetId)) {
      return formatDate(data?.created_at || data?.claim_date);
    }

    const targetName = getStatusName(targetId);
    const matchingLogs = statusLogs.filter((log) => {
      const logStatusStr = String(log.status || log.status_id || "");
      return logStatusStr === targetId || getStatusName(logStatusStr) === targetName;
    });

    if (matchingLogs.length > 0) {
      const lastLog = matchingLogs[matchingLogs.length - 1];
      const logDate = lastLog.update_date || lastLog.created_at || lastLog.created_date;
      if (logDate) return formatDate(logDate);
    }

    if (["2", "6", "Approved"].includes(targetId)) return formatDate(data?.approve_date);
    if (["8", "Processing"].includes(targetId)) return formatDate(data?.warehouse_receive_date);
    if (["9", "Shipping"].includes(targetId)) return formatDate(data?.delivery_date);
    if (["10", "Delivered"].includes(targetId)) return formatDate(data?.receive_finish_date);

    return "-";
  };

  const handleStepBack = () => {
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
        await processStatusChange(previousStatusName, true);
      },
    });
  };

  const processStatusChange = async (targetStatus, isSteppingBack = false) => {
    if (!currentUserId) {
      message.error("ไม่พบรหัสผู้ใช้งาน กรุณาล็อกอินใหม่อีกครั้ง");
      return;
    }

    setLoading(true);

    try {
      const realClaimId = data.claim_id;
      const statusId = String(getStatusId(targetStatus));

      let columnName = "approve_date";
      if (targetStatus === "Approved" || targetStatus === "อนุมัติเคลมสินค้า") {
        columnName = "approve_date";
      } else if (targetStatus === "Processing" || targetStatus === "กำลังดำเนินการเปลี่ยนสินค้า") {
        columnName = "warehouse_receive_date";
      } else if (targetStatus === "Shipping" || targetStatus === "กำลังจัดส่งสินค้าเคลม") {
        columnName = "delivery_date";
      } else if (targetStatus === "Delivered" || targetStatus === "จัดส่งสินค้าเคลมสำเร็จ") {
        columnName = "receive_finish_date";
      }

      await claimService.updateClaimDate({
        claim_id: Number(realClaimId),
        columnname: columnName,
        status: statusId,
      });

      const extraData = {
        driverName: formData.driverName,
        truckPlate: formData.truckPlate,
        deliveryDriver: formData.deliveryDriver,
        deliveryPlate: formData.deliveryPlate,
        estimatedDeliveryDate: formData.estimatedDeliveryDate ? dayjs(formData.estimatedDeliveryDate).format("YYYY-MM-DD") : "",
      };

      const fullRemark = `ถอยสถานะย้อนกลับจาก (${currentStatusInDB}) เป็น ${targetStatus} | DATA:${JSON.stringify(extraData)}`;

      await claimService.createClaimStatusLogs({
        claim_id: String(realClaimId),
        status: String(statusId),
        remark: fullRemark,
        update_by: currentUserId,
        user_id: currentUserId,
      });

      message.success(`ถอยสถานะกลับเป็น "${targetStatus}" เรียบร้อยแล้ว`);
      await fetchClaimDetail();

    } catch (error) {
      message.error(error.message || "เกิดข้อผิดพลาดในการถอยสถานะ");
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStep = () => {
    const statusIdStr = String(currentStatusId);
    const statusNameStr = String(currentStatusInDB).toLowerCase();

    if (["1", "5", "pending", "รอการพิจารณา", "รอพิจารณา"].includes(statusIdStr) || statusNameStr.includes("pending")) {
      return 0;
    }

    if (["9", "shipping", "กำลังจัดส่งสินค้าเคลม"].includes(statusIdStr) || statusNameStr.includes("shipping")) {
      return 3;
    }

    if (["10", "delivered", "จัดส่งสินค้าเคลมสำเร็จ"].includes(statusIdStr) || statusNameStr.includes("delivered")) {
      return 4;
    }

    if (["8", "processing", "กำลังดำเนินการเปลี่ยนสินค้า"].includes(statusIdStr) || statusNameStr.includes("processing")) {
      return 2;
    }

    return 1;
  };

  // เปิดสีแดงจากประวัติการ Reject โดยตรง ไม่ผูกกับ getCurrentStep()
  // เพราะ getCurrentStep() เป็น index สำหรับแสดงลำดับ และอาจคลาดเคลื่อนจาก status ID/name ที่ backend ส่งมา
  // เมื่อสถานะปัจจุบันเดินต่อไป Shipping/Delivered ให้ใช้สีปกติสำหรับขั้นตอนปัจจุบัน
  const normalizedRawStatus = String(rawStatus ?? "").trim().toLowerCase();
  const normalizedCurrentStatusName = String(currentStatusInDB ?? "").trim().toLowerCase();
  const isShipmentStageNow =
    ["9", "10", "shipping", "delivered", "กำลังจัดส่งสินค้าเคลม", "จัดส่งสินค้าเคลมสำเร็จ"].includes(normalizedRawStatus) ||
    ["9", "10", "shipping", "delivered", "กำลังจัดส่งสินค้าเคลม", "จัดส่งสินค้าเคลมสำเร็จ"].includes(String(currentStatusId).trim().toLowerCase()) ||
    ["shipping", "delivered", "กำลังจัดส่งสินค้าเคลม", "จัดส่งสินค้าเคลมสำเร็จ"].includes(normalizedCurrentStatusName);
  const showRejectedTimeline = isRejectedInDB;

  const getRejectReasonText = () => {
    const rejectLog = statusLogs.slice().reverse().find((l) => l.remark && l.remark.includes("ปฏิเสธรายการเคลม:"));
    if (rejectLog) {
      const match = rejectLog.remark.match(/ปฏิเสธรายการเคลม:\s*([^|]+)/);
      if (match && match[1]) return match[1].trim();
    }
    const latestApprove = approveLogs.slice().reverse().find((a) => String(a.approve_status) === "false" || String(a.approve_status) === "0");
    if (latestApprove && latestApprove.approve_remark) return latestApprove.approve_remark;
    return data?.reject_reason || data?.remark || "";
  };

  const handleOpenModalWithStatus = (targetStatus) => {
    handleInputChange("status", targetStatus);
    handleInputChange("estimatedDeliveryDate", data?.estimated_delivery_date ? dayjs(data.estimated_delivery_date) : null);
    setIsModalOpen(true);
  };

  const getStepItems = () => {
    const currentRejectReason = getRejectReasonText();
    const rejectDateDisplay = getLogDate(2) !== "-" ? getLogDate(2) : getLogDate(7);

    return [
      { 
        title: "1. Pending", 
        description: getLogDate(5) !== "-" ? getLogDate(5) : getLogDate(1), 
        icon: renderDotIcon(CheckCircleOutlined),
        disabled: false,
      },
      {
        title: isRejectedInDB ? "2. Rejected" : "2. Approved",
        description: (
          <div className="text-xs">
            <div>{isRejectedInDB ? rejectDateDisplay : (getLogDate(6) !== "-" ? getLogDate(6) : getLogDate(2))}</div>
            {isRejectedInDB && currentRejectReason && (
              <div className="text-red-500 font-medium break-words mt-0.5">
                {currentRejectReason}
              </div>
            )}
          </div>
        ),
        icon: renderDotIcon(isRejectedInDB ? CloseCircleOutlined : CheckCircleOutlined),
        disabled: false,
      },
      { 
        title: "3. Processing", 
        description: isRejectedInDB ? "N/A (ข้ามขั้นตอน)" : getLogDate(8), 
        icon: renderDotIcon(isRejectedInDB ? MinusCircleOutlined : FileSearchOutlined),
        disabled: isRejectedInDB, // 🟢 ปิดกั้นไม่ให้กด Processing เมื่อ Rejected
      },
      { 
        title: "4. Shipping", 
        description: getLogDate(9), 
        icon: renderDotIcon(CarOutlined),
        disabled: false,
      },
      { 
        title: "5. Delivered", 
        description: getLogDate(10), 
        icon: renderDotIcon(SmileOutlined),
        disabled: false,
      },
    ];
  };

  // 🟢 ปรับปรุง Logic การสร้าง Dropdown Options สำหรับ Modal
  const getSelectOptions = () => {
    const currentName = getStatusName(data?.current_status || rawStatus);

    // ตรวจสถานะปัจจุบันก่อนประวัติ Reject เพื่อไม่ให้ Shipping ติดอยู่ที่เมนูเดิม
    if (currentName === "Shipping" || currentName === "กำลังจัดส่งสินค้าเคลม") {
      return [
        { value: "Delivered", label: "5. Delivered (จัดส่งสินค้าเคลมสำเร็จ)" },
      ];
    }

    if (currentName === "Delivered" || currentName === "จัดส่งสินค้าเคลมสำเร็จ") {
      return [
        { value: "Delivered", label: "5. Delivered (สถานะปัจจุบัน)" },
      ];
    }

    if (isRejectedInDB || currentName === "Rejected" || currentName === "ไม่อนุมัติเคลมสินค้า") {
      return [
        { value: "Shipping", label: "4. Shipping (จัดส่งสินค้าคืนให้ลูกค้า/จัดส่งสินค้าเคลม)" },
        { value: "Approved", label: "2. Approved (แก้ไขผลพิจารณาเป็นอนุมัติ)" },
        { value: "Rejected", label: "2. Rejected (ยืนยันปฏิเสธเดิม)" },
      ];
    }

    const nextOptionsMap = {
      "Pending": [
        { value: "Approved", label: "2. Approved (อนุมัติเคลม)" },
        { value: "Rejected", label: "2. Rejected (ปฏิเสธ/ไม่อนุมัติเคลม)" },
      ],
      "Approved": [
        { value: "Processing", label: "3. Processing (ดำเนินการเบิกเปลี่ยนสินค้า)" },
        { value: "Shipping", label: "4. Shipping (กำลังจัดส่งสินค้าเคลม)" },
        { value: "Rejected", label: "2. Rejected (ปฏิเสธ/ไม่อนุมัติเคลม)" },
      ],
      "Processing": [
        { value: "Shipping", label: "4. Shipping (กำลังจัดส่งสินค้าเคลม)" },
      ],
    };

    return nextOptionsMap[currentName] || [
      { value: "Approved", label: "2. Approved (อนุมัติเคลม)" },
      { value: "Shipping", label: "4. Shipping (กำลังจัดส่งสินค้าเคลม)" },
      { value: "Rejected", label: "2. Rejected (ปฏิเสธ/ไม่อนุมัติเคลม)" },
    ];
  };

  const validateForm = () => {
    const { status, rejectReason, driverName, truckPlate, deliveryDriver, deliveryPlate, estimatedDeliveryDate } = formData;

    const isRejectedStatus = 
      status === "Rejected" || 
      status === "2" || 
      status === "7" || 
      status === "ปฏิเสธ/ไม่อนุมัติเคลม" || 
      status === "ไม่อนุมัติเคลมสินค้า" || 
      status === "ไม่มีสิทธิ์เคลม";

    if (isRejectedStatus && !rejectReason.trim()) {
      message.error("กรุณาระบุเหตุผลการปฏิเสธการเคลม");
      return false;
    }

    if ((status === "Processing" || status === "กำลังดำเนินการเปลี่ยนสินค้า")) {
      for (let i = 0; i < claimItems.length; i++) {
        const item = claimItems[i];
        const appQty = item.approved_qty ?? item.qtychang ?? item.qty;

        if (appQty === undefined || appQty === null || appQty === "") {
          message.error(`กรุณาระบุจำนวนสินค้าที่เปลี่ยนแตกในรายการที่ ${i + 1} (${item.item_name})`);
          return false;
        }
      }
    }

    if ((status === "Shipping" || status === "กำลังจัดส่งสินค้าเคลม") && (!deliveryDriver.trim() || !deliveryPlate.trim() || !estimatedDeliveryDate)) {
      message.error("กรุณาระบุชื่อ พขร., ทะเบียนรถจัดส่ง และวันที่คาดว่าจะส่งถึงให้ครบถ้วน");
      return false;
    }

    return true;
  };

  const handleSaveStatus = async () => {
    if (!validateForm()) return;
    if (!currentUserId) {
      message.error("ไม่พบรหัสผู้ใช้งาน กรุณาล็อกอินใหม่อีกครั้ง");
      return;
    }

    setIsSubmitting(true);

    try {
      const { images, image, items: _, ...cleanData } = data;
      const realClaimId = cleanData.claim_id || data.claim_id;
      
      const targetStatusName = formData.status; 
      const statusId = String(getStatusId(targetStatusName));

      const formatDatePayload = (date) => (date ? (dayjs.isDayjs(date) ? date.format("YYYY-MM-DD") : date) : "");
      const formattedEstDate = formatDatePayload(formData.estimatedDeliveryDate);

      const isModalStatusRejected = 
        targetStatusName === "Rejected" || 
        targetStatusName === "2" || 
        targetStatusName === "7" || 
        targetStatusName === "ปฏิเสธ/ไม่อนุมัติเคลม" || 
        targetStatusName === "ไม่อนุมัติเคลมสินค้า" || 
        targetStatusName === "ไม่มีสิทธิ์เคลม";

      const extraData = {
        driverName: formData.driverName,
        truckPlate: formData.truckPlate,
        deliveryDriver: formData.deliveryDriver,
        deliveryPlate: formData.deliveryPlate,
        estimatedDeliveryDate: formattedEstDate
      };

      const fullRemark = isModalStatusRejected
        ? `ปฏิเสธรายการเคลม: ${formData.rejectReason} | DATA:${JSON.stringify(extraData)}`
        : `เปลี่ยนสถานะเป็น ${targetStatusName} | DATA:${JSON.stringify(extraData)}`;

      const isProcessing = targetStatusName === "Processing" || targetStatusName === "กำลังดำเนินการเปลี่ยนสินค้า";
      const formattedClaimItems = Array.isArray(claimItems) ? claimItems.map((item) => {
        if (isModalStatusRejected) {
          // เมื่อ Reject ให้จำนวนใน payload เป็น 0 เพื่อข้ามขั้น Processing
          return {
            claim_item_id: item.claim_item_id,
            item_id: item.item_id,
            qty: 0,
            qtyreceived: item.qtyreceived ?? item.received_qty ?? item.qty,
            qtychang: item.qtychang ?? item.returned_qty ?? item.qty,
            remark: item.item_remark || item.remark || "",
          };
        }

        if (isProcessing) {
          const rawVal = item.approved_qty;
          const newQty = (rawVal !== null && rawVal !== undefined) ? Number(rawVal) : 0;

          return {
            claim_item_id: item.claim_item_id,
            item_id: item.item_id,
            qty: newQty,
            qtyreceived: item.qtyreceived ?? item.received_qty ?? item.qty,
            qtychang: item.qtychang ?? item.returned_qty ?? item.qty,
            remark: item.item_remark || item.remark || "",
          };
        } else {
          return {
            claim_item_id: item.claim_item_id,
            item_id: item.item_id,
            qty: item.qty,
            qtyreceived: item.qtyreceived,
            qtychang: item.qtychang,
            remark: item.item_remark || item.remark || "",
          };
        }
      }) : [];

      let columnName = null;
      if (targetStatusName === "Approved" || targetStatusName === "อนุมัติเคลมสินค้า") {
        columnName = "approve_date";
      } else if (targetStatusName === "Processing" || targetStatusName === "กำลังดำเนินการเปลี่ยนสินค้า") {
        columnName = "warehouse_receive_date";
      } else if (targetStatusName === "Shipping" || targetStatusName === "กำลังจัดส่งสินค้าเคลม") {
        columnName = "delivery_date";
      } else if (targetStatusName === "Delivered" || targetStatusName === "จัดส่งสินค้าเคลมสำเร็จ") {
        columnName = "receive_finish_date";
      }

      if (columnName) {
        await claimService.updateClaimDate({
          claim_id: Number(realClaimId),
          columnname: columnName,
          status: statusId
        });
      }

      await claimService.updateClaim({
        ...cleanData,
        claim_id: realClaimId,
        current_status: statusId,
        items: formattedClaimItems,
        update_by: currentUserId,
      });

      await claimService.createClaimStatusLogs({
        claim_id: String(realClaimId),
        status: String(statusId),
        remark: fullRemark,
        update_by: currentUserId,
        user_id: currentUserId,
      });

      if (isModalStatusRejected || targetStatusName === "Approved" || targetStatusName === "อนุมัติเคลมสินค้า") {
        await claimService.createClaimapproves({
          claim_id: String(realClaimId),
          approve_by: String(currentUserId),
          approve_status: isModalStatusRejected ? "false" : "true",
          approve_remark: isModalStatusRejected ? formData.rejectReason : `ดำเนินการสถานะ: ${targetStatusName}`,
        });
      }

      if (targetStatusName === "Shipping" || targetStatusName === "กำลังจัดส่งสินค้าเคลม") {
        try {
          await deliveryService.createDelivery({
            claim_id: Number(realClaimId),
            driver_id: formData.deliveryDriver || "",
            delivery_status: "9",
            truck_plate: formData.deliveryPlate || "",
          });
        } catch (delErr) {
          console.error("สร้าง Delivery อัตโนมัติไม่สำเร็จ:", delErr);
        }
      }

      message.success("อัปเดตสถานะเรียบร้อยแล้ว");
      setIsModalOpen(false);
      await fetchClaimDetail(false);

    } catch (error) {
      message.error(error.message || "เกิดข้อผิดพลาดในการอัปเดตสถานะ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDotIcon = (IconComponent) => (
    <div className="relative flex items-center justify-center w-full h-full cursor-pointer transition-transform hover:scale-110">
      <IconComponent className="text-lg relative z-10" />
      <span className="absolute w-2.5 h-2.5 bg-current rounded-full -bottom-1 z-0 opacity-80" />
    </div>
  );

  const creatorUserId = data ? String(data.user_id || data.created_by || "") : "";
  const claimAgentId = data ? String(data.agent_id || "") : "";
  const claimAgentCode = data ? String(data.agent_code || "") : "";

  const driverReceiveLogDateStr = getLogRawDateString("4");

  const deliverySuccessLog = statusLogs.find(
    (log) => String(log.status || log.status_id) === "10"
  );

  const deliverySuccessUserId = deliverySuccessLog 
    ? String(deliverySuccessLog.update_by || deliverySuccessLog.user_id || "") 
    : "";
  const deliverySuccessNameDisplay = usersMap[deliverySuccessUserId] || "-";

  const receiveLog = statusLogs.find(
    (log) => String(log.status || log.status_id) === "4"
  );                    

  const receiverUserId = receiveLog ? String(receiveLog.update_by || receiveLog.user_id || "") : "";
  const receiverNameDisplay = usersMap[receiverUserId] || "-";        

  const matchedAgentName = 
    agentsMap[claimAgentId] || 
    agentsMap[claimAgentCode] || 
    getAgentNameByUserId(creatorUserId, usersList, agentsMap);

  const agentNameDisplay = 
    matchedAgentName !== "-" && matchedAgentName 
      ? matchedAgentName 
      : (data?.agent_name || data?.agentName || "-");

  const reporterNameDisplay = usersMap[creatorUserId] || data?.created_by || data?.reporter || "-";

  const latestDelivery = deliveryDataList.length > 0 ? deliveryDataList[deliveryDataList.length - 1] : null;

  const itemColumns = [
    {
      title: "ลำดับ",
      key: "index",
      width: 60,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: "ชื่อสินค้า",
      dataIndex: "item_name",
      key: "item_name",
      render: (text) => <span className="font-medium text-slate-800 break-words">{text}</span>,
    },
     {
      title: "จำนวนรับคืน",
      dataIndex: "qtychang",
      key: "qtychang",
      width: 110,
      align: "right",
      render: (qty) => <span className="font-semibold text-slate-700">{qty ?? "-"}</span>,
    },
    {
      title: "จำนวนแตก",
      dataIndex: "qty",
      key: "qty",
      width: 120,
      align: "right",
      render: (appQty, record) => {
        const isChangeStep = STATUS_PRIORITY[currentStatusInDB] >= 8;
        if (!isChangeStep) return <span className="text-slate-400 font-normal">-</span>;
        
        const val = appQty ?? record.approved_qty;
        return <span className="font-semibold text-emerald-600">{val !== undefined && val !== null ? val : "-"}</span>;
      },
    },
    {
      title: "จำนวนส่งคืน",
      dataIndex: "qtyreceived",
      key: "qtyreceived",
      width: 110,
      align: "right",
      render: (retQty, record) => {
        const isChangeStep = STATUS_PRIORITY[currentStatusInDB] >= 9;
        if (!isChangeStep) return <span className="text-slate-400 font-normal">-</span>;
        
        const val = retQty ?? record.returned_qty;
        return <span className="font-semibold text-amber-600">{val !== undefined && val !== null ? val : "-"}</span>;
      },
    },
    {
      title: "สาเหตุ",
      dataIndex: "item_remark",
      key: "item_remark",
      render: (text, record) => {
        const remarkText = text || record.item_remark || "";
        if (!remarkText) return "-";

        const match = remarkText.match(/^\[(.*?)\]\s*(.*)$/);
        if (match) {
          const claimType = match[1];
          const detail = match[2];
          return (
            <div className="flex flex-col gap-1 text-xs">
              <div>
                <Tag color="volcano" className="font-normal rounded-md m-0">
                  {claimType}
                </Tag>
              </div>
              {detail ? (
                <span className="text-slate-600 break-words">{detail}</span>
              ) : (
                <span className="text-slate-400 italic font-normal">- ไม่มีรายละเอียดเพิ่มเติม -</span>
              )}
            </div>
          );
        }

        return <div className="text-xs text-slate-600 whitespace-pre-wrap break-words">{remarkText}</div>;
      },
    },
  ];

  return (
    <div className="w-full flex flex-col gap-6 font-normal p-4 sm:p-6" style={{ boxSizing: "border-box" }}>
      <Card className="rounded-2xl shadow-sm border-gray-200 w-full overflow-hidden" bodyStyle={{ padding: "24px" }}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
          <div className="flex flex-col gap-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-medium text-slate-800 m-0 truncate">จัดการการเคลม</h1>
            <p className="text-sm text-gray-500 m-0 truncate">
              Claim ID : <b className="text-slate-800 font-mono font-normal">{data.claim_no || data.claim_id}</b>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto justify-start md:justify-end">
            <div className="shrink-0">
              <ClaimStatusTag status={currentStatusInDB} />
            </div>

            {STATUS_PRIORITY[currentStatusInDB] >= 4 && (
              <div>
                <Button
                  type="default"
                  icon={<PrinterOutlined />}
                  className="border-slate-300 text-slate-700 hover:text-slate-900 hover:border-slate-400 hover:bg-slate-50 rounded-xl font-normal shrink-0 h-10 shadow-sm"
                  style={{ paddingLeft: "16px", paddingRight: "16px" }}
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
                    productName: claimItems.length > 0 ? claimItems.map(i => i.item_name).join(", ") : "-",
                    receiverName: receiverNameDisplay,
                    approverName: approveLogs.length > 0 
                      ? usersMap[String(approveLogs[approveLogs.length - 1]?.approve_by)] || "พรนภา แก่นเมือง"
                      : "-",
                    receiveDate: (() => {
                      const targetDate = driverReceiveLogDateStr !== "-" && driverReceiveLogDateStr 
                        ? driverReceiveLogDateStr 
                        : data?.claim_date;

                      if (!targetDate || targetDate === "-") return "-";

                      const parsedDate = dayjs(targetDate, ["DD/MM/YYYY", "YYYY-MM-DD", "DD/MM/YY", "YYYY-MM-DD HH:mm:ss"]);
                      
                      return parsedDate.isValid() ? parsedDate.format("DD/MM/YY") : "-";
                    })(),
                    createdDate: getLogRawDateString("1") !== "-" 
                      ? getLogRawDateString("1") 
                      : (data?.claim_date ? dayjs(data.claim_date).format("DD/MM/YYYY") : "-"),
                    deliverySuccessDate: (data?.current_status === "10" || data?.receive_finish_date)
                      ? (getLogRawDateString("10") !== "-" ? getLogRawDateString("10") : "-")
                      : "-",
                    deliverySuccessName: (data?.current_status === "10" || data?.receive_finish_date)
                      ? (deliverySuccessNameDisplay !== "-" ? deliverySuccessNameDisplay : agentNameDisplay)
                      : "-",
                    estimated_delivery_date: data?.estimated_delivery_date 
                      ? dayjs(data.estimated_delivery_date).format("DD/MM/YYYY") 
                      : "-",
                    agentName: agentNameDisplay,
                    agent_name: agentNameDisplay,
                    reporter: reporterNameDisplay,
                    driverName: data.driver_name || "-",
                    claimType: data.claim_type || data.claim_reason || data.remark || data.detail || "",
                    withdrawDate: data.warehouse_receive_date,
                    items: claimItems
                  }}
                />
              </div>
            )}

            {canRevertOrEdit && !isFinalStatus && previousStatusName && (
              <Button
                type="default"
                icon={<UndoOutlined />}
                onClick={handleStepBack}
                style={{ paddingLeft: "18px", paddingRight: "18px" }}
                className="border-slate-300 text-slate-700 hover:text-slate-900 hover:border-slate-400 hover:bg-slate-50 rounded-xl font-normal shrink-0 h-10 shadow-sm"
              >
                <span style={{ marginLeft: "4px" }}>ถอยสถานะ</span>
              </Button>
            )}

            <Button
              type="primary"
              icon={<SaveOutlined />}
              className="bg-blue-600 hover:bg-blue-700 border-none rounded-xl font-medium shrink-0 h-10 shadow-md"
              style={{ paddingLeft: "24px", paddingRight: "24px" }}
              onClick={() => {
                const options = getSelectOptions();
                const defaultVal = options.length > 0 ? options[0].value : currentStatusInDB;
                handleOpenModalWithStatus(defaultVal);
              }}
            >
              อัปเดตสถานะ
            </Button>
          </div>
        </div>
      </Card>

      {/* Timeline แสดงสถานะเท่านั้น การเปลี่ยนสถานะทำผ่านปุ่มอัปเดตสถานะ */}
      <Card 
        title={<span className="font-medium text-slate-800">มุมมองไทม์ไลน์สถานะ</span>} 
        className="rounded-2xl shadow-sm border-gray-200 w-full" 
        bodyStyle={{ padding: "20px 12px" }}
      >
        <ConfigProvider
          theme={{
            token: { 
              colorPrimary: showRejectedTimeline ? "#ef4444" : "#059669",
              colorError: "#ef4444",
              colorSuccess: showRejectedTimeline ? "#ef4444" : "#059669",
              colorSuccessBorder: showRejectedTimeline ? "#ef4444" : "#059669",
              colorSuccessBg: showRejectedTimeline ? "#fef2f2" : "#ecfdf5",
            },
            components: { 
              Steps: { 
                lineWidth: 1.5, 
                iconSize: 20, 
                titleFontSize: 11, 
                descriptionFontSize: 8 
              } 
            },
          }}
        >
          <style>{`
            .custom-steps-rejected .ant-steps-item .ant-steps-item-container .ant-steps-item-tail::after,
            .custom-steps-rejected .ant-steps-item .ant-steps-item-container .ant-steps-item-tail:after,
            .custom-steps-rejected .ant-steps-item-tail::after,
            .custom-steps-rejected .ant-steps-item-tail:after {
              background-color: #ef4444 !important;
              background: #ef4444 !important;
              background-image: none !important;
              opacity: 1 !important;
            }
            .custom-steps-rejected .ant-steps-item-tail {
              background-color: #ef4444 !important;
              border-color: #ef4444 !important;
            }
            .custom-steps-rejected .ant-steps-item-finish .ant-steps-item-container .ant-steps-item-tail::after,
            .custom-steps-rejected .ant-steps-item-process .ant-steps-item-container .ant-steps-item-tail::after,
            .custom-steps-rejected .ant-steps-item-error .ant-steps-item-container .ant-steps-item-tail::after {
              background-color: #ef4444 !important;
              background: #ef4444 !important;
            }
            .custom-steps-rejected .ant-steps-item-finish .ant-steps-item-tail::after,
            .custom-steps-rejected .ant-steps-item-process .ant-steps-item-tail::after {
              background-color: #ef4444 !important;
              background: #ef4444 !important;
            }
            .custom-steps-rejected .ant-steps-item-finish .ant-steps-item-icon {
              border-color: #ef4444 !important;
            }
            .custom-steps-rejected .ant-steps-item-finish .ant-steps-icon {
              color: #ef4444 !important;
            }
          `}</style>
          <div
            data-timeline-rejected={showRejectedTimeline ? "true" : "false"}
            data-timeline-current-status={String(rawStatus ?? "")}
            className={`custom-steps-compact w-full overflow-hidden pb-2 ${
              showRejectedTimeline ? "custom-steps-rejected" : "custom-steps-normal"
            }`}
          >
            <Steps
              responsive={true}
              current={getCurrentStep()}
              status={showRejectedTimeline ? "error" : "process"}
              items={getStepItems().map((item, idx) => {
                const currentIdx = getCurrentStep();
                let itemStatus = "wait";
                
                if (showRejectedTimeline && idx <= currentIdx) {
                  // Ant Design ใช้สี success กับสถานะ finish; ใช้ error เพื่อไม่ให้เส้นเป็นสีเขียว
                  itemStatus = "error";
                } else if (idx < currentIdx) {
                  itemStatus = "finish";
                } else if (idx === currentIdx) {
                  itemStatus = "process";
                } else {
                  itemStatus = "wait";
                }

                return {
                  ...item,
                  status: itemStatus,
                };
              })}
            />
          </div>
        </ConfigProvider>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full">
        <div className="xl:col-span-2 flex flex-col gap-6 w-full">
          <Card 
            title={<span className="font-medium text-slate-800">ข้อมูลคำร้องขอเคลม</span>} 
            className="rounded-2xl shadow-sm border-gray-200 w-full overflow-hidden" 
            bodyStyle={{ padding: "16px sm:24px" }}
          >
            <Descriptions 
              column={1} 
              bordered 
              size="small" 
              className="w-full table-fixed"
              labelStyle={{ 
                fontWeight: "500", 
                color: "#475569", 
                width: "110px", 
                backgroundColor: "#f8fafc",
                fontSize: "13px",
                whiteSpace: "nowrap"
              }}
              contentStyle={{
                color: "#1e293b",
                fontSize: "13px",
                wordBreak: "break-word"
              }}
            >
              <Descriptions.Item label="วันที่แจ้ง">
                <span className="text-slate-800">
                  {data.claim_date ? dayjs(data.claim_date).format("DD/MM/YYYY") : "-"}
                </span>
              </Descriptions.Item>

              <Descriptions.Item label="ชื่อ Agent">
                <span className="font-medium text-slate-800 break-words" title={agentNameDisplay}>
                  {agentNameDisplay}
                </span>
              </Descriptions.Item>

              <Descriptions.Item label="ผู้แจ้งส่งคืน">
                <span className="text-slate-800 break-words" title={reporterNameDisplay}>
                  {reporterNameDisplay}
                </span>
              </Descriptions.Item>

              <Descriptions.Item label="จำนวนรวมทั้งหมด">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-emerald-600 text-sm">{claimItems.length}</span>
                  <span className="text-xs text-gray-500">รายการ</span>
                </div>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card 
            title={
              <div className="flex justify-between items-center">
                <span className="font-medium text-slate-800">รายการสินค้าที่ขอเคลม</span>
                <Tag color="blue" className="rounded-full px-3">{claimItems.length} รายการ</Tag>
              </div>
            } 
            className="rounded-2xl shadow-sm border-gray-200 w-full" 
            bodyStyle={{ padding: "16px" }}
          >
            <Table
              dataSource={claimItems}
              columns={itemColumns}
              pagination={false}
              scroll={{ x: 650 }}
              size="middle"
              className="rounded-xl overflow-hidden border border-slate-100"
            />
          </Card>

          {(STATUS_PRIORITY[currentStatusInDB] >= 4 ) && (
            <Card title={<span className="font-medium text-slate-800">ข้อมูลการรับสินค้าเคลม</span>} className="rounded-2xl shadow-sm border-gray-200 w-full" bodyStyle={{ padding: "24px" }}>
              <Descriptions 
                column={1} 
                bordered 
                size="middle" 
                labelStyle={{ 
                  fontWeight: "500", 
                  color: "#475569", 
                  width: "130px", 
                  backgroundColor: "#f8fafc",
                  verticalAlign: "top" 
                }}
                contentStyle={{
                  color: "#1e293b",
                  wordBreak: "break-word"
                }}
              >
                <Descriptions.Item label="พนักงานขับรถ (พขร.)"><span className="text-slate-800 break-words">{data.driver_name || "-"}</span></Descriptions.Item>
                <Descriptions.Item label="ทะเบียนรถ"><span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs">{data.truck_plate || "-"}</span></Descriptions.Item>
                <Descriptions.Item label="เลขที่เอกสารเคลม"><span className="font-mono">{data.claim_no || "-"}</span></Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          {(STATUS_PRIORITY[currentStatusInDB] >= 6) && (
            <Card 
              title={<span className="font-medium text-slate-800">ข้อมูลการเบิกเปลี่ยนสินค้า</span>} 
              className="rounded-2xl shadow-sm border-gray-200 w-full" 
              bodyStyle={{ padding: "24px" }}
            >
              <Descriptions 
                column={1} 
                bordered 
                size="middle" 
                labelStyle={{ 
                  fontWeight: "500", 
                  color: "#475569", 
                  width: "160px", 
                  backgroundColor: "#f8fafc",
                  verticalAlign: "top" 
                }}
                contentStyle={{
                  color: "#1e293b",
                  wordBreak: "break-word"
                }}
              >
                <Descriptions.Item label="วันที่เบิกเปลี่ยนสินค้า">
                  <span className="font-mono text-slate-800 font-medium">
                    {data.warehouse_receive_date ? dayjs(data.warehouse_receive_date).format("DD/MM/YYYY") : "-"}
                  </span>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          <Card 
            title={
              <div className="flex justify-between items-center w-full">
                <span className="font-medium text-slate-800">ข้อมูลการจัดส่งสินค้าเคลม (Delivery)</span>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  size="small"
                  className="bg-blue-600 hover:bg-blue-700 rounded-lg text-xs"
                  onClick={() => setIsDeliveryModalOpen(true)}
                >
                  มอบหมายงาน พขร. (บันทึก Delivery)
                </Button>
              </div>
            } 
            className="rounded-2xl shadow-sm border-gray-200 w-full" 
            bodyStyle={{ padding: "24px" }}
          >
            <Descriptions 
              column={1} 
              bordered 
              size="middle" 
              labelStyle={{ 
                fontWeight: "500", 
                color: "#475569", 
                width: "160px", 
                backgroundColor: "#f8fafc",
                verticalAlign: "top" 
              }}
              contentStyle={{
                color: "#1e293b",
                wordBreak: "break-word"
              }}
            >
              <Descriptions.Item label="Driver ID (พขร.)">
                <span className="text-slate-800 font-mono font-medium">
                  {latestDelivery?.driver_id || data.delivery_driver || "-"}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="ทะเบียนรถจัดส่ง">
                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs">
                  {latestDelivery?.truck_plate || data.delivery_plate || "-"}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="วันที่สร้างรายการจัดส่ง">
                <span className="font-mono text-slate-600 text-xs">
                  {latestDelivery?.receive_date ? formatDateString(latestDelivery.receive_date) : "-"}
                </span>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </div>

        <div className="xl:col-span-1 flex flex-col gap-6 w-full">
          <Card 
            title={
              <div className="flex justify-between items-center">
                <span className="font-medium text-slate-800">รูปภาพหลักฐานทั้งหมด</span>
                <span className="text-xs text-gray-500 font-normal">{allImages.length} รูป</span>
              </div>
            } 
            className="rounded-2xl shadow-sm border-gray-200 w-full" 
            bodyStyle={{ padding: "24px" }}
          >
            {allImages && allImages.length > 0 ? (
              <Image.PreviewGroup>
                <div className="grid grid-cols-2 gap-2">
                  {allImages.map((imgObj, index) => (
                    <Image 
                      key={index} 
                      width="100%" 
                      height={110} 
                      style={{ objectFit: "cover" }} 
                      className="rounded-lg border border-gray-200" 
                      src={imgObj.formattedUrl} 
                    />
                  ))}
                </div>
              </Image.PreviewGroup>
            ) : (
              <div className="text-gray-400 italic py-6 text-center flex flex-col items-center gap-2">
                <PictureOutlined className="text-3xl text-gray-300" />
                <span>ไม่มีรูปภาพแนบในรายการนี้</span>
              </div>
            )}
          </Card>

          <Card 
            title={<span className="font-medium text-slate-800">ประวัติการพิจารณาอนุมัติ</span>} 
            className="rounded-2xl shadow-sm border-gray-200 w-full" 
            bodyStyle={{ padding: "16px" }}
          >
            {approveLogs.length > 0 ? (
              <div className="flex flex-col gap-3">
                {approveLogs.map((item, index) => {
                  const rawStatus = String(item.approve_status).toLowerCase();
                  const isApproved = rawStatus === "1" || rawStatus === "true";

                  const conf = isApproved
                    ? { text: "อนุมัติ (Approve)", color: "bg-emerald-100 text-emerald-700 border-emerald-300" }
                    : { text: "ไม่อนุมัติ (Unapprove)", color: "bg-red-100 text-red-700 border-red-300" };

                  const approverId = String(item.approve_by || item.approved_id || "");
                  const approverName = usersMap[approverId] || item.approve_by || item.approved_id || "-";

                  return (
                    <div key={index} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className={`px-2 py-0.5 rounded-md border font-normal ${conf.color}`}>
                          {conf.text}
                        </span>
                        <span className="text-gray-400 font-mono">{formatDateString(item.approve_date)}</span>
                      </div>
                      <div className="text-slate-700 mt-1">
                        <span className="font-medium">ผู้อนุมัติ:</span> <span className="break-words">{approverName}</span>
                      </div>
                      {item.approve_remark && (
                        <div className="text-gray-500 italic break-words">
                          <span className="font-medium">หมายเหตุ:</span> {item.approve_remark}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-gray-400 italic py-4 text-center text-xs">ยังไม่มีประวัติการพิจารณาอนุมัติ</div>
            )}
          </Card>

          <Card 
            title={
              <div className="flex justify-between items-center w-full">
                <span className="font-medium text-slate-800">ประวัติการบันทึกสถานะ</span>
                <Button
                  type="text"
                  icon={<EllipsisOutlined className="text-lg text-slate-600" />}
                  onClick={() => setIsLogModalOpen(true)}
                  className="hover:bg-slate-100 rounded-lg"
                  title="ดูประวัติการบันทึก Log ทั้งหมด"
                />
              </div>
            } 
            className="rounded-2xl shadow-sm border-gray-200 w-full" 
            bodyStyle={{ padding: "16px 24px" }}
          >
            <Descriptions 
              column={1} 
              bordered 
              size="small" 
              labelStyle={{ 
                fontWeight: "500", 
                color: "#475569", 
                width: "130px", 
                backgroundColor: "#f8fafc", 
                fontSize: "12px",
                verticalAlign: "top"
              }}
              contentStyle={{
                color: "#1e293b",
                fontSize: "12px",
                wordBreak: "break-word"
              }}
            >
              <Descriptions.Item label="อัปเดตล่าสุด ณ เวลา">
                <span className="font-mono">{formatDateString(data.updated_at)}</span>
              </Descriptions.Item>
            </Descriptions>

            {statusLogs.filter(l => l.remark && !l.remark.startsWith("[MSG]")).length > 0 && (
              <div className="mt-3 border-t border-slate-100 pt-3 flex flex-col gap-2">
                {statusLogs
                  .filter(l => l.remark && !l.remark.startsWith("[MSG]"))
                  .slice(-2)
                  .map((log, index) => (
                    <div key={index} className="flex flex-col bg-slate-50 p-2 rounded-lg text-[11px] border border-slate-100">
                      <div className="flex justify-between font-mono text-slate-400">
                        <span>{getStatusName(log.status)}</span>
                        <span>{formatDateString(log.update_date || log.created_at)}</span>
                      </div>
                      <span className="text-slate-700 font-medium mt-0.5">
                        {log.remark.split("|")[0].trim()}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </Card>

          <Card
            className="rounded-2xl shadow-sm border border-slate-300 w-full bg-[#f0f4f9]/60"
            bodyStyle={{ padding: "20px" }}
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <UserOutlined className="text-slate-700 text-lg" />
                <span className="font-semibold text-slate-800 text-sm sm:text-base">
                  {chatMessages.length} private comments
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {chatMessages.length > 0 ? (
                  chatMessages.map((msg) => (
                    <div key={msg.id} className="flex flex-col gap-1 w-full">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-800 text-xs">
                          {msg.senderName}
                        </span>
                        <span className="text-slate-400 text-[10px] font-normal">
                          • {msg.time ? dayjs(msg.time).format("DD/MM/YYYY HH:mm") : "-"}
                        </span>
                      </div>

                      <div className="text-slate-800 text-sm sm:text-base whitespace-pre-wrap break-words font-normal leading-relaxed pl-0.5 w-full">
                        {msg.message}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 italic text-xs py-2">
                    ยังไม่มีคอมเมนต์ส่วนตัว
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200/80 w-full" />

              <Input.TextArea
                autoSize={{ minRows: 2, maxRows: 4 }}
                placeholder="เพิ่มความคิดเห็นส่วนตัว..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="rounded-xl border-slate-300 text-sm focus:border-blue-500 bg-white"
              />

              <Button
                type="primary"
                block
                icon={<SendOutlined />}
                loading={sendingMsg}
                disabled={!newMessage.trim()}
                onClick={handleSendMessage}
                className="bg-blue-500 hover:bg-blue-600 rounded-xl text-sm font-medium h-10 border-none shadow-sm flex items-center justify-center gap-1"
              >
                ส่ง
              </Button>
            </div>
          </Card>

          <Card className="rounded-2xl shadow-sm border-gray-200 w-full" bodyStyle={{ padding: "20px" }}>
            <Button
              size="large"
              icon={<ArrowLeftOutlined />}
              className="w-full rounded-xl border-gray-300 text-slate-700 font-normal hover:border-slate-800 h-11"
              onClick={() => navigate("/staff/list-claim")}
            >
              กลับหน้ารายการคลังสินค้า
            </Button>
          </Card>
        </div>
      </div>

      <Modal
        title={<span className="font-medium text-slate-800">มอบหมายงาน พขร. (บันทึกข้อมูลจัดส่งสินค้าเคลม)</span>}
        open={isDeliveryModalOpen}
        onOk={handleSaveDelivery}
        confirmLoading={submittingDelivery}
        onCancel={() => !submittingDelivery && setIsDeliveryModalOpen(false)}
        okText="บันทึก Delivery"
        cancelText="ยกเลิก"
        okButtonProps={{ className: "bg-blue-600 hover:bg-blue-700 font-normal" }}
        width={500}
      >
        <div className="flex flex-col gap-4 py-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Claim ID:
            </label>
            <Input value={data?.claim_id} disabled className="bg-slate-50 font-mono" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Driver ID (รหัสพนักงานขับรถ) <span className="text-red-500">*</span>:
            </label>
            <Input
              placeholder="เช่น 70079126"
              value={deliveryForm.driver_id}
              onChange={(e) => setDeliveryForm((prev) => ({ ...prev, driver_id: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              ทะเบียนรถ (Truck Plate) <span className="text-red-500">*</span>:
            </label>
            <Input
              placeholder="เช่น 748895"
              value={deliveryForm.truck_plate}
              onChange={(e) => setDeliveryForm((prev) => ({ ...prev, truck_plate: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Delivery Status ID ( Default: 8 ):
            </label>
            <Input
              placeholder="8"
              value={deliveryForm.delivery_status}
              disabled
              className="bg-slate-50 font-mono text-slate-500"
            />
          </div>
        </div>
      </Modal>

      <Modal
        width={750}
        title={
          <span className="font-medium text-slate-800">
            {isFinalStatus
              ? "แก้ไข/เปลี่ยนสถานะจากการปฏิเสธ"
              : (STATUS_PRIORITY[formData.status] || 0) < (STATUS_PRIORITY[currentStatusInDB] || 0)
              ? "ย้อนกลับสถานะการเคลมสินค้า"
              : "อัปเดตสถานะการเคลมสินค้า"}
          </span>
        }
        open={isModalOpen}
        onOk={handleSaveStatus}
        confirmLoading={isSubmitting}
        onCancel={() => !isSubmitting && setIsModalOpen(false)}
        okText="บันทึกเปลี่ยนสถานะ"
        cancelText="ยกเลิก"
        okButtonProps={{ 
          disabled: !formData.status || isSubmitting,
          className: isFinalStatus ? "bg-amber-600 hover:bg-amber-700 font-normal" : "bg-emerald-600 hover:bg-emerald-700 font-normal" 
        }}
      >
        <div className="flex flex-col gap-4 py-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              เลือกสถานะใหม่ <span className="text-red-500">*</span>:
            </label>
            <Select
              className="w-full"
              placeholder="-- กรุณาคลิกเพื่อเลือกสถานะใหม่ --"
              value={formData.status}
              onChange={(val) => handleInputChange("status", val)}
              options={getSelectOptions()}
            />
          </div>

          {formData.status === "Processing" && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-4">
              <div className="flex justify-between items-center border-b pb-1">
                <span className="text-sm font-medium text-slate-800">
                  ระบุจำนวนสินค้าที่เปลี่ยนแตก (จำนวนเบิกเปลี่ยนสินค้า)
                </span>
                <span className="text-xs text-slate-500">{claimItems.length} รายการ</span>
              </div>

              <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1">
                {claimItems.map((item, index) => (
                  <div key={item.key || index} className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col gap-2.5 shadow-sm">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        {index + 1}. {item.item_name}
                      </span>
                      <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        แจ้งเคลม: {item.qty} | รับจริง: {item.received_qty ?? item.qty}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <div className="flex-1">
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          จำนวนที่เปลี่ยนแตก (ชิ้น/ขวด/กระป๋อง) <span className="text-red-500">*</span>:
                        </label>
                        <InputNumber
                          min={0}
                          size="middle"
                          className="w-full"
                          keyboard={true}
                          controls={true}
                          placeholder="กรอกจำนวนที่เปลี่ยนแตก"
                          value={item.approved_qty ?? ""}
                          onChange={(val) => {
                            const newQty = (val === null || val === "" || isNaN(val)) ? null : Number(val);
                            handleItemChange(index, "approved_qty", newQty);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(formData.status === "Shipping" || formData.status === "กำลังจัดส่งสินค้าเคลม") && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-3">
              <span className="text-sm font-medium text-slate-800 border-b pb-1">
                ข้อมูลการจัดส่งสินค้าเคลม
              </span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    พนักงานขับรถจัดส่ง <span className="text-red-500">*</span>:
                  </label>
                  <Input 
                    placeholder="เช่น นายสมศักดิ์ ขยันส่ง" 
                    value={formData.deliveryDriver} 
                    onChange={(e) => handleInputChange("deliveryDriver", e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    ทะเบียนรถจัดส่ง <span className="text-red-500">*</span>:
                  </label>
                  <Input 
                    placeholder="เช่น 80-9999 กทม." 
                    value={formData.deliveryPlate} 
                    onChange={(e) => handleInputChange("deliveryPlate", e.target.value)} 
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    วันที่คาดว่าจะส่งถึงลูกค้า <span className="text-red-500">*</span>:
                  </label>
                  <DatePicker
                    className="w-full"
                    format="DD/MM/YYYY"
                    placeholder="เลือกวันที่คาดว่าจะส่งถึง"
                    value={formData.estimatedDeliveryDate}
                    onChange={(date) => handleInputChange("estimatedDeliveryDate", date)}
                  />
                </div>
              </div>
            </div>
          )}

          {isModalStatusRejected && (
            <div className="bg-red-50 p-4 rounded-xl border border-red-200">
              <label className="block text-sm font-medium text-red-700 mb-1">
                เหตุผลการปฏิเสธการเคลม <span className="text-red-500">*</span>:
              </label>
              <Input.TextArea
                rows={3}
                placeholder="กรุณาระบุเหตุผลการปฏิเสธการเคลมสินค้า..."
                value={formData.rejectReason}
                onChange={(e) => handleInputChange("rejectReason", e.target.value)}
                className="rounded-lg border-red-300 focus:border-red-500"
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
        footer={[
          <Button key="close" onClick={() => setIsLogModalOpen(false)} className="rounded-xl">
            ปิด
          </Button>
        ]}
        width={650}
      >
        <div className="py-4 max-h-[500px] overflow-y-auto px-2">
          {statusLogs && statusLogs.length > 0 ? (
            <Timeline
              items={statusLogs
                .filter(log => log.remark && !log.remark.startsWith("[MSG]"))
                .map((log, idx) => ({
                  color: "blue",
                  children: (
                    <div className="flex flex-col gap-1 bg-slate-50 p-3 rounded-xl border border-slate-100 mb-2">
                      <div className="flex justify-between items-center text-xs">
                        <Tag color="blue" className="rounded-md font-normal m-0">
                          {getStatusName(log.status)}
                        </Tag>
                        <span className="font-mono text-slate-400 text-[11px]">
                          {formatDateString(log.update_date || log.created_at || log.created_date)}
                        </span>
                      </div>
                      <div className="text-slate-800 text-xs font-medium mt-1">
                        {log.remark.split("|")[0].trim()}
                      </div>
                      <div className="text-[10px] text-slate-400 flex justify-between">
                        <span>บันทึกโดย: {usersMap[String(log.update_by || log.user_id)] || log.update_by || "-"}</span>
                      </div>
                    </div>
                  ),
                }))}
            />
          ) : (
            <div className="text-center py-8 text-slate-400 italic">ไม่มีประวัติการบันทึกสถานะ</div>
          )}
        </div>
      </Modal>
    </div>
  );

  
};


<style>{`
  /* 1. บังคับเส้นเชื่อม (Tail Connector) ให้เป็นสีแดงทั้งหมดเมื่อเกิด Reject */
  .custom-steps-rejected .ant-steps-item-tail::after,
  .custom-steps-rejected .ant-steps-item-tail:after,
  .custom-steps-rejected .ant-steps-item-container .ant-steps-item-tail::after {
    background-color: #ef4444 !important;
    background: #ef4444 !important;
  }

  /* 2. บังคับเส้นของขั้นตอนที่เป็น Finish / Process / Wait ให้เป็นสีแดงทั้งหมด */
  .custom-steps-rejected .ant-steps-item-finish .ant-steps-item-tail::after,
  .custom-steps-rejected .ant-steps-item-process .ant-steps-item-tail::after,
  .custom-steps-rejected .ant-steps-item-wait .ant-steps-item-tail::after {
    background-color: #ef4444 !important;
    background: #ef4444 !important;
  }

  /* 3. ปรับแต่งวงกลมไอคอนและขอบของ Step ที่ Finish ให้เป็นสีแดง */
  .custom-steps-rejected .ant-steps-item-finish .ant-steps-item-icon {
    border-color: #ef4444 !important;
    background-color: #fef2f2 !important;
  }
  .custom-steps-rejected .ant-steps-item-finish .ant-steps-icon {
    color: #ef4444 !important;
  }
`}</style>

export default StaffClaimUpdate;