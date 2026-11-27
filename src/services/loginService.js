import api from "./api";

export const loginService = {
  login: async (credentials) => {
    try {
      const response = await api.post("/checklogin", {
        username: credentials.username,
        password: credentials.password,
      });

      const { status, token, data } = response.data;

      if (status) {
        if (token) localStorage.setItem("token", token);
        if (data) {
        // หากมี agent_ids แต่ไม่มี agent_id ให้กำหนด agent_id ตัวแรกเข้าไป
        const userData = {
          ...data,
          agent_id: data.agent_id || (Array.isArray(data.agent_ids) ? data.agent_ids[0] : null)
        };
        localStorage.setItem("user", JSON.stringify(userData));
        }
      }

      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  /**
   * สมัครใช้งานผ่านหน้าเว็บ — บัญชีจะอยู่ในสถานะรออนุมัติจนกว่า admin อนุมัติ
   * POST /register
   *   พนักงาน : { user_type: "employee", employee_id, full_name, password, email?, phone? }
   *   คนนอก   : { user_type: "external", username, full_name, password, email, phone? }
   */
  register: async (payload) => {
    try {
      const response = await api.post("/register", payload);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  },

  getToken: () => {
    return localStorage.getItem("token");
  },

  isAuthenticated: () => {
    return !!localStorage.getItem("token");
  },
};

export default loginService;