// src/components/ClaimStatusTag.jsx

import React from "react";
import { Tag } from "antd";
import { getStatusName, getStatusColor } from "../constants/claimStatus";

const ClaimStatusTag = ({ status, role = "default", style, className = "" }) => {
  return (
    <Tag 
      color={getStatusColor(status)} 
      // [UI-FIX 2026-10-31] เดิม padding 0 6px / font 10px อ่านยาก → ขยายระยะข้อความจากขอบและขนาดตัวอักษร
      style={{ margin: 0, padding: "1px 10px", fontSize: "12px", lineHeight: "20px", ...style }} 
      className={`border-0 font-normal rounded-full text-xs ${className}`}
    >
      {getStatusName(status, role)}
    </Tag>
  );
};

export default ClaimStatusTag;