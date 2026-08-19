import React from "react";
import { Tag } from "antd";

const STATUS_CONFIG = {
  สร้างรายการเคลม: { color: "default" },
  รอการพิจารณา: { color: "processing" },
  มีสิทธิ์เคลม: { color: "cyan" },
  รับสินค้าจริงแล้ว: { color: "purple" },
  อนุมัติเคลมสินค้า: { color: "success" },
  กำลังดำเนินการเปลี่ยนสินค้า: { color: "blue" },
  กำลังจัดส่งสินค้าเคลม: { color: "warning" },
  จัดส่งสินค้าเคลมสำเร็จ: { color: "green" },
  ไม่มีสิทธิ์เคลม: { color: "error" },
  ไม่อนุมัติเคลมสินค้า: { color: "error" },
};

const ClaimStatusTag = ({ status, style }) => {
  const config = STATUS_CONFIG[status] || { color: "default" };

  return (
    <Tag color={config.color} style={{ margin: 0, ...style }}>
      {status || "-"}
    </Tag>
  );
};

export default ClaimStatusTag;