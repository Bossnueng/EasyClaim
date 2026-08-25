import React, { useState, useEffect } from "react";
import {Card,Tag,Descriptions,  Button,Steps,Image, ConfigProvider,  Alert,  Popconfirm,  message,  Spin,} from "antd";
import {  CheckCircleOutlined,  FileSearchOutlined,  CloseCircleOutlined,  MessageOutlined,  ArrowLeftOutlined,  CarOutlined,  SmileOutlined,InboxOutlined} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import claimService from "../../services/claimService";
import loginService from "../../services/loginService";
import itemService from "../../services/itemService";
import { CLAIM_STATUS_MAP, getStatusColor } from "../../constants/claimStatus";

const CustomerClaimDetail = () => {
  const navigate = useNavigate();
  const { claimId } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [productName, setProductName] = useState("");

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

      //ดึงข้อมูลรายการเคลมและข้อมูลสินค้า
      const [resClaim, resItems] = await Promise.all([
        claimService.getClaimByAgent(user.agent_id),
        itemService.getItems(),
      ]);

      if (resClaim.status && resClaim.data) {
        const currentClaim = resClaim.data.find(
          (item) => String(item.claim_id) === String(claimId) || item.claim_no === claimId
        );

        if (currentClaim) {
          setData(currentClaim);
          // แปลง item_id เป็นชื่อสินค้า
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

  const isRejected =
    data.current_status === "ไม่มีสิทธิ์เคลม" ||
    data.current_status === "ไม่อนุมัติเคลมสินค้า";

  const getCustomerStepInfo = (status) => {
    if (isRejected) {
      if (status === "รอการพิจารณา") return 1;
      return 2; // ไม่มีสิทธิ์เคลม / ไม่อนุมัติ
    }
    switch (status) {
      case "สร้างรายการเคลม": return 0;
      case "รอการพิจารณา": return 1;
      case "มีสิทธิ์เคลม": return 2;
      case "รับสินค้าจริงแล้ว": return 3;
      case "อนุมัติเคลมสินค้า": return 4;
      case "กำลังดำเนินการเปลี่ยนสินค้า": return 5;
      case "กำลังจัดส่งสินค้าเคลม": return 6;
      case "จัดส่งสินค้าเคลมสำเร็จ":
      case "สำเร็จ": return 7;
      default: return 0;
    }
  };

  const currentStep = getCustomerStepInfo(data.current_status).step;

  const getStatusTag = (status) => {
    // 1. ค้นหา Config จาก status_id หรือจาก Name
    const statusConfig = 
      CLAIM_STATUS_MAP[status] || 
      Object.values(CLAIM_STATUS_MAP).find((item) => item.name === status);

    // 2. ถ้าเจอใน Config ให้ใช้ค่าสีและชื่อตาม Map ถ้าไม่เจอให้ fallback เป็น default
    const color = statusConfig?.color || "default";
    const name = statusConfig?.name || status || "ไม่ระบุสถานะ";

    return <Tag color={color} style={{ margin: 0 }}>{name}</Tag>;
  };

  //ยืนยันรับสินค้าผ่าน API
  const handleConfirmDelivery = async () => {
    try {
      const updatePayload = {
        claim_id: data.claim_id,
        current_status: "สำเร็จ",
      };

      const resUpdate = await claimService.updateClaim(updatePayload);

      if (resUpdate.status) {
        // บันทึก Log เปลี่ยนสถานะ
        await claimService.createClaimStatusLogs({
          claim_id: data.claim_id,
          status_name: "สำเร็จ",
          remark: "ลูกค้ายืนยันรับสินค้าเรียบร้อยแล้ว",
        });

        message.success("ยืนยันรับสินค้าเคลมเรียบร้อยแล้ว");
        fetchClaimDetail(); // โหลดข้อมูลใหม่
      }
    } catch (error) {
      message.error(error.message || "เกิดข้อผิดพลาดในการอัปเดตสถานะ");
    }
  };

  const getStepItems = () => {
  // ดึง statusTimestamps จาก data (ถ้าไม่มีให้เป็น object ว่าง)
  const statusTimestamps = data?.statusTimestamps || {};
  const status = data?.current_status || data?.status;
  const rejectReason = data?.reject_reason || data?.rejectReason;

  if (isRejected) {
    return [
      {
        title: "สร้างรายการเคลม",
        description: statusTimestamps["สร้างรายการเคลม"] || (data?.claim_date ? dayjs(data.claim_date).format("DD/MM/YYYY") : "-"),
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
      description: statusTimestamps["สร้างรายการเคลม"] || (data?.claim_date ? dayjs(data.claim_date).format("DD/MM/YYYY") : "-"),
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
      description: statusTimestamps["จัดส่งสินค้าเคลมสำเร็จ"] || "-",
      icon: <SmileOutlined />,
    },
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
              Claim ID : <b className="text-slate-800 font-mono">{data.claim_no}</b>
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
              <Descriptions.Item label="วันที่แจ้ง">{data.claim_date ? dayjs(data.claim_date).format("DD/MM/YYYY HH:mm") : "-"}</Descriptions.Item>
              <Descriptions.Item label="สินค้า"><span className="font-bold text-slate-800">{productName}</span></Descriptions.Item>
              <Descriptions.Item label="Lot Number"><span className="font-mono">{data.lot_no || "-"}</span></Descriptions.Item>
              <Descriptions.Item label="MFG Number"><span className="font-mono">{data.mfg_date ? dayjs(data.mfg_date).format("DD/MM/YYYY") : "-"}</span></Descriptions.Item>

              <Descriptions.Item label="จำนวน"><span className="font-bold text-emerald-700">{data.qty}</span> รายการ</Descriptions.Item>
              <Descriptions.Item label="รายละเอียดเพิ่มเติม">{data.claim_reason || "-"}</Descriptions.Item>
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
            ) : (
              <div className="text-gray-400 italic py-6 text-center">ไม่มีรูปภาพแนบ</div>
            )}
          </Card>

          <Card className="rounded-2xl shadow-sm border-gray-200 w-full" bodyStyle={{ padding: "20px" }}>
            <div className="flex flex-col gap-3">
              {data.current_status === "กำลังจัดส่งสินค้าเคลม" && (
                <Popconfirm title="ยืนยันการรับสินค้าเคลม" description="คุณได้รับสินค้าเคลมถูกต้องเรียบร้อยแล้วใช่หรือไม่?" onConfirm={handleConfirmDelivery} okText="ยืนยันรับสินค้า" cancelText="ยกเลิก">
                  <Button type="primary" size="large" icon={<CheckCircleOutlined/>} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold shadow-sm border-none h-11">
                    ยืนยันได้รับสินค้าเคลมแล้ว
                  </Button>
                </Popconfirm>
              )}
              <Button type={data.current_status === "กำลังจัดส่งสินค้าเคลม" ? "default" : "primary"} size="large" icon={<MessageOutlined />} className={`w-full rounded-xl font-semibold shadow-sm h-11 ${data.current_status === "กำลังจัดส่งสินค้าเคลม" ? "border-emerald-600 text-emerald-700 hover:bg-emerald-50" : "bg-emerald-600 hover:bg-emerald-700 border-none"}`} onClick={() => navigate(`/customer/chat/${data.claim_id}`)}>
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