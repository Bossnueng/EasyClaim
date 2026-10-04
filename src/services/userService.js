import api from "./api";

export const userService = {
  /**
   * ดึงรายการ User ทั้งหมด
   * GET /users -> userController.getUsers
   */
  getUsers: async () => {
    try {
      const response = await api.get("/users");
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  /**
   * สร้าง User ใหม่
   * POST /users -> userController.createUser
   * @param {Object} userData - { username, password, full_name, email, phone, role_id, agent_ids }
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
   * อัปเดตข้อมูล User (รองรับทั้งการส่ง id ผ่าน URL หรือรวมไว้ใน userData)
   * PUT /users/:id หรือ PUT /users -> userController.updateUser
   * @param {number|string|null} id - ID ของ User (สามารถเว้นว่างได้หากส่ง id อยู่ใน userData)
   * @param {Object} userData - { user_id, username, password, full_name, email, phone, role_id, agent_ids }
   */
  updateUser: async (id, userData) => {
  try {
    // ส่งยิงไปที่ /users ตรงๆ พร้อมแนบ user_id ไปกับ Body Payload
    const payload = { ...userData, user_id: id || userData.user_id };
    const response = await api.put("/users", payload);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error(error.message);
  }
},

  /**
   * ลบ User
   * DELETE /delusers หรือ DELETE /delusers/:id -> userController.deluser
   * @param {number|string} user_id 
   */
  delUser: async (user_id) => {
    try {
      // รองรับทั้งการยิงแบบ /delusers/:id และการส่ง body { user_id } เพื่อไม่ให้กระทบของเดิม
      const response = await api.delete(`/delusers/${user_id}`, {
        data: { user_id }
      });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  /**
   * ปิดการใช้งาน User (Soft Delete)
   * DELETE /delusers/:id -> userController.deluser
   * @param {number|string} user_id 
   */
  deleteUser: async (user_id) => {
    try {
      const response = await api.delete(`/deleteusers/${user_id}`);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  }
};

export default userService;