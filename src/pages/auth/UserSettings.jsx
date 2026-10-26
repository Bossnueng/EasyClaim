import React, { useState, useEffect } from "react";
import { 
  Card, 
  Avatar, 
  Button, 
  message, 
  Spin, 
  Tag, 
  Modal, 
  Form, 
  Input, 
  Row, 
  Col, 
  Space 
} from "antd";
import { 
  UserOutlined, 
  LogoutOutlined, 
  EditOutlined, 
  LockOutlined, 
  MailOutlined, 
  PhoneOutlined,
  IdcardOutlined,
  SafetyCertificateOutlined,
  ShopOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import loginService from "../../services/loginService";
import roleService from "../../services/roleService";
import agentService from "../../services/agentService";
import userService from "../../services/userService";

const UserSettings = () => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  // State สำหรับ Modal แก้ไขข้อมูล
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // ดึงข้อมูล User ปัจจุบัน
  const [currentUser, setCurrentUser] = useState(loginService.getCurrentUser());

  useEffect(() => {
    const fetchUserDataAndOptions = async () => {
      setLoading(true);
      try {
        const [rolesRes, agentsRes, usersRes] = await Promise.all([
          roleService.getRoles().catch(() => []),
          agentService.getAgent().catch(() => []),
          userService.getUsers().catch(() => null),
        ]);

        if (rolesRes && rolesRes.status && Array.isArray(rolesRes.data)) {
          setRoles(rolesRes.data);
        } else if (Array.isArray(rolesRes)) {
          setRoles(rolesRes);
        }

        if (Array.isArray(agentsRes)) {
          setAgents(agentsRes);
        } else if (agentsRes && Array.isArray(agentsRes.data)) {
          setAgents(agentsRes.data);
        }

        const localUser = loginService.getCurrentUser();
        if (localUser && usersRes?.status && Array.isArray(usersRes.data)) {
          const matchedDbUser = usersRes.data.find(
            (u) => Number(u.user_id) === Number(localUser.user_id)
          );

          if (matchedDbUser) {
            const updatedUser = {
              ...localUser,
              ...matchedDbUser,
            };
            setCurrentUser(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));
          }
        }
      } catch (error) {
        console.error("Fetch User Profile Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDataAndOptions();
  }, []);

  const getRoleName = (roleId) => {
    if (!roleId) return "ไม่ระบุสิทธิ์";
    const foundRole = roles.find((r) => Number(r.role_id) === Number(roleId));
    if (foundRole) {
      return foundRole.role_name || foundRole.description || `Role ID: ${roleId}`;
    }
    
    const defaultRoles = {
      1: "ผู้ดูแลระบบ (Admin)",
      2: "ตัวแทนจำหน่าย (Customer/Agent)",
      3: "เจ้าหน้าที่ (Staff)",
    };
    return defaultRoles[roleId] || `Role ID: ${roleId}`;
  };

  const getAgentNames = (userObj) => {
    if (!userObj) return "-";
    let rawAgentIds = userObj.agent_ids || userObj.agent_id;
    if (!rawAgentIds) return "-";

    let agentIdList = [];
    if (Array.isArray(rawAgentIds)) {
      agentIdList = rawAgentIds;
    } else if (typeof rawAgentIds === "string" && rawAgentIds.includes(",")) {
      agentIdList = rawAgentIds.split(",");
    } else {
      agentIdList = [rawAgentIds];
    }

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
      .filter(Boolean);

    return names.length > 0 ? names.join(", ") : "-";
  };

  const handleOpenEditModal = () => {
    form.setFieldsValue({
      username: currentUser?.username || "",
      password: "",
      full_name: currentUser?.full_name || "",
      email: currentUser?.email || "",
      phone: currentUser?.phone || "",
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        user_id: currentUser.user_id,
        role_id: currentUser.role_id,
        agent_ids: currentUser.agent_ids || (currentUser.agent_id ? [currentUser.agent_id] : []),
      };

      await userService.updateUser(currentUser.user_id, payload);

      const updatedUserData = {
        ...currentUser,
        username: values.username,
        full_name: values.full_name,
        email: values.email,
        phone: values.phone,
      };

      localStorage.setItem("user", JSON.stringify(updatedUserData));
      setCurrentUser(updatedUserData);

      message.success("อัปเดตข้อมูลส่วนตัวเรียบร้อยแล้ว");
      setIsEditModalOpen(false);
    } catch (err) {
      message.error("แก้ไขข้อมูลล้มเหลว: " + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    loginService.logout();
    message.success("ออกจากระบบเรียบร้อยแล้ว");
    navigate("/login");
  };

  const InfoItem = ({ icon, label, value }) => (
    <div className="py-2.5 px-2 sm:py-4 sm:px-3">
      <div className="flex items-center gap-2.5 text-slate-500 text-xs sm:text-sm font-normal mb-1.5">
        <span className="text-base sm:text-xl text-emerald-600">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="text-slate-800 font-medium text-sm sm:text-base break-words pl-7 sm:pl-8">
        {value || "-"}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 p-3 sm:p-6 md:p-8 w-full">
      <div className="w-full">
        <Card className="w-full rounded-2xl shadow-sm border border-slate-200 p-2 sm:p-6 md:p-8">
          <Spin spinning={loading}>
            
            {/* Header Profile + Avatar */}
            <div 
              className="flex flex-col items-center justify-center pt-2"
              style={{ marginBottom: "40px" }}
            >
              <Avatar
                size={88}
                icon={<UserOutlined />}
                className="bg-emerald-600 mb-4 shadow-md ring-4 ring-emerald-50"
              />
              <h2 className="m-0 mb-3 text-lg sm:text-3xl font-bold text-slate-800 text-center">
                {currentUser?.full_name || "Unassigned User"}
              </h2>
              <div>
                <Tag
                  color="emerald"
                  className="rounded-full px-4 py-1 text-xs sm:text-sm font-semibold border-none bg-emerald-100 text-emerald-800"
                >
                  {getRoleName(currentUser?.role_id)}
                </Tag>
              </div>
            </div>

            {/* 🟢 2. ปรับการจัดวางส่วนหัวข้อ + ปุ่มแก้ไขข้อมูลให้ Responsive ไม่ตกบรรทัด */}
            <div 
              className="flex flex-row justify-between items-center w-full gap-2 sm:gap-4 px-1"
              style={{ marginBottom: "32px" }}
            >
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <div className="w-1.5 h-6 sm:h-7 bg-emerald-600 rounded-full"></div>
                <h3 className="m-0 text-slate-800 font-bold text-base sm:text-xl whitespace-nowrap">
                  ข้อมูลส่วนตัว
                </h3>
              </div>
              <Button
  type="primary"
  onClick={handleOpenEditModal}
  className="rounded-xl font-medium flex items-center justify-center shadow-xs text-xs sm:text-sm whitespace-nowrap shrink-0"
  style={{
    paddingLeft: "24px",
    paddingRight: "24px",
    paddingTop: "8px",
    paddingBottom: "8px",
    height: "auto"
  }}
>
  แก้ไขข้อมูล
</Button>
            </div>

            {/* รายการข้อมูลผู้ใช้งาน */}
            <div 
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 px-1"
              style={{ marginBottom: "40px" }}
            >
              
              {/**
               <InfoItem 
                icon={<IdcardOutlined />} 
                label="รหัสผู้ใช้งาน (ID)" 
                value={currentUser?.user_id ? `#${currentUser.user_id}` : "-"} 
              />
               */}
              <InfoItem 
                icon={<UserOutlined />} 
                label="ชื่อผู้ใช้ (Username)" 
                value={currentUser?.username} 
              />
              <InfoItem 
                icon={<UserOutlined />} 
                label="ชื่อ-นามสกุล" 
                value={currentUser?.full_name} 
              />
              <InfoItem 
                icon={<MailOutlined />} 
                label="อีเมล" 
                value={currentUser?.email} 
              />
              <InfoItem 
                icon={<PhoneOutlined />} 
                label="เบอร์โทรศัพท์" 
                value={currentUser?.phone} 
              />
              {/**
               <InfoItem 
                icon={<SafetyCertificateOutlined />} 
                label="สิทธิ์การใช้งาน" 
                value={getRoleName(currentUser?.role_id)} 
              />
               */}
              
              
              {Number(currentUser?.role_id) === 2 && (
                <div className="sm:col-span-2">
                  <InfoItem 
                    icon={<ShopOutlined />} 
                    label="ตัวแทนจำหน่าย" 
                    value={getAgentNames(currentUser)} 
                  />
                </div>
              )}
            </div>

            {/* ปุ่ม Log Out */}
            <div 
              className="border-t border-slate-200 pt-6"
              style={{ marginTop: "40px" }}
            >
              <Button
                type="primary"
                danger
                block
                size="large"
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                className="h-11 sm:h-12 rounded-xl text-sm sm:text-base font-semibold shadow-xs hover:bg-rose-600"
              >
                Log Out
              </Button>
            </div>

          </Spin>
        </Card>
      </div>

      {/* Modal แก้ไขข้อมูลส่วนตัว */}
      <Modal
        title={
          <div className="text-lg font-bold text-slate-800 pb-2 border-b border-slate-100">
            แก้ไขข้อมูลส่วนตัว
          </div>
        }
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        footer={null}
        destroyOnClose
        width={680}
        style={{ top: 20 }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEditSubmit}
          className="mt-4"
        >
          <Row gutter={[16, 8]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="username"
                label="Username"
                rules={[{ required: true, message: "กรุณากรอก Username" }]}
              >
                <Input prefix={<UserOutlined />} placeholder="Username" className="rounded-lg h-10" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name="password"
                label="Password (เปลี่ยนใหม่)"
              >
                <Input.Password prefix={<LockOutlined />} placeholder="รหัสผ่านใหม่ (ถ้ามี)" className="rounded-lg h-10" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name="full_name"
                label="ชื่อ-นามสกุล"
                rules={[{ required: true, message: "กรุณากรอก ชื่อ-นามสกุล" }]}
              >
                <Input prefix={<UserOutlined style={{ color: "#bfbfbf" }} />} placeholder="ชื่อ-นามสกุล" className="rounded-lg h-10" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name="email"
                label="อีเมล"
                rules={[{ type: "email", message: "รูปแบบอีเมลไม่ถูกต้อง" }]}
              >
                <Input prefix={<MailOutlined />} placeholder="example@email.com" className="rounded-lg h-10" />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item name="phone" label="เบอร์โทรศัพท์">
                <Input prefix={<PhoneOutlined />} placeholder="08XXXXXXXX" className="rounded-lg h-10" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, marginTop: 16, textAlign: "right" }}>
            <Space size="middle">
              <Button 
                onClick={() => setIsEditModalOpen(false)}
                className="h-10 px-6 rounded-xl"
              >
                ยกเลิก
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={submitting}
                className="h-10 px-6 rounded-xl"
              >
                บันทึกการแก้ไข
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserSettings;