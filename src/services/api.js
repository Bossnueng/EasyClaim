// src/services/api.js

import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// 🟢 Request Interceptor: แนบ Bearer Token ทุก Request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 🟢 Response Interceptor: ดักจับ 401 และ 403 เมื่อ Token หมดอายุ หรือสิทธิ์/สังกัดเปลี่ยน
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // ดักจับทั้ง 401 (Unauthorized) และ 403 (Forbidden)
    if (status === 401 || status === 403) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Redirect เฉพาะเมื่อไม่ได้อยู่ที่หน้า /login เพื่อป้องกัน Loop Reload
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;