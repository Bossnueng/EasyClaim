import api from "./api";

export const roleService = {
  
  /**
   * ดึงรายการ Role ทั้งหมด
   */
  getRoles: async () => {
    try {
      const response = await api.get("/role"); // ปรับ Endpoint ตาม route ของคุณ (เช่น /roles หรือ /getRole)
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  /**
   * สร้าง Role ใหม่
   * @param {Object} roleData - { role_name, description }
   */
  createRole: async (roleData) => {
    try {
      const response = await api.post("/role", roleData);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  /**
   * ลบ Role
   * @param {number|string} id - รหัส role_id ที่ต้องการลบ
   */
  deleteRole: async (id) => {
    try {
      // ส่งแบบ URL parameter (e.g. DELETE /api/roles/1)
      const response = await api.delete(`/roles/${id}`);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },
};

export default roleService;