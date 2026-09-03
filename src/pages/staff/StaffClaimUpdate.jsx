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
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import ClaimPrintModal from "../../components/ClaimPrintModal";
import ClaimStatusTag from "../../components/ClaimStatusTag";
import { STATUS_PRIORITY, getStatusName, getStatusId } from "../../constants/claimStatus";
import claimService from "../../services/claimService";
import itemService from "../../services/itemService";
import loginService from "../../services/loginService";
import userService from "../../services/userService";
import deliveryService from "../../services/deliveryService";

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

const formatDate = (date) => {
  if (!date) return "-";
  const parsed = dayjs(date);
  return parsed.isValid() ? parsed.format("DD/MM/YYYY HH:mm") : "-";
};

const StaffClaimUpdate = () => {
  const navigate = useNavigate();
  const { claimId } = useParams();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [productName, setProductName] = useState("");
  const [statusLogs, setStatusLogs] = useState([]);
  const [approveLogs, setApproveLogs] = useState([]);
  const [usersMap, setUsersMap] = useState({});

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
    withdrawDate: null,
    returnedQty: "",
    approvedQty: "",
    deliveryDriver: "",
    deliveryPlate: "",
    estimatedDeliveryDate: null,
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    fetchClaimDetail();
  }, [claimId]);

  const fetchClaimDetail = async () => {
    setLoading(true);
    try {
      const [resClaim, resItems, resLogs, resApproves, resUsers] = await Promise.all([
        claimService.getClaim(),
        itemService.getItems(),
        claimService.getClaimStatusLogs(),
        claimService.getclaimapproves(),
        userService.getUsers(),
      ]);

      const usersData = resUsers?.data || resUsers || [];
      if (Array.isArray(usersData)) {
        const uMap = {};
        usersData.forEach((u) => {
          const uId = String(u.user_id || u.id);
          const name = u.full_name || u.fullname || u.name || `${u.first_name || ""} ${u.last_name || ""}`.trim();
          uMap[uId] = name || `User ID: ${uId}`;
        });
        setUsersMap(uMap);
      }

      if (resClaim?.data) {
        const currentClaim = resClaim.data.find(
          (item) => String(item.claim_id) === String(claimId) || item.claim_no === claimId
        );

        if (currentClaim) {
          let imageUrls = [];
          try {
            const resImages = await claimService.getClaimImages(currentClaim.claim_id);
            if (resImages?.data && Array.isArray(resImages.data)) {
              imageUrls = resImages.data.map(
                (img) => `http://localhost:5000${img.image_path}`
              );
            }
          } catch (imgErr) {
            console.error("ดึงรูปภาพไม่สำเร็จ:", imgErr);
          }

          const logsData = resLogs?.data || resLogs || [];
          const filteredLogs = Array.isArray(logsData)
            ? logsData.filter((log) => String(log.claim_id) === String(currentClaim.claim_id))
            : [];
          setStatusLogs(filteredLogs);

          const extraLogData = parseExtraDataFromLogs(filteredLogs);

          const mergedClaimData = {
            ...currentClaim,
            images: imageUrls,
            driver_name: currentClaim.driver_name || extraLogData.driverName || "",
            truck_plate: currentClaim.truck_plate || extraLogData.truckPlate || "",
            full_receive: currentClaim.full_receive || extraLogData.fullReceive || "",
            withdraw_date: currentClaim.withdraw_date || extraLogData.withdrawDate || null,
            returned_qty: currentClaim.returned_qty ?? extraLogData.returnedQty ?? "",
            approved_qty: currentClaim.approved_qty ?? extraLogData.approvedQty ?? "",
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
            withdrawDate: mergedClaimData.withdraw_date ? dayjs(mergedClaimData.withdraw_date) : null,
            returnedQty: mergedClaimData.returned_qty,
            approvedQty: mergedClaimData.approved_qty,
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

          if (resItems?.data) {
            const foundItem = resItems.data.find((i) => i.item_id === currentClaim.item_id);
            setProductName(foundItem ? foundItem.item_name : `สินค้า ID: ${currentClaim.item_id}`);
          }
        } else {
          message.error("ไม่พบข้อมูลรายการเคลมนี้");
        }
      }
    } catch (error) {
      message.error("ไม่สามารถดึงข้อมูลได้: " + (error.message || "เกิดข้อผิดพลาด"));
    } 
    finally {
      setLoading(false);
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
  const isRejectedInDB = currentStatusInDB === "ไม่อนุมัติเคลมสินค้า" || currentStatusInDB === "ไม่มีสิทธิ์เคลม";
  const isModalStatusRejected = formData.status === "ไม่อนุมัติเคลมสินค้า" || formData.status === "ไม่มีสิทธิ์เคลม";
  const isFinalStatus = ["ไม่มีสิทธิ์เคลม", "ไม่อนุมัติเคลมสินค้า", "จัดส่งสินค้าเคลมสำเร็จ"].includes(currentStatusInDB);

  const previousStatusName = getPreviousStatusName(currentStatusInDB);

  const getLogDate = (statusTarget) => {
    const targetId = String(statusTarget);
    const matchingLogs = statusLogs.filter(
      (item) => String(item.status || item.status_id) === targetId
    );

    if (matchingLogs.length > 0) {
      const lastLog = matchingLogs[matchingLogs.length - 1];
      const rawDate = lastLog.update_date || lastLog.created_at || lastLog.created_date;
      return formatDate(rawDate);
    }

    if (targetId === "1") return formatDate(data.claim_date || data.created_at);
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
    handleInputChange("status", previousStatusName);
    handleInputChange("withdrawDate", data.withdraw_date ? dayjs(data.withdraw_date) : null);
    handleInputChange("estimatedDeliveryDate", data.estimated_delivery_date ? dayjs(data.estimated_delivery_date) : null);
    setIsModalOpen(true);
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
    handleInputChange("withdrawDate", data.withdraw_date ? dayjs(data.withdraw_date) : null);
    handleInputChange("estimatedDeliveryDate", data.estimated_delivery_date ? dayjs(data.estimated_delivery_date) : null);
    setIsModalOpen(true);
  };

  const getCurrentStep = () => {
    const level = STATUS_PRIORITY[currentStatusInDB];

    if (isRejectedInDB) {
      if (currentStatusInDB === "ไม่มีสิทธิ์เคลม") return 2;
      if (currentStatusInDB === "ไม่อนุมัติเคลมสินค้า") return 4;
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
        { value: "สร้างรายการเคลม", label: "ขั้นที่ 1: สร้างรายการเคลม (คงเดิม)" },
        { value: "รอการพิจารณา", label: "ขั้นที่ 2: รอการพิจารณา" },
      ],
      "รอการพิจารณา": [
        { value: "สร้างรายการเคลม", label: "↩️ ถอยกลับ: สร้างรายการเคลม" },
        { value: "รอการพิจารณา", label: "ขั้นที่ 2: รอการพิจารณา (คงเดิม)" },
        { value: "มีสิทธิ์เคลม", label: "ขั้นที่ 3: มีสิทธิ์เคลม" },
        { value: "ไม่มีสิทธิ์เคลม", label: "ขั้นที่ 3: ไม่มีสิทธิ์เคลม (สิ้นสุด)" },
      ],
      "มีสิทธิ์เคลม": [
        { value: "รอการพิจารณา", label: "↩️ ถอยกลับ: รอการพิจารณา" },
        { value: "มีสิทธิ์เคลม", label: "ขั้นที่ 3: มีสิทธิ์เคลม (คงเดิม)" },
        { value: "รับสินค้าจริงแล้ว", label: "ขั้นที่ 4: รับสินค้าจริงแล้ว" },
      ],
      "รับสินค้าจริงแล้ว": [
        { value: "มีสิทธิ์เคลม", label: "↩️ ถอยกลับ: มีสิทธิ์เคลม" },
        { value: "รับสินค้าจริงแล้ว", label: "ขั้นที่ 4: รับสินค้าจริงแล้ว (คงเดิม)" },
        { value: "อนุมัติเคลมสินค้า", label: "ขั้นที่ 5: อนุมัติเคลมสินค้า" },
        { value: "ไม่อนุมัติเคลมสินค้า", label: "ขั้นที่ 5: ไม่อนุมัติเคลมสินค้า (สิ้นสุด)" },
      ],
      "อนุมัติเคลมสินค้า": [
        { value: "รับสินค้าจริงแล้ว", label: "↩️ ถอยกลับ: รับสินค้าจริงแล้ว" },
        { value: "อนุมัติเคลมสินค้า", label: "ขั้นที่ 5: อนุมัติเคลมสินค้า (คงเดิม)" },
        { value: "กำลังดำเนินการเปลี่ยนสินค้า", label: "ขั้นที่ 6: กำลังดำเนินการเปลี่ยนสินค้า" },
      ],
      "กำลังดำเนินการเปลี่ยนสินค้า": [
        { value: "อนุมัติเคลมสินค้า", label: "↩️ ถอยกลับ: อนุมัติเคลมสินค้า" },
        { value: "กำลังดำเนินการเปลี่ยนสินค้า", label: "ขั้นที่ 6: กำลังดำเนินการเปลี่ยนสินค้า (คงเดิม)" },
        { value: "กำลังจัดส่งสินค้าเคลม", label: "ขั้นที่ 7: กำลังจัดส่งสินค้าเคลม" },
      ],
      "กำลังจัดส่งสินค้าเคลม": [
        { value: "กำลังดำเนินการเปลี่ยนสินค้า", label: "↩️ ถอยกลับ: กำลังดำเนินการเปลี่ยนสินค้า" },
        { value: "กำลังจัดส่งสินค้าเคลม", label: "ขั้นที่ 7: กำลังจัดส่งสินค้าเคลม (คงเดิม)" },
        { value: "จัดส่งสินค้าเคลมสำเร็จ", label: "ขั้นที่ 8: จัดส่งสินค้าเคลมสำเร็จ" },
      ],
    };

    return nextOptionsMap[currentStatusInDB] || [];
  };

  const validateForm = () => {
    const { status, rejectReason, driverName, truckPlate, withdrawDate, returnedQty, approvedQty, deliveryDriver, deliveryPlate, estimatedDeliveryDate } = formData;

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
    if (status === "กำลังดำเนินการเปลี่ยนสินค้า" && (!withdrawDate || !returnedQty.toString().trim() || !approvedQty.toString().trim())) {
      message.error("กรุณาระบุวันที่เบิกสินค้า จำนวนที่ส่งคืน และจำนวนที่รับรองให้ครบถ้วน");
      return false;
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
      const { status, rejectReason, driverName, truckPlate, claimNoInput, fullReceive, withdrawDate, returnedQty, approvedQty, deliveryDriver, deliveryPlate, estimatedDeliveryDate } = formData;

      const formatDatePayload = (date) => (date ? (dayjs.isDayjs(date) ? date.format("YYYY-MM-DD") : date) : "");
      const statusId = getStatusId(status);

      const extraData = {
        driverName,
        truckPlate,
        claimNoInput,
        fullReceive,
        withdrawDate: formatDatePayload(withdrawDate),
        returnedQty,
        approvedQty,
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

      if ((status === "รับสินค้าจริงแล้ว" || status === "รับสินค้าแล้ว") && !cleanData.driver_receive_date) {
        timestampUpdates.driver_receive_date = nowFormattedStandard;
      } else if ((status === "อนุมัติเคลมสินค้า") && !cleanData.approve_date) {
        timestampUpdates.approve_date = nowFormattedStandard;
      } else if (status === "กำลังดำเนินการเปลี่ยนสินค้า" && !cleanData.warehouse_receive_date) {
        timestampUpdates.warehouse_receive_date = nowFormattedStandard;
      } else if (status === "กำลังจัดส่งสินค้าเคลม" && !cleanData.delivery_date) {
        timestampUpdates.delivery_date = nowFormattedStandard;
      } else if (status === "จัดส่งสินค้าเคลมสำเร็จ" && !cleanData.receive_finish_date) {
        timestampUpdates.receive_finish_date = nowFormattedStandard;
      }

      const updatePayload = {
        ...cleanData,
        claim_id: realClaimId,
        claim_date: cleanData.claim_date ? dayjs(cleanData.claim_date).format("YYYY-MM-DD") : null,
        mfg_date: cleanData.mfg_date ? dayjs(cleanData.mfg_date).format("YYYY-MM-DD") : null,
        exp_date: cleanData.exp_date || cleanData.expire_date ? dayjs(cleanData.exp_date || cleanData.expire_date).format("YYYY-MM-DD") : null,

        current_status: statusId,
        status: statusId,
        status_name: status,

        reject_reason: isModalStatusRejected ? rejectReason : "",
        driver_name: status === "รับสินค้าจริงแล้ว" || status === "รับสินค้าแล้ว" || cleanData.driver_name ? driverName : "",
        truck_plate: status === "รับสินค้าจริงแล้ว" || status === "รับสินค้าแล้ว" || cleanData.truck_plate ? truckPlate : "",
        claim_no: status === "รับสินค้าจริงแล้ว" || status === "รับสินค้าแล้ว" || cleanData.claim_no ? claimNoInput : cleanData.claim_no,
        full_receive: status === "รับสินค้าจริงแล้ว" || status === "รับสินค้าแล้ว" || cleanData.full_receive ? fullReceive : "",
        withdraw_date: status === "กำลังดำเนินการเปลี่ยนสินค้า" || cleanData.withdraw_date ? formatDatePayload(withdrawDate) : "",
        returned_qty: status === "กำลังดำเนินการเปลี่ยนสินค้า" || cleanData.returned_qty ? Number(returnedQty) : cleanData.returned_qty,
        approved_qty: status === "กำลังดำเนินการเปลี่ยนสินค้า" || cleanData.approved_qty ? Number(approvedQty) : cleanData.approved_qty,
        delivery_driver: status === "กำลังจัดส่งสินค้าเคลม" || cleanData.delivery_driver ? deliveryDriver : "",
        delivery_plate: status === "กำลังจัดส่งสินค้าเคลม" || cleanData.delivery_plate ? deliveryPlate : "",
        estimated_delivery_date: status === "กำลังจัดส่งสินค้าเคลม" || cleanData.estimated_delivery_date ? formatDatePayload(estimatedDeliveryDate) : "",

        ...timestampUpdates,
        update_by: currentUserId,
      };

      const resUpdate = await claimService.updateClaim(updatePayload);

      if (resUpdate?.status) {
        const targetStatusId = Number(getStatusId(status));
        const isReceiveStatus = targetStatusId === 4 || status === "รับสินค้าจริงแล้ว" || status === "รับสินค้าแล้ว";
        const isDeliveryStatus = targetStatusId === 9 || status === "กำลังจัดส่งสินค้าเคลม";

        if (isReceiveStatus || isDeliveryStatus) {
          try {
            const rawId = realClaimId;
            const numericClaimId = typeof rawId === "number" ? rawId : parseInt(rawId, 10);
            const numericDriverId = parseInt(currentUserId, 10);
            const validDriverId = !isNaN(numericDriverId) && numericDriverId > 0 ? numericDriverId : null;

            if (!isNaN(numericClaimId) && numericClaimId > 0) {
              const deliveryPayload = {
                claim_id: numericClaimId,
                claim_no: claimNoInput || cleanData.claim_no,
                driver_id: validDriverId,
                delivery_status: isReceiveStatus ? "4" : "9",
                
                driver_name: isReceiveStatus ? driverName : deliveryDriver,
                truck_plate: isReceiveStatus ? truckPlate : deliveryPlate,
                
                estimated_delivery_date: formatDatePayload(estimatedDeliveryDate),
                withdraw_date: formatDatePayload(withdrawDate),
                returned_qty: returnedQty ? Number(returnedQty) : null,
                approved_qty: approvedQty ? Number(approvedQty) : null,
              };

              await deliveryService.createDelivery(deliveryPayload);
            } else {
              console.error("สร้าง Delivery ไม่สำเร็จเนื่องจาก claim_id ไม่ใช่ Integer:", rawId);
            }
          } catch (delErr) {
            console.error("Error จาก Backend createDelivery:", delErr?.response?.data || delErr.message);
            message.warning("อัปเดตสถานะสำเร็จ แต่บันทึกข้อมูล Delivery ไม่สำเร็จ");
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
          approveStatusValue = "1";
        } else if (status === "ไม่อนุมัติเคลมสินค้า") {
          approveStatusValue = "0";
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
    const rejectReason = data?.reject_reason;

    if (isRejectedInDB) {
      return [
        { title: "สร้างรายการ", description: getLogDate(1), icon: renderDotIcon(FileSearchOutlined) },
        { title: "รอการพิจารณา", description: getLogDate(5), icon: renderDotIcon(FileSearchOutlined) },
        {
          title: currentStatusInDB === "ไม่มีสิทธิ์เคลม" ? "ไม่มีสิทธิ์เคลม" : "ไม่อนุมัติเคลมสินค้า",
          description: (
            <div className="text-xs">
              <div>{getLogDate(currentStatusId)}</div>
              {rejectReason && <div className="text-red-500 font-medium">{rejectReason}</div>}
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

  return (
    <div className="w-full flex flex-col gap-6 font-normal" style={{ boxSizing: "border-box" }}>
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

  {/* 1. ปุ่ม พิมพ์ / ดาวน์โหลดเอกสาร (Utility Action: สไตล์ปุ่มเทาเรียบง่าย) */}
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
      data={{
        ...data,
        claimId: data.claim_no || data.claim_id,
        productName: productName,
        createdDate: data.claim_date ? dayjs(data.claim_date).format("DD/MM/YYYY") : "-",
      }}
    />
  </div>

  {/* 2. ปุ่ม ถอยสถานะ (Warning / Revert Action: สไตล์ปุ่มเตือนขอบส้ม) */}
  {previousStatusName && (
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

  {/* 3. ปุ่ม อัปเดตสถานะ / ขอแก้ไขรายการเคลม (Primary Action: สไตล์ปุ่มหลักสีฟ้าสด) */}
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
        handleInputChange("status", currentStatusInDB);
        handleInputChange("withdrawDate", data.withdraw_date ? dayjs(data.withdraw_date) : null);
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
        className="rounded-2xl shadow-sm border-gray-200 w-full"
        bodyStyle={{ padding: "24px 20px" }}
      >
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: isRejectedInDB ? "#ef4444" : "#059669",
              fontWeightStrong: 400,
            },
            components: {
              Steps: {
                lineWidth: 4,
                iconSize: 40,
              },
            },
          }}
        >
          <Steps
            current={getCurrentStep()}
            status={isRejectedInDB ? "error" : "process"}
            responsive
            items={getStepItems()}
          />
        </ConfigProvider>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full">
        <div className="xl:col-span-2 flex flex-col gap-6 w-full">
          <Card title={<span className="font-medium text-slate-800">ข้อมูลสินค้า และรายละเอียดคำร้องขอเคลม</span>} className="rounded-2xl shadow-sm border-gray-200 w-full" bodyStyle={{ padding: "24px" }}>
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
              <Descriptions.Item label="วันที่แจ้ง">
                {data.claim_date ? dayjs(data.claim_date).format("DD/MM/YYYY") : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="ผู้แจ้ง">
                {usersMap[String(data.created_by || data.agent_id || data.user_id)] || data.created_by || data.agent_id || data.reporter || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="สินค้า"><span className="font-medium text-slate-800">{productName}</span></Descriptions.Item>
              <Descriptions.Item label="Lot Number"><span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs">{data.lot_no || data.lot || "-"}</span></Descriptions.Item>
              <Descriptions.Item label="MFG Number"><span className="font-mono">{data.mfg_date ? dayjs(data.mfg_date).format("DD/MM/YYYY") : "-"}</span></Descriptions.Item>
              <Descriptions.Item label="EXP Number"><span className="font-mono">{data.exp_date || data.expire_date ? dayjs(data.exp_date || data.expire_date).format("DD/MM/YYYY") : "-"}</span></Descriptions.Item>
              <Descriptions.Item label="จำนวน"><span className="font-medium text-emerald-600 text-base">{data.qty}</span> <span className="text-xs text-gray-500">ขวด/กระป๋อง</span></Descriptions.Item>
              <Descriptions.Item label="รายละเอียดเพิ่มเติม">
                <div className="whitespace-pre-line text-slate-700 leading-relaxed">
                  {data.remark || data.claim_reason || data.detail || "-"}
                </div>
              </Descriptions.Item>
            </Descriptions>
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
                <Descriptions.Item label="พนักงานขับรถ (พขร.)"><span className="text-slate-800">{data.driver_name || "-"}</span></Descriptions.Item>
                <Descriptions.Item label="ทะเบียนรถ"><span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs">{data.truck_plate || "-"}</span></Descriptions.Item>
                <Descriptions.Item label="เลขที่เอกสารเคลม"><span className="font-mono">{data.claim_no || "-"}</span></Descriptions.Item>
                <Descriptions.Item label="จำนวนที่รับคืนสินค้าแตก"><span className="font-mono">{data.full_receive || "-"}</span></Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          {(STATUS_PRIORITY[currentStatusInDB] >= 6 || Boolean(data.withdraw_date)) && (
            <Card title={<span className="font-medium text-slate-800">ข้อมูลการเบิกเปลี่ยนสินค้า</span>} className="rounded-2xl shadow-sm border-gray-200 w-full" bodyStyle={{ padding: "24px" }}>
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
                <Descriptions.Item label="วันที่เบิกสินค้าจากคลัง"><span className="font-mono">{data.withdraw_date ? dayjs(data.withdraw_date).format("DD/MM/YYYY") : "-"}</span></Descriptions.Item>
                <Descriptions.Item label="จำนวนที่ส่งสินค้าคืน"><span className="text-slate-800">{data.returned_qty ?? "-"}</span> ขวด/กระป๋อง</Descriptions.Item>
                <Descriptions.Item label="จำนวนแตกที่รับรองการเปลี่ยน"><span className="text-emerald-600">{data.approved_qty ?? "-"}</span> ขวด/กระป๋อง</Descriptions.Item>
              </Descriptions>
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
                <Descriptions.Item label="พนักงานขับรถจัดส่งสินค้าเคลม"><span className="text-slate-800">{data.delivery_driver || "-"}</span></Descriptions.Item>
                <Descriptions.Item label="ทะเบียนรถจัดส่ง"><span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs">{data.delivery_plate || "-"}</span></Descriptions.Item>
                <Descriptions.Item label="วันที่คาดว่าจะส่งถึงลูกค้า">
                  <span className="text-blue-600">{data.estimated_delivery_date ? dayjs(data.estimated_delivery_date).format("DD/MM/YYYY") : "-"}</span>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}
        </div>

        <div className="xl:col-span-1 flex flex-col gap-6 w-full">
          <Card title={<span className="font-medium text-slate-800">รูปภาพหลักฐานจากลูกค้า</span>} className="rounded-2xl shadow-sm border-gray-200 w-full" bodyStyle={{ padding: "24px" }}>
            {data.images && data.images.length > 0 ? (
              <Image.PreviewGroup>
                <div className="grid grid-cols-2 gap-2">
                  {data.images.map((imgSrc, index) => (
                    <Image key={index} width="100%" height={100} style={{ objectFit: "cover" }} className="rounded-lg border border-gray-200" src={imgSrc} />
                  ))}
                </div>
              </Image.PreviewGroup>
            ) : data.image ? (
              <Image width="100%" src={data.image} />
            ) : (
              <div className="text-gray-400 italic py-6 text-center">ไม่มีรูปภาพแนบ</div>
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
                        <span className="text-gray-400 font-mono">{formatDate(item.approve_date)}</span>
                      </div>
                      <div className="text-slate-700 mt-1">
                        <span className="font-medium">ผู้อนุมัติ:</span> {approverName}
                      </div>
                      {item.approve_remark && (
                        <div className="text-gray-500 italic">
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
                <span className="font-mono">{formatDate(data.updated_at)}</span>
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

      <Modal
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
        okButtonProps={{ className: isFinalStatus ? "bg-amber-600 hover:bg-amber-700 font-normal" : "bg-emerald-600 hover:bg-emerald-700 font-normal" }}
      >
        <div className="flex flex-col gap-4 py-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">เลือกสถานะใหม่:</label>
            <Select
              className="w-full"
              value={formData.status}
              onChange={(val) => handleInputChange("status", val)}
              options={getSelectOptions()}
            />
          </div>

          {(formData.status === "รับสินค้าจริงแล้ว" || formData.status === "รับสินค้าแล้ว") && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-3">
              <span className="text-sm font-medium text-slate-800">ข้อมูลที่เข้ารับสินค้า</span>
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
                <label className="block text-xs font-medium text-slate-600 mb-1">จำนวนที่รับคืนสินค้าแตก(ขวด/กระป๋อง):</label>
                <Input placeholder="เช่น 48" value={formData.fullReceive} onChange={(e) => handleInputChange("fullReceive", e.target.value)} />
              </div>
            </div>
          )}

          {formData.status === "กำลังดำเนินการเปลี่ยนสินค้า" && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-3">
              <span className="text-sm font-medium text-slate-800">ข้อมูลการเบิกและรับรองเปลี่ยนสินค้า</span>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">วันที่เบิกสินค้าจากคลัง:</label>
                <DatePicker
                  className="w-full"
                  format="DD/MM/YYYY"
                  placeholder="เลือกวันที่เบิกสินค้า"
                  value={formData.withdrawDate ? (dayjs.isDayjs(formData.withdrawDate) ? formData.withdrawDate : dayjs(formData.withdrawDate)) : null}
                  onChange={(date) => handleInputChange("withdrawDate", date)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">จำนวนที่ส่งสินค้าคืน (ขวด/กระป๋อง):</label>
                <Input type="number" placeholder="เช่น 48" value={formData.returnedQty} onChange={(e) => handleInputChange("returnedQty", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">จำนวนแตกที่เจ้าหน้าที่คลังรับรองการเปลี่ยน (ขวด/กระป๋อง):</label>
                <Input type="number" placeholder="เช่น 48" value={formData.approvedQty} onChange={(e) => handleInputChange("approvedQty", e.target.value)} />
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