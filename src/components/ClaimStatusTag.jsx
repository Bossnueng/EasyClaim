import React from "react";
import { Tag } from "antd";
import { getStatusName, getStatusColor } from "../constants/claimStatus";

const ClaimStatusTag = ({ status, role = "default", style, className = "" }) => {
  return (
    <Tag 
      color={getStatusColor(status)} 
      style={{ margin: 0, ...style }} 
      className={className}
    >
      {getStatusName(status, role)}
    </Tag>
  );
};

export default ClaimStatusTag;