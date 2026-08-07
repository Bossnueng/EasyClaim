import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Tag, Button } from "antd";
import {
  PlusCircleOutlined,
  InboxOutlined,
  RightOutlined,
} from "@ant-design/icons";

const Home = () => {
  const navigate = useNavigate();
  const [latestClaims, setLatestClaims] = useState([]);

  useEffect(() => {
    // ดึงข้อมูลรายการเคลมจาก localStorage
    const savedClaims = JSON.parse(localStorage.getItem("claims")) || [];
    // ดึงเฉพาะ 3 รายการล่าสุด
    setLatestClaims(savedClaims.slice(0, 3));
  }, []);

  // กำหนดสี Tag ให้ตรงกับ Ant Design Theme
  const getStatusTag = (status) => {
    switch (status) {
      case "รอการตรวจสอบ":
      case "Processing":
        return <Tag color="processing">Processing</Tag>;
      case "อนุมัติ":
      case "Approved":
        return <Tag color="success">Approved</Tag>;
      case "ปฏิเสธ":
      case "Rejected":
        return <Tag color="error">Rejected</Tag>;
      default:
        return <Tag color="blue">{status || "Processing"}</Tag>;
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen flex flex-col gap-6">
      {/* 1. Header Greeting */}
      <div>
        <h1 className="text-3xl font-bold mb-1 text-slate-800">
          สวัสดี, คุณสมชาย
        </h1>
        <p className="text-gray-500 text-sm">
          วันนี้คุณต้องการความช่วยเหลือเกี่ยวกับรายการไหนบ้าง?
        </p>
      </div>

      {/* 2. Banner แจ้งเคลมใหม่ (แก้กล่องล้นเรียบร้อย) */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 md:p-8 rounded-2xl shadow-sm text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-white">
            แจ้งเคลมสินค้าใหม่ได้ทันที
          </h3>
          <p className="text-sm opacity-90 text-emerald-50">
            ใช้เวลาเพียงไม่กี่นาที เพื่อเริ่มต้นกระบวนการเคลมสินค้าของคุณ
          </p>
        </div>
        <Button
          type="default"
          size="large"
          icon={<PlusCircleOutlined />}
          onClick={() => navigate("/claim/new")}
          className="bg-white text-emerald-800 font-bold border-none hover:bg-emerald-50 rounded-full flex items-center shadow-sm shrink-0"
        >
          แจ้งเคลมสินค้าใหม่
        </Button>
      </div>

      {/* 3. รายการเคลมล่าสุด */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800">รายการเคลมล่าสุด</h2>
          <Button
            type="link"
            onClick={() => navigate("/history")}
            className="text-emerald-700 font-semibold p-0 flex items-center gap-1 hover:text-emerald-800"
          >
            ดูทั้งหมด <RightOutlined style={{ fontSize: "12px" }} />
          </Button>
        </div>

        {/* Card List ธีมเดียวกับ ClaimList */}
        {latestClaims.length > 0 ? (
          <div className="flex flex-col gap-3">
            {latestClaims.map((claim) => (
              <Card
                key={claim.claimId}
                hoverable
                onClick={() => navigate(`/claim/summary/${claim.claimId}`)}
                className="rounded-xl shadow-sm border-gray-200"
                bodyStyle={{ padding: "16px 20px" }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-base text-slate-800 mb-1">
                      {claim.productName}
                    </h4>
                    <p className="text-xs text-gray-400 font-mono">
                      ID: {claim.claimId}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {getStatusTag(claim.status)}
                    <span className="text-xs text-gray-400">
                      {claim.createdDate}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          /* Empty State กรณีไม่มีข้อมูล */
          <Card className="rounded-xl text-center py-8 text-gray-400 border-dashed border-gray-300">
            <InboxOutlined className="text-4xl text-gray-300 mb-2" />
            <p className="m-0 text-sm">ยังไม่มีรายการเคลมสินค้า</p>
          </Card>
        )}
      </section>
    </div>
  );
};

export default Home;