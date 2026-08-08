import React from "react";
import {
  Card,
  Tag,
  Descriptions,
  Button,
  Steps,
  Image,
  ConfigProvider,
  Alert,
} from "antd";
import {
  CheckCircleOutlined,
  FileSearchOutlined,
  CloseCircleOutlined,
  MessageOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";


const CustomerClaimDetail = () => {
  const navigate = useNavigate();
  const { claimId } = useParams();

  const claims = JSON.parse(localStorage.getItem("claims")) || [];
  const data = claims.find((item) => item.claimId === claimId);

  if (!data) {
    return (
      <div className="w-full flex justify-center items-center py-12">
        <Card className="w-full max-w-md text-center rounded-2xl shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-4">
            ไม่พบข้อมูลการเคลม
          </h2>
          <Button
            type="primary"
            className="bg-emerald-600 hover:bg-emerald-700 rounded-lg px-6"
            onClick={() => navigate("/customer/list-claim")}
          >
            กลับหน้ารายการ
          </Button>
        </Card>
      </div>
    );
  }

  // สมมติสถานะเป็น 'ไม่อนุมัติ' หรือ 'Rejected'
  const isRejected = data.status === "ปฏิเสธ" || data.status === "Rejected" || data.status === "ไม่อนุมัติ";

  // กำหนด Step ปัจจุบัน
  // ถ้า Rejected ให้หยุดที่ Step index 2 (ขั้นตอนพิจารณา)
  const currentStep = isRejected ? 2 : 1; 

  const getStatusTag = (status) => {
    switch (status) {
      case "อนุมัติแล้ว":
      case "Approved":
        return <Tag color="success" style={{ margin: 0 }}>อนุมัติแล้ว</Tag>;
      case "รอการตรวจสอบ":
      case "Processing":
        return <Tag color="processing" style={{ margin: 0 }}>อยู่ระหว่างตรวจสอบ</Tag>;
      case "ปฏิเสธ":
      case "ไม่อนุมัติ":
      case "Rejected":
        return <Tag color="error" style={{ margin: 0 }}>ไม่อนุมัติการเคลม</Tag>;
      default:
        return <Tag color="processing" style={{ margin: 0 }}>{status || "อยู่ระหว่างตรวจสอบ"}</Tag>;
    }
  };

  // กำหนดรายการ Steps Dynamic ตามสถานะ
  const getStepItems = () => {
    if (isRejected) {
      return [
        {
          title: "รับเรื่องแล้ว",
          description: "07 Aug 2026 09:30",
          icon: <CheckCircleOutlined />,
        },
        {
          title: "อยู่ระหว่างตรวจสอบ",
          description: "ตรวจสอบเรียบร้อย",
          icon: <FileSearchOutlined />,
        },
        {
          title: "ไม่อนุมัติการเคลม",
          description: data.rejectReason || "ไม่อยู่ในเงื่อนไขการรับประกัน",
          icon: <CloseCircleOutlined />,
        },
      ];
    }

    return [
      {
        title: "รับเรื่องแล้ว",
        description: "07 Aug 2026 09:30",
        icon: <CheckCircleOutlined />,
      },
      {
        title: "อยู่ระหว่างตรวจสอบ",
        description: "กำลังตรวจสอบสินค้า",
        icon: <FileSearchOutlined />,
      },
      {
        title: "อนุมัติการเคลม",
      },
      {
        title: "จัดส่งสินค้าใหม่",
      },
      {
        title: "เสร็จสิ้น",
      },
    ];
  };

  return (
    <div className="w-full flex flex-col gap-6" style={{ boxSizing: "border-box" }}>
      
      {/* 1. Header Card */}
      <Card 
        className="rounded-2xl shadow-sm border-gray-200 w-full"
        bodyStyle={{ padding: "24px" }}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-slate-800 m-0">
              รายละเอียดการเคลม (Claim Detail)
            </h1>
            <p className="text-sm text-gray-500 m-0">
              Claim ID : <b className="text-slate-800 font-mono">{data.claimId}</b>
            </p>
          </div>
          <div className="shrink-0">{getStatusTag(data.status)}</div>
        </div>
      </Card>

      {/* เพิ่ม Alert แจ้งเหตุผลเพิ่มเติมกรณีไม่อนุมัติ */}
      {isRejected && (
        <Alert
          message="คำร้องขอเคลมสินค้าถูกปฏิเสธ"
          description={`เหตุผล: ${data.rejectReason || "เนื่องจากสินค้าไม่อยู่ในเงื่อนไขการรับประกัน หากมีข้อสงสัยเพิ่มเติมสามารถติดต่อเจ้าหน้าที่ได้ผ่านช่องทางแชท"}`}
          type="error"
          showIcon
          className="rounded-2xl border-red-200"
        />
      )}

      {/* 2. Timeline Status Card */}
      <Card 
        title={<span className="font-bold text-slate-800">สถานะการดำเนินงาน</span>}
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
          <div className="w-full py-2">
            <Steps
              current={currentStep}
              status={isRejected ? "error" : "process"} // กำหนดเป็น error หากไม่อนุมัติ
              responsive
              items={getStepItems()}
            />
          </div>
        </ConfigProvider>
      </Card>

      {/* 3. Section 2 คอลัมน์: รายละเอียดสินค้า + รูปภาพ & ปุ่มจัดการ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        
        <div className="lg:col-span-2">
          <Card 
            title={<span className="font-bold text-slate-800">รายละเอียดสินค้าและข้อมูลการแจ้ง</span>}
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
              <Descriptions.Item label="วันที่แจ้ง">
                {data.createdDate || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="ผู้แจ้ง">
                {data.reporter || "Phonnapha Kaenmueang"}
              </Descriptions.Item>
              <Descriptions.Item label="สินค้า">
                <span className="font-bold text-slate-800">{data.productName}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Lot Number">
                <span className="font-mono">{data.lot || "-"}</span>
              </Descriptions.Item>
              <Descriptions.Item label="จำนวน">
                <span className="font-bold text-emerald-700">{data.qty}</span> ขวด
              </Descriptions.Item>
              <Descriptions.Item label="รายละเอียดเพิ่มเติม">
                {data.detail || "-"}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-1">
          <Card 
            title={<span className="font-bold text-slate-800">รูปภาพหลักฐาน</span>}
            className="rounded-2xl shadow-sm border-gray-200 flex-1"
            bodyStyle={{ padding: "24px", display: "flex", justifyContent: "center", itemsCenter: "center" }}
          >
            {data.image ? (
              <div className="rounded-xl overflow-hidden border border-gray-200 p-2 bg-gray-50 flex justify-center w-full">
                <Image
                  width="100%"
                  style={{ maxHeight: "200px", objectFit: "contain" }}
                  className="rounded-lg"
                  src={data.image}
                  alt="หลักฐานการเคลม"
                />
              </div>
            ) : (
              <div className="text-gray-400 italic py-6 text-center">ไม่มีรูปภาพแนบ</div>
            )}
          </Card>

          <Card 
            className="rounded-2xl shadow-sm border-gray-200"
            bodyStyle={{ padding: "20px" }}
          >
            <div className="flex flex-col gap-3">
              <Button
                type="primary"
                size="large"
                icon={<MessageOutlined />}
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold shadow-sm border-none h-11"
                onClick={() => navigate(`/customer/chat/${data.claimId}`)}
              >
                สอบถาม/ติดต่อเจ้าหน้าที่
              </Button>
              <Button
                size="large"
                icon={<ArrowLeftOutlined />}
                className="w-full rounded-xl border-gray-300 text-slate-700 font-semibold hover:border-emerald-600 hover:text-emerald-700 h-11"
                onClick={() => navigate("/customer/list-claim")}
              >
                กลับหน้ารายการ
              </Button>
            </div>
          </Card>
        </div>

      </div>

    </div>
  );
}

export default CustomerClaimDetail