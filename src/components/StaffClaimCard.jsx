import React from "react";
import { Tag, Popconfirm } from "antd";
import { useNavigate } from "react-router-dom";
import { RightOutlined,  CodeSandboxOutlined,  DeleteOutlined,} from "@ant-design/icons";
import ClaimStatusTag from "./ClaimStatusTag";

const NON_DELETABLE_STATUSES = ["ไม่มีสิทธิ์เคลม","ไม่อนุมัติเคลมสินค้า","จัดส่งสินค้าเคลมสำเร็จ",];


const ClaimCard = ({
  claim,onDelete,hideDeleteWhenDisabled = true,variant = "grid",

}) => {
  const navigate = useNavigate();
  const isDisableDelete = NON_DELETABLE_STATUSES.includes(claim.status);

  // Home แนวนอน
  if (variant === "compact") {
    return (
      <div
        onClick={() => navigate(`/staff/update-claim/${claim.claimId}`)}
        style={{
          boxSizing: "border-box",
          padding: "20px",
          overflow: "hidden",
        }}
        className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-500 transition-all cursor-pointer flex justify-between items-center gap-4 w-full"
      >
        <div className="flex flex-col gap-1 min-w-0">
          <h4 className="font-bold text-base text-slate-800 m-0 truncate">
            {claim.productName}
          </h4>
          <p className="text-xs text-gray-400 font-mono m-0 truncate">
            ID: {claim.claimId}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <ClaimStatusTag status={claim.status} />
          
          <span className="text-xs text-gray-400">{claim.createdDate}</span>
        </div>
      </div>
    );
  }

  // Grid (สำหรับหน้า List แบบการ์ดใหญ่)
  return (
    <div
      onClick={() => navigate(`/staff/update-claim/${claim.claimId}`)}
      style={{
        boxSizing: "border-box",
        padding: "20px",
        overflow: "hidden",
      }}
      className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-500 transition-all cursor-pointer flex flex-col justify-between gap-5 w-full relative group"
    >
      {/* Header Card */}
      <div className="flex justify-between items-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <CodeSandboxOutlined className="text-xl" />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ClaimStatusTag status={claim.status} />

          {onDelete &&
            (isDisableDelete ? (
              !hideDeleteWhenDisabled && (
                <button
                  disabled
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg text-gray-300 opacity-40 bg-transparent border-0 cursor-not-allowed"
                  title="ไม่สามารถลบรายการในสถานะนี้ได้"
                >
                  <DeleteOutlined className="text-base" />
                </button>
              )
            ) : (
              <Popconfirm
                title="ยืนยันการลบรายการ"
                description="คุณต้องการลบรายการเคลมนี้ใช่หรือไม่?"
                onConfirm={(e) => onDelete(e, claim.claimId)}
                onCancel={(e) => e.stopPropagation()}
                okText="ลบ"
                cancelText="ยกเลิก"
                okButtonProps={{ danger: true }}
              >
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors border-0 bg-transparent cursor-pointer"
                  title="ลบรายการ"
                >
                  <DeleteOutlined className="text-base" />
                </button>
              </Popconfirm>
            ))}
        </div>
      </div>

      {/* Body Card */}
      <div className="flex flex-col gap-1.5 min-w-0">
        <h3 className="font-bold text-lg text-slate-800 m-0 truncate">
          {claim.productName}
        </h3>
        <div className="flex justify-between items-center text-xs text-gray-400 font-mono flex-wrap gap-1">
          <span className="truncate">ID: {claim.claimId}</span>
          <span className="shrink-0">{claim.createdDate}</span>
        </div>
      </div>

      {/* Footer Card */}
      <div
        className="pt-3 border-t border-gray-100 flex justify-between items-center gap-2"
        style={{ marginTop: "4px" }}
      >
        <span className="font-bold text-slate-700 text-sm shrink-0">
          จำนวน: {claim.qty} ขวด
        </span>
        <div className="flex items-center gap-1 text-emerald-600 font-semibold text-sm shrink-0">
          <span>ดูรายละเอียด</span>
          <RightOutlined style={{ fontSize: "11px" }} />
        </div>
      </div>
    </div>
  );
};

export default ClaimCard;
