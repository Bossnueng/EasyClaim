import React, { useState, useEffect, useRef } from "react";
import {
  Table,
  Button,
  Input,
  Modal,
  Form,
  Select,
  Tag,
  Space,
  Card,
  Popconfirm,
  message,
  Typography,
  Radio,
  Row,
  Col,
  Alert,
  Badge,
} from "antd";
import {
  CheckCircleOutlined,
  UserAddOutlined,
  EditOutlined,
  SearchOutlined,
  ReloadOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LockOutlined,
  ShopOutlined,
  IdcardOutlined,
  StopOutlined,DownOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";

import userService from "../../services/userService";
import roleService from "../../services/roleService";
import agentService from "../../services/agentService";

const { Title, Text } = Typography;

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [globalSearchText, setGlobalSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [pageSize, setPageSize] = useState(10);

  // User Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Agent Modal State
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [agentSubmitting, setAgentSubmitting] = useState(false);

  // Approve Modal State (ผู้สมัครผ่านหน้าเว็บ)
  const [approvingUser, setApprovingUser] = useState(null);
  const [approveSubmitting, setApproveSubmitting] = useState(false);

  const [form] = Form.useForm();
  const [agentForm] = Form.useForm();
  const [approveForm] = Form.useForm();
  const searchInput = useRef(null);

  // users.status: '1'/'ACTIVE' ใช้งาน, '0' ปิด, 'PENDING' รออนุมัติ, 'REJECTED' ไม่อนุมัติ
  const getStatusKey = (status) => {
    const s = String(status ?? "").trim().toUpperCase();
    if (s === "PENDING") return "pending";
    if (s === "REJECTED") return "rejected";
    if (s === "0" || s === "INACTIVE") return "inactive";
    return "active";
  };
  const isUserPending = (status) => getStatusKey(status) === "pending";
  const isUserRejected = (status) => getStatusKey(status) === "rejected";
  const isUserInactive = (status) => ["inactive", "rejected"].includes(getStatusKey(status));
  const pendingCount = users.filter((u) => isUserPending(u.status)).length;

  // ผู้ลงทะเบียนผ่านหน้าเว็บ: username ตัวเลขล้วน = พนักงาน (รหัสพนักงาน), มีตัวอักษร = บุคคลภายนอก
  const isEmployeeUsername = (username) => /^\d+$/.test(String(username ?? ""));
  const applicantTypeTag = (record) =>
    isEmployeeUsername(record.username) ? (
      <Tag color="geekblue" icon={<IdcardOutlined />} style={{ fontSize: 11, marginTop: 4 }}>พนักงาน</Tag>
    ) : (
      <Tag color="purple" icon={<ShopOutlined />} style={{ fontSize: 11, marginTop: 4 }}>บุคคลภายนอก</Tag>
    );

  // แจ้งเมนูด้านข้างให้อัปเดตตัวเลขผู้รออนุมัติ
  const notifyPendingChanged = () => window.dispatchEvent(new Event("bev-claim:pending-users-changed"));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resUsers, resRoles, resAgents] = await Promise.all([
        userService.getUsers(),
        roleService.getRoles(),
        agentService.getAgent(),
      ]);

      if (resUsers?.status) {
        setUsers(resUsers.data || []);
      }
      if (resRoles?.status) setRoles(resRoles.data || []);
      
      const agentList = Array.isArray(resAgents)
        ? resAgents
        : resAgents?.data || [];
      setAgents(agentList);
    } catch (err) {
      message.error("โหลดข้อมูลล้มเหลว: " + (err.message || "เกิดข้อผิดพลาด"));
    } finally {
      setLoading(false);
    }
  };

  const getColumnSearchProps = (dataIndex, title) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          ref={searchInput}
          placeholder={`ค้นหา ${title}`}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => confirm()}
          style={{ marginBottom: 8, display: "block" }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => confirm()}
            icon={<SearchOutlined />}
            size="small"
            style={{ paddingLeft: 16, paddingRight: 16 }}
          >
            ค้นหา
          </Button>
          <Button
            onClick={() => {
              clearFilters && clearFilters();
              confirm();
            }}
            size="small"
            style={{ paddingLeft: 16, paddingRight: 16 }}
          >
            ล้างค่า
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => (
      <SearchOutlined style={{ color: filtered ? "#1677ff" : undefined }} />
    ),
    onFilter: (value, record) => {
      const cellValue = record[dataIndex];
      return cellValue
        ? cellValue.toString().toLowerCase().includes(value.toLowerCase())
        : false;
    },
    onFilterDropdownOpenChange: (visible) => {
      if (visible) {
        setTimeout(() => searchInput.current?.select(), 100);
      }
    },
  });

  const handleOpenModal = (user = null) => {
    setEditingUser(user);
    if (user) {
      let selectedAgentIds = [];
      if (Array.isArray(user.agent_ids)) {
        selectedAgentIds = user.agent_ids.map(Number);
      } else if (user.agent_id !== undefined && user.agent_id !== null) {
        selectedAgentIds = [Number(user.agent_id)];
      }

      form.setFieldsValue({
        username: user.username || "",
        password: "",
        full_name: user.full_name || "",
        email: user.email || "",
        phone: user.phone || "",
        role_id: user.role_id ? Number(user.role_id) : undefined,
        agent_ids: selectedAgentIds,
      });
    } else {
      form.resetFields();
      if (roles.length > 0) {
        form.setFieldValue("role_id", Number(roles[0].role_id));
      }
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    const agentIds = values.agent_ids || [];
    const payload = {
      ...values,
      role_id: Number(values.role_id),
      agent_ids: agentIds.map(Number),
      agent_id: agentIds.length > 0 ? Number(agentIds[0]) : null,
    };

    try {
      if (editingUser) {
        await userService.updateUser(editingUser.user_id, payload);
        message.success("อัปเดตข้อมูลผู้ใช้งานเรียบร้อย");
      } else {
        await userService.createUser(payload);
        message.success("บันทึกผู้ใช้งานใหม่เรียบร้อย");
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      message.error("ดำเนินการไม่สำเร็จ: " + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAgentSubmit = async (values) => {
    setAgentSubmitting(true);
    try {
      await agentService.createAgent(values);
      message.success("ลงทะเบียน Agent เรียบร้อยแล้ว");
      setIsAgentModalOpen(false);
      agentForm.resetFields();
      fetchData();
    } catch (err) {
      message.error("ลงทะเบียน Agent ล้มเหลว: " + (err.message || err));
    } finally {
      setAgentSubmitting(false);
    }
  };

  const handleOpenApprove = (user) => {
    setApprovingUser(user);
    approveForm.resetFields();
    setTimeout(() => approveForm.setFieldsValue({ role_id: undefined, agent_ids: [] }), 0);
  };

  const handleApprove = async (values) => {
    if (!approvingUser) return;
    setApproveSubmitting(true);
    try {
      const roleId = Number(values.role_id);
      await userService.approveUser(approvingUser.user_id, {
        role_id: roleId,
        agent_ids: roleId === 1 ? [] : (values.agent_ids || []).map(Number),
      });
      message.success(`อนุมัติ "${approvingUser.full_name || approvingUser.email}" เรียบร้อย`);
      setApprovingUser(null);
      fetchData();
      notifyPendingChanged();
    } catch (err) {
      message.error("อนุมัติไม่สำเร็จ: " + (err.message || err));
    } finally {
      setApproveSubmitting(false);
    }
  };

  const handleReject = async (record) => {
    try {
      await userService.rejectUser(record.user_id);
      message.success(`ไม่อนุมัติ "${record.full_name || record.email}" เรียบร้อย`);
      fetchData();
      notifyPendingChanged();
    } catch (err) {
      message.error("ทำรายการไม่สำเร็จ: " + (err.message || err));
    }
  };

  const handleToggleStatus = async (record) => {
    try {
      if (!isUserInactive(record.status)) {
        await userService.deleteUser(record.user_id);
        message.success(`ปิดการใช้งาน "${record.username}" เรียบร้อยแล้ว`);
      }
      fetchData();
    } catch (err) {
      message.error("ทำรายการไม่สำเร็จ: " + (err.message || err));
    }
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "user_id",
      key: "user_id",
      width: 70,
      sorter: (a, b) => a.user_id - b.user_id,
      render: (id, record) => (
        <Text type={isUserInactive(record.status) ? "disabled" : "secondary"} style={{ fontSize: 13 }}>
          #{id}
        </Text>
      ),
    },
    {
      title: "Username",
      dataIndex: "username",
      key: "username",
      width: 130,
      ...getColumnSearchProps("username", "Username"),
      sorter: (a, b) => (a.username || "").localeCompare(b.username || ""),
      render: (text, record) => (
        <>
          <Text
            delete={isUserInactive(record.status)}
            disabled={isUserInactive(record.status)}
            style={{ fontSize: 13, fontWeight: 600 }}
          >
            {text}
          </Text>
          {(isUserPending(record.status) || isUserRejected(record.status)) && <div>{applicantTypeTag(record)}</div>}
        </>
      ),
    },
    {
      title: "ชื่อ-นามสกุล",
      dataIndex: "full_name",
      key: "full_name",
      width: 150,
      ...getColumnSearchProps("full_name", "ชื่อ-นามสกุล"),
      render: (text, record) => (
        <Text disabled={isUserInactive(record.status)} style={{ fontSize: 13 }}>
          {text || "-"}
        </Text>
      ),
    },
    {
      title: "การติดต่อ",
      key: "contact",
      width: 180,
      ...getColumnSearchProps("email", "Email"),
      render: (_, record) => (
        <div style={{ fontSize: 12, lineHeight: "1.4" }}>
          <Text disabled={isUserInactive(record.status)}>{record.email || "-"}</Text>
          <div>
            <Text type="secondary" disabled={isUserInactive(record.status)} style={{ fontSize: 11 }}>
              {record.phone || ""}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "สิทธิ์",
      dataIndex: "role_id",
      key: "role_id",
      width: 100,
      filters: roles.map((r) => ({
        text: r.role_name,
        value: r.role_id,
      })),
      onFilter: (value, record) => Number(record.role_id) === Number(value),
      render: (role_id, record) => {
        if (isUserPending(record.status)) {
          return <Tag color="orange" style={{ fontSize: 11, margin: 0 }}>รอกำหนด</Tag>;
        }
        const matched = roles.find((r) => Number(r.role_id) === Number(role_id));
        return (
          <Tag
            color={isUserInactive(record.status) ? "default" : "blue"}
            style={{ fontSize: 11, margin: 0 }}
          >
            {matched?.role_name || `Role ${role_id}`}
          </Tag>
        );
      },
    },
    {
      title: "เอเย่นต์ที่เกี่ยวข้อง",
      key: "agents",
      render: (_, record) => {
        if (isUserPending(record.status)) {
          return <span style={{ fontSize: 12, color: "#d46b08" }}>รอ admin ผูก Agent</span>;
        }

        if (Number(record.role_id) === 1) {
          return (
            <Tag color="purple" style={{ fontSize: 11, fontWeight: 500 }}>
              all Agent
            </Tag>
          );
        } 

        let userAgentIds = [];
        if (Array.isArray(record.agent_ids)) {
          userAgentIds = record.agent_ids;
        } else if (record.agent_id) {
          userAgentIds = [record.agent_id];
        }

        if (userAgentIds.length === 0) return <span style={{ fontSize: 12 }}>-</span>;

        return (
          <Space size={[0, 4]} wrap>
            {userAgentIds.map((id) => {
              const matched = agents.find((a) => Number(a.agent_id) === Number(id));
              return matched ? (
                <Tag
                  color={isUserInactive(record.status) ? "default" : "cyan"}
                  key={id}
                  style={{ fontSize: 11 }}
                >
                  {matched.agent_name}
                </Tag>
              ) : null;
            })}
          </Space>
        );
      },
    },
    {
      title: "สถานะ",
      dataIndex: "status",
      key: "status",
      width: 110,
      align: "center",
      render: (status) => {
        const key = getStatusKey(status);
        if (key === "pending") return <Tag color="warning" icon={<ClockCircleOutlined />}>รออนุมัติ</Tag>;
        if (key === "rejected") return <Tag color="error" icon={<CloseCircleOutlined />}>ไม่อนุมัติ</Tag>;
        if (key === "inactive") return <Tag color="default" icon={<StopOutlined />}>ปิดใช้งาน</Tag>;
        return <Tag color="success" icon={<CheckCircleOutlined />}>เปิดใช้งาน</Tag>;
      },
    },
    {
      title: "จัดการ",
      key: "action",
      align: "center",
      width: 160,
      render: (_, record) => {
        const inactive = isUserInactive(record.status);

        // ผู้สมัครผ่านหน้าเว็บ: อนุมัติ (เลือก role + agent) / ไม่อนุมัติ
        // ที่เคยไม่อนุมัติไปแล้ว ยังกดอนุมัติภายหลังได้
        if (isUserPending(record.status) || isUserRejected(record.status)) {
          return (
            <Space size="small">
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleOpenApprove(record)}
                style={{ fontSize: 11, paddingLeft: 14, paddingRight: 14 }}
              >
                อนุมัติ
              </Button>
              {isUserPending(record.status) && (
                <Popconfirm
                  title="ยืนยันไม่อนุมัติ"
                  description={`ไม่อนุมัติการสมัครของ "${record.full_name || record.email}" ?`}
                  onConfirm={() => handleReject(record)}
                  okText="ไม่อนุมัติ"
                  cancelText="ยกเลิก"
                  okButtonProps={{ danger: true, style: { paddingLeft: 20, paddingRight: 20 } }}
                  cancelButtonProps={{ style: { paddingLeft: 20, paddingRight: 20 } }}
                >
                  <Button danger size="small" icon={<CloseCircleOutlined />} style={{ fontSize: 11, paddingLeft: 14, paddingRight: 14 }}>
                    ไม่อนุมัติ
                  </Button>
                </Popconfirm>
              )}
            </Space>
          );
        }

        if (inactive) {
          return (
            <Space size="small">
              <Button type="text" size="small" disabled icon={<EditOutlined />} style={{ paddingLeft: 12, paddingRight: 12 }}>
                <span style={{ fontSize: 12 }}>แก้ไข</span>
              </Button>
              <Button
                type="primary"
                danger
                ghost
                size="small"
                style={{ fontSize: 11, paddingLeft: 16, paddingRight: 16 }}
                icon={<StopOutlined />}
                disabled
              >
                <span style={{ paddingLeft: 4 }}>ปิดใช้งาน</span>
              </Button>
            </Space>
          );
        }

        return (
          <Space size="small">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined style={{ color: "#faad14" }} />}
              onClick={() => handleOpenModal(record)}
              style={{ paddingLeft: 12, paddingRight: 12 }}
            >
              <span style={{ fontSize: 12 }}>แก้ไข</span>
            </Button>

            <Popconfirm
              title="ยืนยันปิดการใช้งาน"
              description={`คุณแน่ใจหรือไม่ที่จะปิดใช้งานผู้ใช้ "${record.username}" ?`}
              onConfirm={() => handleToggleStatus(record)}
              okText="ยืนยัน"
              cancelText="ยกเลิก"
              /* 🟢 เพิ่ม padding ปุ่มยืนยัน/ยกเลิก ใน Modal ยืนยัน Popconfirm */
              okButtonProps={{ danger: true, style: { paddingLeft: 20, paddingRight: 20 } }}
              cancelButtonProps={{ style: { paddingLeft: 20, paddingRight: 20 } }}
            >
              <Button
                type="primary"
                danger
                ghost
                size="small"
                style={{ fontSize: 11, paddingLeft: 16, paddingRight: 16 }}
                icon={<StopOutlined />}
              >
                <span style={{ paddingLeft: 4 }}>ปิดใช้งาน</span>
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const filteredData = users.filter((u) => {
    const term = globalSearchText.toLowerCase();
    const matchText =
      u.username?.toLowerCase().includes(term) ||
      u.full_name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term);

    if (!matchText) return false;

    if (statusFilter === "pending") return isUserPending(u.status);
    if (statusFilter === "active") return getStatusKey(u.status) === "active";
    if (statusFilter === "inactive") return isUserInactive(u.status);
    return true;
  }).sort((a, b) => Number(isUserPending(b.status)) - Number(isUserPending(a.status))); // รออนุมัติขึ้นก่อน

  return (
    <div style={{ padding: 24, minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      <style>{`
        .disabled-row {
          background-color: #f5f5f5 !important;
          opacity: 0.6;
        }
        .disabled-row td {
          color: #8c8c8c !important;
        }
        .disabled-row:hover > td {
          background-color: #e8e8e8 !important;
        }
      `}</style>

      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {/* Header Bar */}
        <Card borderless style={{ borderRadius: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div>
              <Title level={3} style={{ margin: 0 }}>
                จัดการผู้ใช้งาน
              </Title>
              <Text type="secondary">เพิ่ม เปิด/ปิดใช้งาน และแก้ไขสิทธิ์ผู้ใช้งานในระบบ</Text>
            </div>

            <Space size="middle" style={{ marginLeft: "auto" }}>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchData}
                loading={loading}
                style={{ paddingLeft: 20, paddingRight: 20 }}
              >
                รีเฟรช
              </Button>

              <Button
                type="primary"
                icon={<UserAddOutlined />}
                onClick={() => handleOpenModal()}
                style={{ paddingLeft: 24, paddingRight: 24 }}
              >
                เพิ่มผู้ใช้
              </Button>
            </Space>
          </div>
        </Card>

        {pendingCount > 0 && statusFilter !== "pending" && (
          <Alert
            type="warning"
            showIcon
            icon={<ClockCircleOutlined />}
            style={{ borderRadius: 12 }}
            message={`มีผู้สมัครใช้งานรออนุมัติ ${pendingCount} คน`}
            description="ตรวจสอบข้อมูล แล้วกด “อนุมัติ” เพื่อกำหนดสิทธิ์ (Role) และ Agent ให้ผู้ใช้"
            action={
              <Button size="small" type="primary" onClick={() => setStatusFilter("pending")} style={{ paddingLeft: 16, paddingRight: 16 }}>
                ดูรายการรออนุมัติ
              </Button>
            }
          />
        )}

        {/* Filter Bar & Table */}
        <Card borderless style={{ borderRadius: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <Input
              placeholder="ค้นหารวมแบบรวดเร็ว (Username, ชื่อ, อีเมล)..."
              prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
              value={globalSearchText}
              onChange={(e) => setGlobalSearchText(e.target.value)}
              style={{ maxWidth: 360 }}
              allowClear
            />

            <Radio.Group
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="all">ทั้งหมด ({users.length})</Radio.Button>
              <Radio.Button value="pending">
                <Badge dot={pendingCount > 0} offset={[4, -2]}>
                  <span style={{ color: "inherit" }}>รออนุมัติ ({pendingCount})</span>
                </Badge>
              </Radio.Button>
              <Radio.Button value="active">
                เปิดใช้งาน ({users.filter((u) => getStatusKey(u.status) === "active").length})
              </Radio.Button>
              <Radio.Button value="inactive">
                ปิดใช้งาน ({users.filter((u) => isUserInactive(u.status)).length})
              </Radio.Button>
            </Radio.Group>
          </div>

          <Table
            size="small"
            columns={columns}
            dataSource={filteredData}
            rowKey="user_id"
            loading={loading}
            rowClassName={(record) => (isUserInactive(record.status) ? "disabled-row" : "")}
            pagination={{
              pageSize: pageSize,
              showSizeChanger: true,
              pageSizeOptions: ["5", "10", "20", "50", "100"],
              locale: {
                items_per_page: "แถว",
              },
              onShowSizeChange: (current, size) => setPageSize(size),

            }}
            scroll={{ x: true }}
          />
        </Card>

        {/* Modal เพิ่ม/แก้ไข User */}
        <Modal
          title={editingUser ? "แก้ไขข้อมูลผู้ใช้งาน" : "เพิ่มผู้ใช้งานใหม่"}
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={null}
          destroyOnClose
          width={720}
          style={{ top: 20 }}
        >
          <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="username"
                  label="Username"
                  rules={[{ required: true, message: "กรุณากรอก Username" }]}
                >
                  <Input prefix={<UserOutlined />} placeholder="Username" />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12}>
                <Form.Item
                  name="password"
                  label={editingUser ? "Password (เปลี่ยนใหม่)" : "Password"}
                  rules={[{ required: !editingUser, message: "กรุณากรอก รหัสผ่าน" }]}
                >
                  <Input.Password prefix={<LockOutlined />} placeholder="Password" />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12}>
                <Form.Item
                  name="full_name"
                  label="ชื่อ-นามสกุล"
                  rules={[{ required: true, whitespace: true, message: "กรุณากรอก ชื่อ-นามสกุล" }]}
                >
                  <Input 
                    prefix={<UserOutlined style={{ color: "#bfbfbf" }} />} 
                    placeholder="ชื่อ-นามสกุล" 
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12}>
                <Form.Item
                  name="email"
                  label="อีเมล"
                  rules={[{ type: "email", message: "รูปแบบอีเมลไม่ถูกต้อง" }]}
                >
                  <Input prefix={<MailOutlined />} placeholder="example@email.com" />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12}>
                <Form.Item name="phone" label="เบอร์โทรศัพท์">
                  <Input prefix={<PhoneOutlined />} placeholder="08XXXXXXXX" />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item
                  name="role_id"
                  label="สิทธิ์การใช้งาน (Role)"
                  rules={[{ required: true, message: "กรุณาเลือก Role" }]}
                >
                  <Select
                    placeholder="-- เลือก Role --"
                    allowClear
                    style={{ width: "100%", height: 32, borderRadius: "8px" }}
                    suffixIcon={<DownOutlined style={{ marginRight: 8, color: "#bfbfbf" }} />}
                  >
                    {roles.map((r) => (
                      <Select.Option key={r.role_id} value={Number(r.role_id)}>
                        {r.role_name}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.role_id !== currentValues.role_id}>
                  {({ getFieldValue }) => {
                    const selectedRoleId = Number(getFieldValue("role_id"));
                    const isAdmin = selectedRoleId === 1; // 🟢 role_id 1 คือ Admin

                    return (
                      <Form.Item 
                        name="agent_ids" 
                        label="สังกัด/เอเย่นต์ที่เกี่ยวข้อง (เลือกได้หลายตัว)"
                        //extra={isAdmin ? "ผู้ใช้งานสิทธิ์ Admin จะสามารถเข้าถึงและดูรายการเคลมของทุก Agent ในระบบได้โดยอัตโนมัติ" : null}
                      >
                        <Select
                          mode="multiple"
                          placeholder={isAdmin ? "all Agent" : "-- เลือก Agent --"}
                          disabled={isAdmin}
                          allowClear
                          style={{ width: "100%", borderRadius: "8px" }}
                          maxTagCount="responsive"
                          suffixIcon={<DownOutlined style={{ marginRight: 8, color: "#bfbfbf" }} />}
                        >
                          {agents.map((a) => (
                            <Select.Option key={a.agent_id} value={Number(a.agent_id)}>
                              {a.agent_name} ({a.agent_code})
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                    );
                  }}
                </Form.Item>
              </Col>
            </Row>

            <Form.Item style={{ marginBottom: 0, marginTop: 8, textAlign: "right" }}>
              <Space size="middle">
                {/* 🟢 เพิ่ม padding ปุ่มยกเลิก/บันทึก */}
                <Button 
                  onClick={() => setIsModalOpen(false)}
                  style={{ paddingLeft: 20, paddingRight: 20 }}
                >
                  ยกเลิก
                </Button>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={submitting}
                  style={{ paddingLeft: 24, paddingRight: 24 }}
                >
                  {editingUser ? "บันทึกการแก้ไข" : "สร้างผู้ใช้งาน"}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Modal อนุมัติผู้สมัคร: กำหนด Role + Agent */}
        <Modal
          title="อนุมัติผู้สมัครใช้งาน"
          open={!!approvingUser}
          onCancel={() => setApprovingUser(null)}
          footer={null}
          destroyOnClose
          width={560}
        >
          {approvingUser && (
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 16px", margin: "12px 0 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 600 }}>{approvingUser.full_name || "-"}</span>
                {applicantTypeTag(approvingUser)}
              </div>
              <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>
                {isEmployeeUsername(approvingUser.username) ? <IdcardOutlined /> : <UserOutlined />}{" "}
                {isEmployeeUsername(approvingUser.username) ? "รหัสพนักงาน" : "ชื่อผู้ใช้"}: <b>{approvingUser.username}</b>
              </div>
              <div style={{ fontSize: 13, color: "#475569" }}>
                <MailOutlined /> {approvingUser.email || "-"}
                {approvingUser.phone ? <span style={{ marginLeft: 12 }}><PhoneOutlined /> {approvingUser.phone}</span> : null}
              </div>
            </div>
          )}

          <Form form={approveForm} layout="vertical" onFinish={handleApprove}>
            <Form.Item
              name="role_id"
              label="สิทธิ์การใช้งาน (Role)"
              rules={[{ required: true, message: "กรุณาเลือก Role" }]}
            >
              <Select
                placeholder="-- เลือก Role --"
                suffixIcon={<DownOutlined style={{ marginRight: 8, color: "#bfbfbf" }} />}
                options={roles.map((r) => ({ value: Number(r.role_id), label: r.role_name }))}
              />
            </Form.Item>

            <Form.Item noStyle shouldUpdate={(prev, cur) => prev.role_id !== cur.role_id}>
              {({ getFieldValue }) => {
                const isAdmin = Number(getFieldValue("role_id")) === 1;
                return (
                  <Form.Item name="agent_ids" label="สังกัด/เอเย่นต์ที่เกี่ยวข้อง (เลือกได้หลายตัว)">
                    <Select
                      mode="multiple"
                      allowClear
                      disabled={isAdmin}
                      placeholder={isAdmin ? "all Agent" : "-- เลือก Agent --"}
                      maxTagCount="responsive"
                      suffixIcon={<DownOutlined style={{ marginRight: 8, color: "#bfbfbf" }} />}
                      options={agents.map((a) => ({ value: Number(a.agent_id), label: `${a.agent_name} (${a.agent_code})` }))}
                    />
                  </Form.Item>
                );
              }}
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 8, textAlign: "right" }}>
              <Space size="middle">
                <Button onClick={() => setApprovingUser(null)} style={{ paddingLeft: 20, paddingRight: 20 }}>
                  ยกเลิก
                </Button>
                <Button type="primary" htmlType="submit" loading={approveSubmitting} icon={<CheckCircleOutlined />} style={{ paddingLeft: 24, paddingRight: 24 }}>
                  อนุมัติและเปิดใช้งาน
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </Space>
    </div>
  );
}