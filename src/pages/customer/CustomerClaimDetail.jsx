// src/pages/customer/CustomerClaimDetail.jsx

import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Modal,
} from "antd";
import {
  CheckCircleOutlined,
  FileSearchOutlined,
  CloseCircleOutlined,
  CarOutlined,
  SmileOutlined,
  ArrowLeftOutlined,
  PrinterOutlined,
  PictureOutlined,
  SendOutlined,
  UserOutlined,
  EllipsisOutlined,
  HistoryOutlined,
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
import { getAgentNameByUserId } from "../../utils/agentHelper";
import { parseDateSafely, formatDateString } from "../../utils/dateUtils";
import { parseExtraDataFromLogs, getRejectReasonText } from "../../utils/logPaser";

const AUTO_STAMP_DELAY_SECONDS = 10;

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
  const [usersList, setUsersList] = useState([]);
  const [allImages, setAllImages] = useState([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);

  const isExecutingAutoStampRef = useRef(false);

  const user = loginService.getCurrentUser();

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const statusLogsRef = useRef(statusLogs);
  useEffect(() => {
    statusLogsRef.current = statusLogs;
  }, [statusLogs]);

  const rawStatus = String(data?.current_status || data?.status || "");
  const statusName = getStatusName(rawStatus, "customer");
  const statusId = String(getStatusId(rawStatus));

  const lastPendingLog = statusLogs
    .filter((l) => ["1", "5"].includes(String(l.status || l.status_id)))
    .slice(-1)[0];

  const lastDeliveredLog = statusLogs
    .filter((l) => String(l.status || l.status_id) === "10")
    .slice(-1)[0];

  const hasCustomerConfirmedSubmit = statusLogs.some(
    (log) =>
      log.remark?.includes("ยืนยันการส่งเคลม") &&
      (!lastPendingLog || (log.log_id || log.id) >= (lastPendingLog.log_id || lastPendingLog.id))
  );

  const hasCustomerConfirmedDelivery = statusLogs.some(
    (log) =>
      log.remark?.includes("ลูกค้ายืนยันรับสินค้า") &&
      (!lastDeliveredLog || (log.log_id || log.id) >= (lastDeliveredLog.log_id || lastDeliveredLog.id))
  );

  const isPendingStatus =
    !hasCustomerConfirmedSubmit &&
    (["1", "5"].includes(statusId) ||
      ["1", "5", "pending", "รอพิจารณา", "รอตรวจสอบ"].includes(rawStatus.toLowerCase()) ||
      statusName === "รอพิจารณา");

  const isDeliveredStatus =
    !hasCustomerConfirmedDelivery &&
    (statusId === "10" ||
      ["10", "delivered", "จัดส่งสินค้าเคลมสำเร็จ"].includes(rawStatus.toLowerCase()) ||
      statusName === "จัดส่งสินค้าเคลมสำเร็จ");

  const isPendingStatusRef = useRef(isPendingStatus);
  useEffect(() => {
    isPendingStatusRef.current = isPendingStatus;
  }, [isPendingStatus]);

  const isDeliveredStatusRef = useRef(isDeliveredStatus);
  useEffect(() => {
    isDeliveredStatusRef.current = isDeliveredStatus;
  }, [isDeliveredStatus]);

  const fetchClaimDetail = useCallback(
    async (showLoading = true) => {
      const activeUser = userRef.current;
      const activeRole = activeUser?.role || activeUser?.user_type;

      if (activeRole === "staff" || activeRole === "admin") {
        navigate("/staff", { replace: true });
        return;
      }

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

        const currentUserIdStr = String(activeUser?.user_id || activeUser?.id || "");
        const userAgentIdentifiers = [];

        if (Array.isArray(activeUser?.agent_ids)) {
          activeUser.agent_ids.forEach((id) => userAgentIdentifiers.push(String(id)));
        }
        if (activeUser?.agent_id) {
          userAgentIdentifiers.push(String(activeUser.agent_id));
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

        const rawClaims = Array.isArray(resClaim?.data)
          ? resClaim.data
          : Array.isArray(resClaim)
          ? resClaim
          : [];

        const allowedClaims = rawClaims.filter((claim) => {
          const claimAgentIdStr = String(claim.agent_id || "");
          const claimAgentCodeStr = String(claim.agent_code || "");
          const claimCreatedByStr = String(claim.created_by || claim.user_id || "");

          const isAgentMatch =
            userAgentIdentifiers.length > 0 &&
            (userAgentIdentifiers.includes(claimAgentIdStr) || userAgentIdentifiers.includes(claimAgentCodeStr));
          const isUserMatch = currentUserIdStr && claimCreatedByStr === currentUserIdStr;

          return isAgentMatch || isUserMatch;
        });

        if (allowedClaims.length > 0) {
          const targetId = String(claimId || "").trim();

          const currentClaim = allowedClaims.find((item) => {
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

                  const itemImgs = rawImages.filter((img) => {
                    const matchClaimItem =
                      img.claim_item_id && ci.claim_item_id && String(img.claim_item_id) === String(ci.claim_item_id);
                    const matchItem = img.item_id && ci.item_id && String(img.item_id) === String(ci.item_id);
                    return matchClaimItem || matchItem;
                  });

                  const finalImages = itemImgs.length > 0 ? itemImgs : rawImages;

                  return {
                    key: ci.claim_item_id || idx,
                    ...ci,
                    item_code: itemCode,
                    item_name: itemFullName,
                    images: finalImages.map((i) => i.formattedUrl),
                    qtyreceived: ci.qtyreceived ?? parsedItemData.receivedQty ?? ci.qty,
                    qtychang: ci.qtychang ?? parsedItemData.returnedQty ?? ci.qty,
                    received_qty: ci.qtyreceived ?? parsedItemData.receivedQty ?? ci.qty,
                    returned_qty: ci.qtychang ?? parsedItemData.returnedQty ?? ci.qty,
                    approved_qty: parsedItemData.approvedQty ?? ci.qty,
                    item_remark:
                      parsedItemData.itemRemark ||
                      (typeof ci.remark === "string" && !ci.remark.startsWith("{") ? ci.remark : ""),
                    withdraw_date: ci.withdraw_date ? dayjs(ci.withdraw_date) : null,
                    lot_no_change: ci.lot_no_change || "",
                    mfg_date_change: ci.mfg_date_change ? dayjs(ci.mfg_date_change) : null,
                  };
                });
              }
            } catch {
              if (currentClaim.item_id) {
                const itemInfo = masterItemsMap[String(currentClaim.item_id)] || {};
                const fallbackItemName = itemInfo.fullName || `สินค้า ID: ${currentClaim.item_id}`;
                const extraItem = extraItemsMap[fallbackItemName] || extraLogData.items?.[0] || {};

                itemsList = [
                  {
                    key: 1,
                    item_id: currentClaim.item_id,
                    item_code: itemInfo.code || String(currentClaim.item_id),
                    item_name: fallbackItemName,
                    lot_no: currentClaim.lot_no || currentClaim.lot,
                    mfg_date: currentClaim.mfg_date,
                    expire_date: currentClaim.exp_date || currentClaim.expire_date,
                    qty: currentClaim.qty,
                    qtychang: currentClaim.qtychang,
                    qtyreceived: currentClaim.qtyreceived,
                    received_qty: extraItem.receivedQty ?? currentClaim.qty,
                    approved_qty: extraItem.approvedQty ?? currentClaim.qty,
                    returned_qty: extraItem.returnedQty ?? currentClaim.qty,
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
              .filter((log) => log.remark?.startsWith("[MSG]"))
              .map((log) => {
                const cleanRemark = log.remark.replace("[MSG]", "").trim();
                const senderRole = log.remark.includes("[STAFF]") ? "staff" : "customer";
                return {
                  id: log.log_id || log.id || Math.random(),
                  senderRole,
                  senderName:
                    uMap[String(log.update_by || log.user_id)] ||
                    (senderRole === "staff" ? "เจ้าหน้าที่ (Staff)" : "ลูกค้า (Customer)"),
                  message: cleanRemark.replace("[STAFF]", "").replace("[CUSTOMER]", "").trim(),
                  time: log.update_date || log.created_at || log.created_date,
                };
              });
            setChatMessages(msgs);

            setData({
              ...currentClaim,
              images: rawImages.map((i) => i.formattedUrl),
              driver_name: currentClaim.driver_name || extraLogData.driverName || extraLogData.driver_name || "",
              truck_plate: currentClaim.truck_plate || extraLogData.truckPlate || extraLogData.truck_plate || "",
              full_receive: currentClaim.full_receive || extraLogData.fullReceive || extraLogData.full_receive || "",
              delivery_driver:
                currentClaim.delivery_driver || extraLogData.deliveryDriver || extraLogData.delivery_driver || "",
              delivery_plate:
                currentClaim.delivery_plate || extraLogData.deliveryPlate || extraLogData.delivery_plate || "",
              estimated_delivery_date:
                currentClaim.estimated_delivery_date || extraLogData.estimatedDeliveryDate || null,
            });

            const approvesData = resApproves?.data || resApproves || [];
            if (Array.isArray(approvesData)) {
              setApproveLogs(approvesData.filter((app) => String(app.claim_id) === String(currentClaim.claim_id)));
            }
          } else {
            if (showLoading) message.error(`ไม่พบข้อมูลรายการเคลมรหัส: ${claimId}`);
          }
        } else {
          if (showLoading) message.error("ไม่พบข้อมูลรายการเคลมในระบบ");
        }
      } catch (error) {
        if (showLoading) message.error("ไม่สามารถดึงข้อมูลได้: " + (error.message || "เกิดข้อผิดพลาด"));
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [claimId, navigate]
  );

  useClaimRealtime({
    claimId,
    isStaff: false,
    onStatusUpdated: () => fetchClaimDetail(false),
    onCommentCreated: (newLog) => {
      if (!newLog?.remark?.startsWith("[MSG]")) return;

      const isStaff = newLog.remark.includes("[STAFF]");
      const cleanRemark = newLog.remark.replace("[MSG]", "").trim();
      const senderRole = isStaff ? "staff" : "customer";

      const formattedMsg = {
        id: newLog.log_id || newLog.id || Math.random(),
        senderRole,
        senderName:
          usersMap[String(newLog.update_by)] ||
          (senderRole === "staff" ? "เจ้าหน้าที่ (Staff)" : "ลูกค้า (Customer)"),
        message: cleanRemark.replace("[STAFF]", "").replace("[CUSTOMER]", "").trim(),
        time: newLog.update_date || newLog.created_at || new Date(),
      };

      setChatMessages((prev) =>
        prev.some((m) => String(m.id) === String(formattedMsg.id)) ? prev : [...prev, formattedMsg]
      );
    },
  });

  useEffect(() => {
    isExecutingAutoStampRef.current = false;
    fetchClaimDetail(true);

    const interval = setInterval(() => {
      fetchClaimDetail(false);
    }, 4000);

    return () => clearInterval(interval);
  }, [claimId, fetchClaimDetail]);

  const handleConfirmClaimSubmit = async (customRemark, isSilent = false) => {
    setSubmittingClaim(true);
    try {
      const activeUser = userRef.current;
      const activeData = dataRef.current;
      const userId = activeUser?.user_id || activeUser?.id || "";
      const remarkText =
        typeof customRemark === "string" ? customRemark : "ลูกค้ากดยืนยันการส่งเคลมสินค้าเรียบร้อยแล้ว";

      await claimService.createClaimStatusLogs({
        claim_id: String(activeData?.claim_id || claimId),
        status: "5",
        remark: remarkText,
        update_by: String(userId),
        user_id: String(userId),
      });

      if (!isSilent) message.success("ยืนยันการส่งเคลมเรียบร้อยแล้ว");
      await fetchClaimDetail(false);
    } catch (err) {
      if (!isSilent) message.error("เกิดข้อผิดพลาดในการยืนยันรายการ: " + (err.message || ""));
    } finally {
      setSubmittingClaim(false);
    }
  };

  const handleConfirmDelivery = async (customRemark, isSilent = false) => {
    setConfirmingDelivery(true);
    try {
      const activeUser = userRef.current;
      const activeData = dataRef.current;
      const userId = activeUser?.user_id || activeUser?.agent_id || activeData?.agent_id || "";
      const currentTimestamp = new Date().toISOString();
      const remarkText = typeof customRemark === "string" ? customRemark : "ลูกค้ายืนยันรับสินค้าเรียบร้อยแล้ว";

      const { images, items, ...claimDataWithoutImages } = activeData || {};

      const formattedItems =
        Array.isArray(claimItems) && claimItems.length > 0 ? claimItems : Array.isArray(items) ? items : [];

      const updatePayload = {
        ...claimDataWithoutImages,
        claim_id: String(activeData.claim_id),
        claim_no: String(activeData.claim_no || ""),
        agent_id: String(activeData.agent_id || activeUser?.agent_id || ""),
        items: formattedItems,
        current_status: "10",
        status: "10",
        status_name: "จัดส่งสินค้าเคลมสำเร็จ",
        actionsname: "receive_finish_date",
        receive_finish_date: currentTimestamp,
        update_by: String(userId),
      };

      const resUpdate = await claimService.updateClaim(updatePayload);

      if (resUpdate) {
        await claimService.createClaimStatusLogs({
          claim_id: String(activeData.claim_id),
          status: "10",
          remark: remarkText,
          update_by: String(userId),
          agent_id: String(activeData.agent_id || activeUser?.agent_id || ""),
        });

        if (!isSilent) message.success("ยืนยันรับสินค้าเคลมเรียบร้อยแล้ว");
        await fetchClaimDetail(false);
      }
    } catch (error) {
      if (!isSilent) message.error(error.message || "เกิดข้อผิดพลาดในการอัปเดตสถานะ");
    } finally {
      setConfirmingDelivery(false);
    }
  };

  const checkAndTriggerAutoStamp = useCallback(async () => {
    const activeData = dataRef.current;
    const activeLogs = statusLogsRef.current;
    const pendingState = isPendingStatusRef.current;
    const deliveredState = isDeliveredStatusRef.current;

    if (!activeData || isExecutingAutoStampRef.current) return;

    const now = dayjs();

    if (pendingState) {
      const createdTime = parseDateSafely(activeData.created_at || activeData.claim_date);
      if (createdTime && Math.abs(now.diff(createdTime, "second")) >= AUTO_STAMP_DELAY_SECONDS) {
        isExecutingAutoStampRef.current = true;
        try {
          await handleConfirmClaimSubmit(
            `ลูกค้ากดยืนยันการส่งเคลมสินค้าเรียบร้อยแล้ว (ระบบ Stamp อัตโนมัติ ${AUTO_STAMP_DELAY_SECONDS} วินาที)`,
            true
          );
        } finally {
          isExecutingAutoStampRef.current = false;
        }
      }
    }

    if (deliveredState) {
      const deliveredLogs = activeLogs.filter((l) => {
        const st = String(l.status || l.status_id || "").toLowerCase();
        const rm = String(l.remark || "").toLowerCase();
        return st === "10" || st === "delivered" || rm.includes("delivered") || rm.includes("จัดส่งสินค้าเคลมสำเร็จ");
      });

      const lastLog = deliveredLogs.length > 0 ? deliveredLogs[deliveredLogs.length - 1] : null;
      const deliveredTime = parseDateSafely(
        lastLog?.update_date || lastLog?.created_at || activeData.updated_at || activeData.receive_finish_date
      );

      if (deliveredTime && Math.abs(now.diff(deliveredTime, "second")) >= AUTO_STAMP_DELAY_SECONDS) {
        isExecutingAutoStampRef.current = true;
        try {
          await handleConfirmDelivery(
            `ลูกค้ายืนยันรับสินค้าเรียบร้อยแล้ว (ระบบ Stamp อัตโนมัติ ${AUTO_STAMP_DELAY_SECONDS} วินาที)`,
            true
          );
        } finally {
          isExecutingAutoStampRef.current = false;
        }
      }
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      checkAndTriggerAutoStamp();
    }, 1000);
    return () => clearInterval(timer);
  }, [checkAndTriggerAutoStamp]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    const messageToSend = newMessage.trim();
    setSendingMsg(true);
    try {
      const activeUser = userRef.current;
      const activeData = dataRef.current;
      const userId = activeUser?.user_id || activeUser?.id || activeUser?.agent_id || "";
      const realClaimId = activeData.claim_id;
      const formattedRemark = `[MSG] [CUSTOMER] ${messageToSend}`;

      const rawStatusVal = activeData?.current_status || activeData?.status || activeData?.status_id || "1";
      const targetStatusId = Number(getStatusId(rawStatusVal)) || Number(statusId) || 1;

      await claimService.createClaimStatusLogs({
        claim_id: String(realClaimId),
        status: String(targetStatusId),
        remark: formattedRemark,
        update_by: String(userId),
        user_id: String(userId),
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
        <Button onClick={() => navigate("/customer/list-claim")}>กลับหน้ารายการ</Button>
      </div>
    );
  }

  const hasRejectInLogs = statusLogs.some(
    (log) => log.remark && (log.remark.includes("ปฏิเสธรายการเคลม") || String(log.status) === "2" || String(log.status) === "7")
  );

  const hasRejectInApproves = approveLogs.some(
    (app) => String(app.approve_status) === "false" || String(app.approve_status) === "0"
  );

  const rawStatusVal =
    data?.current_status || statusLogs.filter((l) => l.remark && !l.remark.startsWith("[MSG]")).slice(-1)[0]?.status || "1";
  const rawStatusIdStr = String(getStatusId(rawStatusVal));

  const isRejectedInDB =
    hasRejectInLogs ||
    hasRejectInApproves ||
    ["2", "3", "7", "rejected", "ไม่อนุมัติเคลมสินค้า", "ไม่มีสิทธิ์เคลม"].includes(String(rawStatusVal).toLowerCase()) ||
    ["2", "3", "7"].includes(rawStatusIdStr);

  const currentStatusInDB = getStatusName(data.current_status || "สร้างรายการเคลม");
  const currentStatusId = String(getStatusId(data.current_status));

  const getLogRawDateString = (statusTarget) => {
    const targetId = String(statusTarget);
    if (targetId === "1" || targetId === "5") return formatDateString(data?.created_at || data?.claim_date);

    const matchingLogs = statusLogs.filter((item) => String(item.status || item.status_id) === targetId);
    if (matchingLogs.length > 0) {
      const lastLog = matchingLogs[matchingLogs.length - 1];
      return formatDateString(lastLog.update_date || lastLog.created_at || lastLog.created_date);
    }

    if (targetId === "2" || targetId === "6") return formatDateString(data.approve_date || data.updated_at);
    if (targetId === "4") return formatDateString(data.driver_receive_date || data.warehouse_receive_date);
    if (targetId === "8") return formatDateString(data.withdraw_date);
    if (targetId === "9") return formatDateString(data.delivery_date);
    if (targetId === "10") return formatDateString(data.receive_finish_date);

    return "-";
  };

  const getLogDate = (statusTarget) => {
    const targetId = String(statusTarget);
    if (["1", "5", "Pending"].includes(targetId)) {
      return formatDate(data?.created_at || data?.claim_date);
    }

    const matchingLogs = statusLogs.filter((item) => String(item.status || item.status_id) === targetId);
    if (matchingLogs.length > 0) {
      const lastLog = matchingLogs[matchingLogs.length - 1];
      return formatDate(lastLog.update_date || lastLog.created_at || lastLog.created_date);
    }

    if (targetId === "2" || targetId === "6") return formatDate(data.approve_date || data.updated_at);
    if (targetId === "4") return formatDateString(data.driver_receive_date || data.warehouse_receive_date);
    if (targetId === "8") return formatDate(data.withdraw_date);
    if (targetId === "9") return formatDate(data.delivery_date);
    if (targetId === "10") return formatDate(data.receive_finish_date);

    return "-";
  };

  const getCurrentStep = () => {
    const statusIdStr = String(currentStatusId);
    const statusNameStr = String(currentStatusInDB).toLowerCase();

    if (["1", "5", "pending", "รอพิจารณา", "รอตรวจสอบ"].includes(statusIdStr) || statusNameStr.includes("pending")) return 0;
    if (["9", "shipping", "กำลังจัดส่งสินค้าเคลม"].includes(statusIdStr) || statusNameStr.includes("shipping")) return 3;
    if (["10", "delivered", "จัดส่งสินค้าเคลมสำเร็จ"].includes(statusIdStr) || statusNameStr.includes("delivered")) return 4;
    if (["8", "processing"].includes(statusIdStr) || statusNameStr.includes("processing")) return 2;
    return 1;
  };

  const renderDotIcon = (IconComponent) => (
    <div className="relative flex items-center justify-center w-full h-full">
      <IconComponent className="text-lg relative z-10" />
      <span className="absolute w-2.5 h-2.5 bg-current rounded-full -bottom-1 z-0 opacity-80" />
    </div>
  );

  const rejectReasonDisplay = getRejectReasonText(statusLogs, approveLogs, data) || "เนื่องจากสินค้าไม่อยู่ในเงื่อนไขการเคลม";

  const getStepItems = () => {
    const currentRejectReason = getRejectReasonText(statusLogs, approveLogs, data);
    const rejectDateDisplay = getLogDate(2) !== "-" ? getLogDate(2) : getLogDate(7);

    return [
      {
        title: "1. Pending",
        description: getLogDate(5) !== "-" ? getLogDate(5) : getLogDate(1),
        icon: renderDotIcon(CheckCircleOutlined),
      },
      {
        title: isRejectedInDB ? "2. Rejected" : "2. Approved",
        description: (
          <div className="text-xs">
            <div>{isRejectedInDB ? rejectDateDisplay : getLogDate(currentStatusId)}</div>
            {isRejectedInDB && currentRejectReason && (
              <div className="text-red-500 font-medium break-words mt-0.5">{currentRejectReason}</div>
            )}
          </div>
        ),
        icon: renderDotIcon(isRejectedInDB ? CloseCircleOutlined : CheckCircleOutlined),
      },
      {
        title: "3. Processing",
        description: isRejectedInDB && getCurrentStep() < 2 ? "-" : getLogDate(8),
        icon: renderDotIcon(FileSearchOutlined),
      },
      {
        title: "4. Shipping",
        description: getLogDate(9),
        icon: renderDotIcon(CarOutlined),
      },
      {
        title: "5. Delivered",
        description: getLogDate(10),
        icon: renderDotIcon(SmileOutlined),
      },
    ];
  };

  const creatorUserId = data ? String(data.user_id || data.created_by || "") : "";
  const claimAgentId = data ? String(data.agent_id || "") : "";
  const claimAgentCode = data ? String(data.agent_code || "") : "";

  const driverReceiveLogDateStr = getLogRawDateString("4");

  const deliverySuccessLog = statusLogs.find((log) => String(log.status || log.status_id) === "10");
  const deliverySuccessUserId = deliverySuccessLog
    ? String(deliverySuccessLog.update_by || deliverySuccessLog.user_id || "")
    : "";
  const deliverySuccessNameDisplay = usersMap[deliverySuccessUserId] || "-";

  const matchedAgentName =
    agentsMap[claimAgentId] || agentsMap[claimAgentCode] || getAgentNameByUserId(creatorUserId, usersList, agentsMap);
  const agentNameDisplay = matchedAgentName !== "-" && matchedAgentName ? matchedAgentName : data?.agent_name || data?.agentName || "-";
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
      render: (text, record) => {
        if (record.item_code && record.item_name && !record.item_name.includes(record.item_code)) {
          return (
            <div className="flex flex-col text-xs">
              <span className="font-semibold text-slate-800">
                {record.item_code} - {record.item_name}
              </span>
            </div>
          );
        }
        return <span className="font-medium text-slate-800 break-words">{text}</span>;
      },
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
      title: "จำนวนส่งคืน",
      dataIndex: "qtyreceived",
      key: "qtyreceived",
      width: 110,
      align: "right",
      render: (retQty, record) => {
        const val = retQty ?? record.returned_qty;
        if (val === 0 || val === "0") return <span className="text-slate-500 font-medium">0</span>;
        if (!val || val === "-") return <span className="text-slate-400 font-normal">-</span>;
        return <span className="font-semibold text-amber-600">{val}</span>;
      },
    },
    {
      title: "สาเหตุและรายละเอียด",
      dataIndex: "item_remark",
      key: "item_remark",
      render: (text, record) => {
        const remarkText = text || record.item_remark || record.remark || "";
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
                    claimNo: data.claim_no,
                    productName: claimItems.length > 0 ? claimItems.map((i) => i.item_name).join(", ") : "-",
                    receiverName: "-",
                    approverName: "-",
                    receiveDate: (() => {
                      const targetDate =
                        driverReceiveLogDateStr !== "-" && driverReceiveLogDateStr
                          ? driverReceiveLogDateStr
                          : data?.claim_date;

                      if (!targetDate || targetDate === "-") return "-";
                      const parsedDate = parseDateSafely(targetDate);
                      return parsedDate ? parsedDate.format("DD/MM/YY") : "-";
                    })(),
                    createdDate:
                      getLogRawDateString("1") !== "-"
                        ? getLogRawDateString("1")
                        : data?.claim_date
                        ? dayjs(data.claim_date).format("DD/MM/YYYY")
                        : "-",
                    deliverySuccessDate:
                      data?.current_status === "10" || data?.receive_finish_date
                        ? getLogRawDateString("10") !== "-"
                          ? getLogRawDateString("10")
                          : "-"
                        : "-",
                    deliverySuccessName:
                      data?.current_status === "10" || data?.receive_finish_date
                        ? deliverySuccessNameDisplay !== "-"
                          ? deliverySuccessNameDisplay
                          : agentNameDisplay
                        : "-",
                    estimated_delivery_date: data?.estimated_delivery_date
                      ? dayjs(data.estimated_delivery_date).format("DD/MM/YY")
                      : "-",
                    items: claimItems,
                    agentName: agentNameDisplay,
                    agent_name: agentNameDisplay,
                    reporter: reporterNameDisplay,
                    driverName: data.driver_name || "-",
                    claimType: data.claim_type || data.claim_reason || data.remark || data.detail || "",
                    withdrawDate: data.withdraw_date,
                    approved_qty: "-",
                    detail: "-",
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
          description={`เหตุผล: ${rejectReasonDisplay}`}
          type="error"
          showIcon
          className="rounded-2xl border-red-200 break-words"
        />
      )}

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
              colorSuccess: isRejectedInDB ? "#ef4444" : "#059669",
              colorSuccessBorder: isRejectedInDB ? "#ef4444" : "#059669",
              colorSuccessBg: isRejectedInDB ? "#fef2f2" : "#ecfdf5",
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
          <div
            className={`custom-steps-compact w-full overflow-hidden pb-2 ${
              isRejectedInDB ? "custom-steps-rejected" : "custom-steps-normal"
            }`}
          >
            <Steps
              responsive={true}
              current={getCurrentStep()}
              status={isRejectedInDB ? "error" : "process"}
              items={getStepItems().map((item, idx) => {
                const currentIdx = getCurrentStep();
                let itemStatus = "wait";

                if (isRejectedInDB && idx <= currentIdx) {
                  itemStatus = "error";
                } else if (idx < currentIdx) {
                  itemStatus = "finish";
                } else if (idx === currentIdx) {
                  itemStatus = "process";
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
            styles={{ body: { padding: "16px sm:24px" } }}
          >
            <Descriptions
              column={1}
              bordered
              size="small"
              className="w-full table-fixed"
              styles={{
                label: { fontWeight: "500", color: "#475569", width: "110px", backgroundColor: "#f8fafc", fontSize: "13px", whiteSpace: "nowrap" },
                content: { color: "#1e293b", fontSize: "13px", wordBreak: "break-word" }
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
            styles={{ body: { padding: "16px" } }}
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

          {STATUS_PRIORITY[currentStatusInDB] >= 4 && (
            <Card title={<span className="font-medium text-slate-800">ข้อมูลการรับสินค้าเคลม</span>} className="rounded-2xl shadow-sm border-gray-200 w-full" styles={{ body: { padding: "24px" } }}>
              <Descriptions
                column={1}
                bordered
                size="middle"
                className="w-full"
                styles={{
                  label: { fontWeight: "500", color: "#475569", width: "140px", backgroundColor: "#f8fafc", verticalAlign: "top", whiteSpace: "nowrap" },
                  content: { color: "#1e293b", wordBreak: "break-word" }
                }}
              >
                <Descriptions.Item label="พนักงานขับรถ (พขร.)">
                  <span className="text-slate-800 break-words">{data.driver_name || "-"}</span>
                </Descriptions.Item>
                <Descriptions.Item label="ทะเบียนรถ">
                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs">{data.truck_plate || "-"}</span>
                </Descriptions.Item>
                <Descriptions.Item label="เลขที่เอกสารเคลม">
                  <span className="font-mono">{data.claim_no || "-"}</span>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          {STATUS_PRIORITY[currentStatusInDB] >= 7 && (
            <Card title={<span className="font-medium text-slate-800">ข้อมูลการจัดส่งสินค้าเคลม</span>} className="rounded-2xl shadow-sm border-gray-200 w-full" styles={{ body: { padding: "24px" } }}>
              <Descriptions
                column={1}
                bordered
                size="middle"
                styles={{
                  label: { fontWeight: "500", color: "#475569", width: "140px", backgroundColor: "#f8fafc", verticalAlign: "top" },
                  content: { color: "#1e293b", wordBreak: "break-word" }
                }}
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
            styles={{ body: { padding: "24px" } }}
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

          {/* ประวัติการบันทึกสถานะ (sidebar card) เรียกใช้งาน ClaimTimeline */}
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
            styles={{ body: { padding: "16px 24px" } }}
          >
            <Descriptions
              column={1}
              bordered
              size="small"
              styles={{
                label: { fontWeight: "500", color: "#475569", width: "130px", backgroundColor: "#f8fafc", fontSize: "12px", verticalAlign: "top" },
                content: { color: "#1e293b", fontSize: "12px", wordBreak: "break-word" }
              }}
            >
              <Descriptions.Item label="อัปเดตล่าสุด ณ เวลา">
                <span className="font-mono">{formatDateString(data.updated_at)}</span>
              </Descriptions.Item>
            </Descriptions>

            <ClaimTimeline
              statusLogs={statusLogs
                .filter((l) => l.remark && !l.remark.startsWith("[MSG]"))
                .slice(-2)}
              usersMap={usersMap}
            />
          </Card>

          <Card
            className="rounded-2xl shadow-sm border border-slate-300 w-full bg-[#f0f4f9]/60"
            styles={{ body: { padding: "20px" } }}
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

          {isPendingStatus && !hasCustomerConfirmedSubmit && (
            <Popconfirm
              title="ยืนยันรายการเคลม"
              description="คุณต้องการยืนยันการส่งเคลมสินค้ารายการนี้ใช่หรือไม่?"
              onConfirm={() => handleConfirmClaimSubmit("ลูกค้ากดยืนยันการส่งเคลมสินค้าเรียบร้อยแล้ว", false)}
              okText="ยืนยัน"
              cancelText="ยกเลิก"
            >
              <Button
                type="primary"
                size="large"
                loading={submittingClaim}
                disabled={submittingClaim}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 h-11 font-medium border-none shadow-md"
              >
                ยืนยันการส่งเคลมสินค้า
              </Button>
            </Popconfirm>
          )}

          {isDeliveredStatus && !hasCustomerConfirmedDelivery && (
            <Popconfirm
              title="ยืนยันการรับสินค้าเคลม"
              description="คุณได้รับสินค้าเคลมรายการนี้เรียบร้อยแล้วใช่หรือไม่?"
              onConfirm={() => handleConfirmDelivery("ลูกค้ายืนยันรับสินค้าเรียบร้อยแล้ว", false)}
              okText="ยืนยันรับสินค้า"
              cancelText="ยกเลิก"
            >
              <Button
                type="primary"
                size="large"
                loading={confirmingDelivery}
                disabled={confirmingDelivery}
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 h-11 font-medium border-none shadow-md"
              >
                ยืนยันรับสินค้าเคลมแล้ว
              </Button>
            </Popconfirm>
          )}

          <Card className="rounded-2xl shadow-sm border-gray-200 w-full" styles={{ body: { padding: "20px" } }}>
            <Button
              size="large"
              icon={<ArrowLeftOutlined />}
              className="w-full rounded-xl border-gray-300 text-slate-700 font-normal hover:border-slate-800 h-11"
              onClick={() => navigate("/customer/list-claim")}
            >
              กลับหน้ารายการเคลม
            </Button>
          </Card>
        </div>
      </div>

      {/* Modal ประวัติการบันทึกสถานะทั้งหมด เรียกใช้งาน ClaimTimeline */}
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