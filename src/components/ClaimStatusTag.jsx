import React from "react";
import { Tag } from "antd";
import { getStatusName, getStatusColor } from "../constants/claimStatus";

const ClaimStatusTag = ({ status, style }) => {
  // ดึงชื่อภาษาไทยและสีจาก Constant กลางโดยใช้ status_id
  const displayName = getStatusName(status);
  const color = getStatusColor(status);

  return (
    <Tag color={color} style={{ margin: 0, ...style }}>
      {displayName}
    </Tag>
  );
};

export default ClaimStatusTag;