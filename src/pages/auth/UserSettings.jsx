import React, { useState, useEffect } from "react";
import { Card, Avatar, Button, Descriptions, message, Spin, Tag } from "antd";
import { UserOutlined, LogoutOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import loginService from "../../services/loginService";
import roleService from "../../services/roleService";

const UserSettings = () => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // ดึงข้อมูล User จาก localStorage
  const user = loginService.getCurrentUser();

  // ดึงข้อมูล Roles ทั้งหมดจาก Backend
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

  // ฟังก์ชันค้นหา role_name จาก role_id
  const getRoleName = (roleId) => {
    const foundRole = roles.find((r) => r.role_id === roleId);
    return foundRole ? foundRole.description : `Role ID: ${roleId || "-"}`;
  };

  // ฟังก์ชัน Logout
  const handleLogout = () => {
    loginService.logout();
    message.success("ออกจากระบบเรียบร้อยแล้ว");
    navigate("/login");
  };

  return (
    // ปรับ Padding ด้านนอกเป็น p-3 sm:p-4 md:p-5 และใช้ w-full เพื่อลดพื้นที่ขอบสีเทา
    <div className="min-h-screen bg-gray-50/50 p-3 sm:p-4 md:p-5 w-full">
      <div className="w-full">
        <Card className="w-full rounded-2xl shadow-sm border border-slate-200">
          <Spin spinning={loading}>
            {/* Header ส่วนโปรไฟล์ */}
            <div className="flex flex-col items-center pb-4">
              <Avatar
                size={88}
                icon={<UserOutlined />}
                className="bg-emerald-600 mb-4"
              />
              <h2 className="m-0 mb-1 text-xl sm:text-2xl font-bold text-slate-800">
                {user?.full_name || "Unassigned User"}
              </h2>
              <Tag
                color="emerald"
                className="rounded-full px-3 py-0.5 text-xs sm:text-sm font-medium border-none bg-emerald-100 text-emerald-800"
              >
                {getRoleName(user?.role_id)}
              </Tag>
            </div>

            {/* ข้อมูลโปรไฟล์ผู้ใช้ */}
            <Descriptions
              title={<span className="text-slate-700 font-semibold">ข้อมูลส่วนตัว</span>}
              column={1}
              bordered
              size="middle"
              labelStyle={{ width: "30%", minWidth: "140px" }}
              contentStyle={{ width: "70%", wordBreak: "break-all" }}
              className="mb-6"
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

            {/* ปุ่ม Logout */}
            <Button
              type="primary"
              danger
              block
              size="large"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              className="h-12 rounded-xl text-base font-semibold"
            >
              Log Out
            </Button>
          </Spin>
        </Card>
      </div>
    </div>
  );
};

export default UserSettings;