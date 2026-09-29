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
  Form,
} from "antd";
import {
  CheckCircleOutlined,
  FileSearchOutlined,
  CloseCircleOutlined,
  InboxOutlined,
  CarOutlined,
  SmileOutlined,
  SaveOutlined,
  ArrowLeftOutlined,
  PrinterOutlined,
  EditOutlined,
  UndoOutlined,
  PictureOutlined,
  SendOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import ClaimPrintModal from "../../components/ClaimPrintModal";
import ClaimStatusTag from "../../components/ClaimStatusTag";
import { STATUS_PRIORITY, getStatusName, getStatusId, CLAIM_STATUS_MAP } from "../../constants/claimStatus";
import claimService from "../../services/claimService";
import itemService from "../../services/itemService";
import loginService from "../../services/loginService";
import userService from "../../services/userService";
import deliveryService from "../../services/deliveryService";
import agentService from "../../services/agentService";
import { getAgentNameByUserId } from "../../utils/agentHelper";

const formatDateString = (date) => {
  if (!date) return "-";
  const parsed = dayjs(date);
  if (!parsed.isValid()) return "-";
  return parsed.format("DD/MM/YYYY");
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

  if (normalizedCurrent === "ไม่มีสิทธิ์เคลม") return "รอการพิจารณา";
  if (normalizedCurrent === "ไม่อนุมัติเคลมสินค้า") return "รับสินค้าจริงแล้ว";

  const currentLevel = STATUS_PRIORITY[normalizedCurrent] || 1;
  if (currentLevel <= 1) return null;

  const prevLevel = currentLevel - 1;
  const entry = Object.entries(STATUS_PRIORITY).find(([_, level]) => level === prevLevel);
  return entry ? entry[0] : null;
};

const isValidStatusTransition = (currentStatus, newStatus) => {
  if (currentStatus === newStatus) return true;
  const normalizedCurrent = getStatusName(currentStatus);
  const normalizedNew = getStatusName(newStatus);

  if (normalizedCurrent === "รอการพิจารณา" && normalizedNew === "ไม่มีสิทธิ์เคลม") return true;
  if (normalizedCurrent === "รับสินค้าจริงแล้ว" && normalizedNew === "ไม่อนุมัติเคลมสินค้า") return true;

  if (normalizedCurrent === "ไม่มีสิทธิ์เคลม" && (normalizedNew === "มีสิทธิ์เคลม" || normalizedNew === "รอการพิจารณา")) return true;
  if (normalizedCurrent === "ไม่อนุมัติเคลมสินค้า" && (normalizedNew === "อนุมัติเคลมสินค้า" || normalizedNew === "รับสินค้าจริงแล้ว")) return true;
  if (normalizedCurrent === "จัดส่งสินค้าเคลมสำเร็จ" && normalizedNew === "กำลังจัดส่งสินค้าเคลม") return true;

  const currentLevel = STATUS_PRIORITY[normalizedCurrent] || 1;
  const newLevel = STATUS_PRIORITY[normalizedNew] || 1;

  return newLevel === currentLevel + 1 || newLevel === currentLevel - 1;
};

const getActionNameByStatus = (statusVal) => {
  const statusStr = String(statusVal);
  switch (statusStr) {
    case "2":
    case "มีสิทธิ์เคลม":
      return "approve_date";
    case "4":
    case "รับสินค้าจริงแล้ว":
    case "รับสินค้าแล้ว":
      return "driver_receive_date";
    case "6":
    case "อนุมัติเคลมสินค้า":
      return "approve_date";
    case "8":
    case "กำลังดำเนินการเปลี่ยนสินค้า":
      return "warehouse_receive_date";
    case "9":
    case "กำลังจัดส่งสินค้าเคลม":
      return "delivery_date";
    case "10":
    case "จัดส่งสินค้าเคลมสำเร็จ":
      return "receive_finish_date";
    default:
      return "approve_date";
  }
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

  // State สำหรับข้อความสนทนา
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const currentUser = loginService.getCurrentUser();
  const currentUserId = currentUser?.user_id || currentUser?.id;

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
  };

  // อัปเดตข้อมูลรายละเอียดสินค้าแยกรายชิ้นใน Modal
  const handleItemChange = (index, field, value) => {
    setClaimItems((prevItems) => {
      const updated = [...prevItems];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  useEffect(() => {
    fetchClaimDetail();
  }, [claimId]);

  const fetchClaimDetail = async () => {
    setLoading(true);
    try {
      const [resClaim, resMasterItems, resLogs, resApproves, resUsers, resAgents] = await Promise.all([
        claimService.getClaim(),
        itemService.getItems(),
        claimService.getClaimStatusLogs(),
        claimService.getclaimapproves(),
        userService.getUsers(),
        agentService.getAgent(),
      ]);

      const masterItemsMap = {};
      const masterItemsData = Array.isArray(resMasterItems?.data) ? resMasterItems.data : Array.isArray(resMasterItems) ? resMasterItems : [];
      masterItemsData.forEach((item) => {
        masterItemsMap[item.item_id] = `${item.item_code || ""} - ${item.item_name || ""}`;
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
                const itemImgs = rawImages.filter((img) => {
                  const matchClaimItem = img.claim_item_id && ci.claim_item_id && String(img.claim_item_id) === String(ci.claim_item_id);
                  const matchItem = img.item_id && ci.item_id && String(img.item_id) === String(ci.item_id);
                  return matchClaimItem || matchItem;
                });

                const finalImages = itemImgs.length > 0 ? itemImgs : rawImages;

                return {
                  key: ci.claim_item_id || idx,
                  ...ci,
                  item_name: masterItemsMap[ci.item_id] || `สินค้า ID: ${ci.item_id}`,
                  images: finalImages.map((i) => i.formattedUrl),
                  received_qty: ci.received_qty ?? ci.qty,
                  approved_qty: ci.approved_qty ?? ci.qty,
                  returned_qty: ci.returned_qty ?? ci.qty,
                  withdraw_date: ci.withdraw_date ? dayjs(ci.withdraw_date) : null,
                  lot_no_change: ci.lot_no_change || "",
                  mfg_date_change: ci.mfg_date_change ? dayjs(ci.mfg_date_change) : null,
                };
              });
            }
          } catch (itemsErr) {
            console.warn("ไม่สามารถดึงรายการสินค้าเคลมได้:", itemsErr);
            if (currentClaim.item_id) {
              itemsList = [
                {
                  key: 1,
                  item_id: currentClaim.item_id,
                  item_name: masterItemsMap[currentClaim.item_id] || `สินค้า ID: ${currentClaim.item_id}`,
                  lot_no: currentClaim.lot_no || currentClaim.lot,
                  mfg_date: currentClaim.mfg_date,
                  expire_date: currentClaim.exp_date || currentClaim.expire_date,
                  qty: currentClaim.qty,
                  received_qty: currentClaim.qty,
                  approved_qty: currentClaim.qty,
                  returned_qty: currentClaim.qty,
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

          const logsData = resLogs?.data || resLogs || [];
          const filteredLogs = Array.isArray(logsData)
            ? logsData.filter((log) => String(log.claim_id) === String(currentClaim.claim_id))
            : [];
          setStatusLogs(filteredLogs);

          // กรองและคัดแยกข้อความฝากสนทนา
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

          const extraLogData = parseExtraDataFromLogs(filteredLogs);

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
      setLoading(false);
    }
  };

  // ฟังก์ชันส่งข้อความฝากสนทนา
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    setSendingMsg(true);
    try {
      const realClaimId = data.claim_id;
      const formattedRemark = `[MSG] [STAFF] ${newMessage.trim()}`;

      await claimService.createClaimStatusLogs({
        claim_id: String(realClaimId),
        status: String(getStatusId(data.current_status)),
        remark: formattedRemark,
        update_by: currentUserId,
        user_id: currentUserId,
      });

      message.success("ส่งข้อความเรียบร้อยแล้ว");
      setNewMessage("");
      fetchClaimDetail();
    } catch (err) {
      message.error("ส่งข้อความไม่สำเร็จ: " + err.message);
    } finally {
      setSendingMsg(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-64 flex justify-center items-center">
        <Spin size="large" tip="กำลังโหลดข้อมูล..." />
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

  const currentStatusInDB = getStatusName(data.current_status || "สร้างรายการเคลม");
  const currentStatusId = String(getStatusId(data.current_status));
  const isRejectedInDB =
    currentStatusId === "3" ||
    currentStatusId === "7" ||
    currentStatusInDB === "ไม่อนุมัติเคลมสินค้า" ||
    currentStatusInDB === "ไม่มีสิทธิ์เคลม";

  const isModalStatusRejected = formData.status === "ไม่อนุมัติเคลมสินค้า" || formData.status === "ไม่มีสิทธิ์เคลม";
  const isFinalStatus = ["ไม่มีสิทธิ์เคลม", "ไม่อนุมัติเคลมสินค้า", "จัดส่งสินค้าเคลมสำเร็จ"].includes(currentStatusInDB);

  const previousStatusName = getPreviousStatusName(currentStatusInDB);

  const getLogRawDateString = (statusTarget) => {
    const targetId = String(statusTarget);
    const matchingLogs = statusLogs.filter(
      (item) => String(item.status || item.status_id) === targetId
    );

    if (matchingLogs.length > 0) {
      const lastLog = matchingLogs[matchingLogs.length - 1];
      const rawDate = lastLog.update_date || lastLog.created_at || lastLog.created_date;
      return formatDateString(rawDate);
    }

    if (targetId === "1" || targetId === "5") return formatDateString(data.claim_date || data.created_at);
    if (targetId === "2" || targetId === "6") return formatDateString(data.approve_date);
    if (targetId === "4") return formatDateString(data.driver_receive_date || data.warehouse_receive_date);
    if (targetId === "8") return formatDateString(data.withdraw_date);
    if (targetId === "9") return formatDateString(data.delivery_date);
    if (targetId === "10") return formatDateString(data.receive_finish_date);

    return "-";
  };

  const getLogDate = (statusTarget) => {
    const targetId = String(statusTarget);
    const currentPriority = CLAIM_STATUS_MAP[String(currentStatusId)]?.priority || 0;
    const targetPriority = CLAIM_STATUS_MAP[targetId]?.priority || 0;

    if (!isRejectedInDB && targetPriority > currentPriority) {
      return "-";
    }

    const matchingLogs = statusLogs.filter(
      (item) => String(item.status || item.status_id) === targetId
    );

    if (matchingLogs.length > 0) {
      const lastLog = matchingLogs[matchingLogs.length - 1];
      const rawDate = lastLog.update_date || lastLog.created_at || lastLog.created_date;
      return formatDate(rawDate);
    }

    if (targetId === "1" || targetId === "5") return formatDate(data.claim_date || data.created_at);
    if (targetId === "2" || targetId === "6") return formatDate(data.approve_date);
    if (targetId === "4") return formatDate(data.driver_receive_date || data.warehouse_receive_date);
    if (targetId === "8") return formatDate(data.withdraw_date);
    if (targetId === "9") return formatDate(data.delivery_date);
    if (targetId === "10") return formatDate(data.receive_finish_date);

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

    try {
      const { images, image, ...cleanData } = data;
      const realClaimId = cleanData.claim_id || data.claim_id;
      const statusId = getStatusId(targetStatus);
      const actionsName = getActionNameByStatus(targetStatus);

      // ฟอร์แมตวันที่รายชิ้นของ claimItems ก่อนส่งขึ้น Backend
      const formattedClaimItems = claimItems.map((item) => ({
        ...item,
        withdraw_date: item.withdraw_date ? (dayjs.isDayjs(item.withdraw_date) ? item.withdraw_date.format("YYYY-MM-DD") : item.withdraw_date) : null,
        mfg_date_change: item.mfg_date_change ? (dayjs.isDayjs(item.mfg_date_change) ? item.mfg_date_change.format("YYYY-MM-DD") : item.mfg_date_change) : null,
      }));

      const extraData = {
        driverName: formData.driverName,
        truckPlate: formData.truckPlate,
        claimNoInput: formData.claimNoInput,
        fullReceive: formData.fullReceive,
        deliveryDriver: formData.deliveryDriver,
        deliveryPlate: formData.deliveryPlate,
        estimatedDeliveryDate: formData.estimatedDeliveryDate ? dayjs(formData.estimatedDeliveryDate).format("YYYY-MM-DD") : "",
      };

      const mainRemarkText = isSteppingBack
        ? `ถอยสถานะย้อนกลับจาก (${currentStatusInDB}) เป็น ${targetStatus}`
        : `เปลี่ยนสถานะเป็น ${targetStatus}`;

      const fullRemark = `${mainRemarkText} | DATA:${JSON.stringify(extraData)}`;

      const updatePayload = {
        ...cleanData,
        claim_id: realClaimId,
        current_status: statusId,
        status: statusId,
        status_name: targetStatus,
        actionsname: actionsName,
        is_revert: true,
        update_by: currentUserId,
        items: formattedClaimItems,
      };

      const resUpdate = await claimService.updateClaim(updatePayload);

      if (resUpdate?.status) {
        await claimService.createClaimStatusLogs({
          claim_id: String(realClaimId),
          status: String(statusId),
          remark: fullRemark,
          update_by: currentUserId,
          user_id: currentUserId,
        });

        message.success(isSteppingBack ? `ถอยสถานะเป็น "${targetStatus}" เรียบร้อยแล้ว` : "บันทึกข้อมูลเรียบร้อยแล้ว");
        setIsModalOpen(false);
        fetchClaimDetail();
      }
    } catch (error) {
      message.error(error.message || "เกิดข้อผิดพลาดในการอัปเดตสถานะ");
    }
  };

  const handleOpenRevertModal = () => {
    let targetStatus = currentStatusInDB;
    if (currentStatusInDB === "ไม่มีสิทธิ์เคลม") {
      targetStatus = "มีสิทธิ์เคลม";
    } else if (currentStatusInDB === "ไม่อนุมัติเคลมสินค้า") {
      targetStatus = "อนุมัติเคลมสินค้า";
    } else if (currentStatusInDB === "จัดส่งสินค้าเคลมสำเร็จ") {
      targetStatus = "กำลังจัดส่งสินค้าเคลม";
    }

    handleInputChange("status", targetStatus);
    handleInputChange("estimatedDeliveryDate", data.estimated_delivery_date ? dayjs(data.estimated_delivery_date) : null);
    setIsModalOpen(true);
  };

  const getCurrentStep = () => {
    const level = STATUS_PRIORITY[currentStatusInDB];

    if (isRejectedInDB) {
      if (currentStatusInDB === "ไม่มีสิทธิ์เคลม" || currentStatusId === "3") return 2;
      if (currentStatusInDB === "ไม่อนุมัติเคลมสินค้า" || currentStatusId === "7") return 2;
      return 1;
    }

    return level ? level - 1 : 0;
  };

  const getSelectOptions = () => {
    if (currentStatusInDB === "ไม่อนุมัติเคลมสินค้า") {
      return [
        { value: "อนุมัติเคลมสินค้า", label: "อนุมัติเคลมสินค้า (เปลี่ยนกลับมาดำเนินรายการต่อ)" },
        { value: "ไม่อนุมัติเคลมสินค้า", label: "ไม่อนุมัติเคลมสินค้า (คงเดิม)" },
      ];
    }

    if (currentStatusInDB === "ไม่มีสิทธิ์เคลม") {
      return [
        { value: "มีสิทธิ์เคลม", label: "มีสิทธิ์เคลม (เปลี่ยนกลับมาดำเนินรายการต่อ)" },
        { value: "ไม่มีสิทธิ์เคลม", label: "ไม่มีสิทธิ์เคลม (คงเดิม)" },
      ];
    }

    const nextOptionsMap = {
      "สร้างรายการเคลม": [
        { value: "รอการพิจารณา", label: "ขั้นที่ 2: รอการพิจารณา" },
      ],
      "รอการพิจารณา": [
        { value: "มีสิทธิ์เคลม", label: "ขั้นที่ 3: มีสิทธิ์เคลม" },
        { value: "ไม่มีสิทธิ์เคลม", label: "ขั้นที่ 3: ไม่มีสิทธิ์เคลม (สิ้นสุด)" },
      ],
      "มีสิทธิ์เคลม": [
        { value: "รับสินค้าจริงแล้ว", label: "ขั้นที่ 4: รับสินค้าจริงแล้ว" },
      ],
      "รับสินค้าจริงแล้ว": [
        { value: "อนุมัติเคลมสินค้า", label: "ขั้นที่ 5: อนุมัติเคลมสินค้า" },
        { value: "ไม่อนุมัติเคลมสินค้า", label: "ขั้นที่ 5: ไม่อนุมัติเคลมสินค้า (สิ้นสุด)" },
      ],
      "อนุมัติเคลมสินค้า": [
        { value: "กำลังดำเนินการเปลี่ยนสินค้า", label: "ขั้นที่ 6: กำลังดำเนินการเปลี่ยนสินค้า" },
      ],
      "กำลังดำเนินการเปลี่ยนสินค้า": [
        { value: "กำลังจัดส่งสินค้าเคลม", label: "ขั้นที่ 7: กำลังจัดส่งสินค้าเคลม" },
      ],
      "กำลังจัดส่งสินค้าเคลม": [
        { value: "จัดส่งสินค้าเคลมสำเร็จ", label: "ขั้นที่ 8: จัดส่งสินค้าเคลมสำเร็จ" },
      ],
    };

    return nextOptionsMap[currentStatusInDB] || [];
  };

  const validateForm = () => {
    const { status, rejectReason, driverName, truckPlate, deliveryDriver, deliveryPlate, estimatedDeliveryDate } = formData;

    if (!isValidStatusTransition(currentStatusInDB, status)) {
      message.error(`ไม่สามารถเปลี่ยนจาก "${currentStatusInDB}" ไปเป็น "${status}" ได้`);
      return false;
    }
    if (isModalStatusRejected && !rejectReason.trim()) {
      message.error("กรุณาระบุเหตุผลการปฏิเสธการเคลม");
      return false;
    }
    if ((status === "รับสินค้าจริงแล้ว" || status === "รับสินค้าแล้ว") && (!driverName.trim() || !truckPlate.trim())) {
      message.error("กรุณาระบุชื่อ พขร. และทะเบียนรถผู้ไปรับสินค้า");
      return false;
    }
    if (status === "กำลังดำเนินการเปลี่ยนสินค้า") {
      for (let i = 0; i < claimItems.length; i++) {
        const item = claimItems[i];
        if (!item.withdraw_date || !item.returned_qty?.toString().trim() || !item.approved_qty?.toString().trim()) {
          message.error(`กรุณาระบุวันที่เบิกสินค้า จำนวนที่ส่งคืน และจำนวนที่รองรับการเปลี่ยนให้ครบถ้วนในรายการที่ ${i + 1} (${item.item_name})`);
          return false;
        }
      }
    }
    if (status === "กำลังจัดส่งสินค้าเคลม" && (!deliveryDriver.trim() || !deliveryPlate.trim() || !estimatedDeliveryDate)) {
      message.error("กรุณาระบุชื่อ พขร., ทะเบียนรถ และวันที่คาดว่าจะส่งถึงลูกค้าให้ครบถ้วน");
      return false;
    }
    return true;
  };

  const handleSaveStatus = async () => {
    if (!validateForm()) return;

    if (!currentUserId) {
      message.error("ไม่พบรหัสผู้ใช้งาน (User ID) กรุณาล็อกอินใหม่อีกครั้ง");
      return;
    }

    try {
      const { images, image, ...cleanData } = data;
      const realClaimId = cleanData.claim_id || data.claim_id;
      const { status, rejectReason, driverName, truckPlate, claimNoInput, fullReceive, deliveryDriver, deliveryPlate, estimatedDeliveryDate } = formData;

      const formatDatePayload = (date) => (date ? (dayjs.isDayjs(date) ? date.format("YYYY-MM-DD") : date) : "");
     
      const statusId = getStatusId(status);
      const actionsName = getActionNameByStatus(status);

      const extraData = {
        driverName,
        truckPlate,
        claimNoInput,
        fullReceive,
        deliveryDriver,
        deliveryPlate,
        estimatedDeliveryDate: formatDatePayload(estimatedDeliveryDate),
      };

      const isSteppingBack = (STATUS_PRIORITY[status] || 0) < (STATUS_PRIORITY[currentStatusInDB] || 0);
      const mainRemarkText = isSteppingBack
        ? `ถอยสถานะย้อนกลับจาก (${currentStatusInDB}) เป็น ${status}`
        : isFinalStatus
        ? `แก้ไขย้อนกลับสถานะจาก (${currentStatusInDB}) เป็น ${status}`
        : isModalStatusRejected
        ? rejectReason
        : `เปลี่ยนสถานะเป็น ${status}`;

      const fullRemark = `${mainRemarkText} | DATA:${JSON.stringify(extraData)}`;

      const nowFormattedStandard = dayjs().format("YYYY-MM-DD HH:mm:ss");
      const timestampUpdates = {};

      const isReceiveStatus = status === "รับสินค้าจริงแล้ว" || status === "รับสินค้าแล้ว";
      const isDeliveryStatus = status === "กำลังจัดส่งสินค้าเคลม";

      if (isReceiveStatus) {
        timestampUpdates.warehouse_receive_date = nowFormattedStandard;
        if (!cleanData.driver_receive_date) {
          timestampUpdates.driver_receive_date = nowFormattedStandard;
        }
      } else if ((status === "อนุมัติเคลมสินค้า") && !cleanData.approve_date) {
        timestampUpdates.approve_date = nowFormattedStandard;
      } else if (status === "กำลังดำเนินการเปลี่ยนสินค้า" && !cleanData.warehouse_receive_date) {
        timestampUpdates.warehouse_receive_date = nowFormattedStandard;
      } else if (isDeliveryStatus && !cleanData.delivery_date) {
        timestampUpdates.delivery_date = nowFormattedStandard;
      } else if (status === "จัดส่งสินค้าเคลมสำเร็จ" && !cleanData.receive_finish_date) {
        timestampUpdates.receive_finish_date = nowFormattedStandard;
      }

      // ฟอร์แมตวันที่รายชิ้นของ claimItems
      const formattedClaimItems = claimItems.map((item) => ({
        ...item,
        withdraw_date: item.withdraw_date ? formatDatePayload(item.withdraw_date) : null,
        mfg_date_change: item.mfg_date_change ? formatDatePayload(item.mfg_date_change) : null,
      }));

      const updatePayload = {
        ...cleanData,
        claim_id: realClaimId,
        actionsname: actionsName,
        claim_date: cleanData.claim_date ? dayjs(cleanData.claim_date).format("YYYY-MM-DD") : null,
        mfg_date: cleanData.mfg_date ? dayjs(cleanData.mfg_date).format("YYYY-MM-DD") : null,
        exp_date: cleanData.exp_date || cleanData.expire_date ? dayjs(cleanData.exp_date || cleanData.expire_date).format("YYYY-MM-DD") : null,

        current_status: statusId,
        status: statusId,
        status_name: status,

        reject_reason: isModalStatusRejected ? rejectReason : "",
        driver_name: isReceiveStatus || cleanData.driver_name ? driverName : "",
        truck_plate: isReceiveStatus || cleanData.truck_plate ? truckPlate : "",
        claim_no: isReceiveStatus || cleanData.claim_no ? claimNoInput : cleanData.claim_no,
        full_receive: isReceiveStatus || cleanData.full_receive ? fullReceive : "",
        delivery_driver: isDeliveryStatus || cleanData.delivery_driver ? deliveryDriver : "",
        delivery_plate: isDeliveryStatus || cleanData.delivery_plate ? deliveryPlate : "",
        estimated_delivery_date: isDeliveryStatus || cleanData.estimated_delivery_date ? formatDatePayload(estimatedDeliveryDate) : "",
        items: formattedClaimItems,
        ...timestampUpdates,
        update_by: currentUserId,
      };

      const resUpdate = await claimService.updateClaim(updatePayload);

      if (resUpdate?.status) {
        if (isReceiveStatus || isDeliveryStatus) {
          try {
            const rawId = realClaimId;
            const numericClaimId = typeof rawId === "number" ? rawId : parseInt(rawId, 10);
            const numericDriverId = parseInt(currentUserId, 10);
            const validDriverId = !isNaN(numericDriverId) && numericDriverId > 0 ? numericDriverId : null;

            if (!isNaN(numericClaimId) && numericClaimId > 0) {
              const deliveryPayload = {
                claim_id: numericClaimId,
                driver_id: validDriverId,
                delivery_status: isReceiveStatus ? "1" : "2",
                driver_name: isReceiveStatus ? driverName : deliveryDriver,
                truck_plate: isReceiveStatus ? truckPlate : deliveryPlate,
                estimated_delivery_date: isDeliveryStatus ? formatDatePayload(estimatedDeliveryDate) : null,
                claim_no: claimNoInput || cleanData.claim_no || "",
                receive_date: new Date().toISOString(),
              };

              await deliveryService.createDelivery(deliveryPayload);
            }
          } catch (delErr) {
            console.error("Error จาก Backend createDelivery:", delErr?.response?.data || delErr.message);
          }
        }

        await claimService.createClaimStatusLogs({
          claim_id: String(realClaimId),
          status: String(statusId),
          remark: fullRemark,
          update_by: currentUserId,
          user_id: currentUserId,
        });

        let approveStatusValue = null;
        if (status === "อนุมัติเคลมสินค้า") {
          approveStatusValue = true;
        } else if (status === "ไม่อนุมัติเคลมสินค้า" || status === "ไม่มีสิทธิ์เคลม") {
          approveStatusValue = false;
        }

        if (approveStatusValue !== null) {
          await claimService.createClaimapproves({
            claim_id: String(realClaimId),
            approve_by: String(currentUserId),
            approve_status: approveStatusValue,
            approve_remark: isModalStatusRejected ? rejectReason : `ดำเนินการสถานะ: ${status}`,
          }); 
        }

        message.success("ปรับปรุงสถานะรายการเคลมเรียบร้อยแล้ว");
        setIsModalOpen(false);

        setTimeout(() => {
          fetchClaimDetail();
        }, 500);
      }
    } catch (error) {
      message.error(error.message || "เกิดข้อผิดพลาดในการอัปเดตสถานะ");
    }
  };

  const renderDotIcon = (IconComponent) => (
    <div className="relative flex items-center justify-center w-full h-full">
      <IconComponent className="text-lg relative z-10" />
      <span className="absolute w-2.5 h-2.5 bg-current rounded-full -bottom-1 z-0 opacity-80" />
    </div>
  );

  const getStepItems = () => {
    const rejectReason = data?.reject_reason || data?.remark;

    if (isRejectedInDB) {
      return [
        { title: "สร้างรายการ", description: getLogDate(1), icon: renderDotIcon(CheckCircleOutlined) },
        { title: "รอการพิจารณา", description: getLogDate(5), icon: renderDotIcon(FileSearchOutlined) },
        {
          title: CLAIM_STATUS_MAP[currentStatusId]?.staffName || "ปฏิเสธการเคลม",
          description: (
            <div className="text-xs">
              <div>{getLogDate(currentStatusId)}</div>
              {rejectReason && <div className="text-red-500 font-medium break-words">{rejectReason}</div>}
            </div>
          ),
          icon: renderDotIcon(CloseCircleOutlined),
        },
      ];
    }

    return [
      { title: "สร้างรายการ", description: getLogDate(1), icon: renderDotIcon(CheckCircleOutlined) },
      { title: "รอการพิจารณา", description: getLogDate(5), icon: renderDotIcon(FileSearchOutlined) },
      { title: "มีสิทธิ์เคลม", description: getLogDate(2), icon: renderDotIcon(CheckCircleOutlined) },
      { title: "รับสินค้าแล้ว", description: getLogDate(4), icon: renderDotIcon(InboxOutlined) },
      { title: "อนุมัติเคลม", description: getLogDate(6), icon: renderDotIcon(CheckCircleOutlined) },
      { title: "กำลังเปลี่ยนสินค้า", description: getLogDate(8), icon: renderDotIcon(FileSearchOutlined) },
      { title: "กำลังจัดส่ง", description: getLogDate(9), icon: renderDotIcon(CarOutlined) },
      { title: "จัดส่งสำเร็จ", description: getLogDate(10), icon: renderDotIcon(SmileOutlined) },
    ];
  };

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
      title: "จำนวนแจ้งเคลม",
      dataIndex: "qty",
      key: "qty",
      width: 100,
      align: "right",
      render: (qty) => <span className="font-semibold text-slate-700">{qty}</span>,
    },
    {
      title: "จำนวนรับจริง",
      dataIndex: "received_qty",
      key: "received_qty",
      width: 100,
      align: "right",
      render: (rQty, record) => (
        <span className="font-semibold text-emerald-600">{rQty ?? record.qty}</span>
      ),
    },
    {
      title: "สาเหตุและรายละเอียด",
      dataIndex: "remark",
      key: "remark",
      render: (text) => <div className="text-xs text-slate-600 whitespace-pre-wrap break-words">{text || "-"}</div>,
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
              <ClaimStatusTag status={data.current_status || data.status} />
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
                      : "อารียา, สุรศักดิ์, ยุทธพงษ์",
                    receiveDate: (() => {
                      const targetDate = driverReceiveLogDateStr !== "-" ? driverReceiveLogDateStr : data?.claim_date;
                      if (!targetDate || targetDate === "-") return "-";
                      return formatDateString(targetDate);
                    })(),
                    createdDate: getLogRawDateString("1") !== "-" 
                      ? getLogRawDateString("1") 
                      : (data?.claim_date ? dayjs(data.claim_date).format("DD/MM/YYYY") : "-"),
                    deliverySuccessDate: (() => {
                      const log10 = getLogRawDateString("10");
                      const log9 = getLogRawDateString("9");
                      const targetLog = log10 !== "-" ? log10 : log9;
                      return targetLog !== "-" ? targetLog : "-";
                    })(),
                    agentName: agentNameDisplay,
                    agent_name: agentNameDisplay,
                    reporter: reporterNameDisplay,
                    deliverySuccessName: deliverySuccessNameDisplay !== "-" ? deliverySuccessNameDisplay : agentNameDisplay,
                    driverName: data.driver_name || "-",
                    claimType: data.claim_type || data.claim_reason || data.remark || data.detail || "",
                    withdrawDate: data.withdraw_date,
                    items: claimItems
                  }}
                />
              </div>
            )}

            {!isFinalStatus && previousStatusName && (
              <Button
                type="default"
                icon={<UndoOutlined />}
                className="border-amber-500 text-amber-600 hover:text-amber-700 hover:bg-amber-50 hover:border-amber-600 rounded-xl font-normal shrink-0 h-10 shadow-sm"
                style={{ paddingLeft: "16px", paddingRight: "16px" }}
                onClick={handleStepBack}
              >
                ถอยสถานะ
              </Button>
            )}

            {isFinalStatus ? (
              <Button
                type="primary"
                danger
                icon={<EditOutlined />}
                className="rounded-xl font-normal shrink-0 h-10 shadow-sm"
                style={{ paddingLeft: "20px", paddingRight: "20px" }}
                onClick={handleOpenRevertModal}
              >
                ขอแก้ไขรายการเคลม
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<SaveOutlined />}
                className="bg-blue-600 hover:bg-blue-700 border-none rounded-xl font-medium shrink-0 h-10 shadow-md"
                style={{ paddingLeft: "24px", paddingRight: "24px" }}
                onClick={() => {
                  const options = getSelectOptions();
                  
                  const forwardOptions = options.filter(
                    (opt) => !opt.label.includes("(คงเดิม)") && !opt.label.includes("ถอยกลับ")
                  );

                  let defaultStatus = currentStatusInDB;

                  if (forwardOptions.length === 1) {
                    defaultStatus = forwardOptions[0].value;
                  } 
                  else if (forwardOptions.length > 1) {
                    defaultStatus = null; 
                  }

                  handleInputChange("status", defaultStatus);
                  handleInputChange("estimatedDeliveryDate", data.estimated_delivery_date ? dayjs(data.estimated_delivery_date) : null);
                  setIsModalOpen(true);
                }}
              >
                อัปเดตสถานะ
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card
        title={<span className="font-medium text-slate-800">มุมมองไทม์ไลน์สถานะ</span>}
        className="rounded-2xl shadow-sm border-gray-200 w-full overflow-hidden"
        bodyStyle={{ padding: "20px 12px", overflow: "hidden" }}
      >
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: isRejectedInDB ? "#ef4444" : "#059669",
              fontWeightStrong: 400,
            },
            components: {
              Steps: {
                lineWidth: 1.5,
                iconSize: 20,
                customIconSize: 20,
                titleFontSize: 11,
                descriptionFontSize: 8,
              },
            },
          }}
        >
          <div className="custom-steps-compact w-full overflow-hidden pb-2">
            <Steps
              responsive={true}
              current={getCurrentStep()}
              status={isRejectedInDB ? "error" : "process"}
              items={getStepItems()}
            />
          </div>
        </ConfigProvider>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full">
        {/* คอลัมน์ซ้าย (xl:col-span-2) */}
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

          {(STATUS_PRIORITY[currentStatusInDB] >= 4 || Boolean(data.driver_name && data.driver_name.trim())) && (
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
                <Descriptions.Item label="จำนวนที่รับคืนสินค้าแตก"><span className="font-mono">{data.full_receive || "-"}</span></Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          {(STATUS_PRIORITY[currentStatusInDB] >= 6 || claimItems.some(i => i.withdraw_date)) && (
            <Card title={<span className="font-medium text-slate-800">ข้อมูลการเบิกเปลี่ยนสินค้า (แยกรายสินค้า)</span>} className="rounded-2xl shadow-sm border-gray-200 w-full" bodyStyle={{ padding: "24px" }}>
              <div className="flex flex-col gap-4">
                {claimItems.map((item, idx) => (
                  <div key={item.key || idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-2">
                    <div className="font-semibold text-slate-800 text-sm border-b pb-1.5 flex justify-between items-center">
                      <span>{idx + 1}. {item.item_name}</span>
                      <Tag color="emerald">อนุมัติเปลี่ยน: {item.approved_qty ?? "-"} ขวด/กระป๋อง</Tag>
                    </div>
                    <Descriptions 
                      column={{ xs: 1, sm: 2 }} 
                      bordered 
                      size="small" 
                      labelStyle={{ fontWeight: "500", color: "#475569", backgroundColor: "#ffffff", fontSize: "12px" }}
                      contentStyle={{ color: "#1e293b", fontSize: "12px" }}
                    >
                      <Descriptions.Item label="วันที่เบิกสินค้า">
                        <span className="font-mono">{item.withdraw_date ? dayjs(item.withdraw_date).format("DD/MM/YYYY") : "-"}</span>
                      </Descriptions.Item>
                      <Descriptions.Item label="Lot Number ล็อตใหม่">
                        <span className="font-mono bg-white px-2 py-0.5 rounded border text-slate-800">{item.lot_no_change || "-"}</span>
                      </Descriptions.Item>
                      <Descriptions.Item label="MFG Date วันผลิตใหม่">
                        <span className="font-mono text-emerald-600 font-medium">{item.mfg_date_change ? dayjs(item.mfg_date_change).format("DD/MM/YYYY") : "-"}</span>
                      </Descriptions.Item>
                      <Descriptions.Item label="จำนวนส่งคืน / เปลี่ยนแตก">
                        <span>ส่งคืน: <b>{item.returned_qty ?? "-"}</b> | เปลี่ยน: <b className="text-emerald-600">{item.approved_qty ?? "-"}</b></span>
                      </Descriptions.Item>
                    </Descriptions>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {(STATUS_PRIORITY[currentStatusInDB] >= 7 || Boolean(data.delivery_driver && data.delivery_driver.trim())) && (
            <Card title={<span className="font-medium text-slate-800">ข้อมูลการจัดส่งสินค้าเคลม</span>} className="rounded-2xl shadow-sm border-gray-200 w-full" bodyStyle={{ padding: "24px" }}>
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
                <Descriptions.Item label="พนักงานขับรถจัดส่งสินค้าเคลม"><span className="text-slate-800 break-words">{data.delivery_driver || "-"}</span></Descriptions.Item>
                <Descriptions.Item label="ทะเบียนรถจัดส่ง"><span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs">{data.delivery_plate || "-"}</span></Descriptions.Item>
                <Descriptions.Item label="วันที่คาดว่าจะส่งถึงลูกค้า">
                  <span className="text-blue-600">{data.estimated_delivery_date ? dayjs(data.estimated_delivery_date).format("DD/MM/YYYY") : "-"}</span>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}
        </div>

        {/* คอลัมน์ขวา (xl:col-span-1) */}
        <div className="xl:col-span-1 flex flex-col gap-6 w-full">
          {/* Card รูปภาพหลักฐานทั้งหมด */}
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

         {/* Private Comments */}
          <Card
            className="rounded-2xl shadow-sm border border-slate-300 w-full bg-[#f0f4f9]/60"
            bodyStyle={{ padding: "20px" }}
          >
            <div className="flex flex-col gap-3">
              
              {/* 1. Header */}
              <div className="flex items-center gap-2">
                <UserOutlined className="text-slate-700 text-lg" />
                <span className="font-semibold text-slate-800 text-sm sm:text-base">
                  {chatMessages.length} private comments
                </span>
              </div>

              {/* 2. รายการข้อความ */}
              <div className="flex flex-col gap-3">
                {chatMessages.length > 0 ? (
                  chatMessages.map((msg) => (
                    <div key={msg.id} className="flex flex-col gap-1 w-full">
                      {/* ชื่อผู้ส่ง • วันที่ */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-800 text-xs">
                          {msg.senderName}
                        </span>
                        <span className="text-slate-400 text-[10px] font-normal">
                          • {msg.time ? dayjs(msg.time).format("DD/MM/YYYY HH:mm") : "-"}
                        </span>
                      </div>

                      {/* ข้อความ */}
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

              {/* เส้นคั่นกลาง */}
              <div className="border-t border-slate-200/80 w-full" />

              {/* 3. กล่องพิมพ์ข้อความ */}
              <Input.TextArea
                rows={2}
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

              {/* 4. ปุ่มส่ง */}
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

          <Card title={<span className="font-medium text-slate-800">ประวัติการบันทึกสถานะ</span>} className="rounded-2xl shadow-sm border-gray-200 w-full" bodyStyle={{ padding: "16px 24px" }}>
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

      {/* Modal อัปเดตสถานะ */}
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
        onCancel={() => setIsModalOpen(false)}
        okText="บันทึกเปลี่ยนสถานะ"
        cancelText="ยกเลิก"
        okButtonProps={{ 
          disabled: !formData.status || formData.status === currentStatusInDB,
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

          {(formData.status === "รับสินค้าจริงแล้ว" || formData.status === "รับสินค้าแล้ว") && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-4">
              <span className="text-sm font-medium text-slate-800 border-b pb-1">ข้อมูลที่เข้ารับสินค้า</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">ชื่อ-นามสกุล พขร.:</label>
                  <Input placeholder="เช่น นายสมชาย ใจดี" value={formData.driverName} onChange={(e) => handleInputChange("driverName", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">ทะเบียนรถ:</label>
                  <Input placeholder="เช่น 70-1234 กทม." value={formData.truckPlate} onChange={(e) => handleInputChange("truckPlate", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">เลขที่เอกสารเคลม (เล่ม-เลขที่):</label>
                  <Input placeholder="เช่น 055-02742" value={formData.claimNoInput} onChange={(e) => handleInputChange("claimNoInput", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">จำนวนที่รับคืนสินค้าแตกรวม(ขวด/กระป๋อง):</label>
                  <Input placeholder="เช่น 48" value={formData.fullReceive} onChange={(e) => handleInputChange("fullReceive", e.target.value)} />
                </div>
              </div>

              {/* รายละเอียดสินค้าในการรับจริง */}
              <div className="mt-2">
                <span className="text-xs font-semibold text-slate-700 mb-2 block">
                  ระบุรายละเอียดสินค้าที่รับจริง:
                </span>
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                  {claimItems.map((item, index) => (
                    <div key={item.key || index} className="p-2.5 bg-white rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-slate-800 truncate">{item.item_name}</div>
                        <div className="text-[11px] text-slate-500">จำนวนที่แจ้ง: {item.qty}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-28 shrink-0">
                          <label className="text-[10px] text-slate-500 block">รับจริง (ขวด/กระป๋อง)</label>
                          <InputNumber
                            min={0}
                            size="small"
                            className="w-full"
                            value={item.received_qty ?? item.qty}
                            onChange={(val) => handleItemChange(index, "received_qty", val)}
                          />
                        </div>
                        <div className="w-36 shrink-0">
                          <label className="text-[10px] text-slate-500 block">หมายเหตุเพิ่มเติม</label>
                          <Input
                            size="small"
                            placeholder="หมายเหตุ"
                            value={item.item_remark || ""}
                            onChange={(e) => handleItemChange(index, "item_remark", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {formData.status === "กำลังดำเนินการเปลี่ยนสินค้า" && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-4">
              <div className="flex justify-between items-center border-b pb-1">
                <span className="text-sm font-medium text-slate-800">ข้อมูลการเบิกและรับรองเปลี่ยนสินค้า (แยกรายสินค้า)</span>
                <span className="text-xs text-slate-500">{claimItems.length} รายการ</span>
              </div>

              {/* รายละเอียดสินค้าแต่ละตัวแบบแยกกรอบ */}
              <div className="flex flex-col gap-4 max-h-[420px] overflow-y-auto pr-1">
                {claimItems.map((item, index) => (
                  <div key={item.key || index} className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col gap-3 shadow-sm">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-800 truncate">{index + 1}. {item.item_name}</span>
                      <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">แจ้งเคลม: {item.qty} | รับจริง: {item.received_qty ?? item.qty}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">วันที่เบิกสินค้า <span className="text-red-500">*</span>:</label>
                        <DatePicker
                          className="w-full"
                          size="small"
                          format="DD/MM/YYYY"
                          placeholder="เลือกวันที่เบิก"
                          value={item.withdraw_date ? (dayjs.isDayjs(item.withdraw_date) ? item.withdraw_date : dayjs(item.withdraw_date)) : null}
                          onChange={(date) => handleItemChange(index, "withdraw_date", date)}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Lot Number ล็อตใหม่:</label>
                        <Input 
                          size="small"
                          placeholder="เช่น LOT123456" 
                          value={item.lot_no_change || ""} 
                          onChange={(e) => handleItemChange(index, "lot_no_change", e.target.value)} 
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">MFG Date วันผลิตใหม่:</label>
                        <DatePicker
                          className="w-full"
                          size="small"
                          format="DD/MM/YYYY"
                          placeholder="เลือกวันผลิต"
                          value={item.mfg_date_change ? (dayjs.isDayjs(item.mfg_date_change) ? item.mfg_date_change : dayjs(item.mfg_date_change)) : null}
                          onChange={(date) => handleItemChange(index, "mfg_date_change", date)}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">จำนวนส่งสินค้าคืน (ขวด/กระป๋อง) <span className="text-red-500">*</span>:</label>
                        <InputNumber
                          min={0}
                          size="small"
                          className="w-full"
                          placeholder="จำนวนส่งคืน"
                          value={item.returned_qty ?? item.qty}
                          onChange={(val) => handleItemChange(index, "returned_qty", val)}
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-emerald-700 mb-1">จำนวนรับรองการเปลี่ยนแตก (ขวด/กระป๋อง) <span className="text-red-500">*</span>:</label>
                        <InputNumber
                          min={0}
                          size="small"
                          className="w-full"
                          placeholder="จำนวนรับรองเปลี่ยน"
                          value={item.approved_qty ?? item.qty}
                          onChange={(val) => handleItemChange(index, "approved_qty", val)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {formData.status === "กำลังจัดส่งสินค้าเคลม" && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-3">
              <span className="text-sm font-medium text-slate-800">ข้อมูลการจัดส่งสินค้าเคลม</span>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ชื่อ-นามสกุล พขร. จัดส่ง:</label>
                <Input placeholder="เช่น นายสมศักดิ์ ขยันยิ่ง" value={formData.deliveryDriver} onChange={(e) => handleInputChange("deliveryDriver", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ทะเบียนรถจัดส่ง:</label>
                <Input placeholder="เช่น 80-5678 กทม." value={formData.deliveryPlate} onChange={(e) => handleInputChange("deliveryPlate", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">วันที่คาดว่าจะส่งถึงลูกค้า:</label>
                <DatePicker
                  className="w-full"
                  format="DD/MM/YYYY"
                  placeholder="เลือกวันที่ส่งถึง"
                  value={formData.estimatedDeliveryDate ? (dayjs.isDayjs(formData.estimatedDeliveryDate) ? formData.estimatedDeliveryDate : dayjs(formData.estimatedDeliveryDate)) : null}
                  onChange={(date) => handleInputChange("estimatedDeliveryDate", date)}
                />
              </div>
            </div>
          )}

          {isModalStatusRejected && (
            <div className="bg-red-50 p-3 rounded-xl border border-red-200 flex flex-col gap-2">
              <label className="block text-xs font-medium text-red-700">เหตุผลการปฏิเสธการเคลม (จำเป็น):</label>
              <Input.TextArea rows={3} placeholder="ระบุเหตุผลการไม่อนุมัติ หรือไม่มีสิทธิ์เคลม..." value={formData.rejectReason} onChange={(e) => handleInputChange("rejectReason", e.target.value)} />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default StaffClaimUpdate;