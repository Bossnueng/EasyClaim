import api from "./api";

export const userService = {
/**
   * ดึงรายการ User ทั้งหมด
   */
  getUsers: async () => {
    try {
      const response = await api.get("/users"); // ปรับ Endpoint ตาม route ของคุณ (เช่น /roles หรือ /getRole)
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  /**
   * สร้าง User ใหม่
   * @param {Object} userData 
   */
  createUser: async (userData) => {
    try {
      const response = await api.post("/users", userData);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  /**
   * ลบ User
   * @param {number|string} user_id 
   */
  deleteUser: async (user_id) => {
    try {
      // ส่งแบบ URL parameter (e.g. DELETE /api/roles/1)
      const response = await api.delete("/delusers", {
        data: {user_id}
    });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  }
};

export default userService;