import React, { useState } from "react";
import {Card,Tag,Descriptions,Button,Steps,Image,ConfigProvider,Select,Input,Modal,message,} from "antd";
import {CheckCircleOutlined,FileSearchOutlined,CloseCircleOutlined,InboxOutlined,CarOutlined,SmileOutlined,SaveOutlined,ArrowLeftOutlined,} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";

const StaffClaimUpdate = () => {
  const navigate = useNavigate();
  const { claimId } = useParams();

  // ดึงข้อมูลรายการเคลมทั้งหมดจาก localStorage
  const claims = JSON.parse(localStorage.getItem("claims")) || [];
  const data = claims.find((item) => item.claimId === claimId);

  // State สำหรับจัดการสถานะและการอัปเดต
  const [status, setStatus] = useState(data?.status || "อยู่ระหว่างตรวจสอบ");
  const [rejectReason, setRejectReason] = useState(data?.rejectReason || "");
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!data) {
    return (
      <div className="w-full flex justify-center items-center py-12">
        <Card className="w-full max-w-md text-center rounded-2xl shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-4">
            ไม่พบข้อมูลรายการเคลมนี้
          </h2>
          <Button
            type="primary"
            className="bg-emerald-600 hover:bg-emerald-700 rounded-lg px-6"
            onClick={() => navigate("/admin/claims")}
          >
            กลับหน้ารายการคลังสินค้า
          </Button>
        </Card>
      </div>
    );
  }

  // คำนวณสถานะปัจจุบันเพื่อแสดงใน Timeline
  const isRejected = status === "ปฏิเสธ" || status === "Rejected" || status === "ไม่อนุมัติ";
  const isApproved = status === "อนุมัติแล้ว" || status === "Approved";
  
  const getCurrentStep = () => {
    if (isRejected) return 2;
    if (isApproved) return 2;
    if (status === "จัดส่งสินค้าใหม่") return 3;
    if (status === "เสร็จสิ้น") return 4;
    return 1; // อยู่ระหว่างตรวจสอบ
  };

  // บันทึกการเปลี่ยนสถานะลง localStorage
  const handleSaveStatus = () => {
    if (isRejected && !rejectReason.trim()) {
      message.error("กรุณาระบุเหตุผลการปฏิเสธการเคลม");
      return;
    }

    const updatedClaims = claims.map((item) => {
      if (item.claimId === claimId) {
        return {
          ...item,
          status: status,
          rejectReason: isRejected ? rejectReason : "",
          updatedAt: new Date().toISOString(),
        };
      }
      return item;
    });

    localStorage.setItem("claims", JSON.stringify(updatedClaims));
    message.success("อัปเดตสถานะรายการเคลมเรียบร้อยแล้ว");
    setIsModalOpen(false);
  };

  const getStatusTag = (currentStatus) => {
    switch (currentStatus) {
      case "อนุมัติแล้ว":
      case "Approved":
        return <Tag color="success" style={{ margin: 0 }}>อนุมัติแล้ว</Tag>;
      case "อยู่ระหว่างตรวจสอบ":
      case "Processing":
        return <Tag color="processing" style={{ margin: 0 }}>อยู่ระหว่างตรวจสอบ</Tag>;
      case "ปฏิเสธ":
      case "ไม่อนุมัติ":
      case "Rejected":
        return <Tag color="error" style={{ margin: 0 }}>ไม่อนุมัติการเคลม</Tag>;
      default:
        return <Tag color="processing" style={{ margin: 0 }}>{currentStatus}</Tag>;
    }
  };

  return (
    <div className="w-full flex flex-col gap-6" style={{ boxSizing: "border-box" }}>
      
      {/* 1. Header Card */}
      <Card className="rounded-2xl shadow-sm border-gray-200 w-full" bodyStyle={{ padding: "24px" }}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-slate-700 text-white text-xs px-2 py-0.5 rounded font-semibold">
                ADMIN / WAREHOUSE
              </span>
              <h1 className="text-2xl font-bold text-slate-800 m-0">
                จัดการรายการเคลม
              </h1>
            </div>
            <p className="text-sm text-gray-500 mt-1 mb-0">
              Claim ID : <b className="text-slate-800 font-mono">{data.claimId}</b>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusTag(status)}
            <Button
              type="primary"
              icon={<SaveOutlined />}
              className="bg-slate-800 hover:bg-slate-900 rounded-xl font-semibold"
              onClick={() => setIsModalOpen(true)}
            >
              อัปเดตสถานะ
            </Button>
          </div>
        </div>
      </Card>

      {/* 2. Timeline Status */}
      <Card 
        title={<span className="font-bold text-slate-800">มุมมองไทม์ไลน์สถานะ</span>}
        className="rounded-2xl shadow-sm border-gray-200 w-full"
        bodyStyle={{ padding: "24px 20px" }}
      >
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: isRejected ? "#ef4444" : "#059669",
            },
          }}
        >
          <Steps
            current={getCurrentStep()}
            status={isRejected ? "error" : "process"}
            responsive
            items={
              isRejected
                ? [
                    { title: "รับเรื่องแล้ว", icon: <CheckCircleOutlined /> },
                    { title: "อยู่ระหว่างตรวจสอบ", icon: <FileSearchOutlined /> },
                    { title: "ไม่อนุมัติการเคลม", description: rejectReason, icon: <CloseCircleOutlined /> },
                  ]
                : [
                    { title: "รับเรื่องแล้ว", icon: <CheckCircleOutlined /> },
                    { title: "อยู่ระหว่างตรวจสอบ", icon: <FileSearchOutlined /> },
                    { title: "อนุมัติการเคลม", icon: <InboxOutlined /> },
                    { title: "จัดส่งสินค้าใหม่", icon: <CarOutlined /> },
                    { title: "เสร็จสิ้น", icon: <SmileOutlined /> },
                  ]
            }
          />
        </ConfigProvider>
      </Card>

      {/* 3. Section 2 คอลัมน์ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        
        {/* รายละเอียดข้อมูลสินค้า */}
        <div className="lg:col-span-2">
          <Card 
            title={<span className="font-bold text-slate-800">ข้อมูลสินค้าและรายละเอียดคำร้อง</span>}
            className="rounded-2xl shadow-sm border-gray-200 h-full"
            bodyStyle={{ padding: "24px" }}
          >
            <Descriptions 
              column={1} 
              bordered 
              size="middle"
              labelStyle={{ 
                fontWeight: "600", 
                color: "#334155", 
                width: "180px",
                backgroundColor: "#f8fafc" 
              }}
            >
              <Descriptions.Item label="วันที่แจ้งเคลม">{data.createdDate || "-"}</Descriptions.Item>
              <Descriptions.Item label="ชื่อลูกค้า / ผู้แจ้ง">{data.reporter || "Phonnapha Kaenmueang"}</Descriptions.Item>
              <Descriptions.Item label="สินค้า">{data.productName}</Descriptions.Item>
              <Descriptions.Item label="Lot Number"><span className="font-mono">{data.lot || "-"}</span></Descriptions.Item>
              <Descriptions.Item label="จำนวน"><span className="font-bold text-emerald-700">{data.qty}</span> ขวด</Descriptions.Item>
              <Descriptions.Item label="อาการเสีย/เหตุผลที่แจ้ง">{data.detail || "-"}</Descriptions.Item>
            </Descriptions>
          </Card>
        </div>

        {/* รูปภาพ + ปุ่มย้อนกลับ */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          <Card 
            title={<span className="font-bold text-slate-800">รูปภาพหลักฐานจากลูกค้า</span>}
            className="rounded-2xl shadow-sm border-gray-200 flex-1"
            bodyStyle={{ padding: "24px", display: "flex", justifyContent: "center", alignItems: "center" }}
          >
            {data.image ? (
              <div className="rounded-xl overflow-hidden border border-gray-200 p-2 bg-gray-50 flex justify-center w-full">
                <Image
                  width="100%"
                  style={{ maxHeight: "200px", objectFit: "contain" }}
                  className="rounded-lg"
                  src={data.image}
                  alt="หลักฐานจากลูกค้า"
                />
              </div>
            ) : (
              <div className="text-gray-400 italic py-6 text-center">ไม่มีรูปภาพแนบ</div>
            )}
          </Card>

          <Card className="rounded-2xl shadow-sm border-gray-200" bodyStyle={{ padding: "20px" }}>
            <Button
              size="large"
              icon={<ArrowLeftOutlined />}
              className="w-full rounded-xl border-gray-300 text-slate-700 font-semibold hover:border-slate-800 h-11"
              onClick={() => navigate("/staff/list-claim")}
            >
              กลับหน้ารายการคลังสินค้า
            </Button>
          </Card>
        </div>

      </div>

      {/* Modal ปรับเปลี่ยนสถานะ */}
      <Modal
        title={<span className="font-bold text-slate-800">อัปเดตสถานะการเคลมสินค้า</span>}
        open={isModalOpen}
        onOk={handleSaveStatus}
        onCancel={() => setIsModalOpen(false)}
        okText="บันทึกเปลี่ยนสถานะ"
        cancelText="ยกเลิก"
        okButtonProps={{ className: "bg-emerald-600 hover:bg-emerald-700 font-semibold" }}
      >
        <div className="flex flex-col gap-4 py-3">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              เลือกสถานะใหม่:
            </label>
            <Select
              className="w-full"
              value={status}
              onChange={(value) => setStatus(value)}
              options={[
                { value: "อยู่ระหว่างตรวจสอบ", label: "อยู่ระหว่างตรวจสอบ" },
                { value: "อนุมัติแล้ว", label: "อนุมัติการเคลม" },
                { value: "จัดส่งสินค้าใหม่", label: "จัดส่งสินค้าใหม่" },
                { value: "เสร็จสิ้น", label: "เสร็จสิ้นขั้นตอน" },
                { value: "ปฏิเสธ", label: "ปฏิเสธ / ไม่อนุมัติการเคลม" },
              ]}
            />
          </div>

          {/* ช่องกรอกเหตุผลกรณีไม่อนุมัติ */}
          {isRejected && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                ระบุเหตุผลการปฏิเสธการเคลม:
              </label>
              <Input.TextArea
                rows={3}
                placeholder="เช่น สินค้าชำรุดนอกเหนือเงื่อนไขการรับประกัน หรือเกินระยะเวลาที่กำหนด"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          )}
        </div>
      </Modal>

    </div>
  );
};

export default StaffClaimUpdate;