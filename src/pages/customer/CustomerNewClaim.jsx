// src/pages/customer/CustomerNewClaim.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, DatePicker, AutoComplete, Upload, Button, Card, Row, Col, Select, Space, message } from "antd";
import { UploadOutlined, CalendarOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import loginService from "../../services/loginService";
import itemService from "../../services/itemService";
import claimService from "../../services/claimService";

const claimType = [
  { value: "แตกจากการขนส่ง", label: "แตกจากการขนส่ง" },
  { value: "แตกแห้งหลังการส่งสินค้า", label: "แตกแห้งหลังการส่งสินค้า" },
  { value: "อื่นๆ", label: "อื่นๆ" },
];
const { TextArea } = Input;

const CustomerNewClaim = () => {
  const navigate = useNavigate();
  const user = loginService.getCurrentUser();

  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [productOptions, setProductOptions] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchItems = async () => {
      setLoadingItems(true);
      try {
        const res = await itemService.getItems();
        if (res.status && Array.isArray(res.data)) {
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

      if (resClaim && resClaim.status && resClaim.claim_id) {
        const newClaimId = resClaim.claim_id;

        for (const file of fileList) {
          if (file.originFileObj) {
            await claimService.createClaimimageFormData(newClaimId, file.originFileObj);
          }
        }

        await claimService.createClaimStatusLogs({
          claim_id: newClaimId.toString(),
          status: "1",
          remark: "สร้างรายการเคลมสินค้าใหม่ในระบบ",
          update_by: user?.user_id || 0,
        });

        await claimService.createClaimStatusLogs({
          claim_id: newClaimId.toString(),
          status: "5",
          remark: "เปลี่ยนสถานะเป็นรอการพิจารณาโดยอัตโนมัติ",
          update_by: user?.user_id || 0,
        });

        message.success("สร้างรายการขอเคลมสินค้าสำเร็จ");
        navigate(`/customer/new-claim/processing/${newClaimId}`);
      } else {
        message.error(resClaim?.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }
    } catch (error) {
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
    <div className="p-2 sm:p-6 w-full">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight m-0">
          สร้างรายการเคลม
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1 m-0">
          กรุณากรอกข้อมูลการเคลมสินค้าให้ครบถ้วน
        </p>
      </div>

      {/* Form */}
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Row gutter={[16, 16]}>
          
          {/* คอลัมน์ซ้าย: ข้อมูลผู้แจ้ง + ข้อมูลสินค้า */}
          <Col xs={24} lg={12}>
            <Space direction="vertical" size={16} className="w-full">
              {/* ข้อมูลผู้แจ้ง */}
              <Card title="ข้อมูลผู้แจ้ง" size="small" bodyStyle={{ padding: "16px" }}>
                <Row gutter={[12, 0]}>
                  <Col xs={24} sm={12}>
                    <Form.Item 
                      label="วันที่แจ้ง" 
                      className="mb-3 sm:mb-4"
                      tooltip={{ title: "วันที่เริ่มทำรายการระบบจะดึงวันที่ปัจจุบันให้อัตโนมัติ", icon: <QuestionCircleOutlined /> }}
                    >
                      <DatePicker 
                        size="large" 
                        suffixIcon={<CalendarOutlined className="text-gray-400" />}
                        style={{ paddingLeft: "16px", paddingRight: "16px" }}
                        className="w-full rounded-xl h-11" 
                        defaultValue={dayjs()} 
                        disabled 
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} sm={12}>
                    <Form.Item 
                      label="ผู้แจ้ง" 
                      className="mb-0 sm:mb-4"
                      tooltip={{ title: "ชื่อและนามสกุลของผู้ใช้งานที่เข้าสู่ระบบ", icon: <QuestionCircleOutlined /> }}
                    >
                      <Input 
                        size="large" 
                        className="w-full rounded-xl h-11" 
                        style={{ paddingLeft: "16px", paddingRight: "16px" }}
                        value={user?.full_name || "-"} 
                        disabled 
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              {/* ข้อมูลสินค้า */}
              <Card title="ข้อมูลสินค้า" size="small" bodyStyle={{ padding: "16px" }}>
                <Row gutter={[12, 0]}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="ชื่อสินค้า"
                      name="productName"
                      className="mb-3 sm:mb-4"
                      rules={[{ required: true, message: "กรุณาเลือกสินค้า" }]}
                      tooltip={{ title: "พิมพ์รหัสสินค้าหรือชื่อสินค้าเพื่อเลือกรายการ", icon: <QuestionCircleOutlined /> }}
                    >
                      <AutoComplete
                        size="large"
                        className="w-full h-11"
                        options={productOptions}
                        placeholder={loadingItems ? "กำลังโหลดสินค้า..." : "ค้นหาชื่อสินค้า"}
                        disabled={loadingItems}
                        filterOption={(input, option) =>
                          (option?.label ?? "").toLowerCase().includes(input.toLowerCase()) ||
                          (option?.value ?? "").toLowerCase().includes(input.toLowerCase())
                        }
                      >
                        <Input 
                          style={{ paddingLeft: "16px", paddingRight: "16px" }} 
                          className="rounded-xl h-11" 
                          placeholder={loadingItems ? "กำลังโหลดสินค้า..." : "ค้นหาชื่อสินค้า"}
                        />
                      </AutoComplete>
                    </Form.Item>
                  </Col>

                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="หมายเลข Lot"
                      name="lot"
                      className="mb-3 sm:mb-4"
                      getValueFromEvent={(e) => e.target.value.toUpperCase()}
                      rules={[{ required: true, message: "กรุณาใส่เลข Lot" }]}
                      tooltip={{ title: "ระบุหมายเลข Lot สินค้าที่พิมพ์อยู่บนบรรจุภัณฑ์", icon: <QuestionCircleOutlined /> }}
                    >
                      <Input 
                        size="large" 
                        className="w-full rounded-xl h-11" 
                        style={{ paddingLeft: "16px", paddingRight: "16px" }}
                        placeholder="เช่น LOT240801" 
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={[12, 0]}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="วันที่ผลิต"
                      name="mfg"
                      className="mb-3 sm:mb-4"
                      rules={[{ required: true, message: "กรุณาเลือกวันที่" }]}
                      tooltip={{ title: "เลือกวันที่ผลิต (MFG) ตามที่ระบุบนสินค้า", icon: <QuestionCircleOutlined /> }}
                    >
                      <DatePicker 
                        size="large" 
                        suffixIcon={<CalendarOutlined className="text-gray-400" />}
                        style={{ paddingLeft: "16px", paddingRight: "16px" }}
                        className="w-full rounded-xl h-11" 
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="จำนวน"
                      name="qty"
                      className="mb-0 sm:mb-4"
                      getValueFromEvent={(e) => e.target.value.replace(/[^0-9]/g, "")}
                      rules={[
                        { required: true, message: "กรุณาระบุจำนวน" },
                        { pattern: /^[1-9][0-9]*$/, message: "กรุณากรอกจำนวนเต็มที่มากกว่า 0 เท่านั้น" },
                      ]}
                      tooltip={{ title: "ระบุจำนวนสินค้าที่ต้องการส่งเคลม (ตัวเลขเท่านั้น)", icon: <QuestionCircleOutlined /> }}
                    >
                      <Input 
                        size="large" 
                        className="w-full rounded-xl h-11" 
                        style={{ paddingLeft: "16px", paddingRight: "16px" }}
                        placeholder="ระบุจำนวน" 
                        maxLength={6} 
                        suffix={<span className="text-gray-400 text-xs sm:text-sm font-normal">ขวด/กระป๋อง</span>}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </Space>
          </Col>

          {/* คอลัมน์ขวา: รายละเอียดการเคลม + รูปภาพ + ปุ่มกดส่ง */}
          <Col xs={24} lg={12}>
            <Space direction="vertical" size={16} className="w-full">
              {/* รายละเอียดการเคลม */}
              <Card title="รายละเอียดการเคลม" size="small" bodyStyle={{ padding: "16px" }}>
                <Form.Item
                  label="ประเภทการเคลม"
                  name="claimType"
                  className="mb-3 sm:mb-4"
                  rules={[{ required: true, message: "กรุณาเลือกประเภทการเคลม" }]}
                  tooltip={{ title: "เลือกประเภทความเสียหายของสินค้า", icon: <QuestionCircleOutlined /> }}
                >
                  <Select 
                    size="large" 
                    className="w-full h-11 [&_.ant-select-selection-search]:!left-3 [&_.ant-select-selection-placeholder]:!left-3 [&_.ant-select-selection-item]:!left-3" 
                    options={claimType} 
                    placeholder="เลือกประเภทการเคลม" 
                  />
                </Form.Item>

                <Form.Item
                  label="รายละเอียด"
                  name="detail"
                  className="mb-0 sm:mb-4"
                  rules={[{ required: true, message: "กรุณาใส่รายละเอียดสาเหตุเพิ่มเติม" }]}
                  tooltip={{ title: "อธิบายลักษณะความเสียหาย หรือเหตุผลเพิ่มเติมโดยสังเขป", icon: <QuestionCircleOutlined /> }}
                >
                  <TextArea 
                    rows={4} 
                    className="rounded-xl p-3 px-4" 
                    placeholder="อธิบายอาการเสียหรือรายละเอียดสาเหตุเพิ่มเติม" 
                  />
                </Form.Item>
              </Card>

              {/* รูปภาพ */}
              <Card title="รูปภาพประกอบ" size="small" bodyStyle={{ padding: "16px" }}>
                <Form.Item
                  name="images"
                  className="mb-0"
                  rules={[
                    {
                      validator: () => {
                        if (fileList.length > 0) return Promise.resolve();
                        return Promise.reject(new Error("กรุณาอัปโหลดรูปภาพประกอบอย่างน้อย 1 รูป"));
                      },
                    },
                  ]}
                  tooltip={{ title: "แนบรูปถ่ายสินค้าที่ชำรุด โดยถ่ายให้เห็นเลข Lot และบริเวณที่เสียหายชัดเจน", icon: <QuestionCircleOutlined /> }}
                >
                  <Upload.Dragger
                    listType="picture"
                    beforeUpload={() => false}
                    fileList={fileList}
                    onChange={({ fileList }) => setFileList(fileList)}
                    multiple
                    className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl hover:border-emerald-500 transition-colors p-6"
                  >
                    <p className="ant-upload-drag-icon flex justify-center mb-2">
                      <UploadOutlined className="text-3xl text-emerald-600" />
                    </p>
                    <p className="text-sm font-medium text-slate-700 m-0">
                      คลิกหรือลากไฟล์มาวางที่นี่เพื่ออัปโหลด
                    </p>
                    <p className="text-xs text-slate-400 mt-1 mb-0">
                      รองรับไฟล์ภาพ JPG, PNG (สูงสุด 5MB)
                    </p>
                  </Upload.Dragger>
                </Form.Item>
              </Card>

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="primary"
                  size="large"
                  htmlType="submit"
                  loading={submitting}
                  block
                  className="rounded-2xl"
                  style={{ backgroundColor: "#059669", borderColor: "#059669", height: "48px", fontSize: "16px" }}
                >
                  ส่งข้อมูลการเคลม
                </Button>
              </div>
            </Space>
          </Col>

        </Row>
      </Form>
    </div>
  );
};

export default CustomerNewClaim;