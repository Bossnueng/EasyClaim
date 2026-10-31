import React from "react";
import { Timeline, Tag } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  CarOutlined,
  FileSearchOutlined,
} from "@ant-design/icons";
import { getStatusName, getStatusColor } from "../../constants/claimStatus";
import { formatDateString } from "../../utils/formatters";

const ClaimTimeline = ({ statusLogs = [], usersMap = {} }) => {
  if (!statusLogs || statusLogs.length === 0) {
    return <div className="text-slate-400 text-sm py-4 text-center">ยังไม่มีประวัติการอัปเดตสถานะ</div>;
  }

  const getTimelineIcon = (statusName, isLatest) => {
    switch (statusName) {
      case "Approved":
      case "Delivered":
        return <CheckCircleOutlined className="text-green-500" />;
      case "Rejected":
        return <CloseCircleOutlined className="text-red-500" />;
      case "Shipping":
        // ถ้าเป็น Shipping ให้ใช้ไอคอนรถ หรือถ้าเป็นสถานะล่าสุดค่อยหมุน
        return isLatest ? (
          <SyncOutlined spin className="text-blue-500" />
        ) : (
          <CarOutlined className="text-blue-500" />
        );
      case "Processing":
        return isLatest ? (
          <SyncOutlined spin className="text-blue-500" />
        ) : (
          <FileSearchOutlined className="text-blue-500" />
        );
      default:
        return <ClockCircleOutlined className="text-slate-400" />;
    }
  };

  return (
    <Timeline mode="left" className="mt-4">
      {statusLogs.map((log, index) => {
        const sName = getStatusName(log.status);
        const sColor = getStatusColor(sName);
        const updaterName = usersMap[String(log.update_by || log.user_id)] || `ID: ${log.update_by || log.user_id || "-"}`;
        // [DOC-FIX 2026-10-31] ตัดข้อมูลเทคนิค (| DATA:, | AUTO_AT:) ออกจากข้อความที่แสดง
        const cleanRemark = log.remark ? log.remark.split("| DATA:")[0].split("| AUTO_AT:")[0].trim() : "";
        
        // เช็คว่ารายการนี้เป็น Log ล่าสุดของ Timeline หรือไม่
        const isLatest = index === statusLogs.length - 1;

        return (
          <Timeline.Item
            key={log.log_id || index}
            dot={getTimelineIcon(sName, isLatest)}
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Tag color={sColor} className="rounded-full px-3">
                  {sName}
                </Tag>
                <span className="text-xs text-slate-400 font-mono">
                  {formatDateString(log.update_date || log.created_at)}
                </span>
              </div>
              {cleanRemark && <p className="text-xs text-slate-600 mt-1 mb-0">{cleanRemark}</p>}
              <span className="text-[11px] text-slate-400">ผู้ดำเนินการ: {updaterName}</span>
            </div>
          </Timeline.Item>
        );
      })}
    </Timeline>
  );
};

export default ClaimTimeline;