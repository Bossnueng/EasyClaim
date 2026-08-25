import axios from "axios";

// 🟢 ใช้ Port และ BaseURL ที่ตรงกับ index.js Backend
const api = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// ปรับแก้ใน api.js ส่วน response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // 🟢 เพิ่มสั่ง เด้งกลับหน้า Login
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
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