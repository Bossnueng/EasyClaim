import api from "./api";

export const loginService = {
  /**
   * ล็อกอินเข้าสู่ระบบ (POST /checklogin อ้างอิงจาก loginRoute ใน index.js)
   * @param {Object} credentials - { username, password }
   */
  login: async (credentials) => {
    try {
      const response = await api.post("/checklogin", {
        username: credentials.username,
        password: credentials.password,
      });

      const { status, token, data } = response.data;

      if (status) {
        if (token) localStorage.setItem("token", token);
        if (data) localStorage.setItem("user", JSON.stringify(data));
      }

      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  /**
   * ออกจากระบบ
   */
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  /**
   * ดึงข้อมูลผู้ใช้งานที่กำลังเข้าสู่ระบบ
   */
  getCurrentUser: () => {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  },
};

export default loginService;