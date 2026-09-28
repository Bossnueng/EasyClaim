import api from "./api";

export const itemService = {
  /**
   * ดึงรายการสินค้าทั้งหมด (GET /api/getitem)
   */
  getItems: async () => {
    try {
      const response = await api.get("/getitem");
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  /**
   * เพิ่มรายการสินค้าใหม่ (POST /api/item)
   * @param {Object} itemData - { item_code, item_name }
   */
  createItem: async (itemData) => {
    try {
      const response = await api.post("/item", itemData);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  /**
   * อัปเดตรายการสินค้า (POST /api/itemupdate)
   * @param {Object} itemData - { id, item_code, item_name, status }
   */
  updateItem: async (itemData) => {
    try {
      const response = await api.post("/itemupdate", itemData);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  /**
   * ลบรายการสินค้าแบบเลือกหลายรายการ (DELETE /api/itemdeleteall)
   * @param {Array<number>} ids - อาร์เรย์ของ item_id เช่น [1, 2, 3]
   */
  deleteItems: async (ids) => {
    try {
      // Axios DELETE กรณีส่ง Data เป็น Body ต้องระบุผ่าน Key "data"
      const response = await api.delete("/itemdeleteall", {
        data: { ids },
      });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },
};

export default itemService;