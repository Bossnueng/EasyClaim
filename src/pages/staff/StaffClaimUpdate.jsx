import React, { useState, useEffect } from "react";
import {Card,Tag,Descriptions,Button,Steps,Image,ConfigProvider,Select,
  Input,
  DatePicker,
  Modal,
  message,
  Spin,
} from "antd";
import {
  CheckCircleOutlined,
  FileSearchOutlined,
  CloseCircleOutlined,
  InboxOutlined,
  CarOutlined,
  SmileOutlined,
  SaveOutlined,
  ArrowLeftOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import ClaimPrintModal from "../../components/ClaimPrintModal";
import ClaimStatusTag from "../../components/ClaimStatusTag";
import { STATUS_PRIORITY } from "../../constants/claimStatus";
import claimService from "../../services/claimService";
import itemService from "../../services/itemService";

const isValidStatusTransition = (currentStatus, newStatus) => {
  if (currentStatus === newStatus) return true;

  // กรณีปฏิเสธในขั้นที่ 2 (รอการพิจารณา -> ไม่มีสิทธิ์เคลม)
  if (currentStatus === "รอการพิจารณา" && newStatus === "ไม่มีสิทธิ์เคลม") {
    return true;
  }

  // กรณีปฏิเสธในขั้นที่ 4 (รับสินค้าจริงแล้ว -> ไม่อนุมัติเคลมสินค้า)
  if (currentStatus === "รับสินค้าจริงแล้ว" && newStatus === "ไม่อนุมัติเคลมสินค้า") {
    return true;
  }

  // การเปลี่ยนสถานะตามลำดับปกติ (1 -> 2 -> 3 -> ...)
  const currentLevel = STATUS_PRIORITY[currentStatus] || 1;
  const newLevel = STATUS_PRIORITY[newStatus] || 1;

  return newLevel === currentLevel + 1;
};

const StaffClaimUpdate = () => {
  const navigate = useNavigate();
  const { claimId } = useParams();

  // State ข้อมูลจาก API
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [productName, setProductName] = useState("");
  const [statusTimestamps, setStatusTimestamps] = useState({});

  // State สำหรับการอัปเดตฟอร์มใน Modal
  const [status, setStatus] = useState("สร้างรายการเคลม");
  const [rejectReason, setRejectReason] = useState("");
  const [driverName, setDriverName] = useState("");
  const [truckPlate, setTruckPlate] = useState("");
  const [claimNoInput, setClaimNoInput] = useState("");
  const [fullReceive, setFullReceive] = useState("");
  const [withdrawDate, setWithdrawDate] = useState(null);
  const [returnedQty, setReturnedQty] = useState("");
  const [approvedQty, setApprovedQty] = useState("");
  const [deliveryDriver, setDeliveryDriver] = useState("");
  const [deliveryPlate, setDeliveryPlate] = useState("");
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  useEffect(() => {
    fetchClaimDetail();
  }, [claimId]);

  // 🟢 ดึงข้อมูลการเคลม รายการสินค้า และ Status Logs จาก API
  const fetchClaimDetail = async () => {
    setLoading(true);
    try {
      const [resClaim, resItems] = await Promise.all([
        claimService.getClaim(),
        itemService.getItems(),
      ]);

      if (resClaim && resClaim.data) {
        const currentClaim = resClaim.data.find(
          (item) =>
            String(item.claim_id) === String(claimId) || item.claim_no === claimId
        );

        if (currentClaim) {
          setData(currentClaim);
          setStatus(currentClaim.current_status || "สร้างรายการเคลม");
          setRejectReason(currentClaim.reject_reason || "");
          setDriverName(currentClaim.driver_name || "");
          setTruckPlate(currentClaim.truck_plate || "");
          setClaimNoInput(currentClaim.claim_no || "");
          setFullReceive(currentClaim.full_receive || "");
          setWithdrawDate(
            currentClaim.withdraw_date ? dayjs(currentClaim.withdraw_date) : null
          );
          setReturnedQty(currentClaim.returned_qty || "");
          setApprovedQty(currentClaim.approved_qty || "");
          setDeliveryDriver(currentClaim.delivery_driver || "");
          setDeliveryPlate(currentClaim.delivery_plate || "");
          setEstimatedDeliveryDate(
            currentClaim.estimated_delivery_date
              ? dayjs(currentClaim.estimated_delivery_date)
              : null
          );

          // แปลง item_id เป็นชื่อสินค้า
          if (resItems && resItems.data) {
            const foundItem = resItems.data.find(
              (i) => i.item_id === currentClaim.item_id
            );
            setProductName(
              foundItem ? foundItem.item_name : `สินค้า ID: ${currentClaim.item_id}`
            );
          }

          // ดึง Timeline Status Logs
          try {
            const resLogs = await claimService.getClaimStatusLogs(currentClaim.claim_id);
            if (resLogs && resLogs.data) {
              const logsMap = {};
              resLogs.data.forEach((log) => {
                logsMap[log.status_name] = dayjs(log.created_at).format("DD/MM/YYYY HH:mm");
              });
              setStatusTimestamps(logsMap);
            }
          } catch (e) {
            // กรณีไม่มี Logs ให้ fallback ค่าตั้งต้น
            setStatusTimestamps({
              สร้างรายการเคลม: currentClaim.claim_date
                ? dayjs(currentClaim.claim_date).format("DD/MM/YYYY HH:mm")
                : "-",
            });
          }
        } else {
          message.error("ไม่พบข้อมูลรายการเคลมนี้");
        }
      }
    } catch (error) {
      message.error("ไม่สามารถดึงข้อมูลได้: " + (error.message || "เกิดข้อผิดพลาด"));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-64 flex justify-center items-center">
        <Spin size="large" tip="กำลังโหลดข้อมูล..." />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-10 bg-white rounded-2xl m-6">
        <p className="text-gray-500 mb-4">ไม่พบข้อมูลรายการเคลม</p>
        <Button onClick={() => navigate("/staff/list-claim")}>
          กลับหน้ารายการ
        </Button>
      </div>
    );
  }

  const currentStatusInDB = data.current_status || "สร้างรายการเคลม";
  const isRejected =
    status === "ไม่อนุมัติเคลมสินค้า" || status === "ไม่มีสิทธิ์เคลม";

  const getCurrentStep = () => {
    const level = STATUS_PRIORITY[currentStatusInDB];
    return level ? level - 1 : 0;
  };

  // 🟢 บันทึกการอัปเดตสถานะผ่าน API
  const handleSaveStatus = async () => {
    if (!isValidStatusTransition(currentStatusInDB, status)) {
      message.error(
        `ไม่สามารถเปลี่ยนจาก "${currentStatusInDB}" ไปเป็น "${status}" ได้ (ต้องดำเนินการตามลำดับขั้นตอน)`
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
        "กรุณาระบุวันที่เบิกสินค้า จำนวนที่ส่งคืน และจำนวนที่รับรองให้ครบถ้วน"
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
        "กรุณาระบุชื่อ พขร., ทะเบียนรถ และวันที่คาดว่าจะส่งถึงลูกค้าให้ครบถ้วน"
      );
      return;
    }

    try {
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

      // 🟢 1. แยกภาพและฟิลด์ความสัมพันธ์ที่ไม่เกี่ยวข้องออก
      const { images, image, ...cleanData } = data;

      // 🟢 2. ดึงค่า claim_id และแปลงเป็น String ให้ชัวร์
      const targetClaimId = String(cleanData.claim_id || claimId);

      // 🟢 3. ประกอบ Payload อัปเดตข้อมูล
      const updatePayload = {
        ...cleanData,
        claim_id: targetClaimId, // บังคับเป็น String ป้องกัน Validation ล้มเหลว

        // ฟอร์แมตวันที่ให้อยู่ในรูปแบบ Standard YYYY-MM-DD
        claim_date: cleanData.claim_date ? dayjs(cleanData.claim_date).format("YYYY-MM-DD") : null,
        mfg_date: cleanData.mfg_date ? dayjs(cleanData.mfg_date).format("YYYY-MM-DD") : null,
        exp_date: cleanData.exp_date ? dayjs(cleanData.exp_date).format("YYYY-MM-DD") : null,

        current_status: status,
        reject_reason: isRejected ? rejectReason : "",
        driver_name: status === "รับสินค้าจริงแล้ว" || cleanData.driver_name ? driverName : "",
        truck_plate: status === "รับสินค้าจริงแล้ว" || cleanData.truck_plate ? truckPlate : "",
        claim_no: status === "รับสินค้าจริงแล้ว" || cleanData.claim_no ? claimNoInput : cleanData.claim_no,
        full_receive: status === "รับสินค้าจริงแล้ว" || cleanData.full_receive ? fullReceive : "",
        withdraw_date: status === "กำลังดำเนินการเปลี่ยนสินค้า" || cleanData.withdraw_date ? formattedWithdrawDate : "",
        returned_qty: status === "กำลังดำเนินการเปลี่ยนสินค้า" || cleanData.returned_qty ? Number(returnedQty) : cleanData.returned_qty,
        approved_qty: status === "กำลังดำเนินการเปลี่ยนสินค้า" || cleanData.approved_qty ? Number(approvedQty) : cleanData.approved_qty,
        delivery_driver: status === "กำลังจัดส่งสินค้าเคลม" || cleanData.delivery_driver ? deliveryDriver : "",
        delivery_plate: status === "กำลังจัดส่งสินค้าเคลม" || cleanData.delivery_plate ? deliveryPlate : "",
        estimated_delivery_date: status === "กำลังจัดส่งสินค้าเคลม" || cleanData.estimated_delivery_date ? formattedEstDate : "",
      };

      // 🟢 4. ยิง API อัปเดตข้อมูลการเคลม
      const resUpdate = await claimService.updateClaim(updatePayload);

      if (resUpdate && resUpdate.status) {
        // 🟢 5. ยิง API บันทึก Status Log โดยระบุ claim_id เป็น String
        await claimService.createClaimStatusLogs({
          claim_id: targetClaimId,
          status_name: status,
          remark: isRejected ? rejectReason : `เปลี่ยนสถานะเป็น ${status}`,
        });

        message.success("อัปเดตสถานะรายการเคลมเรียบร้อยแล้ว");
        setIsModalOpen(false);
        fetchClaimDetail();
      }
    } catch (error) {
      message.error(error.message || "เกิดข้อผิดพลาดในการอัปเดตสถานะ");
    }
  };

  return (
    <div className="w-full flex flex-col gap-6" style={{ boxSizing: "border-box" }}>
      <Card className="rounded-2xl shadow-sm border-gray-200 w-full overflow-hidden" bodyStyle={{ padding: "24px" }}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
          <div className="flex flex-col gap-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 m-0 truncate">จัดการการเคลม</h1>
            <p className="text-sm text-gray-500 m-0 truncate">
              Claim ID : <b className="text-slate-800 font-mono">{data.claim_no || data.claim_id}</b>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto justify-start md:justify-end">
            <div className="shrink-0">
              <ClaimStatusTag status={data.current_status || data.status} />
            </div>

            <div>
              {/* ปุ่มกดเปิด Modal พิมพ์เอกสาร */}
              <Button icon={<PrinterOutlined />} onClick={() => setIsPreviewModalOpen(true)}>
                พิมพ์ / ดาวน์โหลดเอกสาร
              </Button>

              {/* Component Modal สำหรับพิมพ์ */}
              <ClaimPrintModal
                open={isPreviewModalOpen}
                onClose={() => setIsPreviewModalOpen(false)}
                data={{
                  ...data,
                  claimId: data.claim_no || data.claim_id,
                  productName: productName,
                  createdDate: data.claim_date ? dayjs(data.claim_date).format("DD/MM/YYYY") : "-",
                }}
              />
            </div>

            <Button
              type="primary"
              icon={<SaveOutlined />}
              className="bg-slate-800 hover:bg-slate-900 rounded-xl font-semibold shrink-0"
              onClick={() => {
                setStatus(data.current_status || "สร้างรายการเคลม");
                setWithdrawDate(
                  data.withdraw_date ? dayjs(data.withdraw_date) : null
                );
                setEstimatedDeliveryDate(
                  data.estimated_delivery_date
                    ? dayjs(data.estimated_delivery_date)
                    : null
                );
                setIsModalOpen(true);
              }}
            >
              อัปเดตสถานะ
            </Button>
          </div>
        </div>
      </Card>

      {/* ไทม์ไลน์สถานะ */}
      <Card
        title={<span className="font-bold text-slate-800">มุมมองไทม์ไลน์สถานะ</span>}
        className="rounded-2xl shadow-sm border-gray-200 w-full"
        bodyStyle={{ padding: "24px 20px" }}
      >
        <ConfigProvider theme={{ token: { colorPrimary: isRejected ? "#ef4444" : "#059669" } }}>
          <Steps
            current={getCurrentStep()}
            status={isRejected ? "error" : "process"}
            responsive
            items={
              isRejected
                ? [
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
                      title: status === "ไม่มีสิทธิ์เคลม" ? "ไม่มีสิทธิ์เคลม" : "ไม่อนุมัติเคลมสินค้า",
                      description: (
                        <div className="text-xs">
                          <div>{statusTimestamps[status] || "-"}</div>
                          {rejectReason && (<div className="text-red-500 font-semibold">{rejectReason}</div>)}
                        </div>
                      ),
                      icon: <CloseCircleOutlined />,
                    },
                  ]
                : [
                    {
                      title: "สร้างรายการ",
                      description: statusTimestamps["สร้างรายการเคลม"] || (data.claim_date ? dayjs(data.claim_date).format("DD/MM/YYYY") : "-"),
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
                      description: statusTimestamps["กำลังดำเนินการเปลี่ยนสินค้า"] || "-",
                      icon: <FileSearchOutlined />,
                    },
                    {
                      title: "กำลังจัดส่ง",
                      description: statusTimestamps["กำลังจัดส่งสินค้าเคลม"] || "-",
                      icon: <CarOutlined />,
                    },
                    {
                      title: "จัดส่งสำเร็จ",
                      description: statusTimestamps["จัดส่งสินค้าเคลมสำเร็จ"] || statusTimestamps["สำเร็จ"] || "-",
                      icon: <SmileOutlined />,
                    },
                  ]
            }
          />
        </ConfigProvider>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full">
        <div className="xl:col-span-2 flex flex-col gap-6 w-full">
          {/* รายละเอียดสินค้า */}
          <Card
            title={<span className="font-bold text-slate-800">ข้อมูลสินค้า และรายละเอียดคำร้องขอเคลม</span>}
            className="rounded-2xl shadow-sm border-gray-200 w-full"
            bodyStyle={{ padding: "24px" }}
          >
            <Descriptions column={1} bordered size="middle" labelStyle={{ fontWeight: "600", color: "#334155", width: "180px", backgroundColor: "#f8fafc" }}>
              <Descriptions.Item label="วันที่แจ้ง">
                {data.claim_date ? dayjs(data.claim_date).format("DD/MM/YYYY HH:mm") : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="ผู้แจ้ง">{data.agent_id || data.reporter || "-"}</Descriptions.Item>
              <Descriptions.Item label="สินค้า">
                <span className="font-bold text-slate-800">{productName}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Lot Number">
                <span className="font-mono">{data.lot_no || data.lot || "-"}</span>
              </Descriptions.Item>
              <Descriptions.Item label="MFG Number">
                <span className="font-mono">{data.mfg_date ? dayjs(data.mfg_date).format("DD/MM/YYYY") : "-"}</span>
              </Descriptions.Item>
              <Descriptions.Item label="EXP Number">
                <span className="font-mono">{data.exp_date ? dayjs(data.exp_date).format("DD/MM/YYYY") : "-"}</span>
              </Descriptions.Item>
              <Descriptions.Item label="จำนวน">
                <span className="font-bold text-emerald-700">{data.qty}</span> ขวด/กระป๋อง
              </Descriptions.Item>
              <Descriptions.Item label="รายละเอียดเพิ่มเติม">
                {data.claim_reason || data.detail || "-"}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* การรับสินค้า */}
          {data.driver_name && (
            <Card
              title={<span className="font-bold text-slate-800">ข้อมูลการรับสินค้าเคลม</span>}
              className="rounded-2xl shadow-sm border-gray-200 w-full"
              bodyStyle={{ padding: "24px" }}
            >
              <Descriptions column={1} bordered size="middle" labelStyle={{ fontWeight: "600", color: "#334155", width: "180px", backgroundColor: "#f8fafc" }}>
                <Descriptions.Item label="พนักงานขับรถ (พขร.)">
                  <span className="font-semibold text-slate-800">{data.driver_name}</span>
                </Descriptions.Item>
                <Descriptions.Item label="ทะเบียนรถ">
                  <span className="font-mono">{data.truck_plate || "-"}</span>
                </Descriptions.Item>
                <Descriptions.Item label="เลขที่เอกสารเคลม">
                  <span className="font-mono">{data.claim_no || "-"}</span>
                </Descriptions.Item>
                <Descriptions.Item label="จำนวนที่รับคืนสินค้าแตก">
                  <span className="font-mono">{data.full_receive || "-"}</span>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          {/* การเบิกเปลี่ยนสินค้า */}
          {data.withdraw_date && (
            <Card
              title={<span className="font-bold text-slate-800">ข้อมูลการเบิกเปลี่ยนสินค้า</span>}
              className="rounded-2xl shadow-sm border-gray-200 w-full"
              bodyStyle={{ padding: "24px" }}
            >
              <Descriptions column={1} bordered size="middle" labelStyle={{ fontWeight: "600", color: "#334155", width: "180px", backgroundColor: "#f8fafc" }}>
                <Descriptions.Item label="วันที่เบิกสินค้าจากคลัง">
                  <span className="font-mono">{dayjs(data.withdraw_date).format("DD/MM/YYYY")}</span>
                </Descriptions.Item>
                <Descriptions.Item label="จำนวนที่ส่งสินค้าคืน">
                  <span className="font-bold text-slate-800">{data.returned_qty}</span> ขวด/กระป๋อง
                </Descriptions.Item>
                <Descriptions.Item label="จำนวนแตกที่รับรองการเปลี่ยน">
                  <span className="font-bold text-emerald-700">{data.approved_qty}</span> ขวด/กระป๋อง
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          {/* การจัดส่งสินค้า */}
          {data.delivery_driver && (
            <Card
              title={<span className="font-bold text-slate-800">ข้อมูลการจัดส่งสินค้าเคลม</span>}
              className="rounded-2xl shadow-sm border-gray-200 w-full"
              bodyStyle={{ padding: "24px" }}
            >
              <Descriptions column={1} bordered size="middle" labelStyle={{ fontWeight: "600", color: "#334155", width: "180px", backgroundColor: "#f8fafc" }}>
                <Descriptions.Item label="พนักงานขับรถจัดส่งสินค้าเคลม">
                  <span className="font-semibold text-slate-800">{data.delivery_driver}</span>
                </Descriptions.Item>
                <Descriptions.Item label="ทะเบียนรถจัดส่ง">
                  <span className="font-mono">{data.delivery_plate || "-"}</span>
                </Descriptions.Item>
                <Descriptions.Item label="วันที่คาดว่าจะส่งถึงลูกค้า">
                  <span className="font-semibold text-blue-600">
                    {data.estimated_delivery_date ? dayjs(data.estimated_delivery_date).format("DD/MM/YYYY") : "-"}
                  </span>
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
                    <Image
                      key={index}
                      width="100%"
                      height={100}
                      style={{ objectFit: "cover" }}
                      className="rounded-lg border border-gray-200"
                      src={imgSrc}
                    />
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
            <Descriptions column={1} bordered size="small" labelStyle={{ fontWeight: "600", color: "#334155", width: "150px", backgroundColor: "#f8fafc", fontSize: "12px" }}>
              <Descriptions.Item label="อัปเดตล่าสุด ณ เวลา">
                <span className="font-mono">
                  {statusTimestamps[data.current_status] || (data.updated_at ? dayjs(data.updated_at).format("DD/MM/YYYY HH:mm") : "-")}
                </span>
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
            <Select
              className="w-full"
              value={status}
              onChange={(val) => setStatus(val)}
              options={[
                { value: "สร้างรายการเคลม", label: "ขั้นที่ 1: สร้างรายการเคลม" },
                { value: "รอการพิจารณา", label: "ขั้นที่ 2: รอการพิจารณา" },
                { value: "มีสิทธิ์เคลม", label: "ขั้นที่ 3: มีสิทธิ์เคลม" },
                { value: "ไม่มีสิทธิ์เคลม", label: "ขั้นที่ 3: ไม่มีสิทธิ์เคลม (สิ้นสุด)" },
                { value: "รับสินค้าจริงแล้ว", label: "ขั้นที่ 4: รับสินค้าจริงแล้ว" },
                { value: "อนุมัติเคลมสินค้า", label: "ขั้นที่ 5: อนุมัติเคลมสินค้า" },
                { value: "ไม่อนุมัติเคลมสินค้า", label: "ขั้นที่ 5: ไม่อนุมัติเคลมสินค้า (สิ้นสุด)" },
                { value: "กำลังดำเนินการเปลี่ยนสินค้า", label: "ขั้นที่ 6: กำลังดำเนินการเปลี่ยนสินค้า" },
                { value: "กำลังจัดส่งสินค้าเคลม", label: "ขั้นที่ 7: กำลังจัดส่งสินค้าเคลม" },
                { value: "จัดส่งสินค้าเคลมสำเร็จ", label: "ขั้นที่ 8: จัดส่งสินค้าเคลมสำเร็จ" },
              ].map((opt) => ({
                ...opt,
                disabled: !isValidStatusTransition(currentStatusInDB, opt.value),
              }))}
            />
          </div>

          {status === "รับสินค้าจริงแล้ว" && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-3">
              <span className="text-sm font-bold text-slate-800">ข้อมูลที่เข้ารับสินค้า</span>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อ-นามสกุล พขร.:</label>
                <Input
                  placeholder="เช่น นายสมชาย ใจดี"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">ทะเบียนรถ:</label>
                <Input
                  placeholder="เช่น 70-1234 กทม."
                  value={truckPlate}
                  onChange={(e) => setTruckPlate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">เลขที่เอกสารเคลม (เล่ม-เลขที่):</label>
                <Input
                  placeholder="เช่น 055-02742"
                  value={claimNoInput}
                  onChange={(e) => setClaimNoInput(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">จำนวนที่รับคืนสินค้าแตก(ขวด/กระป๋อง):</label>
                <Input
                  placeholder="เช่น 48"
                  value={fullReceive}
                  onChange={(e) => setFullReceive(e.target.value)}
                />
              </div>
            </div>
          )}

          {status === "กำลังดำเนินการเปลี่ยนสินค้า" && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-3">
              <span className="text-sm font-bold text-slate-800">ข้อมูลการเบิกและรับรองเปลี่ยนสินค้า</span>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">วันที่เบิกสินค้าจากคลัง:</label>
                <DatePicker
                  className="w-full"
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
                <Input
                  type="number"
                  placeholder="เช่น 48"
                  value={returnedQty}
                  onChange={(e) => setReturnedQty(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">จำนวนแตกที่เจ้าหน้าที่คลังรับรองการเปลี่ยน (ขวด/กระป๋อง):</label>
                <Input
                  type="number"
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
                <Input
                  placeholder="เช่น นายสมศักดิ์ ขยันส่ง"
                  value={deliveryDriver}
                  onChange={(e) => setDeliveryDriver(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">ทะเบียนรถจัดส่ง:</label>
                <Input
                  placeholder="เช่น 80-9999 กทม."
                  value={deliveryPlate}
                  onChange={(e) => setDeliveryPlate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">วันที่คาดว่าจะส่งถึงลูกค้า:</label>
                <DatePicker
                  className="w-full"
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