import api from "./api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
const FILE_BASE_URL = API_URL.replace(/\/api\/?$/, "");

const isNotReady = (error) => [404, 405, 501].includes(error?.response?.status) || error?.code === "ERR_NETWORK";

export const toFileUrl = (sig) => {
  if (!sig) return "";
  if (sig.image_url) return String(sig.image_url).replace("localhost", window.location.hostname);
  if (!sig.image_path) return "";
  const path = String(sig.image_path).startsWith("/") ? sig.image_path : `/${sig.image_path}`;
  return `${FILE_BASE_URL}${path}`;
};

export const normalizeWarehouse = (name) => String(name || "").trim().toLowerCase();

export const signatureService = {
  getAll: async () => {
    try {
      const res = await api.get("/getWarehouseSignatures");
      const rows = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      return { ready: true, data: rows.map((r) => ({ ...r, image_url: toFileUrl(r) })) };
    } catch (error) {
      if (isNotReady(error)) return { ready: false, data: [] };
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  getHistory: async (warehouse) => {
    try {
      const params = warehouse ? { warehouse: String(warehouse).trim() } : undefined;
      const res = await api.get("/getWarehouseSignatureHistory", { params });
      const rows = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      return { ready: true, data: rows.map((r) => ({ ...r, image_url: toFileUrl(r) })) };
    } catch (error) {
      if (isNotReady(error)) return { ready: false, data: [] };
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  getByWarehouse: async (warehouse) => {
    const { ready, data } = await signatureService.getAll();
    const target = normalizeWarehouse(warehouse);
    return { ready, data: data.find((r) => normalizeWarehouse(r.warehouse) === target) || null };
  },

  save: async ({ warehouse, reviewerName, file, updatedBy }) => {
    const form = new FormData();
    form.append("warehouse", String(warehouse || "").trim());
    form.append("reviewer_name", String(reviewerName || "").trim());
    form.append("updated_by", String(updatedBy || ""));
    if (file) form.append("file", file);
    try {
      const res = await api.post("/warehouseSignature", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return { ready: true, data: res.data };
    } catch (error) {
      if (isNotReady(error)) return { ready: false, data: null };
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  remove: async (warehouse, updatedBy) => {
    try {
      const res = await api.delete("/delWarehouseSignature", { data: { warehouse, updated_by: String(updatedBy || "") } });
      return { ready: true, data: res.data };
    } catch (error) {
      if (isNotReady(error)) return { ready: false, data: null };
      throw error.response ? error.response.data : new Error(error.message);
    }
  },
};

const toTime = (v) => {
  const t = v ? new Date(v).getTime() : NaN;
  return Number.isFinite(t) ? t : null;
};

export const pickSignatureVersion = ({ current = null, history = [], warehouse, deliveredAt }) => {
  const deliveredTime = toTime(deliveredAt);
  if (deliveredTime === null) return current;

  const target = normalizeWarehouse(warehouse);
  const versions = (Array.isArray(history) ? history : [])
    .filter((v) => normalizeWarehouse(v.warehouse) === target && toTime(v.effective_from) !== null)
    .sort((a, b) => toTime(a.effective_from) - toTime(b.effective_from) || Number(a.history_id || 0) - Number(b.history_id || 0));
  if (versions.length === 0) return current;

  const active = versions.filter((v) => toTime(v.effective_from) <= deliveredTime).pop() || versions[0];
  if (!active.image_path) return null;
  return {
    warehouse: active.warehouse,
    reviewer_name: active.reviewer_name,
    image_path: active.image_path,
    image_url: active.image_url,
    effective_from: active.effective_from,
  };
};

export default signatureService;
