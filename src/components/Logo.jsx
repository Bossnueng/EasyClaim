import {SafetyCertificateFilled} from "@ant-design/icons"
import LogoIcon from "../assets/logo.svg?react";


import React from 'react'

const Logo = ({ className = "h-9 w-auto" }) => {
  return (
    <div className="flex items-center justify-center shrink-0">
      <LogoIcon className={className} />
    </div>
  );
};

export default Logo;
