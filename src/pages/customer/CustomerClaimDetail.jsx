import React, { useState } from "react";
import {
  Card,
  Tag,
  Descriptions,
  Button,
  Steps,
  Image,
  ConfigProvider,
  Alert,
  Popconfirm,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  FileSearchOutlined,
  CloseCircleOutlined,
  MessageOutlined,
  ArrowLeftOutlined,
  CarOutlined,
  SmileOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";

const CustomerClaimDetail = () => {
  const navigate = useNavigate();
  const { claimId } = useParams();
  //const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const claims = JSON.parse(localStorage.getItem("claims")) || [];
  const data = claims.find((item) => item.claimId === claimId) || {};

  const isRejected =
    data.status === "ไม่มีสิทธิ์เคลม" ||
    data.status === "ไม่อนุมัติเคลมสินค้า" ||
    data.status === "Rejected" ||
    data.status === "ปฏิเสธ";

  const getCustomerStepInfo = (status) => {
    if (isRejected) return { step: 2, text: status };
    switch (status) {
      case "สร้างรายการเคลม": return { step: 0, text: "ยื่นคำร้องแล้ว" };
      case "รอการพิจารณา":
      case "มีสิทธิ์เคลม":
      case "รับสินค้าจริงแล้ว": return { step: 1, text: "อยู่ระหว่างพิจารณาและรับสินค้า" };
      case "อนุมัติเคลมสินค้า":
      case "กำลังดำเนินการเปลี่ยนสินค้า":
      case "กำลังจัดส่งสินค้าเคลม": return { step: 2, text: "กำลังจัดส่งสินค้าเคลม" };
      case "จัดส่งสินค้าเคลมสำเร็จ": return { step: 3, text: "จัดส่งสินค้าสำเร็จ" };
      default: return { step: 0, text: status || "อยู่ระหว่างดำเนินการ" };
    }
  };

  const currentStep = getCustomerStepInfo(data.status).step;

  const getStatusTag = (status) => {
    if (isRejected) return <Tag color="error" style={{ margin: 0 }}>{status}</Tag>;
    switch (status) {
      case "จัดส่งสินค้าเคลมสำเร็จ": return <Tag color="success" style={{ margin: 0 }}>จัดส่งสำเร็จ</Tag>;
      case "กำลังจัดส่งสินค้าเคลม":
      case "กำลังดำเนินการเปลี่ยนสินค้า": return <Tag color="warning" style={{ margin: 0 }}>กำลังจัดส่งสินค้าเคลม</Tag>;
      default: return <Tag color="processing" style={{ margin: 0 }}>{getCustomerStepInfo(status).text}</Tag>;
    }
  };

  const handleConfirmDelivery = () => {
    const nowTimestamp = dayjs().format("DD/MM/YYYY HH:mm");
    const updatedClaims = claims.map((item) => {
      if (item.claimId === claimId) {
        return {
          ...item,
          status: "จัดส่งสินค้าเคลมสำเร็จ",
          statusTimestamps: {
            ...(item.statusTimestamps || {}),
            จัดส่งสินค้าเคลมสำเร็จ: nowTimestamp,
          },
          updateAt: nowTimestamp,
        };
      }
      return item;
    });

    localStorage.setItem("claims", JSON.stringify(updatedClaims));
    message.success("ยืนยันรับสินค้าเคลมเรียบร้อยแล้ว");
    window.location.reload();
  };

  const getStepItems = () => {
    if (isRejected) {
      return [
        { title: "ยื่นคำร้อง", description: data.statusTimestamps?.["สร้างรายการเคลม"] || data.createdDate || "-", icon: <CheckCircleOutlined /> },
        { title: "อยู่ระหว่างพิจารณา", description: "ตรวจสอบเรียบร้อย", icon: <FileSearchOutlined /> },
        { title: "ไม่อนุมัติการเคลม", description: data.rejectReason || "ไม่อยู่ในเงื่อนไขการรับประกัน", icon: <CloseCircleOutlined /> },
      ];
    }

    return [
      { title: "ยื่นคำร้อง", description: data.statusTimestamps?.["สร้างรายการเคลม"] || data.createdDate || "-", icon: <CheckCircleOutlined /> },
      { title: "พิจารณา / รับสินค้า", description: data.statusTimestamps?.["รับสินค้าจริงแล้ว"] || "ตรวจสอบและรับสินค้าคืน", icon: <FileSearchOutlined /> },
      { title: "กำลังจัดส่งสินค้าเคลม", description: data.statusTimestamps?.["กำลังจัดส่งสินค้าเคลม"] || "อยู่ระหว่างการขนส่ง", icon: <CarOutlined /> },
      { title: "จัดส่งสำเร็จ", description: data.statusTimestamps?.["จัดส่งสินค้าเคลมสำเร็จ"] || "ลูกค้ารับสินค้าแล้ว", icon: <SmileOutlined /> },
    ];
  };

  return (
    <div className="w-full flex flex-col gap-6" style={{ boxSizing: "border-box" }}>
      {/* Header */}
      <Card className="rounded-2xl shadow-sm border-gray-200 w-full" bodyStyle={{ padding: "24px" }}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-slate-800 m-0">รายละเอียดการเคลม</h1>
            <p className="text-sm text-gray-500 m-0">
              Claim ID : <b className="text-slate-800 font-mono">{data.claimId}</b>
            </p>
          </div>
          <div className="shrink-0">{getStatusTag(data.status)}</div>
        </div>

        {/**
         <div>
          
          <Button
            icon={<PrinterOutlined />}
            className="w-full rounded-xl font-semibold h-11"
            onClick={() => setIsPreviewModalOpen(true)}
          >
            ดาวน์โหลด / พิมพ์ใบเคลม
          </Button>

          
          <ClaimPrintModal
            open={isPreviewModalOpen}
            onClose={() => setIsPreviewModalOpen(false)}
            data={data}
          />
        </div>
         */}

      </Card>

      {/* Alert when rejected */}
      {isRejected && (
        <Alert
          message="คำร้องขอเคลมสินค้าถูกปฏิเสธ"
          description={`เหตุผล: ${data.rejectReason || "เนื่องจากสินค้าไม่อยู่ในเงื่อนไขการเคลม"}`}
          type="error"
          showIcon
          className="rounded-2xl border-red-200"
        />
      )}

      {/* Timeline */}
      <Card title={<span className="font-bold text-slate-800">สถานะการดำเนินงาน</span>} className="rounded-2xl shadow-sm border-gray-200 w-full" bodyStyle={{ padding: "24px 20px" }}>
        <ConfigProvider theme={{ token: { colorPrimary: isRejected ? "#ef4444" : "#059669" } }}>
          <div className="w-full py-2">
            <Steps current={currentStep} status={isRejected ? "error" : "process"} responsive items={getStepItems()} />
          </div>
        </ConfigProvider>
      </Card>

      {/* Responsive Grid Details */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full">
        <div className="xl:col-span-2 flex flex-col gap-6 w-full">
          {data.deliveryDriver && (
            <Card title={<span className="font-bold text-slate-800">ข้อมูลการจัดส่งสินค้าเคลม</span>} className="rounded-2xl shadow-sm border-gray-200 w-full" bodyStyle={{ padding: "24px" }}>
              <Descriptions column={1} bordered size="middle" labelStyle={{ fontWeight: "600", color: "#334155", width: "180px", backgroundColor: "#f8fafc" }}>
                <Descriptions.Item label="พนักงานจัดส่ง (พขร.)"><span className="font-semibold text-slate-800">{data.deliveryDriver}</span></Descriptions.Item>
                <Descriptions.Item label="ทะเบียนรถจัดส่ง"><span className="font-mono">{data.deliveryPlate || "-"}</span></Descriptions.Item>
                <Descriptions.Item label="คาดว่าจะส่งถึงวันที่"><span className="font-semibold text-blue-600">{dayjs(data.estimatedDeliveryDate).format("DD/MM/YYYY")}</span></Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          {data.driverName && (
            <Card title={<span className="font-bold text-slate-800">ข้อมูลการรับสินค้าเคลม</span>} className="rounded-2xl shadow-sm border-gray-200 w-full" bodyStyle={{ padding: "24px" }}>
              <Descriptions column={1} bordered size="middle" labelStyle={{ fontWeight: "600", color: "#334155", width: "180px", backgroundColor: "#f8fafc" }}>
                <Descriptions.Item label="พนักงานขับรถ (พขร.)"><span className="font-semibold text-slate-800">{data.driverName}</span></Descriptions.Item>
                <Descriptions.Item label="ทะเบียนรถ"><span className="font-mono">{data.truckPlate || "-"}</span></Descriptions.Item>
                <Descriptions.Item label="เลขที่เอกสารเคลม"><span className="font-mono">{data.claimNo || "-"}</span></Descriptions.Item>
                <Descriptions.Item label="จำนวนที่รับคืนสินค้าแตก"><span className="font-mono">{data.fullReceive || "-"}</span></Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          <Card title={<span className="font-bold text-slate-800">รายละเอียดสินค้าและข้อมูลการแจ้ง</span>} className="rounded-2xl shadow-sm border-gray-200 w-full" bodyStyle={{ padding: "24px" }}>
            <Descriptions column={1} bordered size="middle" labelStyle={{ fontWeight: "600", color: "#334155", width: "180px", backgroundColor: "#f8fafc" }}>
              <Descriptions.Item label="วันที่แจ้ง">{data.createdDate || "-"}</Descriptions.Item>
              <Descriptions.Item label="ผู้แจ้ง">{data.reporter || "-"}</Descriptions.Item>
              <Descriptions.Item label="สินค้า"><span className="font-bold text-slate-800">{data.productName}</span></Descriptions.Item>
              <Descriptions.Item label="Lot Number"><span className="font-mono">{data.lot || "-"}</span></Descriptions.Item>
              <Descriptions.Item label="MFG Number"><span className="font-mono">{data.mfg ? dayjs(data.mfg).format("DD/MM/YYYY") : "-"}</span></Descriptions.Item>
              <Descriptions.Item label="EXP Number"><span className="font-mono">{data.exp ? dayjs(data.exp).format("DD/MM/YYYY") : "-"}</span></Descriptions.Item>
              <Descriptions.Item label="จำนวน"><span className="font-bold text-emerald-700">{data.qty}</span> ขวด/กระป๋อง</Descriptions.Item>
              <Descriptions.Item label="รายละเอียดเพิ่มเติม">{`${data.claimType || ""}: ${data.detail || ""}` || "-"}</Descriptions.Item>
            </Descriptions>
          </Card>
        </div>

        {/* Sidebar Rights */}
        <div className="xl:col-span-1 flex flex-col gap-6 w-full">
          <Card title={<span className="font-bold text-slate-800">รูปภาพหลักฐาน</span>} className="rounded-2xl shadow-sm border-gray-200 w-full" bodyStyle={{ padding: "24px", display: "flex", justifyContent: "center" }}>
            {data.images && data.images.length > 0 ? (
              <Image.PreviewGroup>
                <div className="rounded-xl overflow-hidden border border-gray-200 p-2 bg-gray-50 flex justify-center w-full">
                  <Image width="100%" style={{ maxHeight: "200px", objectFit: "contain" }} className="rounded-lg" src={data.images[0]} />
                  <div className="hidden">{data.images.slice(1).map((img, idx) => <Image key={idx} src={img} />)}</div>
                </div>
              </Image.PreviewGroup>
            ) : data.image ? (
              <Image width="100%" style={{ maxHeight: "200px", objectFit: "contain" }} src={data.image} />
            ) : (
              <div className="text-gray-400 italic py-6 text-center">ไม่มีรูปภาพแนบ</div>
            )}
          </Card>

          <Card title={<span className="font-bold text-slate-800">ประวัติการบันทึกสถานะ</span>} className="rounded-2xl shadow-sm border-gray-200 w-full" bodyStyle={{ padding: "16px 24px" }}>
            <Descriptions column={1} bordered size="small" labelStyle={{ fontWeight: "600", color: "#334155", width: "150px", backgroundColor: "#f8fafc", fontSize: "12px" }}>
              <Descriptions.Item label="อัปเดตล่าสุด ณ เวลา"><span className="font-mono">{data.statusTimestamps?.[data.status] || data.updateAt || "-"}</span></Descriptions.Item>
            </Descriptions>
          </Card>

          <Card className="rounded-2xl shadow-sm border-gray-200 w-full" bodyStyle={{ padding: "20px" }}>
            <div className="flex flex-col gap-3">
              {data.status === "กำลังจัดส่งสินค้าเคลม" && (
                <Popconfirm title="ยืนยันการรับสินค้าเคลม" description="คุณได้รับสินค้าเคลมถูกต้องเรียบร้อยแล้วใช่หรือไม่?" onConfirm={handleConfirmDelivery} okText="ยืนยันรับสินค้า" cancelText="ยกเลิก">
                  <Button type="primary" size="large" icon={<CheckCircleOutlined />} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold shadow-sm border-none h-11">
                    ยืนยันได้รับสินค้าเคลมแล้ว
                  </Button>
                </Popconfirm>
              )}
              <Button type={data.status === "กำลังจัดส่งสินค้าเคลม" ? "default" : "primary"} size="large" icon={<MessageOutlined />} className={`w-full rounded-xl font-semibold shadow-sm h-11 ${data.status === "กำลังจัดส่งสินค้าเคลม" ? "border-emerald-600 text-emerald-700 hover:bg-emerald-50" : "bg-emerald-600 hover:bg-emerald-700 border-none"}`} onClick={() => navigate(`/customer/chat/${data.claimId}`)}>
                สอบถาม/ติดต่อเจ้าหน้าที่
              </Button>
              <Button size="large" icon={<ArrowLeftOutlined />} className="w-full rounded-xl border-gray-300 text-slate-700 font-semibold hover:border-emerald-600 hover:text-emerald-700 h-11" onClick={() => navigate("/customer/list-claim")}>
                กลับหน้ารายการ
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CustomerClaimDetail;