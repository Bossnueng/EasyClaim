import React from "react";
import { Popconfirm } from "antd";
import { useNavigate } from "react-router-dom";
import { RightOutlined, CodeSandboxOutlined, DeleteOutlined } from "@ant-design/icons";
import ClaimStatusTag from "./ClaimStatusTag";

// รายการสถานะที่ไม่ยินยอมให้ลบ
const NON_DELETABLE_STATUSES = [
  "ไม่มีสิทธิ์เคลม",
  "ไม่อนุมัติเคลมสินค้า",
  "จัดส่งสินค้าเคลมสำเร็จ",
];

const StaffClaimCard = ({
  claim,
  onDelete,
  hideDeleteWhenDisabled = true,
  layout = "vertical",
}) => {
  const navigate = useNavigate();

  // 🟢 Map ค่าตัวแปรให้รองรับทั้ง Data จาก API และ Props เดิม
  const claim_no = claim?.claim_no || claim?.claimId;
  const targetClaimId = claim?.claim_id || claim_no;
  const status = claim?.current_status || claim?.status;
  const productName = claim?.item_name || claim?.productName;
  const createdDate = claim?.claim_date || claim?.createdDate;
  const qty = claim?.qty || 0;
  const agentName = claim?.agent_name || claim?.full_name;

  const isDisableDelete = NON_DELETABLE_STATUSES.includes(status);

  // ส่วนแสดงปุ่มลบ
  const renderDeleteButton = () => {
    if (!onDelete) return null;

    if (isDisableDelete) {
      return !hideDeleteWhenDisabled ? (
        <button
          disabled
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded-lg text-gray-300 opacity-40 bg-transparent border-0 cursor-not-allowed"
          title="ไม่สามารถลบรายการในสถานะนี้ได้"
        >
          <DeleteOutlined className="text-base" />
        </button>
      ) : null;
    }

    return (
      <Popconfirm
        title="ยืนยันการลบรายการ"
        description="คุณต้องการลบรายการเคลมนี้ใช่หรือไม่?"
        onConfirm={(e) => {
          if (e) e.stopPropagation();
          onDelete(e, targetClaimId);
        }}
        onCancel={(e) => e && e.stopPropagation()}
        okText="ลบ"
        cancelText="ยกเลิก"
        okButtonProps={{ danger: true }}
      >
        <button
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors border-0 bg-transparent cursor-pointer flex items-center justify-center"
          title="ลบรายการ"
        >
          <DeleteOutlined className="text-base" />
        </button>
      </Popconfirm>
    );
  };

  // Layout แนวนอน (Horizontal) - สำหรับใช้งานใน StaffHome หรือหมวดการแสดงผลกระชับ
  if (layout === "horizontal") {
    return (
      <div
        onClick={() => navigate(`/staff/update-claim/${claim_no}`)}
        style={{
          boxSizing: "border-box",
          padding: "20px",
          overflow: "hidden",
        }}
        className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-500 transition-all cursor-pointer flex justify-between items-center gap-4 w-full"
      >
        <div className="flex flex-col gap-1 min-w-0">
          <h4 className="font-bold text-base text-slate-800 m-0 truncate">
            {productName}
          </h4>
          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono truncate">
            <span>ID: {claim_no}</span>
            {agentName && <span className="text-gray-500 font-sans">| {agentName}</span>}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-2">
            <ClaimStatusTag status={status} />
            {renderDeleteButton()}
          </div>
          <span className="text-xs text-gray-400">{createdDate}</span>
        </div>
      </div>
    );
  }

  // Layout แนวตั้ง (Vertical) - สำหรับใช้ใน StaffClaimList
  return (
    <div
      onClick={() => navigate(`/staff/update-claim/${claim_no}`)}
      style={{
        boxSizing: "border-box",
        padding: "20px",
        overflow: "hidden",
      }}
      className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-500 transition-all cursor-pointer flex flex-col justify-between gap-5 w-full relative group"
    >
      <div className="flex justify-between items-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <CodeSandboxOutlined className="text-xl" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ClaimStatusTag status={status} />
          {renderDeleteButton()}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 min-w-0">
        <h3 className="font-bold text-lg text-slate-800 m-0 truncate">
          {productName}
        </h3>
        <div className="flex justify-between items-center text-xs text-gray-400 font-mono flex-wrap gap-1">
          <span className="truncate">ID: {claim_no}</span>
          <span className="shrink-0">{createdDate}</span>
        </div>
        {agentName && (
          <p className="text-xs text-slate-500 font-medium m-0 truncate">
            ลูกค้า: {agentName}
          </p>
        )}
      </div>

      <div
        className="pt-3 border-t border-gray-100 flex justify-between items-center gap-2"
        style={{ marginTop: "4px" }}
      >
        <span className="font-bold text-slate-700 text-sm shrink-0">
          จำนวน: {qty} ขวด
        </span>
        <div className="flex items-center gap-1 text-emerald-600 font-semibold text-sm shrink-0">
          <span>อัปเดตสถานะ</span>
          <RightOutlined style={{ fontSize: "11px" }} />
        </div>
      </div>
    </div>
  );
};

export default StaffClaimCard;