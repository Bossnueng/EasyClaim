import {SafetyCertificateFilled} from "@ant-design/icons"


import React from 'react'

const Logo = () => {
  return (
    <div className="logo p-4">
            <div className="logo-icon flex items-center gap-3">
                <SafetyCertificateFilled className="text-4xl text-blue-500 flex-shrink-0"  />
                <h2 className="text-xl font-bold text-white whitespace-nowrap">
                    Easy Claim
                </h2>
            </div>
        </div>
  );
};

export default Logo;
