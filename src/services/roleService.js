import api from "./api";

export const roleService = {
  getRoles: async () => {
    try {
      const response = await api.get("/role");
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  createRole: async (roleData) => {
    try {
      const response = await api.post("/role", roleData);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  deleteRole: async (id) => {
    try {
      const response = await api.delete(`/roles/${id}`);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },
};

export default roleService;