import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Input,
  Modal,
  Form,
  Space,
  Card,
  Popconfirm,
  message,
  Typography,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  DeleteOutlined,
} from "@ant-design/icons";

import roleService from "../../services/roleService";

const { Title, Text } = Typography;

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form] = Form.useForm();

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await roleService.getRoles();
      const roleList = res?.data || (Array.isArray(res) ? res : []);
      setRoles(roleList);
    } catch (err) {
      message.error("โหลดข้อมูล Role ล้มเหลว: " + (err.message || "เกิดข้อผิดพลาด"));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (role = null) => {
    setEditingRole(role);
    if (role) {
      form.setFieldsValue({
        role_name: role.role_name,
        description: role.description || "",
      });
    } else {
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (editingRole) {
        await roleService.createRole({
          id: editingRole.role_id,
          ...values,
        });
        message.success("อัปเดตสิทธิ์การใช้งานเรียบร้อย");
      } else {
        await roleService.createRole(values);
        message.success("สร้าง Role ใหม่เรียบร้อยแล้ว");
      }
      setIsModalOpen(false);
      fetchRoles();
    } catch (err) {
      message.error("บันทึกไม่สำเร็จ: " + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async (role_id) => {
    try {
      await roleService.deleteRole(role_id);
      message.success("ลบ Role เรียบร้อยแล้ว");
      fetchRoles();
    } catch (err) {
      message.error("ลบไม่สำเร็จ: " + (err.message || err));
    }
  };

  const columns = [
    {
      title: "Role ID",
      dataIndex: "role_id",
      key: "role_id",
      width: 100,
      render: (id) => <Text type="secondary">#{id}</Text>,
    },
    {
      title: "ชื่อสิทธิ์ (Role Name)",
      dataIndex: "role_name",
      key: "role_name",
      width: 200,
      render: (text) => <Text style={{ fontWeight: 600, color: "#1677ff" }}>{text}</Text>,
    },
    {
      title: "รายละเอียด / ขอบเขตการใช้งาน",
      dataIndex: "description",
      key: "description",
      render: (text) => text || <Text type="disabled">- ไม่ระบุ -</Text>,
    },
    {
      title: "จัดการ",
      key: "action",
      align: "center",
      width: 160,
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
            title="ยืนยันการลบ Role"
            description={`คุณแน่ใจหรือไม่ที่จะลบ Role "${record.record_name || record.role_name}" ?`}
            onConfirm={() => handleDeleteRole(record.role_id)}
            okText="ยืนยัน"
            cancelText="ยกเลิก"
            okButtonProps={{ danger: true, style: { paddingLeft: 16, paddingRight: 16 } }}
            cancelButtonProps={{ style: { paddingLeft: 16, paddingRight: 16 } }}
          >
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              style={{ paddingLeft: 12, paddingRight: 12 }}
            >
              ลบ
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Card borderless style={{ borderRadius: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div>
              <Title level={3} style={{ margin: 0 }}>จัดการสิทธิ์การใช้งาน</Title>
              <Text type="secondary">กำหนดและบริหารจัดการสิทธิ์ของแต่ละกลุ่มผู้ใช้งานในระบบ</Text>
            </div>
            <Space size="middle" style={{ marginLeft: "auto" }}>
              <Button icon={<ReloadOutlined />} onClick={fetchRoles} loading={loading} style={{ paddingLeft: 16, paddingRight: 16 }}>
                รีเฟรช
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()} style={{ paddingLeft: 16, paddingRight: 16 }}>
                เพิ่ม Role ใหม่
              </Button>
            </Space>
          </div>
        </Card>

        <Card borderless style={{ borderRadius: 12 }}>
          <Table
            size="small"
            columns={columns}
            dataSource={roles}
            rowKey="role_id"
            loading={loading}
            pagination={false}
          />
        </Card>

        <Modal
          title={editingRole ? "แก้ไข Role" : "สร้าง Role ใหม่"}
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={null}
          destroyOnClose
        >
          <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
            <Form.Item
              name="role_name"
              label="ชื่อ Role"
              rules={[{ required: true, message: "กรุณากรอกชื่อ Role" }]}
            >
              <Input prefix={<SafetyCertificateOutlined style={{ color: "#bfbfbf" }} />} placeholder="เช่น ADMIN, STAFF, AGENT_USER" />
            </Form.Item>

            <Form.Item name="description" label="คำอธิบายสิทธิ์การใช้งาน">
              <Input.TextArea rows={3} placeholder="อธิบายหน้าที่หรือสิทธิ์การเข้าถึงข้อมูลของ Role นี้..." />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
              <Space size="middle">
                <Button onClick={() => setIsModalOpen(false)} style={{ paddingLeft: 16, paddingRight: 16 }}>
                  ยกเลิก
                </Button>
                <Button type="primary" htmlType="submit" loading={submitting} style={{ paddingLeft: 16, paddingRight: 16 }}>
                  {editingRole ? "บันทึกการแก้ไข" : "สร้าง Role"}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </Space>
    </div>
  );
}