import React, { useState, useEffect, useRef } from "react";
import {
  Table,
  Button,
  Input,
  Modal,
  Form,
  Tag,
  Space,
  Card,
  Popconfirm,
  message,
  Typography,
  Radio,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  SearchOutlined,
  ReloadOutlined,
  ShopOutlined,
  IdcardOutlined,
  LinkOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from "@ant-design/icons";

import agentService from "../../services/agentService";

const { Title, Text } = Typography;

export default function AgentManagement() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [globalSearchText, setGlobalSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form] = Form.useForm();
  const searchInput = useRef(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await agentService.getAgent();
      const agentList = Array.isArray(res) ? res : res?.data || [];
      setAgents(agentList);
    } catch (err) {
      message.error("โหลดข้อมูล Agent ล้มเหลว: " + (err.message || "เกิดข้อผิดพลาด"));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (agent = null) => {
    setEditingAgent(agent);
    if (agent) {
      form.setFieldsValue({
        agent_code: agent.agent_code,
        agent_name: agent.agent_name,
        teams_webhook_url: agent.teams_webhook_url || "",
        status: agent.status !== undefined ? Number(agent.status) : 1,
      });
    } else {
      form.resetFields();
      form.setFieldValue("status", 1);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (editingAgent) {
        // จัดรูปแบบ Payload สำหรับแก้ไข
        const payload = {
          agent_id: editingAgent.agent_id,
          agent_code: values.agent_code,
          agent_name: values.agent_name,
          teams_webhook_url: values.teams_webhook_url,
          // หากไม่มีการเลือก status ให้ใช้ค่าเดิมของ editingAgent หรือส่ง 1 (เปิดใช้งาน)
          status: editingAgent.status !== undefined ? Number(editingAgent.status) : 1,
        };

        await agentService.updateAgent(payload);
        message.success("อัปเดตข้อมูล Agent เรียบร้อยแล้ว");
      } else {
        // สำหรับกรณีสร้างใหม่
        await agentService.createAgent(values);
        message.success("ลงทะเบียน Agent ใหม่เรียบร้อยแล้ว");
      }
      setIsModalOpen(false);
      fetchAgents();
    } catch (err) {
      message.error("บันทึกไม่สำเร็จ: " + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (record) => {
    try {
      const newStatus = Number(record.status) === 1 ? 0 : 1;
      await agentService.updateAgent({
        ...record,
        status: newStatus,
      });
      message.success(`อัปเดตสถานะของ ${record.agent_name} เรียบร้อยแล้ว`);
      fetchAgents();
    } catch (err) {
      message.error("เปลี่ยนสถานะไม่สำเร็จ: " + (err.message || err));
    }
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "agent_id",
      key: "agent_id",
      width: 70,
      sorter: (a, b) => a.agent_id - b.agent_id,
      render: (id) => <Text type="secondary">#{id}</Text>,
    },
    {
      title: "รหัส Agent",
      dataIndex: "agent_code",
      key: "agent_code",
      width: 140,
      sorter: (a, b) => (a.agent_code || "").localeCompare(b.agent_code || ""),
      render: (text) => <Text style={{ fontWeight: 600 }}>{text}</Text>,
    },
    {
      title: "ชื่อ Agent",
      dataIndex: "agent_name",
      key: "agent_name",
      width: 220,
      render: (text) => <Text>{text}</Text>,
    },
    {
      title: "Microsoft Teams Webhook",
      dataIndex: "teams_webhook_url",
      key: "teams_webhook_url",
      render: (url) =>
        url ? (
          <Tooltip title={url}>
            <Tag icon={<LinkOutlined />} color="blue" style={{ cursor: "pointer" }}>
              {url.length > 45 ? `${url.substring(0, 45)}...` : url}
            </Tag>
          </Tooltip>
        ) : (
          <Text type="disabled" style={{ fontSize: 12 }}>- ไม่ได้ตั้งค่า -</Text>
        ),
    },
    {
      title: "สถานะ",
      dataIndex: "status",
      key: "status",
      width: 120,
      align: "center",
      render: (status) =>
        Number(status) === 1 ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>เปิดใช้งาน</Tag>
        ) : (
          <Tag color="default" icon={<StopOutlined />}>ปิดใช้งาน</Tag>
        ),
    },
    {
      title: "จัดการ",
      key: "action",
      align: "center",
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined style={{ color: "#faad14" }} />}
            onClick={() => handleOpenModal(record)}
            style={{ paddingLeft: 12, paddingRight: 12 }}
          >
            แก้ไข
          </Button>

          <Popconfirm
            title={Number(record.status) === 1 ? "ปิดการใช้งาน Agent" : "เปิดการใช้งาน Agent"}
            description={`คุณแน่ใจหรือไม่ที่จะ${Number(record.status) === 1 ? "ปิด" : "เปิด"}ใช้งาน "${record.agent_name}" ?`}
            onConfirm={() => handleToggleStatus(record)}
            okText="ยืนยัน"
            cancelText="ยกเลิก"
            okButtonProps={{ style: { paddingLeft: 16, paddingRight: 16 } }}
            cancelButtonProps={{ style: { paddingLeft: 16, paddingRight: 16 } }}
          >
            <Button
              type="text"
              danger={Number(record.status) === 1}
              size="small"
              style={{ paddingLeft: 12, paddingRight: 12 }}
            >
              {Number(record.status) === 1 ? "ปิดใช้งาน" : "เปิดใช้งาน"}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const filteredData = agents.filter((a) => {
    const term = globalSearchText.toLowerCase();
    const matchText =
      a.agent_code?.toLowerCase().includes(term) ||
      a.agent_name?.toLowerCase().includes(term);

    if (!matchText) return false;

    if (statusFilter === "active") return Number(a.status) === 1;
    if (statusFilter === "inactive") return Number(a.status) === 0;
    return true;
  });

  return (
    <div style={{ padding: 24, minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Card borderless style={{ borderRadius: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div>
              <Title level={3} style={{ margin: 0 }}>จัดการ Agent</Title>
              <Text type="secondary">ลงทะเบียน เพิ่ม ลบ แก้ไข รายชื่อ Agent และ Webhook การแจ้งเตือน</Text>
            </div>
            <Space size="middle" style={{ marginLeft: "auto" }}>
              <Button icon={<ReloadOutlined />} onClick={fetchAgents} loading={loading} style={{ paddingLeft: 16, paddingRight: 16 }}>
                รีเฟรช
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()} style={{ paddingLeft: 16, paddingRight: 16 }}>
                เพิ่ม Agent ใหม่
              </Button>
            </Space>
          </div>
        </Card>

        <Card borderless style={{ borderRadius: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <Input
              placeholder="ค้นหา Agent Code หรือชื่อ Agent..."
              prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
              value={globalSearchText}
              onChange={(e) => setGlobalSearchText(e.target.value)}
              style={{ maxWidth: 360 }}
              allowClear
            />
            <Radio.Group value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} buttonStyle="solid">
              <Radio.Button value="all">ทั้งหมด ({agents.length})</Radio.Button>
              <Radio.Button value="active">เปิดใช้งาน ({agents.filter((a) => Number(a.status) === 1).length})</Radio.Button>
              <Radio.Button value="inactive">ปิดใช้งาน ({agents.filter((a) => Number(a.status) === 0).length})</Radio.Button>
            </Radio.Group>
          </div>

          <Table
            size="small"
            columns={columns}
            dataSource={filteredData}
            rowKey="agent_id"
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            scroll={{ x: true }}
          />
        </Card>

        <Modal
          title={editingAgent ? "แก้ไขข้อมูล Agent" : "ลงทะเบียน Agent ใหม่"}
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={null}
          destroyOnClose
        >
          <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
            <Form.Item
              name="agent_code"
              label="รหัสเอเย่นต์ (Agent Code)"
              rules={[{ required: true, message: "กรุณากรอก Agent Code" }]}
            >
              <Input prefix={<IdcardOutlined style={{ color: "#bfbfbf" }} />} placeholder="เช่น 101, AG001" />
            </Form.Item>

            <Form.Item
              name="agent_name"
              label="ชื่อเอเย่นต์ (Agent Name)"
              rules={[{ required: true, message: "กรุณากรอก Agent Name" }]}
            >
              <Input prefix={<ShopOutlined style={{ color: "#bfbfbf" }} />} placeholder="เช่น บริษัท เอเจ้นท์ จำกัด" />
            </Form.Item>

            <Form.Item
              name="teams_webhook_url"
              label="Microsoft Teams Webhook URL"
              rules={[{ type: "url", message: "รูปแบบ URL ไม่ถูกต้อง" }]}
            >
              <Input placeholder="https://outlook.office.com/webhook/..." />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
              <Space size="middle">
                <Button onClick={() => setIsModalOpen(false)} style={{ paddingLeft: 16, paddingRight: 16 }}>
                  ยกเลิก
                </Button>
                <Button type="primary" htmlType="submit" loading={submitting} style={{ paddingLeft: 16, paddingRight: 16 }}>
                  {editingAgent ? "บันทึกการแก้ไข" : "สร้าง Agent"}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </Space>
    </div>
  );
}