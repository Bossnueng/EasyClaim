import React, { useState } from "react";
import { Form, Input, Button, Alert, Result, Radio } from "antd";
import { Link } from "react-router-dom";
import {
  UserAddOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LockOutlined,
  IdcardOutlined,
  TeamOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import loginService from "../../services/loginService";

const MIN_PASSWORD_LENGTH = 8;
const USER_TYPE = { EMPLOYEE: "employee", EXTERNAL: "external" };

const cardStyle = {
  width: "100%",
  maxWidth: "460px",
  backgroundColor: "#ffffff",
  borderRadius: "24px",
  padding: "40px 32px",
  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)",
  border: "1px solid #e2e8f0",
  textAlign: "center",
};

const inputStyle = { borderRadius: "12px", padding: "10px 16px", borderColor: "#cbd5e1" };
const labelStyle = { fontWeight: "600", color: "#334155" };
const iconStyle = { color: "#94a3b8", marginRight: "8px" };

const typeOptionStyle = (active) => ({
  flex: 1,
  height: "auto",
  padding: "12px 10px",
  borderRadius: "12px",
  textAlign: "center",
  lineHeight: 1.4,
  borderColor: active ? "#059669" : "#cbd5e1",
  background: active ? "#ecfdf5" : "#ffffff",
  color: "#0f172a",
});

const Register = () => {
  const [form] = Form.useForm();
  const userType = Form.useWatch("user_type", form);
  const isEmployee = userType === USER_TYPE.EMPLOYEE;
  const isExternal = userType === USER_TYPE.EXTERNAL;

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [done, setDone] = useState(null); // { username, isEmployee }

  const onFinish = async (values) => {
    setLoading(true);
    setErrorMessage("");
    const base = {
      user_type: values.user_type,
      full_name: values.full_name.trim(),
      email: (values.email || "").trim(),
      phone: (values.phone || "").trim(),
      password: values.password,
    };
    const payload =
      values.user_type === USER_TYPE.EMPLOYEE
        ? { ...base, employee_id: values.employee_id.trim() }
        : { ...base, username: values.username.trim() };
    try {
      const res = await loginService.register(payload);
      if (res?.status) setDone({ username: res.username, isEmployee: values.user_type === USER_TYPE.EMPLOYEE });
      else setErrorMessage(res?.message || "สมัครใช้งานไม่สำเร็จ");
    } catch (error) {
      setErrorMessage(error?.message || "สมัครใช้งานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f8fafc",
        padding: "20px",
        boxSizing: "border-box",
        fontFamily: "'Prompt', 'Kanit', 'Inter', sans-serif",
      }}
    >
      <div style={cardStyle}>
        {done ? (
          <Result
            status="success"
            title="สมัครใช้งานเรียบร้อย"
            subTitle={
              <>
                บัญชีของคุณอยู่ระหว่างรอผู้ดูแลระบบอนุมัติ เมื่ออนุมัติแล้วจึงจะเข้าสู่ระบบได้
                <div style={{ marginTop: 12, color: "#0f172a" }}>
                  เข้าสู่ระบบด้วย{done.isEmployee ? "รหัสพนักงาน" : "ชื่อผู้ใช้"}: <b>{done.username}</b>
                </div>
              </>
            }
            style={{ padding: "8px 0" }}
            extra={
              <Link to="/login">
                <Button
                  type="primary"
                  size="large"
                  style={{ borderRadius: "24px", backgroundColor: "#059669", borderColor: "#059669", paddingInline: 32 }}
                >
                  กลับไปหน้าเข้าสู่ระบบ
                </Button>
              </Link>
            }
          />
        ) : (
          <>
            <div
              style={{
                display: "inline-flex",
                justifyContent: "center",
                alignItems: "center",
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                backgroundColor: "#ecfdf5",
                marginBottom: "16px",
              }}
            >
              <UserAddOutlined style={{ fontSize: "36px", color: "#059669" }} />
            </div>

            <h2 style={{ fontSize: "24px", fontWeight: "600", color: "#0f172a", margin: "0 0 8px 0", letterSpacing: "0.5px" }}>
              ลงทะเบียนเข้าใช้งาน
            </h2>
            <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 24px 0" }}>
              บัญชีจะใช้งานได้หลังผู้ดูแลระบบอนุมัติ
            </p>

            {errorMessage && (
              <Alert
                message={errorMessage}
                type="error"
                showIcon
                closable
                onClose={() => setErrorMessage("")}
                style={{ marginBottom: "20px", textAlign: "left", borderRadius: "10px", fontSize: "14px" }}
              />
            )}

            <Form
              form={form}
              name="register_form"
              layout="vertical"
              onFinish={onFinish}
              onValuesChange={() => errorMessage && setErrorMessage("")}
              requiredMark={false}
              style={{ textAlign: "left" }}
            >
              {/* ขั้นที่ 1: เป็นพนักงานบริษัท หรือบุคคลภายนอก */}
              <Form.Item
                label={<span style={labelStyle}>คุณเป็น</span>}
                name="user_type"
                rules={[{ required: true, message: "กรุณาเลือกประเภทผู้ใช้งาน" }]}
              >
                <Radio.Group style={{ display: "flex", gap: 12, width: "100%" }}>
                  <Radio.Button value={USER_TYPE.EMPLOYEE} style={typeOptionStyle(isEmployee)}>
                    <TeamOutlined style={{ fontSize: 20, color: "#059669" }} />
                    <div style={{ fontWeight: 600 }}>พนักงานบริษัท</div>
                  </Radio.Button>
                  <Radio.Button value={USER_TYPE.EXTERNAL} style={typeOptionStyle(isExternal)}>
                    <ShopOutlined style={{ fontSize: 20, color: "#059669" }} />
                    <div style={{ fontWeight: 600 }}>บุคคลภายนอก</div>
                  </Radio.Button>
                </Radio.Group>
              </Form.Item>

              {/* ขั้นที่ 2: กรอกข้อมูลตามประเภท */}
              {userType && (
                <>
                  {isEmployee ? (
                    <Form.Item
                      label={<span style={labelStyle}>รหัสพนักงาน</span>}
                      name="employee_id"
                      rules={[
                        { required: true, whitespace: true, message: "กรุณากรอกรหัสพนักงาน" },
                        { pattern: /^\d{4,12}$/, message: "รหัสพนักงานต้องเป็นตัวเลข 4-12 หลัก" },
                      ]}
                    >
                      <Input
                        prefix={<IdcardOutlined style={iconStyle} />}
                        placeholder="รหัสพนักงาน"
                        size="large"
                        inputMode="numeric"
                        autoComplete="username"
                        style={inputStyle}
                      />
                    </Form.Item>
                  ) : (
                    <Form.Item
                      label={<span style={labelStyle}>ชื่อผู้ใช้</span>}
                      name="username"
                      rules={[
                        { required: true, whitespace: true, message: "กรุณากรอกชื่อผู้ใช้" },
                        {
                          pattern: /^(?=.*[A-Za-z])[A-Za-z0-9._-]{4,50}$/,
                          message: "ใช้ได้เฉพาะ a-z, 0-9, . _ - ยาว 4-50 ตัว และต้องมีตัวอักษร",
                        },
                      ]}
                    >
                      <Input
                        prefix={<UserOutlined style={iconStyle} />}
                        placeholder="ชื่อผู้ใช้"
                        size="large"
                        autoComplete="username"
                        style={inputStyle}
                      />
                    </Form.Item>
                  )}

                  <Form.Item
                    label={<span style={labelStyle}>ชื่อ-นามสกุล</span>}
                    name="full_name"
                    rules={[
                      { required: true, whitespace: true, message: "กรุณากรอกชื่อ-นามสกุล" },
                      { max: 200, message: "ไม่เกิน 200 ตัวอักษร" },
                    ]}
                  >
                    <Input prefix={<UserOutlined style={iconStyle} />} placeholder="ชื่อ-นามสกุล" size="large" style={inputStyle} />
                  </Form.Item>

                  <Form.Item
                    label={<span style={labelStyle}>อีเมล{isEmployee ? " (ไม่บังคับ)" : ""}</span>}
                    name="email"
                    rules={[
                      { required: isExternal, message: "กรุณากรอกอีเมล" },
                      { type: "email", message: "รูปแบบอีเมลไม่ถูกต้อง" },
                      { max: 150, message: "ไม่เกิน 150 ตัวอักษร" },
                    ]}
                  >
                    <Input prefix={<MailOutlined style={iconStyle} />} placeholder="name@example.com" size="large" autoComplete="email" style={inputStyle} />
                  </Form.Item>

                  <Form.Item label={<span style={labelStyle}>เบอร์โทรศัพท์</span>} name="phone" rules={[{ max: 20, message: "ไม่เกิน 20 ตัวอักษร" }]}>
                    <Input prefix={<PhoneOutlined style={iconStyle} />} placeholder="เบอร์โทรศัพท์" size="large" autoComplete="tel" style={inputStyle} />
                  </Form.Item>

                  <Form.Item
                    label={<span style={labelStyle}>รหัสผ่าน</span>}
                    name="password"
                    rules={[
                      { required: true, message: "กรุณากรอกรหัสผ่าน" },
                      { min: MIN_PASSWORD_LENGTH, message: `อย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร` },
                    ]}
                    hasFeedback
                  >
                    <Input.Password
                      prefix={<LockOutlined style={iconStyle} />}
                      placeholder={`อย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`}
                      size="large"
                      autoComplete="new-password"
                      style={inputStyle}
                    />
                  </Form.Item>

                  <Form.Item
                    label={<span style={labelStyle}>ยืนยันรหัสผ่าน</span>}
                    name="confirm"
                    dependencies={["password"]}
                    hasFeedback
                    rules={[
                      { required: true, message: "กรุณายืนยันรหัสผ่าน" },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          return !value || getFieldValue("password") === value
                            ? Promise.resolve()
                            : Promise.reject(new Error("รหัสผ่านไม่ตรงกัน"));
                        },
                      }),
                    ]}
                    style={{ marginBottom: "28px" }}
                  >
                    <Input.Password
                      prefix={<LockOutlined style={iconStyle} />}
                      placeholder="ยืนยันรหัสผ่าน"
                      size="large"
                      autoComplete="new-password"
                      style={inputStyle}
                    />
                  </Form.Item>

                  <Form.Item style={{ marginBottom: 0 }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      block
                      size="large"
                      style={{
                        height: "48px",
                        borderRadius: "24px",
                        backgroundColor: "#059669",
                        borderColor: "#059669",
                        fontSize: "16px",
                        fontWeight: "600",
                        boxShadow: "0 4px 12px rgba(5, 150, 105, 0.25)",
                      }}
                    >
                      ลงทะเบียน
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form>

            <div style={{ marginTop: "20px", fontSize: "14px", color: "#64748b" }}>
              มีบัญชีแล้ว?{" "}
              <Link to="/login" style={{ color: "#059669", fontWeight: 600 }}>
                เข้าสู่ระบบ
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Register;
