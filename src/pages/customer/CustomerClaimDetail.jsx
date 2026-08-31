import React, { useState, useEffect } from "react";
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
  Spin,
} from "antd";
import {
  CheckCircleOutlined,
  FileSearchOutlined,
  CloseCircleOutlined,
  MessageOutlined,
  ArrowLeftOutlined,
  CarOutlined,
  SmileOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import claimService from "../../services/claimService";
import loginService from "../../services/loginService";
import itemService from "../../services/itemService";
import { 
  getStatusName, 
  getStatusColor,
  getStatusId,
  STATUS_PRIORITY,
  CLAIM_STATUS_MAP
} from "../../constants/claimStatus";

dayjs.extend(utc);

const CustomerClaimDetail = () => {
  const navigate = useNavigate();
  const { claimId } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [productName, setProductName] = useState("");
  const [statusLogs, setStatusLogs] = useState([]);

  const formatDbDate = (dateString, format = "DD/MM/YYYY HH:mm") => {
    if (!dateString) return "-";
    return dayjs(dateString).format(format);
  };

  useEffect(() => {
    fetchClaimDetail();
  }, [claimId]);

  const fetchClaimDetail = async () => {
    setLoading(true);
    try {
      const user = loginService.getCurrentUser();
      if (!user?.agent_id) {
        message.error("ไม่พบข้อมูลผู้ใช้งาน กรุณาล็อกอินใหม่");
        return;
      }

      const [resClaim, resItems, resLogs] = await Promise.all([
        claimService.getClaimByAgent(user.agent_id),
        itemService.getItems(),
        claimService.getClaimStatusLogs(),
      ]);

      if (resClaim.status && resClaim.data) {
        const currentClaim = resClaim.data.find(
          (item) => String(item.claim_id) === String(claimId) || item.claim_no === claimId
        );

        if (currentClaim) {
          let imageUrls = [];
          try {
            const resImages = await claimService.getClaimImages(currentClaim.claim_id);
            if (resImages?.data && Array.isArray(resImages.data)) {
              imageUrls = resImages.data.map(
                (img) => `http://localhost:5000${img.image_path}`
              );
            }
          } catch (imgErr) {
            console.error("ดึงรูปภาพไม่สำเร็จ:", imgErr);
          }

          setData({
            ...currentClaim,
            images: imageUrls,
          });

          if (resLogs && resLogs.status && Array.isArray(resLogs.data)) {
            const filteredLogs = resLogs.data.filter(
              (log) => String(log.claim_id) === String(currentClaim.claim_id)
            );
            setStatusLogs(filteredLogs);
          }

          if (resItems && resItems.data) {
            const foundItem = resItems.data.find((i) => i.item_id === currentClaim.item_id);
            setProductName(foundItem ? foundItem.item_name : `สินค้า ID: ${currentClaim.item_id}`);
          }
        } else {
          message.error("ไม่พบข้อมูลรายการเคลมนี้");
        }
      }
    } catch (error) {
      message.error("ไม่สามารถดึงข้อมูลได้: " + error.message);
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
      <div className="text-center py-10">
        <p>ไม่พบข้อมูลรายการเคลม</p>
        <Button onClick={() => navigate("/customer/list-claim")}>กลับหน้ารายการ</Button>
      </div>
    );
  }

  const currentStatusInDB = getStatusName(data.current_status || "สร้างรายการเคลม");
  const currentStatusId = String(getStatusId(data.current_status));

  const isRejected =
    currentStatusId === "3" || 
    currentStatusId === "7" || 
    data.current_status === "ไม่มีสิทธิ์เคลม" ||
    data.current_status === "ไม่อนุมัติเคลมสินค้า";

  const getCustomerStepIndex = (statusVal) => {
    const statusId = String(getStatusId(statusVal));

    if (isRejected) {
      if (statusId === "1" || statusId === "5") return 1;
      return 2;
    }

    switch (statusId) {
      case "1": return 0;
      case "5": return 1;
      case "2": return 2;
      case "4": return 3;
      case "6": return 4;
      case "8": return 5;
      case "9": return 6;
      case "10": return 7;
      default: return 0;
    }
  };

  const currentStep = getCustomerStepIndex(data.current_status);

  const getStatusTag = (status) => {
    const color = getStatusColor(status);
    const name = getStatusName(status, "customer");

    return <Tag color={color} style={{ margin: 0 }}>{name}</Tag>;
  };

  const getLogDate = (statusTarget) => {
    const targetId = String(statusTarget);
    const log = statusLogs.find((item) => String(item.status) === targetId);
    return log ? formatDbDate(log.update_date, "DD/MM/YYYY HH:mm") : "-";
  };

  const handleConfirmDelivery = async () => {
    try {
      const currentUser = loginService.getCurrentUser();
      const userId = currentUser?.user_id || currentUser?.agent_id || data?.agent_id || "";

      const { images, ...claimDataWithoutImages } = data;
      const currentTimestamp = new Date().toISOString();

      const updatePayload = {
        ...claimDataWithoutImages,
        claim_id: String(data.claim_id),
        claim_no: String(data.claim_no || ""),
        agent_id: String(data.agent_id || currentUser?.agent_id || ""),
        claim_date: data.claim_date,
        current_status: "10",
        status: "10",
        status_name: "จัดส่งสินค้าเคลมสำเร็จ",
        receive_finish_date: currentTimestamp,
        update_by: String(userId),
      };

      const resUpdate = await claimService.updateClaim(updatePayload);

      if (resUpdate.status) {
        await claimService.createClaimStatusLogs({
          claim_id: String(data.claim_id),
          status: "10",
          status_name: "จัดส่งสินค้าเคลมสำเร็จ",
          remark: "ลูกค้ายืนยันรับสินค้าเรียบร้อยแล้ว",
          update_by: String(userId),
          agent_id: String(data.agent_id || currentUser?.agent_id || ""),
        });

        message.success("ยืนยันรับสินค้าเคลมเรียบร้อยแล้ว");
        fetchClaimDetail();
      }
    } catch (error) {
      message.error(error.message || "เกิดข้อผิดพลาดในการอัปเดตสถานะ");
    }
  };

  const getStepItems = () => {
    const rejectReason = data?.remark || data?.reject_reason;

    if (isRejected) {
      return [
        {
          title: CLAIM_STATUS_MAP["1"]?.customerName || "สร้างรายการ",
          description: getLogDate(1),
          icon: <CheckCircleOutlined />,
        },
        {
          title: CLAIM_STATUS_MAP["5"]?.customerName || "รอการพิจารณา",
          description: getLogDate(5),
          icon: <FileSearchOutlined />,
        },
        {
          title: CLAIM_STATUS_MAP[currentStatusId]?.customerName || "ปฏิเสธการเคลม",
          description: (
            <div className="text-xs">
              <div>{getLogDate(currentStatusId)}</div>
              {rejectReason && (
                <div className="text-red-500 font-semibold">{rejectReason}</div>
              )}
            </div>
          ),
          icon: <CloseCircleOutlined />,
        },
      ];
    }

    return [
      {
        title: "สร้างรายการ",
        description: getLogDate(1),
        icon: <CheckCircleOutlined />,
      },
      {
        title: "รอการพิจารณา",
        description: getLogDate(5),
        icon: <FileSearchOutlined />,
      },
      {
        title: "มีสิทธิ์เคลม",
        description: getLogDate(2),
        icon: <CheckCircleOutlined />,
      },
      {
        title: "รับสินค้าแล้ว",
        description: getLogDate(4),
        icon: <InboxOutlined />,
      },
      {
        title: "อนุมัติเคลม",
        description: getLogDate(6),
        icon: <CheckCircleOutlined />,
      },
      {
        title: "กำลังเปลี่ยนสินค้า",
        description: getLogDate(8),
        icon: <FileSearchOutlined />,
      },
      {
        title: "กำลังจัดส่ง",
        description: getLogDate(9),
        icon: <CarOutlined />,
      },
      {
        title: "จัดส่งสำเร็จ",
        description: getLogDate(10),
        icon: <SmileOutlined />,
      },
    ];
  };

  const isShipping = currentStatusId === "9" || data.current_status === "กำลังจัดส่งสินค้าเคลม";

  return (
    <div className="w-full flex flex-col gap-6" style={{ boxSizing: "border-box" }}>
      {/* Header */}
      <Card className="rounded-2xl shadow-sm border-gray-200 w-full" bodyStyle={{ padding: "24px" }}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-slate-800 m-0">รายละเอียดการเคลม</h1>
            <p className="text-sm text-gray-500 m-0">
              Claim ID : <b className="text-slate-800 font-mono">{data.claim_no || data.claim_id}</b>
            </p>
          </div>
          <div className="shrink-0">{getStatusTag(data.current_status)}</div>
        </div>
      </Card>

      {/* Alert when rejected */}
      {isRejected && (
        <Alert
          message="คำร้องขอเคลมสินค้าถูกปฏิเสธ"
          description={`เหตุผล: ${data.reject_reason || "เนื่องจากสินค้าไม่อยู่ในเงื่อนไขการเคลม"}`}
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
          <Card title={<span className="font-bold text-slate-800">รายละเอียดสินค้าและข้อมูลการแจ้ง</span>} className="rounded-2xl shadow-sm border-gray-200 w-full" bodyStyle={{ padding: "24px" }}>
            <Descriptions column={1} bordered size="middle" labelStyle={{ fontWeight: "600", color: "#334155", width: "180px", backgroundColor: "#f8fafc" }}>
              <Descriptions.Item label="วันที่แจ้ง">
                {data.claim_date ? formatDbDate(data.claim_date, "DD/MM/YYYY HH:mm") : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="สินค้า"><span className="font-bold text-slate-800">{productName}</span></Descriptions.Item>
              <Descriptions.Item label="Lot Number"><span className="font-mono">{data.lot_no || "-"}</span></Descriptions.Item>
              <Descriptions.Item label="MFG Number"><span className="font-mono">{data.mfg_date ? formatDbDate(data.mfg_date, "DD/MM/YYYY") : "-"}</span></Descriptions.Item>
              <Descriptions.Item label="จำนวน"><span className="font-bold text-emerald-700">{data.qty}</span> รายการ</Descriptions.Item>
              <Descriptions.Item label="รายละเอียดเพิ่มเติม">{data.claim_reason || "-"}</Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Card ข้อมูลการรับสินค้าเคลม */}
          {(STATUS_PRIORITY[currentStatusInDB] >= 4 || Boolean(data.driver_name && data.driver_name.trim())) && (
            <Card title={<span className="font-bold text-slate-800">ข้อมูลการรับสินค้าเคลม</span>} className="rounded-2xl shadow-sm border-gray-200 w-full" bodyStyle={{ padding: "24px" }}>
              <Descriptions column={1} bordered size="middle" labelStyle={{ fontWeight: "600", color: "#334155", width: "180px", backgroundColor: "#f8fafc" }}>
                <Descriptions.Item label="พนักงานขับรถ (พขร.)"><span className="font-semibold text-slate-800">{data.driver_name || "-"}</span></Descriptions.Item>
                <Descriptions.Item label="ทะเบียนรถ"><span className="font-mono">{data.truck_plate || "-"}</span></Descriptions.Item>
                <Descriptions.Item label="เลขที่เอกสารเคลม"><span className="font-mono">{data.claim_no || "-"}</span></Descriptions.Item>
                <Descriptions.Item label="จำนวนที่รับคืนสินค้าแตก"><span className="font-mono">{data.full_receive || "-"}</span></Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          {/* Card ข้อมูลการจัดส่งสินค้าเคลม */}
          {(STATUS_PRIORITY[currentStatusInDB] >= 7 || Boolean(data.delivery_driver && data.delivery_driver.trim())) && (
            <Card title={<span className="font-bold text-slate-800">ข้อมูลการจัดส่งสินค้าเคลม</span>} className="rounded-2xl shadow-sm border-gray-200 w-full" bodyStyle={{ padding: "24px" }}>
              <Descriptions column={1} bordered size="middle" labelStyle={{ fontWeight: "600", color: "#334155", width: "180px", backgroundColor: "#f8fafc" }}>
                <Descriptions.Item label="พนักงานขับรถจัดส่งสินค้าเคลม"><span className="font-semibold text-slate-800">{data.delivery_driver || "-"}</span></Descriptions.Item>
                <Descriptions.Item label="ทะเบียนรถจัดส่ง"><span className="font-mono">{data.delivery_plate || "-"}</span></Descriptions.Item>
                <Descriptions.Item label="วันที่คาดว่าจะส่งถึงลูกค้า">
                  <span className="font-semibold text-blue-600">{data.estimated_delivery_date ? dayjs(data.estimated_delivery_date).format("DD/MM/YYYY") : "-"}</span>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}
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
            ) : (
              <div className="text-gray-400 italic py-6 text-center">ไม่มีรูปภาพแนบ</div>
            )}
          </Card>

          <Card className="rounded-2xl shadow-sm border-gray-200 w-full" bodyStyle={{ padding: "20px" }}>
            <div className="flex flex-col gap-3">
              {isShipping && (
                <Popconfirm title="ยืนยันการรับสินค้าเคลม" description="คุณได้รับสินค้าเคลมถูกต้องเรียบร้อยแล้วใช่หรือไม่?" onConfirm={handleConfirmDelivery} okText="ยืนยันรับสินค้า" cancelText="ยกเลิก">
                  <Button type="primary" size="large" icon={<CheckCircleOutlined/>} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold shadow-sm border-none h-11">
                    ยืนยันได้รับสินค้าเคลมแล้ว
                  </Button>
                </Popconfirm>
              )}
              <Button type={isShipping ? "default" : "primary"} size="large" icon={<MessageOutlined />} className={`w-full rounded-xl font-semibold shadow-sm h-11 ${isShipping ? "border-emerald-600 text-emerald-700 hover:bg-emerald-50" : "bg-emerald-600 hover:bg-emerald-700 border-none"}`} onClick={() => navigate(`/customer/chat/${data.claim_id}`)}>
                สอบถาม/ติดต่อเจ้าหน้าที่
              </Button>
              <Button size="large" icon={<ArrowLeftOutlined/>} className="w-full rounded-xl border-gray-300 text-slate-700 font-semibold hover:border-emerald-600 hover:text-emerald-700 h-11" onClick={() => navigate("/customer/list-claim")}>
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