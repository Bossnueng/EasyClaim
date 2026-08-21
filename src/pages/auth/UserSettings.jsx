import React, { useState, useEffect } from "react";
import { Card, Avatar, Button, Descriptions, message, Spin,Tag } from "antd";
import { UserOutlined, LogoutOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import loginService from "../../services/loginService";
import roleService from "../../services/roleService";

const UserSettings = () => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // ดึงข้อมูล User จาก localStorage ผ่าน loginService หรือ JSON.parse Direct
  const user = loginService.getCurrentUser();

    // 2. ดึงข้อมูล Roles ทั้งหมดจาก Backend ผ่าน roleService[cite: 10]
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await roleService.getRoles();
        if (res.status && Array.isArray(res.data)) {
          setRoles(res.data);
        }
      } catch (error) {
        message.error("ไม่สามารถดึงข้อมูลบทบาทผู้ใช้ได้");
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, []);

  // 3. ฟังก์ชันค้นหา role_name จาก role_id ที่ได้จาก API[cite: 10]
  const getRoleName = (roleId) => {
    const foundRole = roles.find((r) => r.role_id === roleId);
    return foundRole ? foundRole.description : `Role ID: ${roleId || "-"}`;
  };

  // ฟังก์ชัน Logout (เคลียร์ทั้ง Token และ User)
  const handleLogout = () => {
    loginService.logout();
    message.success("ออกจากระบบเรียบร้อยแล้ว");
    navigate("/login");
  };

  return (
    <div style={{ padding: "24px", maxWidth: "680px", margin: "0 auto" }}>
      <Card
        style={{
          borderRadius: "20px",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
          border: "1px solid #e2e8f0",
        }}
      >
        <Spin spinning={loading}>
          {/* ===== Header ส่วนโปรไฟล์ ===== */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              paddingBottom: "16px",
            }}
          >
            <Avatar
              size={88}
              icon={<UserOutlined />}
              style={{ backgroundColor: "#059669", marginBottom: "16px" }}
            />
            <h2 style={{ margin: "0 0 4px 0", fontSize: "22px", color: "#0f172a" }}>
              {user?.full_name || "Unassigned User"}
            </h2>
            <Tag color="emerald" style={{ borderRadius: "12px", padding: "2px 10px", fontSize: "13px" }}>
              {getRoleName(user?.role_id)}
            </Tag>
          </div>

          {/* ===== ข้อมูลโปรไฟล์ผู้ใช้ ===== */}
          <Descriptions
            title={<span style={{ color: "#334155" }}>ข้อมูลส่วนตัว</span>}
            column={1}
            bordered
            size="middle"
            style={{ marginBottom: "24px" }}
          >
            <Descriptions.Item label="รหัสผู้ใช้งาน (ID)">
              {user?.user_id || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="ชื่อผู้ใช้ (Username)">
              {user?.username || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="ชื่อ-นามสกุล">
              {user?.full_name || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="อีเมล">
              {user?.email || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="สิทธิ์การใช้งาน">
              {getRoleName(user?.role_id)}
            </Descriptions.Item>
            {user?.agent_id && (
              <Descriptions.Item label="รหัสตัวแทน (Agent ID)">
                {user.agent_id}
              </Descriptions.Item>
            )}
          </Descriptions>

          {/* ===== ปุ่ม Logout ===== */}
          <Button
            type="primary"
            danger
            block
            size="large"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            style={{
              height: "48px",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: "600",
            }}
          >
            Log Out
          </Button>
        </Spin>
      </Card>
    </div>
  );
};

export default UserSettings;