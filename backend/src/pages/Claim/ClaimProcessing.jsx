import { Card, Steps, Spin} from "antd";
import { useEffect} from "react";
import { useNavigate, useParams} from "react-router-dom";

const ClaimProcessing =()=>{
    const navigate = useNavigate();
    const {id}=useParams();

    useEffect(()=>{
        const timer=setTimeout(()=>{
            navigate(`/claim/summary/${id}`);
        },3000);

        return ()=>clearTimeout(timer);
    },[]);

    return(
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <Card className="w-[500px]">
                <div className="text-center">
                    <Spin size="large"/>
                    <h1 className="text-2xl font-bold mt-5">กำลังประมวลผลข้อมูล Claim</h1>
                    <p className="text-gray-500 mt-3">ระบบกำลังตรวจสอบข้อมูลและสร้างรายการเคลม</p>
                </div>

                <Steps className="mt-8" direction="vertical" current={2} 
                    items={[{title:"รับข้อมูล Claim"},
                        {title:"ตรวจสอบข้อมูลสินค้า"},
                        {title:"บันทึกข้อมูลเข้าสู่ระบบ"}]}/>
            </Card>
        </div>
    )
}

export default ClaimProcessing;