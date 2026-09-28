import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Form,
  Input,
  DatePicker,
  AutoComplete,
  Upload,
  Button,
  Card,
  Row,
  Col,
  Select,
  Space,
  message,
  Divider,
} from "antd";
import {
  UploadOutlined,
  CalendarOutlined,
  QuestionCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import claimService from "../../services/claimService";
import loginService from "../../services/loginService";
import itemService from "../../services/itemService";
import { getStatusId } from "../../constants/claimStatus";

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
      const currentUserId = parseInt(user?.user_id || user?.id || 0, 10);
      const agentId = parseInt(user?.agent_id || 0, 10);
      const generatedClaimNo = `CLM-${dayjs().format("YYYYMMDDHHmmss")}`;

      const formData = new FormData();
      formData.append("claim_no", generatedClaimNo);
      formData.append("agent_id", agentId);
      formData.append("current_status", "5");
      formData.append("created_by", currentUserId);

      // โครงสร้าง items Payload และจัดรูปภาพตาม `images[item_id]`
      const itemsPayload = [];

      values.items.forEach((itemForm) => {
        const selectedProduct = productOptions.find(
          (opt) => opt.value === itemForm.productName
        );

        if (selectedProduct) {
          const itemId = selectedProduct.id;

          // 1. เก็บรายการสินค้า
          itemsPayload.push({
            item_id: itemId,
            lot_no: itemForm.lot || null,
            mfg_date: itemForm.mfg ? dayjs(itemForm.mfg).format("YYYY-MM-DD") : null,
            expire_date: itemForm.exp ? dayjs(itemForm.exp).format("YYYY-MM-DD") : null,
            qty: parseFloat(itemForm.qty),
            remark: `[${itemForm.claimType}] ${itemForm.detail || ""}`,
          });

          // 2. แนบรูปภาพตรงตาม Key `images[${item_id}]` ที่ Backend คาดหวัง
          if (itemForm.images && itemForm.images.length > 0) {
            itemForm.images.forEach((file) => {
              if (file.originFileObj) {
                formData.append(`images[${itemId}]`, file.originFileObj);
              }
            });
          }
        }
      });

      if (itemsPayload.length === 0) {
        message.error("กรุณาระบุข้อมูลสินค้าอย่างน้อย 1 รายการที่ถูกต้อง");
        setSubmitting(false);
        return;
      }

      formData.append("items", JSON.stringify(itemsPayload));

      // เรียกสร้าง Claim หลัก
      const resClaim = await claimService.createClaim(formData);

      if (resClaim && resClaim.status && resClaim.claim_id) {
        const newClaimId = resClaim.claim_id;
        message.success("สร้างรายการขอเคลมสินค้าสำเร็จ");
        navigate(`/customer/detail-claim/${newClaimId}`);
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
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          items: [{}], // ค่าเริ่มต้นเปิดรายการสินค้าชิ้นแรกให้เลย 1 รายการ
        }}
      >
        <Row gutter={[16, 16]}>
          {/* ข้อมูลผู้แจ้ง */}
          <Col xs={24}>
            <Card title="ข้อมูลผู้แจ้ง" size="small" bodyStyle={{ padding: "16px" }}>
              <Row gutter={[12, 0]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="วันที่แจ้ง"
                    className="mb-3 sm:mb-0"
                    tooltip={{
                      title: "วันที่เริ่มทำรายการระบบจะดึงวันที่ปัจจุบันให้อัตโนมัติ",
                      icon: <QuestionCircleOutlined />,
                    }}
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
                    className="mb-0"
                    tooltip={{
                      title: "ชื่อและนามสกุลของผู้ใช้งานที่เข้าสู่ระบบ",
                      icon: <QuestionCircleOutlined />,
                    }}
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
          </Col>

          {/* Dynamic Items (วนลูปเพิ่มหลายรายการสินค้า) */}
          {/* Dynamic Items (วนลูปเพิ่มหลายรายการสินค้า - รูปแบบ 1 Column ระยะห่างน้อยลง) */}
<Col xs={24}>
  <Form.List name="items">
    {(fields, { add, remove }) => (
      <Space direction="vertical" size={12} className="w-full">
        {fields.map((field, index) => (
          <Card
            key={field.key}
            size="small"
            title={
              <span className="font-semibold text-base text-gray-800">
                รายการสินค้าที่ {index + 1}
              </span>
            }
            extra={
              fields.length > 1 && (
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => remove(field.name)}
                >
                  ลบรายการนี้
                </Button>
              )
            }
            bodyStyle={{ padding: "16px" }}
          >
            {/* 🟢 ปรับระยะห่างระหว่างแถวลงจาก 16 เหลือ 8 */}
            <Row gutter={[0, 8]}>
              {/* 1. ชื่อสินค้า */}
              <Col span={24}>
                <Form.Item
                  {...field}
                  label="ชื่อสินค้า"
                  name={[field.name, "productName"]}
                  style={{ marginBottom: 8 }} // 🟢 กระชับระยะห่าง
                  rules={[{ required: true, message: "กรุณาเลือกสินค้า" }]}
                  tooltip={{
                    title: "พิมพ์รหัสสินค้าหรือชื่อสินค้าเพื่อเลือกรายการ",
                    icon: <QuestionCircleOutlined />,
                  }}
                >
                  <AutoComplete
                    size="large"
                    className="w-full h-11"
                    options={productOptions}
                    placeholder={
                      loadingItems ? "กำลังโหลดสินค้า..." : "ค้นหาชื่อสินค้า"
                    }
                    disabled={loadingItems}
                    filterOption={(input, option) =>
                      (option?.label ?? "")
                        .toLowerCase()
                        .includes(input.toLowerCase()) ||
                      (option?.value ?? "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                  >
                    <Input
                      style={{ paddingLeft: "16px", paddingRight: "16px" }}
                      className="rounded-xl h-11"
                      placeholder={
                        loadingItems ? "กำลังโหลดสินค้า..." : "ค้นหาชื่อสินค้า"
                      }
                    />
                  </AutoComplete>
                </Form.Item>
              </Col>

              {/* 2. จำนวน */}
              <Col span={24}>
                <Form.Item
                  {...field}
                  label="จำนวน"
                  name={[field.name, "qty"]}
                  style={{ marginBottom: 8 }} // 🟢 กระชับระยะห่าง
                  getValueFromEvent={(e) =>
                    e.target.value.replace(/[^0-9]/g, "")
                  }
                  rules={[
                    { required: true, message: "กรุณาระบุจำนวน" },
                    {
                      pattern: /^[1-9][0-9]*$/,
                      message: "กรุณากรอกจำนวนเต็มที่มากกว่า 0 เท่านั้น",
                    },
                  ]}
                  tooltip={{
                    title: "ระบุจำนวนสินค้าที่ต้องการส่งเคลม (ตัวเลขเท่านั้น)",
                    icon: <QuestionCircleOutlined />,
                  }}
                >
                  <Input
                    size="large"
                    className="w-full rounded-xl h-11"
                    style={{ paddingLeft: "16px", paddingRight: "16px" }}
                    placeholder="ระบุจำนวน"
                    maxLength={6}
                    suffix={
                      <span className="text-gray-400 text-xs sm:text-sm font-normal">
                        ขวด/กระป๋อง
                      </span>
                    }
                  />
                </Form.Item>
              </Col>

              {/* 3. ประเภทการเคลม */}
              <Col span={24}>
                <Form.Item
                  {...field}
                  label="ประเภทการเคลม"
                  name={[field.name, "claimType"]}
                  style={{ marginBottom: 8 }} // 🟢 กระชับระยะห่าง
                  rules={[{ required: true, message: "กรุณาเลือกประเภทการเคลม" }]}
                  tooltip={{
                    title: "เลือกประเภทความเสียหายของสินค้า",
                    icon: <QuestionCircleOutlined />,
                  }}
                >
                  <Select
                    size="large"
                    className="w-full h-11 [&_.ant-select-selection-search]:!left-3 [&_.ant-select-selection-placeholder]:!left-3 [&_.ant-select-selection-item]:!left-3"
                    options={claimType}
                    placeholder="เลือกประเภทการเคลม"
                  />
                </Form.Item>
              </Col>
              
              {/* 4. รายละเอียด */}
              <Col span={24}>
                <Form.Item
                  {...field}
                  label="รายละเอียด"
                  name={[field.name, "detail"]}
                  style={{ marginBottom: 8 }} // 🟢 กระชับระยะห่าง
                  rules={[
                    { required: false, message: "กรุณาใส่รายละเอียดสาเหตุเพิ่มเติม" },
                  ]}
                  tooltip={{
                    title: "อธิบายลักษณะความเสียหาย หรือเหตุผลเพิ่มเติมโดยสังเขป",
                    icon: <QuestionCircleOutlined />,
                  }}
                >
                  <TextArea
                    rows={2} // 🟢 ปรับลดจำนวนบรรทัดลงเหลือ 2 ให้ดูสั้นลงกระชับขึ้น
                    className="rounded-xl p-2.5 px-4"
                    placeholder="อธิบายอาการเสียหรือรายละเอียดสาเหตุเพิ่มเติม"
                  />
                </Form.Item>
              </Col>

              {/* 5. รูปภาพประกอบรายการนี้ */}
              <Col span={24}>
                <Form.Item
                  {...field}
                  label="รูปภาพประกอบรายการนี้"
                  name={[field.name, "images"]}
                  valuePropName="fileList"
                  getValueFromEvent={(e) =>
                    Array.isArray(e) ? e : e && e.fileList
                  }
                  style={{ marginBottom: 0 }}
                  rules={[
                    {
                      validator: (_, value) => {
                        if (value && value.length > 0)
                          return Promise.resolve();
                        return Promise.reject(
                          new Error("กรุณาอัปโหลดรูปภาพประกอบอย่างน้อย 1 รูป")
                        );
                      },
                    },
                  ]}
                  tooltip={{
                    title:
                      "แนบรูปถ่ายสินค้าที่ชำรุด โดยถ่ายให้เห็นบริเวณที่เสียหายชัดเจน",
                    icon: <QuestionCircleOutlined />,
                  }}
                >
                  <Upload.Dragger
                    listType="picture"
                    beforeUpload={() => false}
                    multiple
                    className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl hover:border-emerald-500 transition-colors p-3" // 🟢 ปรับ Padding จาก 4 เหลือ 3
                  >
                    <p className="ant-upload-drag-icon flex justify-center mb-1">
                      <UploadOutlined className="text-xl text-emerald-600" />
                    </p>
                    <p className="text-sm font-medium text-slate-700 m-0">
                      คลิกหรือลากไฟล์มาวางที่นี่เพื่ออัปโหลด
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 mb-0">
                      รองรับไฟล์ภาพ JPG, PNG (สูงสุด 5MB)
                    </p>
                  </Upload.Dragger>
                </Form.Item>
              </Col>
            </Row>
          </Card>
        ))}

        {/* ปุ่มกดเพิ่มรายการสินค้า */}
        <Button
          type="dashed"
          onClick={() => add()}
          block
          icon={<PlusOutlined />}
          className="h-11 rounded-xl text-emerald-600 border-emerald-500 hover:text-emerald-700 hover:border-emerald-600 font-medium"
          style={{
            color: "#2563eb",
            borderColor: "#3b82f6",
            backgroundColor: "#eff6ff",
          }}
        >
          เพิ่มรายการสินค้าที่ต้องการเคลม
        </Button>
      </Space>
    )}
  </Form.List>
</Col>

          {/* Submit Button */}
          <Col xs={24}>
            <div className="pt-2">
              <Button
                type="primary"
                size="large"
                htmlType="submit"
                loading={submitting}
                block
                className="rounded-2xl"
                style={{
                  backgroundColor: "#059669",
                  borderColor: "#059669",
                  height: "48px",
                  fontSize: "16px",
                }}
              >
                ส่งข้อมูลการเคลมทั้งหมด
              </Button>
            </div>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default CustomerNewClaim;