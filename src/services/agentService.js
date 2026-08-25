import api from "./api";
/**
 //GET
router.get("/getagent",AgentController.getagent);

router.post("/agent",AgentController.createAgent);
router.post("/updateAgent",AgentController.updateAgent);

 */

export const agentService = {
    /**
   * ดึงรายการ Agent ทั้งหมด
   */
    getAgent: async () => {
        try {
            const response = await api.get("/getagent"); // ปรับ Endpoint ตาม route ของคุณ (เช่น /roles หรือ /getRole)
            return response.data;
        } catch (error) {
            throw error.response ? error.response.data : new Error(error.message);
        }
    },

    /**
   * สร้าง Agent ใหม่
   * @param {Object} agentData - { agent_code, agent_name }
   */
    createAgent: async (agentData) => {
        try {
            const response = await api.post("/agent", agentData); // ปรับ Endpoint ตาม route ของคุณ (เช่น /roles หรือ /getRole)
            return response.data;
        } catch (error) {
            throw error.response ? error.response.data : new Error(error.message);
        }
    },

/**
   * อัปเดตข้อมูล Agent
   * @param {Object} agentData - { agent_id, agent_code, agent_name, status }
   */
    updateAgent: async (agentData) => {
        try {
            const response = await api.post("/updateAgent", agentData); // ปรับ Endpoint ตาม route ของคุณ (เช่น /roles หรือ /getRole)
            return response.data;
        } catch (error) {
            throw error.response ? error.response.data : new Error(error.message);
        }
    },                    
};

export default agentService;