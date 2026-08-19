import React, { useState } from "react";
import {Card,Tag,Descriptions,Button,Steps,Image,ConfigProvider,Select,Input,DatePicker,Modal,message,} from "antd";
import {CheckCircleOutlined,FileSearchOutlined,CloseCircleOutlined,InboxOutlined,CarOutlined,SmileOutlined,SaveOutlined,ArrowLeftOutlined,PrinterOutlined,} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import ClaimPrintModal from "../../components/ClaimPrintModal";
import ClaimStatusTag from "../../components/ClaimStatusTag";
import { STATUS_PRIORITY } from "../../constants/claimStatus";

const isValidStatusTransition = (currentStatus, newStatus) => {
  if (currentStatus === newStatus) return true;
  const currentLevel = STATUS_PRIORITY[currentStatus] || 1;
  const newLevel = STATUS_PRIORITY[newStatus] || 1;

  return newLevel === currentLevel + 1;
};

const StaffClaimUpdate = () => {
  const navigate = useNavigate();
  const { claimId } = useParams();
  const claims = JSON.parse(localStorage.getItem("claims")) || [];
  const data = claims.find((item) => item.claimId === claimId) || {};
  const [status, setStatus] = useState(data?.status || "สร้างรายการเคลม");
  const [rejectReason, setRejectReason] = useState(data?.rejectReason || "");
  const [driverName, setDriverName] = useState(data?.driverName || "");
  const [truckPlate, setTruckPlate] = useState(data?.truckPlate || "");
  const [claimNo, setclaimNo] = useState(data?.claimNo || "");
  const [fullReceive, setfullReceive] = useState(data?.fullReceive || "");
  const [withdrawDate, setWithdrawDate] = useState(
    data?.withdrawDate ? dayjs(data.withdrawDate) : null,
  );
  const [returnedQty, setReturnedQty] = useState(data?.returnedQty || "");
  const [approvedQty, setApprovedQty] = useState(data?.approvedQty || "");
  const [deliveryDriver, setDeliveryDriver] = useState(
    data?.deliveryDriver || "",
  );
  const [deliveryPlate, setDeliveryPlate] = useState(data?.deliveryPlate || "");
    const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState(
    data?.estimatedDeliveryDate ? dayjs(data.estimatedDeliveryDate) : null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const canPrintOrPreview = Boolean(
    data?.driverName || data?.withdrawDate || data?.returnedQty,
  );
  const statusTimestamps = data.statusTimestamps || {
    สร้างรายการเคลม: data.createdDate || dayjs().format("DD/MM/YYYY HH:mm"),
  };
  const isRejected =
    status === "ไม่อนุมัติเคลมสินค้า" || status === "ไม่มีสิทธิ์เคลม";
  const getCurrentStep = () => {
    const level = STATUS_PRIORITY[status];
    return level ? level - 1 : 0;
  };
  const handleSaveStatus = () => {
    const currentStatusInDB = data.status || "สร้างรายการเคลม";
    const nowTimestamp = dayjs().format("DD/MM/YYYY HH:mm");
    if (!isValidStatusTransition(currentStatusInDB, status)) {
      message.error(
        `ไม่สามารถเปลี่ยนจาก "${currentStatusInDB}" ไปเป็น "${status}" ได้ (ต้องดำเนินการตามลำดับขั้นตอน)`,
      );
      return;
    }
    if (isRejected && !rejectReason.trim()) {
      message.error("กรุณาระบุเหตุผลการปฏิเสธการเคลม");
      return;
    }
    if (
      status === "รับสินค้าจริงแล้ว" &&
      (!driverName.trim() || !truckPlate.trim())
    ) {
      message.error("กรุณาระบุชื่อ พขร. และทะเบียนรถผู้ไปรับสินค้า");
      return;
    }
    if (
      status === "กำลังดำเนินการเปลี่ยนสินค้า" &&
      (!withdrawDate ||
        !returnedQty.toString().trim() ||
        !approvedQty.toString().trim())
    ) {
      message.error(
        "กรุณาระบุวันที่เบิกสินค้า จำนวนที่ส่งคืน และจำนวนที่รับรองให้ครบถ้วน",
      );
      return;
    }
    if (
      status === "กำลังจัดส่งสินค้าเคลม" &&
      (!deliveryDriver.trim() ||
        !deliveryPlate.trim() ||
        !estimatedDeliveryDate)
    ) {
      message.error(
        "กรุณาระบุชื่อ พขร., ทะเบียนรถ และวันที่คาดว่าจะส่งถึงลูกค้าให้ครบถ้วน",
      );
      return;
    }

    const updatedClaims = claims.map((item) => {
      if (item.claimId === claimId) {
        const updatedTimestamps = {
          ...(item.statusTimestamps || {
            สร้างรายการเคลม: item.createdDate || nowTimestamp,
          }),
          [status]: nowTimestamp,
        };

        const formattedWithdrawDate = withdrawDate
          ? dayjs.isDayjs(withdrawDate)
            ? withdrawDate.format("YYYY-MM-DD")
            : withdrawDate
          : "";

        const formattedEstDate = estimatedDeliveryDate
          ? dayjs.isDayjs(estimatedDeliveryDate)
            ? estimatedDeliveryDate.format("YYYY-MM-DD")
            : estimatedDeliveryDate
          : "";

        return {
          ...item,
          status: status,
          rejectReason: isRejected ? rejectReason : "",
          driverName:
            status === "รับสินค้าจริงแล้ว" || item.driverName ? driverName : "",
          truckPlate:
            status === "รับสินค้าจริงแล้ว" || item.truckPlate ? truckPlate : "",
          claimNo:
            status === "รับสินค้าจริงแล้ว" || item.claimNo ? claimNo : "",
          fullReceive:
            status === "รับสินค้าจริงแล้ว" || item.fullReceive
              ? fullReceive
              : "",
          withdrawDate:
            status === "กำลังดำเนินการเปลี่ยนสินค้า" || item.withdrawDate
              ? formattedWithdrawDate
              : "",
          returnedQty:
            status === "กำลังดำเนินการเปลี่ยนสินค้า" || item.returnedQty
              ? returnedQty
              : "",
          approvedQty:
            status === "กำลังดำเนินการเปลี่ยนสินค้า" || item.approvedQty
              ? approvedQty
              : "",
          deliveryDriver:
            status === "กำลังจัดส่งสินค้าเคลม" || item.deliveryDriver
              ? deliveryDriver
              : "",
          deliveryPlate:
            status === "กำลังจัดส่งสินค้าเคลม" || item.deliveryPlate
              ? deliveryPlate
              : "",
          estimatedDeliveryDate:
            status === "กำลังจัดส่งสินค้าเคลม" || item.estimatedDeliveryDate
              ? formattedEstDate
              : "",
          statusTimestamps: updatedTimestamps,
          updateAt: nowTimestamp,
        };
      }
      return item;
    });

    localStorage.setItem("claims", JSON.stringify(updatedClaims));
    message.success("อัปเดตสถานะรายการเคลมเรียบร้อยแล้ว");
    setIsModalOpen(false);
  };

  return (
    <div className="w-full flex flex-col gap-6" style={{ boxSizing: "border-box" }}>
      <Card className="rounded-2xl shadow-sm border-gray-200 w-full overflow-hidden" bodyStyle={{ padding: "24px" }}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
          <div className="flex flex-col gap-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 m-0 truncate">จัดการการเคลม</h1>
            <p className="text-sm text-gray-500 m-0 truncate">Claim ID :{" "}
              <b className="text-slate-800 font-mono">{data.claimId}</b>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto justify-start md:justify-end">
            <div className="shrink-0">
              <ClaimStatusTag status={data.status} />
            </div>

            <div>
              {/* ปุ่มกดเปิด Modal */}
              <Button icon={<PrinterOutlined />} onClick={() => setIsPreviewModalOpen(true)}>
                พิมพ์ / ดาวน์โหลดเอกสาร
              </Button>

              {/* เรียกใช้งาน Component Modal */}
              <ClaimPrintModal open={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} data={data}/>
            </div>

            <Button
              type="primary"
              icon={<SaveOutlined />}
              className="bg-slate-800 hover:bg-slate-900 rounded-xl font-semibold shrink-0"
              onClick={() => {
                setStatus(data.status);
                setWithdrawDate(
                  data.withdrawDate ? dayjs(data.withdrawDate) : null,
                );
                setEstimatedDeliveryDate(
                  data.estimatedDeliveryDate
                    ? dayjs(data.estimatedDeliveryDate)
                    : null,
                );
                setIsModalOpen(true);
              }}
            >
              อัปเดตสถานะ
            </Button>
          </div>
        </div>
      </Card>

      <Card
        title={<span className="font-bold text-slate-800">มุมมองไทม์ไลน์สถานะ</span>}
        className="rounded-2xl shadow-sm border-gray-200 w-full"
        bodyStyle={{ padding: "24px 20px" }}
      >
        <ConfigProvider theme={{token: { colorPrimary: isRejected ? "#ef4444" : "#059669" },}}>
          <Steps current={getCurrentStep()} status={isRejected ? "error" : "process"} responsive
          items={
          isRejected ? [
                    {
                      title: "สร้างรายการเคลม",
                      description: statusTimestamps["สร้างรายการเคลม"] || "-",
                      icon: <FileSearchOutlined />,
                    },
                    {
                      title: "รอการพิจารณา",
                      description: statusTimestamps["รอการพิจารณา"] || "-",
                      icon: <FileSearchOutlined />,
                    },
                    {
                      title: status === "ไม่มีสิทธิ์เคลม"? "ไม่มีสิทธิ์เคลม" : "ไม่อนุมัติเคลมสินค้า",
                      description: (
                      <div className="text-xs">
                        <div>{statusTimestamps[status] || "-"}</div>
                        {rejectReason && ( <div className="text-red-500 font-semibold">{rejectReason}</div>)}
                      </div>),
                      icon: <CloseCircleOutlined />,
                    },
                  ]
                : [
                    {
                      title: "สร้างรายการ",
                      description: statusTimestamps["สร้างรายการเคลม"] || "-",
                      icon: <CheckCircleOutlined />,
                    },
                    {
                      title: "รอการพิจารณา",
                      description: statusTimestamps["รอการพิจารณา"] || "-",
                      icon: <FileSearchOutlined />,
                    },
                    {
                      title: "มีสิทธิ์เคลม",
                      description: statusTimestamps["มีสิทธิ์เคลม"] || "-",
                      icon: <CheckCircleOutlined />,
                    },
                    {
                      title: "รับสินค้าแล้ว",
                      description: statusTimestamps["รับสินค้าจริงแล้ว"] || "-",
                      icon: <InboxOutlined />,
                    },
                    {
                      title: "อนุมัติเคลม",
                      description: statusTimestamps["อนุมัติเคลมสินค้า"] || "-",
                      icon: <CheckCircleOutlined />,
                    },
                    {
                      title: "กำลังเปลี่ยนสินค้า",
                      description:statusTimestamps["กำลังดำเนินการเปลี่ยนสินค้า"] || "-",
                      icon: <FileSearchOutlined />,
                    },
                    {
                      title: "กำลังจัดส่ง",
                      description:statusTimestamps["กำลังจัดส่งสินค้าเคลม"] || "-",
                      icon: <CarOutlined />,
                    },
                    {
                      title: "จัดส่งสำเร็จ",
                      description:statusTimestamps["จัดส่งสินค้าเคลมสำเร็จ"] || "-",
                      icon: <SmileOutlined />,
                    },
                  ]
            }
          />
        </ConfigProvider>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full">
        <div className="xl:col-span-2 flex flex-col gap-6 w-full">
          <Card
            title={<span className="font-bold text-slate-800">ข้อมูลสินค้า และรายละเอียดคำร้องขอเคลม</span>}
            className="rounded-2xl shadow-sm border-gray-200 w-full"
            bodyStyle={{ padding: "24px" }}
          >
            <Descriptions column={1} bordered size="middle" labelStyle={{fontWeight: "600", color: "#334155", width: "180px", backgroundColor: "#f8fafc",}}>
              <Descriptions.Item label="วันที่แจ้ง">{data.createdDate || "-"}</Descriptions.Item>
              <Descriptions.Item label="ผู้แจ้ง">{data.reporter || "-"}</Descriptions.Item>
              <Descriptions.Item label="สินค้า"><span className="font-bold text-slate-800">{data.productName}</span>\</Descriptions.Item>
              <Descriptions.Item label="Lot Number"><span className="font-mono">{data.lot || "-"}</span></Descriptions.Item>
              <Descriptions.Item label="MFG Number"><span className="font-mono">{data.mfg ? dayjs(data.mfg).format("DD/MM/YYYY") : "-"}</span></Descriptions.Item>
              <Descriptions.Item label="EXP Number"><span className="font-mono">{data.exp ? dayjs(data.exp).format("DD/MM/YYYY") : "-"}</span></Descriptions.Item>
              <Descriptions.Item label="จำนวน"><span className="font-bold text-emerald-700">{data.qty}</span>{" "}ขวด/กระป๋อง</Descriptions.Item>
              <Descriptions.Item label="รายละเอียดเพิ่มเติม">{`${data.claimType || ""}: ${data.detail || ""}` || "-"}</Descriptions.Item>
            </Descriptions>
          </Card>

          {data.driverName && (
            <Card
              title={<span className="font-bold text-slate-800">ข้อมูลการรับสินค้าเคลม</span>}
              className="rounded-2xl shadow-sm border-gray-200 w-full"
              bodyStyle={{ padding: "24px" }}
            >
              <Descriptions column={1} bordered size="middle" labelStyle={{ fontWeight: "600",color: "#334155",width: "180px",backgroundColor: "#f8fafc",}}>
                <Descriptions.Item label="พนักงานขับรถ (พขร.)">
                  <span className="font-semibold text-slate-800">{data.driverName}</span>
                </Descriptions.Item>
                <Descriptions.Item label="ทะเบียนรถ">
                  <span className="font-mono">{data.truckPlate || "-"}</span>
                </Descriptions.Item>
                <Descriptions.Item label="เลขที่เอกสารเคลม">
                  <span className="font-mono">{data.claimNo || "-"}</span>
                </Descriptions.Item>
                <Descriptions.Item label="จำนวนที่รับคืนสินค้าแตก">
                  <span className="font-mono">{data.fullReceive || "-"}</span>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          {data.withdrawDate && (
            <Card
              title={<span className="font-bold text-slate-800">ข้อมูลการเบิกเปลี่ยนสินค้า</span>}
              className="rounded-2xl shadow-sm border-gray-200 w-full"
              bodyStyle={{ padding: "24px" }}
            >
              <Descriptions column={1} bordered size="middle" labelStyle={{fontWeight: "600",color: "#334155",width: "180px",backgroundColor: "#f8fafc",}}>
                <Descriptions.Item label="วันที่เบิกสินค้าจากคลัง">
                  <span className="font-mono">{dayjs(data.withdrawDate).format("DD/MM/YYYY")}</span>
                </Descriptions.Item>
                <Descriptions.Item label="จำนวนที่ส่งสินค้าคืน">
                  <span className="font-bold text-slate-800">{data.returnedQty}</span>{" "}ขวด/กระป๋อง
                </Descriptions.Item>
                <Descriptions.Item label="จำนวนแตกที่รับรองการเปลี่ยน">
                  <span className="font-bold text-emerald-700">{data.approvedQty}</span>{" "}ขวด/กระป๋อง
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          {data.deliveryDriver && (
            <Card
              title={<span className="font-bold text-slate-800">ข้อมูลการจัดส่งสินค้าเคลม</span>}
              className="rounded-2xl shadow-sm border-gray-200 w-full"
              bodyStyle={{ padding: "24px" }}
            >
              <Descriptions column={1} bordered size="middle" labelStyle={{fontWeight: "600",color: "#334155",width: "180px",backgroundColor: "#f8fafc",}}>
                <Descriptions.Item label="พนักงานขับรถจัดส่งสินค้าเคลม">
                  <span className="font-semibold text-slate-800">{data.deliveryDriver}</span>
                </Descriptions.Item>
                <Descriptions.Item label="ทะเบียนรถจัดส่ง">
                  <span className="font-mono">{data.deliveryPlate || "-"}</span>
                </Descriptions.Item>
                <Descriptions.Item label="วันที่คาดว่าจะส่งถึงลูกค้า">
                  <span className="font-semibold text-blue-600">{dayjs(data.estimatedDeliveryDate).format("DD/MM/YYYY")}</span>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}
        </div>

        {/* Sidebar Rights */}
        <div className="xl:col-span-1 flex flex-col gap-6 w-full">
          <Card
            title={<span className="font-bold text-slate-800">รูปภาพหลักฐานจากลูกค้า</span>}
            className="rounded-2xl shadow-sm border-gray-200 w-full"
            bodyStyle={{ padding: "24px" }}
          >
            {data.images && data.images.length > 0 ? (
              <Image.PreviewGroup>
                <div className="grid grid-cols-2 gap-2">
                  {data.images.map((imgSrc, index) => (
                    <Image key={index}
                      width="100%"
                      height={100}
                      style={{ objectFit: "cover" }}
                      className="rounded-lg border border-gray-200"
                      src={imgSrc}/>
                  ))}
                </div>
              </Image.PreviewGroup>
            ) : data.image ? (
              <Image width="100%" src={data.image} />
            ) : (
              <div className="text-gray-400 italic py-6 text-center">
                ไม่มีรูปภาพแนบ
              </div>
            )}
          </Card>

          <Card
            title={<span className="font-bold text-slate-800">ประวัติการบันทึกสถานะ</span>}
            className="rounded-2xl shadow-sm border-gray-200 w-full"
            bodyStyle={{ padding: "16px 24px" }}
          >
            <Descriptions column={1} bordered size="small" labelStyle={{ fontWeight: "600", color: "#334155", width: "150px", backgroundColor: "#f8fafc",fontSize: "12px",}}>
              <Descriptions.Item label="อัปเดตล่าสุด ณ เวลา">
                <span className="font-mono">{data.statusTimestamps?.[data.status] || data.updateAt || "-"}</span>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card className="rounded-2xl shadow-sm border-gray-200 w-full" bodyStyle={{ padding: "20px" }}>
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

      {/* Modal Status Update */}
      <Modal
        title={<span className="font-bold text-slate-800">อัปเดตสถานะการเคลมสินค้า</span>}
        open={isModalOpen}
        onOk={handleSaveStatus}
        onCancel={() => setIsModalOpen(false)}
        okText="บันทึกเปลี่ยนสถานะ"
        cancelText="ยกเลิก"
        okButtonProps={{
          className: "bg-emerald-600 hover:bg-emerald-700 font-semibold",
        }}
      >
        <div className="flex flex-col gap-4 py-3">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">เลือกสถานะใหม่:</label>
            <Select className="w-full"
              value={status}
              onChange={(val) => setStatus(val)}
              options={[
                {
                  value: "สร้างรายการเคลม",label: "ขั้นที่ 1: สร้างรายการเคลม",
                },
                { value: "รอการพิจารณา", label: "ขั้นที่ 2: รอการพิจารณา" },
                { value: "มีสิทธิ์เคลม", label: "ขั้นที่ 3: มีสิทธิ์เคลม" },
                {
                  value: "ไม่มีสิทธิ์เคลม",label: "ขั้นที่ 3: ไม่มีสิทธิ์เคลม (สิ้นสุด)",
                },
                {
                  value: "รับสินค้าจริงแล้ว",label: "ขั้นที่ 4: รับสินค้าจริงแล้ว",
                },
                {
                  value: "อนุมัติเคลมสินค้า",label: "ขั้นที่ 5: อนุมัติเคลมสินค้า",
                },
                {
                  value: "ไม่อนุมัติเคลมสินค้า",label: "ขั้นที่ 5: ไม่อนุมัติเคลมสินค้า (สิ้นสุด)",
                },
                {
                  value: "กำลังดำเนินการเปลี่ยนสินค้า",label: "ขั้นที่ 6: กำลังดำเนินการเปลี่ยนสินค้า",
                },
                {
                  value: "กำลังจัดส่งสินค้าเคลม",label: "ขั้นที่ 7: กำลังจัดส่งสินค้าเคลม",
                },
                {
                  value: "จัดส่งสินค้าเคลมสำเร็จ",label: "ขั้นที่ 8: จัดส่งสินค้าเคลมสำเร็จ",
                },
              ].map((opt) => ({ ...opt, disabled: !isValidStatusTransition(data.status || "สร้างรายการเคลม",opt.value,),}))}
            />
          </div>

          {status === "รับสินค้าจริงแล้ว" && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-3">
              <span className="text-sm font-bold text-slate-800">ข้อมูลที่เข้ารับสินค้า</span>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อ-นามสกุล พขร.:</label>
                <Input placeholder="เช่น นายสมชาย ใจดี"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">ทะเบียนรถ:</label>
                <Input placeholder="เช่น 70-1234 กทม."
                  value={truckPlate}
                  onChange={(e) => setTruckPlate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">เลขที่เอกสารเคลม (เล่ม-เลขที่):</label>
                <Input placeholder="เช่น 055-02742"
                  value={claimNo}
                  onChange={(e) => setclaimNo(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">จำนวนที่รับคืนสินค้าแตก(ขวด/กระป๋อง):</label>
                <Input placeholder="เช่น 48"
                  value={fullReceive}
                  onChange={(e) => setfullReceive(e.target.value)}
                />
              </div>
            </div>
          )}

          {status === "กำลังดำเนินการเปลี่ยนสินค้า" && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-3">
              <span className="text-sm font-bold text-slate-800">ข้อมูลการเบิกและรับรองเปลี่ยนสินค้า</span>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">วันที่เบิกสินค้าจากคลัง:</label>
                <DatePicker className="w-full"
                  format="DD/MM/YYYY"
                  placeholder="เลือกวันที่เบิกสินค้า"
                  value={
                    withdrawDate
                      ? dayjs.isDayjs(withdrawDate)
                        ? withdrawDate
                        : dayjs(withdrawDate)
                      : null
                  }
                  onChange={(date) => setWithdrawDate(date)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">จำนวนที่ส่งสินค้าคืน (ขวด/กระป๋อง):</label>
                <Input type="number"
                  placeholder="เช่น 48"
                  value={returnedQty}
                  onChange={(e) => setReturnedQty(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">จำนวนแตกที่เจ้าหน้าที่คลังรับรองการเปลี่ยน (ขวด/กระป๋อง):</label>
                <Input type="number"
                  placeholder="เช่น 48"
                  value={approvedQty}
                  onChange={(e) => setApprovedQty(e.target.value)}
                />
              </div>
            </div>
          )}

          {status === "กำลังจัดส่งสินค้าเคลม" && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-3">
              <span className="text-sm font-bold text-slate-800">ข้อมูลการจัดส่งสินค้าเคลม</span>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อ-นามสกุล พขร. ผู้จัดส่ง:</label>
                <Input placeholder="เช่น นายสมศักดิ์ ขยันส่ง"
                  value={deliveryDriver}
                  onChange={(e) => setDeliveryDriver(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">ทะเบียนรถจัดส่ง:</label>
                <Input placeholder="เช่น 80-9999 กทม."
                  value={deliveryPlate}
                  onChange={(e) => setDeliveryPlate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">วันที่คาดว่าจะส่งถึงลูกค้า:</label>
                <DatePicker className="w-full"
                  format="DD/MM/YYYY"
                  placeholder="เลือกวันที่คาดว่าจะถึง"
                  value={
                    estimatedDeliveryDate
                      ? dayjs.isDayjs(estimatedDeliveryDate)
                        ? estimatedDeliveryDate
                        : dayjs(estimatedDeliveryDate)
                      : null
                  }
                  onChange={(date) => setEstimatedDeliveryDate(date)}
                />
              </div>
            </div>
          )}

          {isRejected && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">ระบุเหตุผลการปฏิเสธการเคลม:</label>
              <Input.TextArea rows={3}
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
