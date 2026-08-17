import React from "react";
import { Card, Avatar, Button, Descriptions, Divider, message } from "antd";
import { UserOutlined, LogoutOutlined, KeyOutlined, BellOutlined,} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const UserSettings = () => {
  const navigate = useNavigate();

  // ดึงข้อมูล User จาก localStorage
  const savedUser = localStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;

  // ฟังก์ชัน Logout
  const handleLogout = () => {
    localStorage.removeItem("user");
    message.success("ออกจากระบบเรียบร้อยแล้ว");
    navigate("/login");
  };

  return (
    <div style={{ padding: "24px", maxWidth: "680px", margin: "0 auto" }}>
      <Card style={{borderRadius: "20px",boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",border: "1px solid #e2e8f0",}}>

        {/* ===== Header ส่วนโปรไฟล์ ===== */}
        <div style={{display: "flex",flexDirection: "column",alignItems: "center",paddingBottom: "16px",}}>
          <Avatar size={88} icon={<UserOutlined />} style={{ backgroundColor: "#059669", marginBottom: "16px" }}/>
          <h2 style={{ margin: "0 0 4px 0", fontSize: "22px", color: "#0f172a" }}>{user?.name || "Unassigned User"}</h2>
          <span style={{padding: "4px 12px",backgroundColor: user?.role === "staff" ? "#e0f2fe" : "#ecfdf5",color: user?.role === "staff" ? "#0369a1" : "#047857",borderRadius: "20px",fontSize: "13px",fontWeight: "600",textTransform: "uppercase",}}>
            {user?.role || "Guest"}
          </span>
        </div>

        {/* ===== ข้อมูลโปรไฟล์ผู้ใช้ ===== */}
        <Descriptions title={<span style={{ color: "#334155" }}>ข้อมูลส่วนตัว</span>} column={1} bordered size="middle" style={{ marginBottom: "24px" }}>
          <Descriptions.Item label="ชื่อผู้ใช้">{user?.username || "-"}</Descriptions.Item>
          {/**<Descriptions.Item label="ชื่อ">{user?.name || "-"}</Descriptions.Item> */}
          <Descriptions.Item label="ตำแหน่ง">{user?.role || "-"}</Descriptions.Item>
        </Descriptions>

        {/* --- รายการเมนูการตั้งค่า --- */}
        {/*
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <Button type="text" block icon={<KeyOutlined />} style={{textAlign: "left", height: "45px", fontSize: "15px", borderRadius: "10px",}} onClick={() => message.info("ระบบเปลี่ยนรหัสผ่านกำลังพัฒนา")}>
            เปลี่ยนรหัสผ่าน (Change Password)
          </Button>

          <Button type="text" block icon={<BellOutlined />} style={{textAlign: "left", height: "45px", fontSize: "15px", borderRadius: "10px",}} onClick={() => message.info("ระบบการแจ้งเตือนกำลังพัฒนา")}>
            การแจ้งเตือน (Notifications)
          </Button>
        </div>

        <Divider />
        */}
        

        {/* ===== ปุ่ม Logout ===== */}
        <Button type="primary" danger block size="large" icon={<LogoutOutlined />} onClick={handleLogout} style={{height: "48px",borderRadius: "12px",fontSize: "16px",fontWeight: "600",}}>
          Log Out
        </Button>
      </Card>
    </div>
  );
};

export default UserSettings;