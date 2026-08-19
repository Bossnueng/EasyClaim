import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api", // เปลี่ยนเป็น Port Backend ของคุณ
  headers: {
    "Content-Type": "application/json",
  },
});

// แนบ Bearer Token ไปใน Header อัตโนมัติก่อนส่ง Request
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

export default api;