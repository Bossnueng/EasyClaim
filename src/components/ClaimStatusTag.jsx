// src/components/ClaimStatusTag.jsx

import React from "react";
import { Tag } from "antd";
import { getStatusName, getStatusColor } from "../constants/claimStatus";

const ClaimStatusTag = ({ status, role = "default", style, className = "" }) => {
  return (
    <Tag 
      color={getStatusColor(status)} 
      style={{ margin: 0, padding: "0px 6px", fontSize: "10px", lineHeight: "18px", ...style }} 
      className={`border-0 font-normal rounded-md text-[10px] ${className}`}
    >
      {getStatusName(status, role)}
    </Tag>
  );
};

export default ClaimStatusTag;