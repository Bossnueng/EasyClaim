import api from "./api";

export const agentService = {
  getAgent: async () => {
    try {
      const response = await api.get("/getagent");
      // แก้ไขเพื่อส่งกลับเฉพาะ Array ข้อมูลที่อยู่ใน field data
      return response.data.data || [];
    } catch (error) {
      throw error.response?.data || new Error(error.message);
    }
  },

  createAgent: async (agentData) => {
    try {
      const response = await api.post("/createagent", agentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error(error.message);
    }
  },

  updateAgent: async (agentData) => {
    try {
      const response = await api.put("/updateagent", agentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error(error.message);
    }
  },

  deleteAgent: async (agentId) => {
    try {
      const response = await api.delete(`/deleteagent/${agentId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error(error.message);
    }
  },
};

export default agentService;