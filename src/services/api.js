import axios from "axios";

// 🟢 ใช้ Port และ BaseURL ที่ตรงกับ index.js Backend
const api = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Interceptor: แนบ Bearer Token ใน Header อัตโนมัติทุกครั้งที่ยิง API
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

// Interceptor: จัดการ Error รวมจาก Backend
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // เคลียร์ Token และ Redirect หน้า Login กรณีหมดอายุ
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    return Promise.reject(error);
  }
);

export default api;