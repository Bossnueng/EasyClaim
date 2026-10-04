import React, { useState, useEffect } from "react";
import { Card, Avatar, Button, Descriptions, message, Spin, Tag } from "antd";
import { UserOutlined, LogoutOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import loginService from "../../services/loginService";
import roleService from "../../services/roleService";
import agentService from "../../services/agentService";

const UserSettings = () => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = loginService.getCurrentUser();

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const [rolesRes, agentsRes] = await Promise.all([
          roleService.getRoles().catch(() => []),
          agentService.getAgent().catch(() => []),
        ]);

        if (rolesRes && rolesRes.status && Array.isArray(rolesRes.data)) {
          setRoles(rolesRes.data);
        } else if (Array.isArray(rolesRes)) {
          setRoles(rolesRes);
        }

        // จัดเก็บข้อมูล Agents
        if (Array.isArray(agentsRes)) {
          setAgents(agentsRes);
        } else if (agentsRes && Array.isArray(agentsRes.data)) {
          setAgents(agentsRes.data);
        }
      } catch (error) {
        console.error("Fetch Roles Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, []);

  const getRoleName = (roleId) => {
    if (!roleId) return "ไม่ระบุสิทธิ์";
    const foundRole = roles.find((r) => Number(r.role_id) === Number(roleId));
    if (foundRole) {
      return foundRole.role_name || foundRole.description || `Role ID: ${roleId}`;
    }
    
    // Mapping สำรองสำหรับสิทธิ์มาตรฐาน
    const defaultRoles = {
      1: "ผู้ดูแลระบบ (Admin)",
      2: "ตัวแทนจำหน่าย (Customer/Agent)",
      3: "เจ้าหน้าที่ (Staff)",
    };
    return defaultRoles[roleId] || `Role ID: ${roleId}`;
  };

  // 🟢 1. ปรับฟังก์ชันดึงชื่อตัวแทนจำหน่ายทั้งหมด (รองรับทั้ง Array และ ID เดี่ยว)
  const getAgentNames = (userObj) => {
    if (!userObj) return "-";

    // ดึงค่า agent_ids หรือ agent_id จาก user
    let rawAgentIds = userObj.agent_ids || userObj.agent_id;

    if (!rawAgentIds) return "-";

    // แปลงให้เป็น Array เสมอ
    let agentIdList = [];
    if (Array.isArray(rawAgentIds)) {
      agentIdList = rawAgentIds;
    } else if (typeof rawAgentIds === "string" && rawAgentIds.includes(",")) {
      agentIdList = rawAgentIds.split(",");
    } else {
      agentIdList = [rawAgentIds];
    }

    // ค้นหาชื่อของแต่ละ Agent ID
    const names = agentIdList
      .map((id) => {
        const targetStr = String(id).trim();
        const found = agents.find(
          (a) =>
            String(a.agent_code).trim() === targetStr ||
            String(a.agent_id).trim() === targetStr
        );
        return found ? found.agent_name : null;
      })
      .filter(Boolean); // กรองเอาเฉพาะชื่อที่พบ

    return names.length > 0 ? names.join(", ") : "-";
  };

  const handleLogout = () => {
    loginService.logout();
    message.success("ออกจากระบบเรียบร้อยแล้ว");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-3 sm:p-4 md:p-5 w-full">
      <div className="w-full">
        <Card className="w-full rounded-2xl shadow-sm border border-slate-200">
          <Spin spinning={loading}>
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
              
              {/* 🟢 2. แสดงเฉพาะกรณีที่ user มี role_id เท่ากับ 2 */}
              {Number(user?.role_id) === 2 && (
                <Descriptions.Item label="ตัวแทนจำหน่าย">
                  {getAgentNames(user)}
                </Descriptions.Item>
              )}
            </Descriptions>

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