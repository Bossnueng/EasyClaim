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
        if (data) localStorage.setItem("user", JSON.stringify(data));
      }

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