import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {Form,Input,DatePicker,AutoComplete,InputNumber,Upload,Button,
  Card,Row,Col,Select,Space,message,} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const productOptions = [{ value: "Est" },{ value: "Beer" },{ value: "100Plus" },{ value: "Oishi Corn" },{ value: "Oishi Grape" },];

const claimType = [
  { value: "แตกจากการขนส่ง", label: "แตกจากการขนส่ง" },
  { value: "แตกแห้งหลังการส่งสินค้า", label: "แตกแห้งหลังการส่งสินค้า" },
  { value: "ฝากเปลี่ยน", label: "ฝากเปลี่ยน" },
];
const { TextArea } = Input;

const CustomerNewClaim = () => {
  const savedUser = localStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);

  // ปรับฟังก์ชันการจัดการรูปภาพ ไม่ต้องแปลงเป็น Base64 ทั้งหมด
  // เพื่อป้องกัน localStorage เต็ม
  const processImages = async () => {
    return fileList.map((file) => {
      if (file.originFileObj) {
        return URL.createObjectURL(file.originFileObj);
      }
      return file.url || "";
    });
  };
  const onFinish = async (values) => {
    try {
      const base64Images = await processImages();

      const claimData = {
        claimId: "CLM-" + Date.now(),
        claimNo: "-",
        createdDate: dayjs().format("DD/MM/YYYY"),
        reporter: user?.name || "-",
        ...values,
        images: base64Images, // บันทึกเป็น Array ของ Base64
        image: base64Images[0] || null, // สำหรับแมปเข้า StaffClaimUpdate
        status: "สร้างรายการเคลม",
        updateAt: dayjs(Date.now()).format("DD/MM/YYYY"),
      };

      //เขียนข้อมูลการเคลมใหม่เพิ่มเข้าไปในฐานข้อมูล
      const oldClaims = JSON.parse(localStorage.getItem("claims")) || [];
      oldClaims.push(claimData);
      localStorage.setItem("claims", JSON.stringify(oldClaims));

      message.success("สร้างรายการขอเคลมสินค้าสำเร็จ");
      navigate(`/customer/new-claim/processing/${claimData.claimId}`);
    } catch (error) {
      message.error("เกิดข้อผิดพลาดในการแปลงไฟล์รูปภาพ");
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <Card>
        {/* ==================== ส่วน Header สร้างรายการเคลม ==================== */}
        <div className="border-l-4 border-blue-600 pl-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            สร้างรายการเคลม
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            กรุณากรอกข้อมูลการเคลมสินค้าให้ครบถ้วน
          </p>
        </div>

        {/* ==================== Form กรอกข้อมูลการเคลมสินค้า ==================== */}
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Space direction="vertical" size={24} className="w-full">
            {/* ------------------------- */}
            {/* ข้อมูลผู้แจ้ง */}
            {/* ------------------------- */}
            <Card title="ข้อมูลผู้แจ้ง">
              <Row gutter={16}>
                {/* วันที่ */}
                <Col xs={24} md={12}>
                  <Form.Item label="วันที่แจ้ง">
                    <DatePicker className="w-full" defaultValue={dayjs()} disabled/>
                  </Form.Item>
                </Col>

                {/* ชื่อผู้แจ้ง */}
                <Col xs={24} md={12}>
                  <Form.Item label="ผู้แจ้ง">
                    {/**Backend : ไปดูว่าฐานข้อมูลเก็บชื่ออย่างไร แล้วตอนที่จะขันทึกข้อมูลจะใช้ User ใคร */}
                    <Input value={user?.name || "-"} disabled />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* ------------------------- */}
            {/* ข้อมูลสินค้า */}
            {/* ------------------------- */}
            <Card title="ข้อมูลสินค้า">
              <Row gutter={16}>
                {/* ชื่อสินค้า */}
                <Col xs={24} md={12}>
                  <Form.Item label="ชื่อสินค้า"
                    name="productName"
                    rules={[
                      {
                        required: true,
                        message: "กรุณาเลือกสินค้า",
                      },
                    ]}
                  >
                    <AutoComplete
                      options={productOptions}
                      placeholder="ค้นหาชื่อสินค้า"
                      filterOption={(input, option) =>
                        option.value.toLowerCase().includes(input.toLowerCase())
                      }
                    />
                  </Form.Item>
                </Col>

                {/* Lot Number เป็นตัวพิมพ์ใหญ่อัตโนมัติ */}
                <Col xs={24} md={12}>
                  <Form.Item
                    label="หมายเลข Lot"
                    name="lot"
                    getValueFromEvent={(e) => e.target.value.toUpperCase()}
                    rules={[{ required: true, message: "กรุณาใส่เลข Lot" }]}
                  >
                    <Input placeholder="เช่น LOT240801" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                {/* MFG DATE */}
                <Col xs={24} md={12}>
                  <Form.Item
                    label="วันที่ผลิต"
                    name="mfg"
                    rules={[{ required: true, message: "กรุณาเลือกวันที่" }]}
                  >
                    <DatePicker className="w-full" />
                  </Form.Item>
                </Col>

                {/* EXP DATE */}
                <Col xs={24} md={12}>
                  <Form.Item
                    label="วันหมดอายุ"
                    name="exp"
                    rules={[{ required: true, message: "กรุณาเลือกวันที่" }]}
                  >
                    <DatePicker className="w-full" />
                  </Form.Item>
                </Col>
              </Row>

              {/* จำนวนสินค้าที่เคลม ใช้หน่วยขวด/กระป๋อง  */}
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="จำนวน"
                    name="qty"
                    getValueFromEvent={(e) =>
                      e.target.value.replace(/[^0-9]/g, "")
                    }
                    rules={[
                      {
                        required: true,
                        message: "กรุณาระบุจำนวน",
                      },
                      {
                        pattern: /^[1-9][0-9]*$/,
                        message: "กรุณากรอกจำนวนเต็มที่มากกว่า 0 เท่านั้น",
                      },
                    ]}
                  >
                    <Input
                      placeholder="ระบุจำนวน"
                      maxLength={6}
                      addonAfter="ขวด/กระป๋อง"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* ------------------------- */}
            {/* รายละเอียดการเคลม */}
            {/* ------------------------- */}
            <Card title="รายละเอียดการเคลม">
              {/*ประเภทการเคลม มีในเล่มเคลม*/}
              <Form.Item
                label="ประเภทการเคลม"
                name="claimType"
                rules={[{ required: true, message: "กรุณาประเภทการเคลม" }]}
              >
                <Select options={claimType} placeholder="เลือกประเภทการเคลม" />
              </Form.Item>

              {/*รายละเอียดการเคลม*/}
              <Form.Item
                label="รายละเอียด"
                name="detail"
                rules={[
                  {
                    required: true,
                    message: "กรุณาใส่รายละเอียดสาเหตุเพิ่มเติม",
                  },
                ]}
              >
                <TextArea
                  rows={6}
                  placeholder="อธิบายอาการเสียหรือรายละเอียดสาเหตุเพิ่มเติม"
                />
              </Form.Item>
            </Card>

            {/* ------------------------- */}
            {/* รูปภาพ */}
            {/* ------------------------- */}
            <Card title="รูปภาพประกอบ">
              <Form.Item
                name="images"
                rules={[
                  {
                    validator: () => {
                      if (fileList.length > 0) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error("กรุณาอัปโหลดรูปภาพประกอบอย่างน้อย 1 รูป"),
                      );
                    },
                  },
                ]}
              >
                <Upload
                  listType="picture-card"
                  beforeUpload={() => false}
                  fileList={fileList}
                  onChange={({ fileList }) => setFileList(fileList)}
                  multiple
                >
                  <div>
                    <UploadOutlined style={{ fontSize: 24 }} />
                    <div className="mt-2">Upload</div>
                  </div>
                </Upload>
              </Form.Item>
            </Card>

            {/* ------------------------- */}
            {/* Button */}
            {/* ------------------------- */}
            <div className="flex justify-end gap-3">
              <Button type="primary" size="large" htmlType="submit">
                ส่งข้อมูลการเคลม
              </Button>
            </div>
          </Space>
        </Form>
      </Card>
    </div>
  );
};

export default CustomerNewClaim;
