import React from "react";
import { Tag, Popconfirm } from "antd";
import { useNavigate } from "react-router-dom";
import { RightOutlined, CodeSandboxOutlined, DeleteOutlined } from "@ant-design/icons";
import ClaimStatusTag from "./ClaimStatusTag";

// รายการสถานะที่ไม่ยินยอมให้ลบ
const NON_DELETABLE_STATUSES = [
  "ไม่มีสิทธิ์เคลม",
  "ไม่อนุมัติเคลมสินค้า",
  "จัดส่งสินค้าเคลมสำเร็จ",
];

const StaffClaimCard = ({ claim, onDelete, hideDeleteWhenDisabled = true, layout = "vertical" }) => {
  const navigate = useNavigate();

  const claim_no = claim?.claim_no;
  const status = claim?.current_status;
  const productName = claim?.item_name;
  const createdDate = claim?.claim_date || claim?.createdDate;
  const qty = claim?.qty;

  const isDisableDelete = NON_DELETABLE_STATUSES.includes(status);

  const renderDeleteButton = () => {
    if (!onDelete) return null;

    const targetClaimId = claim?.claim_id || claim?.claim_no;

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
        onConfirm={(e) => onDelete(e, targetClaimId)}
        onCancel={(e) => e.stopPropagation()}
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

  // Layout แนวนอน (ขนาดเดียวกับ CustomerHome)
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
          <p className="text-xs text-gray-400 font-mono m-0 truncate">
            ID: {claim_no}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-2">
            <ClaimStatusTag status={status} role="staff" />
            {renderDeleteButton()}
          </div>
          <span className="text-xs text-gray-400">{createdDate}</span>
        </div>
      </div>
    );
  }

  // Layout แนวตั้ง / Default
  return (
    <div
      onClick={() => navigate(`/staff/update-claim/${claim_no}`)}
      style={{
        boxSizing: "border-box",
        padding: "20px",
        overflow: "hidden",
      }}
      className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-500 transition-all cursor-pointer flex gap-4 w-full relative group"
    >
      <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 self-center">
        <CodeSandboxOutlined className="text-2xl" />
      </div>

      <div className="flex flex-col justify-between gap-4 flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-bold text-lg text-slate-800 m-0 truncate leading-snug">
            {productName}
          </h3>
          <div className="flex items-center gap-2 shrink-0">
            <ClaimStatusTag status={status} role="staff" />
            {renderDeleteButton()}
          </div>
        </div>

        <div className="flex justify-between items-center text-xs text-gray-400 font-mono flex-wrap gap-1">
          <span className="truncate">ID: {claim_no}</span>
          <span className="shrink-0">{createdDate}</span>
        </div>

        <div
          className="pt-3 border-t border-gray-100 flex justify-between items-center gap-2"
          style={{ marginTop: "2px" }}
        >
          <span className="font-bold text-slate-700 text-sm shrink-0">
            จำนวน: {qty} ขวด
          </span>
          <div className="flex items-center gap-1 text-emerald-600 font-semibold text-sm shrink-0">
            <span>ดูรายละเอียด</span>
            <RightOutlined style={{ fontSize: "11px" }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffClaimCard;