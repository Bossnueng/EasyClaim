import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {  Form,Input,DatePicker,AutoComplete,Upload,Button,Card,Row,Col,Select,Space,message,} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import imageCompression from 'browser-image-compression';
import dayjs from "dayjs";
import loginService from "../../services/loginService";
import itemService from "../../services/itemService"; // 🟢 1. Import itemService
import claimService from "../../services/claimService";

const claimType = [
  { value: "แตกจากการขนส่ง", label: "แตกจากการขนส่ง" },
  { value: "แตกแห้งหลังการส่งสินค้า", label: "แตกแห้งหลังการส่งสินค้า" },
  { value: "อื่นๆ", label: "อื่นๆ" },
];
const { TextArea } = Input;

const CustomerNewClaim = () => {
  const navigate = useNavigate();

  // ดึงข้อมูล User ผ่าน loginService
  const user = loginService.getCurrentUser();

  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [productOptions, setProductOptions] = useState([]); // 🟢 2. เพิ่ม State สำหรับเก็บตัวเลือกสินค้า
  const [loadingItems, setLoadingItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 🟢 3. ดึงรายการสินค้าผ่าน itemService
  useEffect(() => {
    const fetchItems = async () => {
      setLoadingItems(true);
      try {
        const res = await itemService.getItems();
        if (res.status && Array.isArray(res.data)) {
          // 🟢 2. แมปเก็บ id ไว้ใน id และใส่ value/label สำหรับค้นหา
          const options = res.data.map((item) => ({
            id: item.item_id,
            value: `${item.item_code} - ${item.item_name}`,
            label: `${item.item_code} - ${item.item_name}`,
          }));
          setProductOptions(options);
        }
      } catch (error) {
        message.error("ไม่สามารถโหลดรายการสินค้าได้");
      } finally {
        setLoadingItems(false);
      }
    };

    fetchItems();
  }, []);

  // แปลงไฟล์รูปภาพเป็น Base64 พร้อมบีบอัดให้เล็กพิเศษ ไม่เกิน Express Default Limit (100KB)
  const getBase64 = async (file) => {
    const options = {
      maxSizeMB: 0.03,          // 🟢 ลดขนาดเหลือ 30 KB (เมื่อแปลงเป็น Base64 จะไม่เกิน 60-70 KB)
      maxWidthOrHeight: 600,   // 🟢 ย่อความกว้าง/สูงเหลือ 600px
      useWebWorker: true,
      initialQuality: 0.6,     // 🟢 ปรับคุณภาพเริ่มต้นที่ 60%
    };

    try {
      const compressedFile = await imageCompression(file, options);
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(compressedFile);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
      });
    } catch (error) {
      console.error("Compression Error:", error);
      throw error;
    }
  };

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      const selectedProduct = productOptions.find((opt) => opt.value === values.productName);
      if (!selectedProduct) {
        message.error("กรุณาเลือกสินค้าจากรายการที่กำหนด");
        setSubmitting(false);
        return;
      }

      const claimPayload = {
        agent_id: user?.agent_id || 0,
        item_id: selectedProduct.id,
        lot_no: values.lot,
        mfg_date: values.mfg ? dayjs(values.mfg).format("YYYY-MM-DD") : null,
        expire_date: values.exp ? dayjs(values.exp).format("YYYY-MM-DD") : null,
        qty: parseInt(values.qty, 10),
        remark: `[${values.claimType}] ${values.detail}`,
        current_status: "5",
        driver_receive_date: null,
        warehouse_receive_date: null,
        approve_date: null,
        delivery_date: null,
        receive_finish_date: null,
        created_by: user?.full_name || "Agent",
      };

      const resClaim = await claimService.createClaim(claimPayload);

      // เช็ก response จาก API
      if (resClaim && resClaim.status && resClaim.claim_id) {
        const newClaimId = resClaim.claim_id;

        // บันทึก รูปภาพ
        // บันทึก รูปภาพ
      for (const file of fileList) {
        if (file.originFileObj) {
          // 🟢 ยิง API ส่งไฟล์ตรงๆ ไม่ติด Limit และ ไม่เกินความยาว VARCHAR ของ DB
          await claimService.createClaimimageFormData(newClaimId, file.originFileObj);
        }
      }

        // บันทึก Log
        await claimService.createClaimStatusLogs({
          claim_id: newClaimId.toString(),
          status: "1",
          remark: "สร้างรายการเคลมสินค้าใหม่ในระบบ",
          update_by: user?.user_id || 0,
        });
              // 4. บันทึก Log สถานะ "รอการพิจารณา" ต่อทันทีโดยอัตโนมัติ[cite: 24, 25]
        await claimService.createClaimStatusLogs({
          claim_id: newClaimId.toString(),
          status: "5",
          remark: "เปลี่ยนสถานะเป็นรอการพิจารณาโดยอัตโนมัติ",
          update_by: user?.user_id || 0,
        });

        message.success("สร้างรายการขอเคลมสินค้าสำเร็จ");
        navigate(`/customer/new-claim/processing/${newClaimId}`);
      } else {
        // ดึง message จาก response ถ้ามี
        message.error(resClaim?.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }
    } catch (error) {
      // 🟢 ปรับปรุงการจัดการ Error ให้ดึงข้อความจากหลายช่องทางและป้องกัน undefined
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        (typeof error === "string" ? error : "เกิดข้อผิดพลาดไม่ทราบสาเหตุ");
        
      console.error("Claim Submission Error:", error);
      message.error("เกิดข้อผิดพลาด: " + errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <Card>
        {/* ==================== Header ==================== */}
        <div className="border-l-4 border-blue-600 pl-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            สร้างรายการเคลม
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            กรุณากรอกข้อมูลการเคลมสินค้าให้ครบถ้วน
          </p>
        </div>

        {/* ==================== Form ==================== */}
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Space direction="vertical" size={24} className="w-full">
            {/* ข้อมูลผู้แจ้ง */}
            <Card title="ข้อมูลผู้แจ้ง">
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item label="วันที่แจ้ง">
                    <DatePicker className="w-full" defaultValue={dayjs()} disabled />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item label="ผู้แจ้ง">
                    <Input value={user?.full_name || "-"} disabled />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* ข้อมูลสินค้า */}
            <Card title="ข้อมูลสินค้า">
              <Row gutter={16}>
                {/* ชื่อสินค้า */}
                <Col xs={24} md={12}>
                  <Form.Item
                    label="ชื่อสินค้า"
                    name="productName"
                    rules={[
                      {
                        required: true,
                        message: "กรุณาเลือกสินค้า",
                      },
                    ]}
                  >
                    {/* 🟢 4. ใช้งาน AutoComplete ร่วมกับ productOptions จาก Backend */}
                    <AutoComplete
                      options={productOptions}
                      placeholder={loadingItems ? "กำลังโหลดสินค้า..." : "ค้นหาชื่อสินค้า"}
                      disabled={loadingItems}
                      filterOption={(input, option) =>
                        (option?.label ?? "").toLowerCase().includes(input.toLowerCase()) ||
                        (option?.value ?? "").toLowerCase().includes(input.toLowerCase())
                      }
                    />
                  </Form.Item>
                </Col>

                {/* Lot Number */}
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

                {/* จำนวนสินค้า */}
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

            {/* รายละเอียดการเคลม */}
            <Card title="รายละเอียดการเคลม">
              <Form.Item
                label="ประเภทการเคลม"
                name="claimType"
                rules={[{ required: true, message: "กรุณาประเภทการเคลม" }]}
              >
                <Select options={claimType} placeholder="เลือกประเภทการเคลม" />
              </Form.Item>

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

            {/* รูปภาพ */}
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
                        new Error("กรุณาอัปโหลดรูปภาพประกอบอย่างน้อย 1 รูป")
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

            {/* Submit Button */}
            <div className="flex justify-end gap-3">
              <Button type="primary" size="large" htmlType="submit" loading={submitting}>
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