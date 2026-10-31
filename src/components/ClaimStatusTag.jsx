// src/components/ClaimStatusTag.jsx

import React from "react";
import { Tag } from "antd";
import { getStatusName, getStatusColor } from "../constants/claimStatus";

const ClaimStatusTag = ({ status, role = "default", style, className = "" }) => {
  return (
    <Tag 
      color={getStatusColor(status)} 
      style={{ margin: 0, padding: "1px 10px", fontSize: "12px", lineHeight: "20px", ...style }} 
      className={`border-0 font-normal rounded-full text-xs ${className}`}
    >
      {getStatusName(status, role)}
    </Tag>
  );
};

export default ClaimStatusTag;