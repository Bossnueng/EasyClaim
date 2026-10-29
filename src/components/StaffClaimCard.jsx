// src/components/StaffClaimCard.jsx

import React, { useState, useEffect } from "react";
import { Popconfirm, Tag } from "antd";
import { useNavigate } from "react-router-dom";
import { RightOutlined, CodeSandboxOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import ClaimStatusTag from "./ClaimStatusTag";
import loginService from "../services/loginService";
import itemService from "../services/itemService";
import { getStatusName } from "../constants/claimStatus";

const NON_DELETABLE_STATUSES = [
  "ไม่มีสิทธิ์เคลม",
  "ไม่อนุมัติเคลมสินค้า",
  "จัดส่งสินค้าเคลมสำเร็จ",
];

const StaffClaimCard = ({ claim, onDelete, hideDeleteWhenDisabled = true, layout = "horizontal", itemsMap: externalItemsMap }) => {
  const navigate = useNavigate();
  const [internalItemsMap, setInternalItemsMap] = useState({});

  const currentUser = loginService.getCurrentUser();
  const userRoleId = Number(currentUser?.role_id);
  const isAdmin = userRoleId === 1;

  const claim_id = claim?.claim_id;
  const claim_no = claim?.claim_no || claim_id;
  const status = claim?.current_status || claim?.status;

  // 🟢 ดึง Master Items มาทำ Map เองอัตโนมัติ หากภายนอกไม่ได้ส่งเข้ามา
  useEffect(() => {
    if (externalItemsMap && Object.keys(externalItemsMap).length > 0) return;

    let isMounted = true;
    itemService.getItems()
      .then((res) => {
        if (!isMounted) return;
        const masterItems = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        const map = {};
        masterItems.forEach((item) => {
          const code = String(item.item_code || "").trim();
          const id = String(item.item_id || "").trim();
          const name = (item.item_name || "").trim();

          if (id) map[id] = name;
          if (code) map[code] = name;
        });
        setInternalItemsMap(map);
      })
      .catch((err) => console.error("Error fetching items in Card:", err));

    return () => { isMounted = false; };
  }, [externalItemsMap]);

  const mergedItemsMap = (externalItemsMap && Object.keys(externalItemsMap).length > 0) 
    ? externalItemsMap 
    : internalItemsMap;

  // 🟢 ปรับปรุงการแปลงรายการสินค้า
  const productDisplayList = (() => {
    const getItemName = (id, rawName) => {
      const idStr = String(id || "").trim();
      const mapName = mergedItemsMap[idStr] || "";
      let nameStr = (mapName || rawName || "").trim();

      if (nameStr.startsWith("สินค้า ID:")) {
        nameStr = nameStr.replace(/^สินค้า ID:\s*/, "").trim();
      }

      if (nameStr === idStr) nameStr = "";

      if (idStr && nameStr) {
        const cleanName = nameStr.replace(new RegExp(`^${idStr}\\s*-\\s*`), "");
        return `${idStr} - ${cleanName}`;
      }

      return nameStr || (idStr ? idStr : "ไม่พบข้อมูลสินค้า");
    };

    if (Array.isArray(claim?.items) && claim.items.length > 0) {
      const formattedItems = claim.items
        .map((i) => getItemName(i.item_id || i.item_code, i.item_name || i.name))
        .filter(Boolean);

      if (formattedItems.length > 0) {
        return formattedItems.join(", ");
      }
    }

    return getItemName(claim?.item_id || claim?.item_code, claim?.item_name);
  })();

  const qtyDisplay = (() => {
    if (Array.isArray(claim?.items) && claim.items.length > 0) {
      return claim.items
        .map((i) => i.qtyreceived ?? i.qtychang ?? i.qty ?? 0)
        .join(", ");
    }
    return claim?.qtyreceived ?? claim?.qtychang ?? claim?.qty ?? 0;
  })();

  const isOverdue7Days = (() => {
    const rawStatus = String(status || "").trim().toLowerCase();
    const statusName = String(getStatusName(rawStatus) || "").trim().toLowerCase();
    
    const isDelivered = ["10", "delivered", "จัดส่งสำเร็จ", "จัดส่งสินค้าเคลมสำเร็จ"].includes(rawStatus) ||
                        ["10", "delivered", "จัดส่งสำเร็จ", "จัดส่งสินค้าเคลมสำเร็จ"].includes(statusName);

    if (isDelivered) return false;

    const createdDate = claim?.created_at || claim?.claim_date || claim?.createdDate;
    if (!createdDate) return false;

    const parsedDate = dayjs(createdDate);
    if (!parsedDate.isValid()) return false;

    return dayjs().diff(parsedDate, "day") >= 7;
  })();

  const overdueHighlightClass = isOverdue7Days 
    ? "border border-red-300 bg-white shadow-[0_0_12px_rgba(239,68,68,0.22)]" 
    : "border border-gray-200 bg-white hover:border-emerald-500 hover:shadow-md";

  const rawDate = claim?.claim_date || claim?.created_at || claim?.createdDate;
  const agentName = claim?.agent_name || claim?.agentName;

  const rawRemark = claim?.remark || claim?.claim_reason || claim?.claim_type || claim?.detail || "";
  const claimTypeMatch = rawRemark.match(/\[(.*?)\]/);
  const claimType = claimTypeMatch ? claimTypeMatch[1] : (rawRemark.trim() || "-");

  const formattedDate = rawDate && dayjs(rawDate).isValid()
    ? dayjs(rawDate).format("DD/MM/YY")
    : rawDate || "-";

  const isDisableDelete = NON_DELETABLE_STATUSES.includes(status);

  const renderDeleteButton = () => {
    if (!isAdmin || !onDelete) return null;

    const targetClaimId = claim?.claim_id || claim?.claim_no;

    if (isDisableDelete) {
      return !hideDeleteWhenDisabled ? (
        <button
          disabled
          onClick={(e) => e.stopPropagation()}
          className="p-1 rounded-lg text-gray-300 opacity-40 bg-transparent border-0 cursor-not-allowed"
          title="ไม่สามารถลบรายการในสถานะนี้ได้"
        >
          <DeleteOutlined className="text-xs sm:text-sm" />
        </button>
      ) : null;
    }

    return (
      <Popconfirm
        title="ยืนยันการลบรายการ"
        description="คุณต้องการลบรายการเคลมนี้ใช่หรือไม่?"
        onConfirm={(e) => onDelete(e, targetClaimId)}
        onCancel={(e) => e.stopPropagation()}
        okText="ลบ"
        cancelText="ยกเลิก"
        okButtonProps={{ danger: true }}
      >
        <button
          onClick={(e) => e.stopPropagation()}
          className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors border-0 bg-transparent cursor-pointer flex items-center justify-center"
          title="ลบรายการ"
        >
          <DeleteOutlined className="text-xs sm:text-sm" />
        </button>
      </Popconfirm>
    );
  };

  // Layout แนวนอน (Horizontal)
  if (layout === "horizontal") {
    return (
      <div
        onClick={() => navigate(`/staff/update-claim/${claim_id || claim_no}`)}
        style={{ boxSizing: "border-box", padding: "16px 20px" }}
        className={`rounded-2xl transition-all cursor-pointer flex justify-between items-start gap-4 w-full relative ${overdueHighlightClass}`}
      >
        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          <div className="flex items-center flex-wrap gap-2">
            <h4 className="font-bold text-xs sm:text-sm text-slate-800 m-0 break-words leading-snug font-mono">
              Claim ID: {claim_no}
            </h4>
            {isOverdue7Days && (
              <Tag 
                color="error" 
                style={{ 
                  margin: 0, 
                  padding: "0px 8px", 
                  fontSize: "10px", 
                  lineHeight: "18px",
                  backgroundColor: "#fff1f0",
                  borderColor: "#ffa39e",
                  color: "#cf1322"
                }} 
                className="border font-normal rounded-md text-[10px] shrink-0"
              >
                ค้างเกิน 7 วัน
              </Tag>
            )}
          </div>

          <div className="flex flex-col gap-1 text-[11px] sm:text-xs text-gray-500 font-mono mt-1">
            <div className="text-slate-800 font-medium break-words">
              รายการสินค้า: {productDisplayList}
            </div>

            {agentName && (
              <div className="text-emerald-700 font-semibold break-words">
                Agent: {agentName}
              </div>
            )}

            <div className="break-words">
              ประเภทการเคลม : {claimType}
            </div>

            <div>
              จำนวน: <b className="text-emerald-700 font-bold">{qtyDisplay}</b> ขวด/กระป๋อง
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end justify-between self-stretch gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <ClaimStatusTag status={status} role="staff" />
            {renderDeleteButton()}
          </div>
          <span className="text-[10px] sm:text-xs text-gray-400 font-mono">
            {formattedDate}
          </span>
        </div>
      </div>
    );
  }

  // Layout แนวตั้ง (Vertical)
  return (
    <div
      onClick={() => navigate(`/staff/update-claim/${claim_id || claim_no}`)}
      style={{ boxSizing: "border-box", padding: "20px" }}
      className={`rounded-2xl transition-all cursor-pointer flex flex-col justify-between gap-4 w-full relative group ${overdueHighlightClass}`}
    >
      <div className="flex justify-between items-center gap-2">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <CodeSandboxOutlined className="text-lg sm:text-xl" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isOverdue7Days && (
            <Tag 
              color="error" 
              style={{ 
                margin: 0, 
                padding: "0px 8px", 
                fontSize: "10px", 
                lineHeight: "18px",
                backgroundColor: "#fff1f0",
                borderColor: "#ffa39e",
                color: "#cf1322"
              }} 
              className="border font-normal rounded-md text-[10px] shrink-0"
            >
              ค้างเกิน 7 วัน
            </Tag>
          )}
          <ClaimStatusTag status={status} role="staff" />
          {renderDeleteButton()}
        </div>
      </div>

      <div className="flex flex-col gap-1 min-w-0">
        <h3 className="font-bold text-sm sm:text-base text-slate-800 m-0 break-words leading-snug font-mono">
          Claim ID: {claim_no}
        </h3>
        
        <div className="flex flex-col gap-1 text-[11px] sm:text-xs text-gray-500 font-mono mt-1">
          <div className="text-slate-800 font-medium break-words">
            รายการสินค้า: {productDisplayList}
          </div>

          {agentName && (
            <div className="text-emerald-700 font-semibold break-words">
              Agent: {agentName}
            </div>
          )}

          <div className="break-words">ประเภทการเคลม : {claimType}</div>
        </div>
      </div>

      <div
        className="pt-3 border-t border-gray-100 flex justify-between items-center gap-2"
        style={{ marginTop: "4px" }}
      >
        <span className="text-slate-700 text-xs sm:text-sm shrink-0 font-mono">
          จำนวน: <span className="text-emerald-700 font-bold">{qtyDisplay}</span> ขวด/กระป๋อง
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] sm:text-xs text-gray-400 font-mono">{formattedDate}</span>
          <RightOutlined style={{ fontSize: "10px" }} className="text-emerald-600" />
        </div>
      </div>
    </div>
  );
};

export default StaffClaimCard;