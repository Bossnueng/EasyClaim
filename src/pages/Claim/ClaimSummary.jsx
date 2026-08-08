import {
  Card,
  Tag,
  Descriptions,
  Button,
  Space,
  Steps,
  Divider,
  Image,
} from "antd";

import {
  CheckCircleOutlined,
  FileSearchOutlined,
  InboxOutlined,
  CarOutlined,
  SmileOutlined,
} from "@ant-design/icons";

import { useNavigate, useParams } from "react-router-dom";

const ClaimSummary=()=>{

    const navigate=useNavigate();

    const { claimId } = useParams();

    const claims = JSON.parse(localStorage.getItem("claims")) || [];

    const data = claims.find((item) => item.claimId === claimId);

    if (!data) {
        return (
            <div className="p-6">
                <Card>
                    <h2>ไม่พบข้อมูลการเคลม</h2>
                    <Button type="primary" onClick={() => navigate("/claim")}>กลับ</Button>
                </Card>
            </div>
        );
    }
    
    // ตัวอย่างสถานะ
    const currentStep = 1;

    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            <Card>
                <h1 className="text-3xl font-bold"> Claim Submitted Successfully</h1>
                <p className="text-gray-500 mb-6"> หมายเลขการเคลม :<b> {data.claimId}</b></p>
                
                <Space direction="vertical" size={20} className="w-full">

                    <Card title="สถานะการเคลม" className="mb-5">
                        <Tag color="blue">กำลังตรวจสอบ</Tag>
                    </Card>

                    <Card title="ข้อมูลผู้แจ้ง" className="mb-5">
                        <Descriptions column={1}>
                            <Descriptions.Item label="วันที่แจ้ง">{data.createdDate}</Descriptions.Item>
                            <Descriptions.Item label="ผู้แจ้ง">{data.reporter}</Descriptions.Item>
                        </Descriptions>
                    </Card>
                    
                    <Card title="ข้อมูลสินค้า" className="mb-5">
                        <Descriptions column={1}>
                            <Descriptions.Item label="สินค้า">{data.productName}</Descriptions.Item>
                            <Descriptions.Item label="Lot Number">{data.lot}</Descriptions.Item>
                            <Descriptions.Item label="จำนวน">{data.qty} ขวด</Descriptions.Item>
                        </Descriptions>
                    </Card>
                    
                    <Card title="รายละเอียด Claim">
                        <p>{data.detail || "-"}</p>
                    </Card>

                    <div className="flex justify-end mt-6">
                        <Button
                            type="primary"
                            onClick={() => navigate("/history")}
                        >
                            กลับหน้ารายการ Claim
                        </Button>
                    </div>
                </Space>
            </Card>
        </div>
        )}


export default ClaimSummary;