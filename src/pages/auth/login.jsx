import React, { useState } from "react";
import { Form, Input, Button, message } from "antd";
import { useNavigate } from "react-router-dom";
import {SafetyCertificateFilled,UserOutlined,LockOutlined,} from "@ant-design/icons";
import loginService from "../../services/loginService";

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // 🟢 เรียกใช้ API เช็คเข้าสู่ระบบจริง
      const res = await loginService.login(values);

      if (res.status) {
        message.success(res.message || `ยินดีต้อนรับ ${res.data.full_name}`);

        // 🟢 ตรวจสอบ role_id แยกหน้า Dashboard
        const roleId = res.data.role_id;
        if (roleId === 1) {
          // Admin (1) หรือ Driver (3)
          navigate("/staff");
        } else if (roleId === 2) {
          // Agent/Customer (2)
          navigate("/customer");
        } else {
          navigate("/staff");
        }
      } else {
        message.error(res.message || "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      }
    } catch (error) {
      message.error(
        error.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบ Backend"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", 
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f8fafc",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div style={{width: "100%",
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
        <div style={{ display: "inline-flex",
            justifyContent: "center",
            alignItems: "center",
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            backgroundColor: "#ecfdf5",
            marginBottom: "16px",
          }}
        >
          <SafetyCertificateFilled style={{ fontSize: "42px", color: "#059669" }}/>
        </div>

        {/* === Title Section ===*/}
        <h2 style={{ fontSize: "24px",fontWeight: "700",color: "#0f172a",margin: "0 0 8px 0",}}>
          Sign In
        </h2>

        <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 28px 0" }}>
          กรอกข้อมูลชื่อผู้ใช้และรหัสผ่านเพื่อเข้าสู่ระบบ
        </p>

        {/* === Form Section === */}
        <Form name="login_form" layout="vertical" onFinish={onFinish} requiredMark={false}>
          {/* --- Username --- */}
          <Form.Item label={<span style={{ fontWeight: "600", color: "#334155" }}>Username</span>}
            name="username"
            rules={[{ required: true, message: "กรุณากรอก Username!" }]}
            style={{ marginBottom: "20px", textAlign: "left" }}
          >
            <Input
              prefix={<UserOutlined style={{ color: "#94a3b8", marginRight: "8px" }}/>}
              placeholder="Enter your username"
              size="large"
              style={{borderRadius: "12px",padding: "10px 16px",borderColor: "#cbd5e1",}}
            />
          </Form.Item>

          {/* --- Password --- */}
          <Form.Item label={<span style={{ fontWeight: "600", color: "#334155" }}>Password</span>}
            name="password"
            rules={[{ required: true, message: "กรุณากรอก Password!" }]}
            style={{ marginBottom: "32px", textAlign: "left" }}
          >
            <Input.Password prefix={
              <LockOutlined style={{ color: "#94a3b8", marginRight: "8px" }}/>
            }
              placeholder="Enter your password"
              size="large"
              style={{borderRadius: "12px",padding: "10px 16px",borderColor: "#cbd5e1",}}
            />
          </Form.Item>

          {/* --- Submit Button --- */}
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block size="large"
              style={{height: "48px",
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
