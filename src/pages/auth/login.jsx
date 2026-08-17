import React from "react";
import { Form, Input, Button, message } from "antd";
import { useNavigate } from "react-router-dom";
import {
  SafetyCertificateFilled,
  UserOutlined,
  LockOutlined,
} from "@ant-design/icons";

const Login = () => {
  const navigate = useNavigate();

  const onFinish = async (values) => {
    const { username, password } = values;

    // 1. Mock Database / Users List
    const mockUsers = [
      {
        username: "staff01",
        password: "1234",
        role: "staff",
        name: "Somchai (Staff)",
      },
      {
        username: "customer01",
        password: "1234",
        role: "customer",
        name: "Somsri (Customer)",
      },
    ];

    // 2. ค้นหา User จากข้อมูลที่กรอก
    const foundUser = mockUsers.find(
      (u) => u.username === username && u.password === password,
    );

    if (foundUser) {
      // บันทึกข้อมูล Session/Token ลงใน LocalStorage (ถ้าต้องการนำไปใช้หน้าอื่นต่อ)
      localStorage.setItem("user", JSON.stringify(foundUser));

      message.success(`ยินดีต้อนรับ ${foundUser.name}`);

      // 3. เปลี่ยน Route ตาม Role ที่ตรวจพบ
      if (foundUser.role === "staff") {
        navigate("/staff");
      } else if (foundUser.role === "customer") {
        navigate("/customer");
      }
    } else {
      // หากรอกไม่ตรงกับข้อมูล Mock
      message.error(
        "Username หรือ Password ไม่ถูกต้อง (ลองใช้ staff01/1234 หรือ customer01/1234)",
      );
    }

    {
      /**
      try {
      // 1. เรียก API ตรวจสอบการเข้าสู่ระบบ (สมมติการยิง API หรือดึง response)
      // const response = await loginApi({ username, password });
      // const userRole = response.data.role; // ได้ค่าเช่น 'staff' หรือ 'customer'

      // ตัวอย่าง Mock Logic สำหรับทดสอบ:
      // หาก username มีคำว่า "staff" หรือ "admin" ให้ตั้งเป็น staff นอกนั้นเป็น customer
      const userRole = username.toLowerCase().includes("staff") ? "staff" : "customer";

      message.success("เข้าสู่ระบบสำเร็จ");

      // 2. ตรวจสอบ Role ที่ได้ตอบกลับมาจากระบบแล้ว Navigate ไปยังหน้าที่ถูกต้อง
      if (userRole === "staff") {
        navigate("/staff");
      } else if (userRole === "customer") {
        navigate("/customer");
      } else {
        // กรณีทั่วไป (ถ้ามี)
        navigate("/");
      }
    } catch (error) {
      message.error("Username หรือ Password ไม่ถูกต้อง");
    }
       */
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
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          backgroundColor: "#ffffff",
          borderRadius: "24px",
          padding: "40px 32px",
          boxShadow:
            "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)",
          border: "1px solid #e2e8f0",
          textAlign: "center",
        }}
      >
        {/* === Shield Icon Header === */}
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
          <SafetyCertificateFilled
            style={{ fontSize: "42px", color: "#059669" }}
          />
        </div>

        {/* === Title Section ===*/}
        <h2
          style={{
            fontSize: "24px",
            fontWeight: "700",
            color: "#0f172a",
            margin: "0 0 8px 0",
          }}
        >
          Sign In
        </h2>

        <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 28px 0" }}>
          กรอกข้อมูลชื่อผู้ใช้และรหัสผ่านเพื่อเข้าสู่ระบบ
        </p>

        {/* === Form Section === */}
        <Form
          name="login_form"
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
        >
          {/* --- Username --- */}
          <Form.Item
            label={
              <span style={{ fontWeight: "600", color: "#334155" }}>
                Username
              </span>
            }
            name="username"
            rules={[{ required: true, message: "กรุณากรอก Username!" }]}
            style={{ marginBottom: "20px", textAlign: "left" }}
          >
            <Input
              prefix={
                <UserOutlined
                  style={{ color: "#94a3b8", marginRight: "8px" }}
                />
              }
              placeholder="Enter your username"
              size="large"
              style={{
                borderRadius: "12px",
                padding: "10px 16px",
                borderColor: "#cbd5e1",
              }}
            />
          </Form.Item>

          {/* --- Password --- */}
          <Form.Item
            label={
              <span style={{ fontWeight: "600", color: "#334155" }}>
                Password
              </span>
            }
            name="password"
            rules={[{ required: true, message: "กรุณากรอก Password!" }]}
            style={{ marginBottom: "32px", textAlign: "left" }}
          >
            <Input.Password
              prefix={
                <LockOutlined
                  style={{ color: "#94a3b8", marginRight: "8px" }}
                />
              }
              placeholder="Enter your password"
              size="large"
              style={{
                borderRadius: "12px",
                padding: "10px 16px",
                borderColor: "#cbd5e1",
              }}
            />
          </Form.Item>

          {/* --- Submit Button --- */}
          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
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
              Sign In
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default Login;
