import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AutoComplete,
  Button,
  Card,
  Empty,
  Form,
  Image,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, UploadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import signatureService, { normalizeWarehouse } from "../../services/signatureService";
import claimService from "../../services/claimService";
import loginService from "../../services/loginService";

const { Title, Text } = Typography;

const MAX_FILE_MB = 2;
const AUTO_REFRESH_MS = 15000;
const ACCEPT_TYPES = ["image/png", "image/jpeg"];

export default function SignatureManagement() {
  const currentUser = loginService.getCurrentUser();
  const isAdmin = Number(currentUser?.role_id) === 1;

  const [rows, setRows] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [ready, setReady] = useState(true);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const knownWarehousesRef = useRef(null);
  const [newWarehouseKeys, setNewWarehouseKeys] = useState(() => new Set());
  const modalOpenRef = useRef(false);
  useEffect(() => {
    modalOpenRef.current = isModalOpen;
  }, [isModalOpen]);

  const fetchData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [sigRes, claimRes] = await Promise.all([
        signatureService.getAll(),
        claimService.getClaim().catch(() => ({ data: [] })),
      ]);
      setReady(sigRes.ready);
      setRows(sigRes.data);

      const claims = Array.isArray(claimRes?.data) ? claimRes.data : [];
      const names = new Map();
      claims.forEach((c) => {
        const name = String(c.warehouse || "").trim();
        if (name && !names.has(normalizeWarehouse(name))) names.set(normalizeWarehouse(name), name);
      });
      setWarehouses([...names.values()].sort((a, b) => a.localeCompare(b, "th")));

      const keys = [...names.keys()];
      if (knownWarehousesRef.current === null) {
        knownWarehousesRef.current = new Set(keys);
      } else {
        const fresh = keys.filter((k) => !knownWarehousesRef.current.has(k));
        if (fresh.length > 0) {
          fresh.forEach((k) => knownWarehousesRef.current.add(k));
          setNewWarehouseKeys((prev) => new Set([...prev, ...fresh]));
          message.info(`มีคลังสินค้าใหม่ ${fresh.length} คลัง: ${fresh.map((k) => names.get(k)).join(", ")}`);
        }
      }
    } catch (err) {
      if (!silent) message.error("โหลดข้อมูลลายเซ็นไม่สำเร็จ: " + (err.message || "เกิดข้อผิดพลาด"));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const refresh = () => {
      if (!modalOpenRef.current && document.visibilityState === "visible") fetchData({ silent: true });
    };
    const timer = setInterval(refresh, AUTO_REFRESH_MS);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [fetchData]);

  const tableData = useMemo(() => {
    const map = new Map();
    warehouses.forEach((w) => map.set(normalizeWarehouse(w), { warehouse: w, signature: null }));
    rows.forEach((r) => {
      const key = normalizeWarehouse(r.warehouse);
      map.set(key, { warehouse: map.get(key)?.warehouse || r.warehouse, signature: r });
    });
    return [...map.values()]
      .map((r) => ({ ...r, key: normalizeWarehouse(r.warehouse) }))
      .sort((a, b) => Number(Boolean(a.signature)) - Number(Boolean(b.signature)) || a.warehouse.localeCompare(b.warehouse, "th"));
  }, [rows, warehouses]);

  const missingCount = tableData.filter((r) => !r.signature).length;

  const openModal = (record = null) => {
    setEditing(record);
    setFile(null);
    setPreviewUrl(record?.signature?.image_url || "");
    form.setFieldsValue({
      warehouse: record?.warehouse || "",
      reviewer_name: record?.signature?.reviewer_name || "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    if (file && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setIsModalOpen(false);
  };

  const beforeUpload = (f) => {
    if (!ACCEPT_TYPES.includes(f.type)) {
      message.error("รองรับเฉพาะไฟล์ PNG หรือ JPG");
      return Upload.LIST_IGNORE;
    }
    if (f.size / 1024 / 1024 > MAX_FILE_MB) {
      message.error(`ไฟล์ต้องไม่เกิน ${MAX_FILE_MB} MB`);
      return Upload.LIST_IGNORE;
    }
    if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    return false;
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (!file && !editing?.signature) {
      message.error("กรุณาเลือกไฟล์ลายเซ็น");
      return;
    }
    setSubmitting(true);
    try {
      const res = await signatureService.save({
        warehouse: values.warehouse,
        reviewerName: values.reviewer_name,
        file,
        updatedBy: currentUser?.user_id || currentUser?.id,
      });
      if (!res.ready) {
        message.warning("ยังบันทึกไม่ได้: ระบบลายเซ็นฝั่ง backend ยังไม่พร้อมใช้งาน");
        return;
      }
      message.success("บันทึกลายเซ็นผู้สอบทานเรียบร้อยแล้ว");
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      message.error("บันทึกไม่สำเร็จ: " + (err.message || "เกิดข้อผิดพลาด"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (warehouse) => {
    try {
      const res = await signatureService.remove(warehouse, currentUser?.user_id || currentUser?.id);
      if (!res.ready) {
        message.warning("ระบบลายเซ็นฝั่ง backend ยังไม่พร้อมใช้งาน");
        return;
      }
      message.success("ลบลายเซ็นเรียบร้อยแล้ว");
      fetchData();
    } catch (err) {
      message.error("ลบไม่สำเร็จ: " + (err.message || "เกิดข้อผิดพลาด"));
    }
  };

  const columns = [
    {
      title: "คลังสินค้า",
      dataIndex: "warehouse",
      key: "warehouse",
      render: (v, r) => (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <span className="font-medium text-slate-800">{v}</span>
          {newWarehouseKeys.has(r.key) && <Tag color="blue" style={{ margin: 0 }}>ใหม่</Tag>}
        </span>
      ),
    },
    {
      title: "ผู้สอบทาน",
      key: "reviewer",
      render: (_, r) => r.signature?.reviewer_name || <Text type="secondary">-</Text>,
    },
    {
      title: "ลายเซ็น",
      key: "image",
      width: 160,
      render: (_, r) =>
        r.signature?.image_url ? (
          <Image src={r.signature.image_url} alt={`ลายเซ็น ${r.warehouse}`} height={40} style={{ objectFit: "contain" }} />
        ) : (
          <Text type="warning">ยังไม่มีลายเซ็น</Text>
        ),
    },
    {
      title: "อัปเดตล่าสุด",
      key: "updated",
      width: 150,
      render: (_, r) =>
        r.signature?.updated_at && dayjs(r.signature.updated_at).isValid()
          ? dayjs(r.signature.updated_at).format("DD/MM/YYYY HH:mm")
          : "-",
    },
    {
      title: "จัดการ",
      key: "action",
      width: 200,
      render: (_, r) => (
        <Space size="small" wrap>
          <Button size="small" icon={r.signature ? <EditOutlined /> : <UploadOutlined />} onClick={() => openModal(r)} disabled={!ready}>
            {r.signature ? "เปลี่ยน" : "อัปโหลด"}
          </Button>
          {r.signature && (
            <Popconfirm
              title="ลบลายเซ็นของคลังนี้?"
              description="เอกสารที่พิมพ์หลังจากนี้จะไม่มีลายเซ็นผู้สอบทาน"
              onConfirm={() => handleDelete(r.warehouse)}
              okText="ลบ"
              cancelText="ยกเลิก"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" danger icon={<DeleteOutlined />} disabled={!ready}>
                ลบ
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  if (!isAdmin) {
    return (
      <div className="p-4 sm:p-6">
        <Alert type="error" showIcon title="หน้านี้สำหรับผู้ดูแลระบบ (Admin) เท่านั้น" className="rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 min-h-screen w-full flex flex-col gap-4">
      <Card className="rounded-2xl">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="min-w-0">
            <Title level={3} style={{ margin: 0 }}>
              ลายเซ็นผู้สอบทาน
            </Title>
            <Text type="secondary">ไฟล์ลายเซ็นของแต่ละคลัง ใช้ในช่อง "ผู้สอบทาน" ของเอกสารใบเคลม</Text>
          </div>
          <Space wrap className="ml-auto">
            <Button icon={<ReloadOutlined />} onClick={() => fetchData()} loading={loading}>
              รีเฟรช
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal(null)} disabled={!ready}>
              เพิ่มคลัง
            </Button>
          </Space>
        </div>
      </Card>

      {ready && missingCount > 0 && (
        <Alert
          type="warning"
          showIcon
          title={`มี ${missingCount} คลังที่ยังไม่มีลายเซ็นผู้สอบทาน`}
          description="เอกสารใบเคลมของคลังเหล่านี้จะเว้นช่องผู้สอบทานว่าง — รายการอัปเดตอัตโนมัติเมื่อมีคลังใหม่จากเคลมที่แจ้งเข้ามา"
          className="rounded-2xl"
        />
      )}

      {!ready && (
        <Alert
          type="warning"
          showIcon
          title="ระบบลายเซ็นยังไม่พร้อมใช้งาน"
          description="ต้องเพิ่ม API ฝั่ง backend ก่อน (ดูสเปกในไฟล์ BACKEND_SIGNATURE_API.md) — หน้านี้จะใช้งานได้ทันทีเมื่อ API พร้อม"
          className="rounded-2xl"
        />
      )}

      <Card className="rounded-2xl" styles={{ body: { padding: 12 } }}>
        <Table
          columns={columns}
          dataSource={tableData}
          loading={loading}
          pagination={false}
          scroll={{ x: 720 }}
          locale={{ emptyText: <Empty description="ยังไม่มีข้อมูลคลังสินค้า" /> }}
        />
      </Card>

      <Modal
        title={editing?.signature ? `เปลี่ยนลายเซ็น: ${editing.warehouse}` : "เพิ่มลายเซ็นผู้สอบทาน"}
        open={isModalOpen}
        onCancel={closeModal}
        onOk={handleSubmit}
        okText="บันทึก"
        cancelText="ยกเลิก"
        confirmLoading={submitting}
        width={520}
      >
        <Form form={form} layout="vertical" requiredMark className="pt-2">
          <Form.Item
            name="warehouse"
            label="คลังสินค้า"
            rules={[{ required: true, whitespace: true, message: "กรุณาระบุคลังสินค้า" }]}
            extra="ชื่อต้องตรงกับชื่อคลังในข้อมูลเคลม"
          >
            <AutoComplete
              options={warehouses.map((w) => ({ value: w }))}
              disabled={Boolean(editing)}
              placeholder="เลือกหรือพิมพ์ชื่อคลัง"
              filterOption={(input, option) => String(option?.value || "").toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>

          <Form.Item
            name="reviewer_name"
            label="ชื่อผู้สอบทาน"
            rules={[{ required: true, whitespace: true, message: "กรุณาระบุชื่อผู้สอบทาน" }]}
          >
            <Input placeholder="เช่น นายสมชาย ใจดี" maxLength={100} />
          </Form.Item>

          <Form.Item label="ไฟล์ลายเซ็น" required extra={`PNG หรือ JPG ไม่เกิน ${MAX_FILE_MB} MB (แนะนำพื้นหลังโปร่งใส)`}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Upload accept=".png,.jpg,.jpeg" beforeUpload={beforeUpload} showUploadList={false} maxCount={1}>
                <Button icon={<UploadOutlined />}>{file || editing?.signature ? "เลือกไฟล์ใหม่" : "เลือกไฟล์"}</Button>
              </Upload>
              <div className="flex-1 min-h-[64px] rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center p-2">
                {previewUrl ? (
                  <img src={previewUrl} alt="ตัวอย่างลายเซ็น" className="max-h-14 max-w-full object-contain" />
                ) : (
                  <span className="text-xs text-slate-400">ตัวอย่างลายเซ็น</span>
                )}
              </div>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
