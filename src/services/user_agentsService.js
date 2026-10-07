// src/services/userAgentService.js
import api from "./api";

export const userAgentService = {
  // ดึงรายการ Agent ของ User
  getAgentsByUserId: async (userId) => {
    try {
      const response = await api.get(`/user-agents/user/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  // มอบหมาย Agent ให้ User
  assignAgents: async (data) => {
    try {
      const response = await api.post("/user-agents", data);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  // อัปเดตรายการ Agent ทั้งหมดของ User
  updateUserAgents: async (data) => {
    try {
      const response = await api.put("/user-agents", data);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  // ยกเลิกการผูก Agent
  removeAgent: async (data) => {
    try {
      const response = await api.delete("/user-agents", { data });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },
};

export default userAgentService;