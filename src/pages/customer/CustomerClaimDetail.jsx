import React, { useState, useEffect } from "react";
import {
  Card,
  Descriptions,
  Button,
  Steps,
  Image,
  ConfigProvider,
  Spin,
  message,
  Popconfirm,
  Alert,
  Table,
  Tag,
  Input,
} from "antd";
import {
  CheckCircleOutlined,
  FileSearchOutlined,
  CloseCircleOutlined,
  InboxOutlined,
  CarOutlined,
  SmileOutlined,
  ArrowLeftOutlined,
  PrinterOutlined,
  PictureOutlined,
  SendOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { useClaimRealtime } from "../../hooks/useClaimRealtime";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import ClaimStatusTag from "../../components/ClaimStatusTag";
import ClaimPrintModal from "../../components/ClaimPrintModal";
import { STATUS_PRIORITY, getStatusName, getStatusId, CLAIM_STATUS_MAP } from "../../constants/claimStatus";
import claimService from "../../services/claimService";
import loginService from "../../services/loginService";
import itemService from "../../services/itemService";
import userService from "../../services/userService";
import agentService from "../../services/agentService";
import { getAgentNameByUserId } from "../../utils/agentHelper";
import socket from "../../services/socket";

dayjs.extend(utc);

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
  
  // วนลูปจากหลังมาหน้า เพื่อให้ได้ Log ล่าสุดเสมอ
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
  const [usersList, setUsersList] = useState([]);
  const [allImages, setAllImages] = useState([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // State สำหรับกล่องข้อความ Private Comments ฝั่ง Customer
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  // จัดการ Socket Room
  useEffect(() => {
    if (!claimId) return;

    socket.emit("join_claim", { claim_id: claimId });

    return () => {
      socket.emit("leave_claim", { claim_id: claimId });
    };
  }, [claimId]);

  // ใช้ Realtime Hook ในการดักจับ Event และ Trigger โหลดข้อมูล
  useClaimRealtime({
    claimId: claimId,
    isStaff: false,
    onStatusUpdated: () => {
      // สถานะเปลี่ยน (เช่น เปลี่ยนเป็น "รับสินค้าแล้ว") ค่อยดึงข้อมูลใหม่ทั้งหน้า
      fetchClaimDetail();
    },
    onCommentCreated: (newLog) => {
      if (!newLog || !newLog.remark) return;

      const remark = newLog.remark;

      // เคสที่ 1: เป็นข้อความแชทสนทนา ([MSG])
      if (remark.startsWith("[MSG]")) {
        // ถ้าเป็นแชทที่ฝั่ง Staff ส่งมา ให้ดันเข้า State Chat โดยไม่สั่ง fetchClaimDetail ทั้งหน้า (หน้าไม่กระตุก)
        if (remark.includes("[STAFF]")) {
          const cleanRemark = remark.replace("[MSG]", "").trim();
          const formattedMsg = {
            id: newLog.log_id || newLog.id || Math.random(),
            senderRole: "staff",
            senderName: usersMap[String(newLog.update_by || newLog.user_id)] || "เจ้าหน้าที่ (Staff)",
            message: cleanRemark.replace("[STAFF]", "").trim(),
            time: newLog.update_date || newLog.created_at || new Date(),
          };

          // ตรวจสอบเพื่อไม่ให้เพิ่มข้อความซ้ำ
          setChatMessages((prevMsgs) => {
            const isExist = prevMsgs.some((m) => String(m.id) === String(formattedMsg.id));
            return isExist ? prevMsgs : [...prevMsgs, formattedMsg];
          });
        }
        return;
      }

      // เคสที่ 2: เป็นการอัปเดตข้อมูลระบบ / Extra Data (| DATA:)
      if (remark.includes("| DATA:")) {
        // ดึงข้อมูลใหม่เพื่ออัปเดตกล่องรับ/ส่งสินค้า
        fetchClaimDetail();
      }
    },
  });

  useEffect(() => {
    fetchClaimDetail();
  }, [claimId]);

  const fetchClaimDetail = async () => {
    const user = loginService.getCurrentUser();
    const role = user?.role || user?.user_type;

    if (role === "staff" || role === "admin") {
      navigate("/staff", { replace: true });
      return;
    }

    if (!user?.agent_id) {
      loginService.logout();
      navigate("/login", { replace: true });
      return;
    }

    setLoading(true);
    try {
      // เพิ่ม .catch ป้องกัน API ล้มแล้วค้าง
      const [resClaim, resMasterItems, resLogs, resApproves, resUsers, resAgents] = await Promise.all([
        claimService.getClaimByAgent(user.agent_id).catch((err) => {
          console.error("getClaimByAgent error:", err);
          return { data: [] };
        }),
        itemService.getItems().catch(() => ({ data: [] })),
        claimService.getClaimStatusLogs().catch(() => ({ data: [] })),
        claimService.getclaimapproves().catch(() => ({ data: [] })),
        userService.getUsers().catch(() => ({ data: [] })),
        agentService.getAgent().catch(() => ({ data: [] })),
      ]);

      const masterItemsMap = {};
      const masterItemsData = Array.isArray(resMasterItems?.data) ? resMasterItems.data : Array.isArray(resMasterItems) ? resMasterItems : [];
      masterItemsData.forEach((item) => {
        masterItemsMap[item.item_id] = `${item.item_code} - ${item.item_name}`;
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

          const extraLogData = parseExtraDataFromLogs(filteredLogs) || {};

          const mergedClaimData = {
            ...currentClaim,
            images: rawImages.map((i) => i.formattedUrl),
            driver_name: currentClaim.driver_name || extraLogData.driverName || extraLogData.driver_name || "",
            truck_plate: currentClaim.truck_plate || extraLogData.truckPlate || extraLogData.truck_plate || "",
            full_receive: currentClaim.full_receive || extraLogData.fullReceive || extraLogData.full_receive || "",
            delivery_driver: currentClaim.delivery_driver || extraLogData.deliveryDriver || extraLogData.delivery_driver || "",
            delivery_plate: currentClaim.delivery_plate || extraLogData.deliveryPlate || extraLogData.delivery_plate || "",
            estimated_delivery_date: currentClaim.estimated_delivery_date || extraLogData.estimatedDeliveryDate || null,
          };
          setData(mergedClaimData);
         

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
      console.error("fetchClaimDetail error:", error);
      message.error("ไม่สามารถดึงข้อมูลได้: " + (error.message || "เกิดข้อผิดพลาด"));
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันส่งข้อความฝากสนทนาฝั่ง Customer
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    const messageToSend = newMessage.trim();
      setSendingMsg(true);
      try {
        const currentUser = loginService.getCurrentUser();
        const userId = currentUser?.user_id || currentUser?.id || currentUser?.agent_id || "";
        const realClaimId = data.claim_id;
        const formattedRemark = `[MSG] [CUSTOMER] ${messageToSend}`;

        await claimService.createClaimStatusLogs({
          claim_id: String(realClaimId),
          status: String(getStatusId(data.current_status)),
          remark: formattedRemark,
          update_by: String(userId),
          user_id: String(userId),
        });

        setNewMessage("");
      message.success("ส่งข้อความเรียบร้อยแล้ว");
    } catch (err) {
      message.error("ส่งข้อความไม่สำเร็จ: " + err.message);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleConfirmDelivery = async () => {
    try {
      const currentUser = loginService.getCurrentUser();
      const userId = currentUser?.user_id || currentUser?.agent_id || data?.agent_id || "";
      const currentTimestamp = new Date().toISOString();

      const { images, ...claimDataWithoutImages } = data;

      const updatePayload = {
        ...claimDataWithoutImages,
        claim_id: String(data.claim_id),
        claim_no: String(data.claim_no || ""),
        agent_id: String(data.agent_id || currentUser?.agent_id || ""),
        current_status: "10",
        status: "10",
        status_name: "จัดส่งสินค้าเคลมสำเร็จ",
        actionsname: "receive_finish_date",
        receive_finish_date: currentTimestamp,
        update_by: String(userId),
      };

      const resUpdate = await claimService.updateClaim(updatePayload);

      if (resUpdate.status) {
        await claimService.createClaimStatusLogs({
          claim_id: String(data.claim_id),
          status: "10",
          remark: "ลูกค้ายืนยันรับสินค้าเรียบร้อยแล้ว",
          update_by: String(userId),
          agent_id: String(data.agent_id || currentUser?.agent_id || ""),
        });

        message.success("ยืนยันรับสินค้าเคลมเรียบร้อยแล้ว");
        fetchClaimDetail();
      }
    } catch (error) {
      message.error(error.message || "เกิดข้อผิดพลาดในการอัปเดตสถานะ");
    }
  };

  if (loading) {
    return (
      <div className="w-full h-64 flex justify-center items-center">
        {/* แก้ไข tip -> description ตาม Warning ของ Antd v5 */}
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

  const currentStatusInDB = getStatusName(data.current_status || "สร้างรายการเคลม");
  const currentStatusId = String(getStatusId(data.current_status));
  const isRejectedInDB =
    currentStatusId === "3" ||
    currentStatusId === "7" ||
    currentStatusInDB === "ไม่อนุมัติเคลมสินค้า" ||
    currentStatusInDB === "ไม่มีสิทธิ์เคลม";

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

  const getCurrentStep = () => {
    const level = STATUS_PRIORITY[currentStatusInDB];

    if (isRejectedInDB) {
      if (currentStatusInDB === "ไม่มีสิทธิ์เคลม" || currentStatusId === "3") return 2;
      if (currentStatusInDB === "ไม่อนุมัติเคลมสินค้า" || currentStatusId === "7") return 2;
      return 1;
    }

    return level ? level - 1 : 0;
  };

  const renderDotIcon = (IconComponent) => (
    <div className="relative flex items-center justify-center w-full h-full">
      <IconComponent className="text-lg relative z-10" />
      <span className="absolute w-2.5 h-2.5 bg-current rounded-full -bottom-1 z-0 opacity-80" />
    </div>
  );

  // 1. ดึงเหตุผลการไม่อนุมัติออกมาไว้ที่ Top level ของ Component
  const latestRejectApprove = approveLogs.length > 0 
    ? [...approveLogs].reverse().find((app) => 
        app.approve_status === false || 
        app.approve_status === "false" || 
        app.approve_status === "0"
      )
    : null;

  const rejectReason = latestRejectApprove?.approve_remark || data?.reject_reason || data?.remark || "เนื่องจากสินค้าไม่อยู่ในเงื่อนไขการเคลม";

  const getStepItems = () => {
    if (isRejectedInDB) {
      return [
        { title: "สร้างรายการ", description: getLogDate(1), icon: renderDotIcon(CheckCircleOutlined) },
        { title: "รอการพิจารณา", description: getLogDate(5), icon: renderDotIcon(FileSearchOutlined) },
        {
          title: CLAIM_STATUS_MAP[currentStatusId]?.customerName || "ปฏิเสธการเคลม",
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

  const isShipping = currentStatusId === "9" || data.current_status === "กำลังจัดส่งสินค้าเคลม";

  const creatorUserId = data ? String(data.user_id || data.created_by || "") : "";
  const claimAgentId = data ? String(data.agent_id || "") : "";
  const claimAgentCode = data ? String(data.agent_code || "") : "";

  const driverReceiveLogDateStr = getLogRawDateString("4");

  const deliverySuccessLog = statusLogs.find(
    (log) => String(log.status || log.status_id) === "10"
  );
  const deliverySuccessUserId = deliverySuccessLog ? String(deliverySuccessLog.update_by || deliverySuccessLog.user_id || "") : "";
  const deliverySuccessNameDisplay = usersMap[deliverySuccessUserId] || "-";

  const matchedAgentName = agentsMap[claimAgentId] || agentsMap[claimAgentCode] || getAgentNameByUserId(creatorUserId, usersList, agentsMap);
  const agentNameDisplay = matchedAgentName !== "-" && matchedAgentName ? matchedAgentName : (data?.agent_name || data?.agentName || "-");
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
      title: "จำนวน",
      dataIndex: "qty",
      key: "qty",
      width: 80,
      align: "right",
      render: (qty) => <span className="font-semibold text-emerald-600">{qty}</span>,
    },
    {
      title: "จำนวนรับจริง",
      dataIndex: "received_qty",
      key: "received_qty",
      width: 100,
      align: "right",
      render: (rQty, record) => {
        const isReceivedStep = STATUS_PRIORITY[currentStatusInDB] >= 4;
        
        if (!isReceivedStep) {
          return <span className="text-slate-400 font-normal">-</span>;
        }
        
        return (
          <span className="font-semibold text-emerald-600">
            {rQty ?? record.qty}
          </span>
        );
      },
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
                  className="border-slate-300 text-slate-700 hover:text-slate-900 hover:border-slate-400 hover:bg-slate-50 rounded-xl font-normal shrink-0 h-10 shadow-sm"
                  style={{ paddingLeft: "16px", paddingRight: "16px" }}
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
                    claimNo: data.claim_no || data.claim_id,
                    productName: claimItems.length > 0 ? claimItems.map(i => i.item_name).join(", ") : "-",
                    receiverName: "-",
                    approverName: "-",
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
                    approved_qty: "-",
                    detail: "-",
                    items: claimItems
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {isRejectedInDB && (
        <Alert
          title="คำร้องขอเคลมสินค้าถูกปฏิเสธ"
          description={`เหตุผล: ${rejectReason}`}
          type="error"
          showIcon
          className="rounded-2xl border-red-200 break-words"
        />
      )}

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

          {(STATUS_PRIORITY[currentStatusInDB] >= 4 || Boolean(data?.driver_name && data?.driver_name.trim())) && (
            <Card title={<span className="font-medium text-slate-800">ข้อมูลการรับสินค้าเคลม</span>}>
              <Descriptions column={1} bordered size="middle">
                <Descriptions.Item label="พนักงานขับรถ (พขร.)">
                  {data.driver_name || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="ทะเบียนรถ">
                  {data.truck_plate || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="เลขที่เอกสารเคลม">
                  {data.claim_no || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="จำนวนที่รับคืนสินค้าแตก">
                  {data.full_receive || "-"}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          {(STATUS_PRIORITY[currentStatusInDB] >= 7 || Boolean(data.delivery_driver && data.delivery_driver.trim())) && (
            <Card title={<span className="font-medium text-slate-800">ข้อมูลการจัดส่งสินค้าเคลม</span>} className="rounded-2xl shadow-sm border-gray-200 w-full" bodyStyle={{ padding: "24px" }}>
              <Descriptions 
                column={1} 
                bordered 
                size="middle" 
                labelStyle={{ fontWeight: "500", color: "#475569", width: "130px", backgroundColor: "#f8fafc", verticalAlign: "top" }}
                contentStyle={{ color: "#1e293b", wordBreak: "break-word" }}
              >
                <Descriptions.Item label="พนักงานจัดส่ง"><span className="text-slate-800 break-words">{data.delivery_driver || "-"}</span></Descriptions.Item>
                <Descriptions.Item label="ทะเบียนรถจัดส่ง"><span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs">{data.delivery_plate || "-"}</span></Descriptions.Item>
                <Descriptions.Item label="วันคาดว่าจะถึง">
                  <span className="text-blue-600">
                    {data.estimated_delivery_date && dayjs(data.estimated_delivery_date).isValid()
                      ? dayjs(data.estimated_delivery_date).format("DD/MM/YYYY")
                      : "-"}
                  </span>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}
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
            <div className="flex flex-col gap-3">
              {isShipping && (
                <Popconfirm 
                  title="ยืนยันการรับสินค้าเคลม" 
                  description="คุณได้รับสินค้าเคลมถูกต้องเรียบร้อยแล้วใช่หรือไม่?" 
                  onConfirm={handleConfirmDelivery} 
                  okText="ยืนยันรับสินค้า" 
                  cancelText="ยกเลิก"
                >
                  <Button 
                    type="primary" 
                    size="large" 
                    icon={<CheckCircleOutlined />} 
                    className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 font-normal shadow-sm border-none h-11 text-sm"
                  >
                    ยืนยันได้รับสินค้าเคลมแล้ว
                  </Button>
                </Popconfirm>
              )}

              <Button
                size="large"
                icon={<ArrowLeftOutlined />}
                className="w-full rounded-xl border-gray-300 text-slate-700 font-normal hover:border-slate-800 h-11 text-sm"
                onClick={() => navigate("/customer/list-claim")}
              >
                กลับหน้ารายการเคลม
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CustomerClaimDetail;