// src/components/StaffClaimCard.jsx

import React from "react";
import { Popconfirm } from "antd";
import { useNavigate } from "react-router-dom";
import { RightOutlined, CodeSandboxOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import ClaimStatusTag from "./ClaimStatusTag";

const NON_DELETABLE_STATUSES = [
  "ไม่มีสิทธิ์เคลม",
  "ไม่อนุมัติเคลมสินค้า",
  "จัดส่งสินค้าเคลมสำเร็จ",
];

const StaffClaimCard = ({ claim, onDelete, hideDeleteWhenDisabled = true, layout = "horizontal" }) => {
  const navigate = useNavigate();

  const claim_id = claim?.claim_id;
  const claim_no = claim?.claim_no;
  const status = claim?.current_status || claim?.status;
  const productName = claim?.item_name;
  const rawDate = claim?.claim_date || claim?.created_at || claim?.createdDate;
  const qty = claim?.qty || 0;
  const agentName = claim?.agent_name || claim?.agentName || "-";

  const rawRemark = claim?.remark || claim?.claim_reason || claim?.claim_type || claim?.detail || "";
  const claimTypeMatch = rawRemark.match(/\[(.*?)\]/);
  const claimType = claimTypeMatch ? claimTypeMatch[1] : (rawRemark.trim() || "-");

  const formattedDate = rawDate && dayjs(rawDate).isValid()
    ? dayjs(rawDate).format("DD/MM/YY HH:mm")
    : rawDate || "-";

  const isDisableDelete = NON_DELETABLE_STATUSES.includes(status);

  const renderDeleteButton = () => {
    if (!onDelete) return null;

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
        // 🟢 2. แก้ไขการ navigate จาก claim_no เป็น claim_id (หรือใช้ fallback เป็น claim_no)
        onClick={() => navigate(`/staff/update-claim/${claim_id || claim_no}`)}
        style={{ boxSizing: "border-box", padding: "16px 20px" }}
        className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-500 transition-all cursor-pointer flex justify-between items-start gap-4 w-full"
      >
        {/* ฝั่งซ้าย: ชื่อสินค้า, Agent, ประเภทการเคลม, จำนวน */}
        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          <h4 className="font-bold text-xs sm:text-sm text-slate-800 m-0 break-words leading-snug">
            {productName}
          </h4>

          <div className="flex flex-col gap-1 text-[11px] sm:text-xs text-gray-500 font-mono mt-1">
            <div className="text-emerald-700 font-semibold break-words">
              Agent: {agentName}
            </div>
            <div className="break-words">
              ประเภทการเคลม : {claimType}
            </div>
            <div>
              จำนวน: <b className="text-emerald-700 font-bold">{qty}</b> ขวด/กระป๋อง
            </div>
          </div>
        </div>

        {/* ฝั่งขวา: สถานะ, ปุ่มลบ, ID (สีดำ ปกติ), วันเวลา */}
        <div className="flex flex-col items-end justify-between self-stretch gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <ClaimStatusTag status={status} role="staff" />
            {renderDeleteButton()}
          </div>
          <div className="flex flex-col items-end gap-0.5 font-mono">
            <span className="text-xs sm:text-sm text-slate-800">
              ID: {claim_no}
            </span>
            <span className="text-[10px] sm:text-xs text-gray-400">
              {formattedDate}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Layout แนวตั้ง (Vertical)
  return (
    <div
      // 🟢 3. แก้ไขจุดนี้เช่นกัน
      onClick={() => navigate(`/staff/update-claim/${claim_id || claim_no}`)}
      style={{ boxSizing: "border-box", padding: "20px" }}
      className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-500 transition-all cursor-pointer flex flex-col justify-between gap-4 w-full relative group"
    >
      <div className="flex justify-between items-center gap-2">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <CodeSandboxOutlined className="text-lg sm:text-xl" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ClaimStatusTag status={status} role="staff" />
          {renderDeleteButton()}
        </div>
      </div>

      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-bold text-sm sm:text-base text-slate-800 m-0 break-words leading-snug flex-1">
            {productName}
          </h3>
          <span className="text-sm sm:text-base text-slate-800 font-mono shrink-0">
            ID: {claim_no}
          </span>
        </div>
        
        <div className="flex flex-col gap-1 text-[11px] sm:text-xs text-gray-500 font-mono mt-1">
          <div className="text-emerald-700 font-semibold break-words">
            Agent: {agentName}
          </div>
          <div className="break-words">ประเภทการเคลม : {claimType}</div>
        </div>
      </div>

      <div
        className="pt-3 border-t border-gray-100 flex justify-between items-center gap-2"
        style={{ marginTop: "4px" }}
      >
        <span className="text-slate-700 text-xs sm:text-sm shrink-0 font-mono">
          จำนวน: <span className="text-emerald-700 font-bold">{qty}</span> ขวด/กระป๋อง
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