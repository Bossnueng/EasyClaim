import React from "react";
import { Form, Input, Button, Checkbox, Divider } from "antd";
import {
  SafetyCertificateFilled,
  GoogleOutlined,
  AppleFilled,
  FacebookFilled,
} from "@ant-design/icons";

const Login = () => {
  const onFinish = (values) => {
    console.log("Login Success:", values);
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
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          backgroundColor: "#ffffff",
          borderRadius: "32px",
          padding: "40px 32px",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)",
          border: "1px solid #f1f5f9",
          textAlign: "center",
        }}
      >
        {/* 1. Shield Icon Header */}
        <div
          style={{
            display: "inline-flex",
            justifyContent: "center",
            alignItems: "center",
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            backgroundColor: "#ecfdf5",
            marginBottom: "12px",
          }}
        >
          <SafetyCertificateFilled style={{ fontSize: "42px", color: "#059669" }} />
        </div>

        {/* Indicator dots */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "4px",
            marginBottom: "24px",
          }}
        >
          <span
            style={{
              width: "16px",
              height: "6px",
              borderRadius: "3px",
              backgroundColor: "#e2e8f0",
            }}
          />
          <span
            style={{
              width: "8px",
              height: "6px",
              borderRadius: "3px",
              backgroundColor: "#059669",
            }}
          />
        </div>

        {/* 2. Title Section */}
        <h2
          style={{
            fontSize: "26px",
            fontWeight: "700",
            color: "#0f172a",
            margin: "0 0 8px 0",
          }}
        >
          Welcome Back
        </h2>
        <p
          style={{
            fontSize: "14px",
            color: "#64748b",
            margin: "0 0 32px 0",
          }}
        >
          Log in to your account to continue.
        </p>

        {/* 3. Form Section */}
        <Form
          name="login_form"
          layout="vertical"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          requiredMark={false}
        >
          <Form.Item
            label={<span style={{ fontWeight: "600", color: "#334155" }}>Email</span>}
            name="email"
            rules={[
              { required: true, message: "Please enter your email!" },
              { type: "email", message: "Please enter a valid email!" },
            ]}
            style={{ marginBottom: "20px", textAlign: "left" }}
          >
            <Input
              placeholder="Enter your email"
              size="large"
              style={{
                borderRadius: "12px",
                padding: "10px 16px",
                borderColor: "#e2e8f0",
              }}
            />
          </Form.Item>

          <Form.Item
            label={<span style={{ fontWeight: "600", color: "#334155" }}>Password</span>}
            name="password"
            rules={[{ required: true, message: "Please enter your password!" }]}
            style={{ marginBottom: "16px", textAlign: "left" }}
          >
            <Input.Password
              placeholder="Enter your password"
              size="large"
              style={{
                borderRadius: "12px",
                padding: "10px 16px",
                borderColor: "#e2e8f0",
              }}
            />
          </Form.Item>

          {/* Remember me & Forgot Password */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "28px",
            }}
          >
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox style={{ color: "#64748b", fontSize: "13px" }}>
                Remember me
              </Checkbox>
            </Form.Item>
            <a
              href="#forgot"
              style={{
                color: "#475569",
                fontSize: "13px",
                fontWeight: "500",
                textDecoration: "none",
              }}
            >
              Forgot Password?
            </a>
          </div>

          {/* Submit Button */}
          <Form.Item style={{ marginBottom: "24px" }}>
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

        {/* 4. Social Login Divider */}
        <Divider
          style={{
            borderColor: "#f1f5f9",
            color: "#94a3b8",
            fontSize: "13px",
            margin: "0 0 24px 0",
          }}
        >
          Or
        </Divider>

        {/* Social Buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <Button
            shape="circle"
            size="large"
            style={{
              width: "48px",
              height: "48px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderColor: "#f1f5f9",
              boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
            }}
            icon={<GoogleOutlined style={{ fontSize: "20px", color: "#EA4335" }} />}
          />
          <Button
            shape="circle"
            size="large"
            style={{
              width: "48px",
              height: "48px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderColor: "#f1f5f9",
              boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
            }}
            icon={<AppleFilled style={{ fontSize: "20px", color: "#000000" }} />}
          />
          <Button
            shape="circle"
            size="large"
            style={{
              width: "48px",
              height: "48px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderColor: "#f1f5f9",
              boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
            }}
            icon={<FacebookFilled style={{ fontSize: "20px", color: "#1877F2" }} />}
          />
        </div>

        {/* 5. Footer Register Link */}
        <div style={{ fontSize: "14px", color: "#64748b" }}>
          Don't have an account?{" "}
          <a
            href="#signup"
            style={{
              color: "#059669",
              fontWeight: "600",
              textDecoration: "none",
            }}
          >
            Sign Up
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;