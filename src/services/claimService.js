import api from "./api";

export const claimService = {

  getClaim: async () => {
    try {
      const response = await api.get("/getClaim");
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  getClaimByAgent: async (agentId) => {
    try {
      const response = await api.get(`/getClaimByAgent/${agentId}`);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  getclaimstatuslog: async () => {
    try {
      const response = await api.get("/getclaimstatuslog");
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  // 🟢 เพิ่ม alias ฟังก์ชันเพื่อให้รองรับ camelCase แบบที่เรียกใช้งานใน UI
  getClaimStatusLogs: async (claimId) => {
    try {
      const response = await api.get("/getclaimstatuslog");
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  getclaimapproves: async () => {
    try {
      const response = await api.get("/getclaimapproves");
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  getClaimImages: async (claimId) => {
    try {
      const response = await api.get(`/getClaimImages/${claimId}`);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },    

  createClaim: async (claimData) => {
    try {
      const response = await api.post("/Claim", claimData);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  createClaimStatusLogs: async (logData) => {
    try {
      const response = await api.post("/ClaimStatusLogs", logData);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  createClaimapproves: async (approveData) => {
    try {
      const response = await api.post("/Claimapproves", approveData);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  // 🟢 ส่งไฟล์รูปแบบ FormData
  createClaimimageFormData: async (claimId, fileObj, imageType = "CLAIM_ATTACHMENT") => {
    try {
      const formData = new FormData();
      formData.append("claim_id", claimId);
      formData.append("image_type", imageType);
      formData.append("file", fileObj);

      const response = await api.post("/Claimimage", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  updateClaim: async (claimData) => {
    try {
      const response = await api.post("/updateClaim", claimData);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  delClaim: async (claim_id) => {
    try {
      const response = await api.delete("/delClaim", {
        data: { claim_id }
      });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  delClaimApprove: async (approve_id) => {
    try {
      const response = await api.delete("/delClaimApprove", {
        data: { approve_id }
      });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  delClaimImages: async (image_ids) => {
    try {
      const response = await api.delete("/delClaimImages", {
        data: { image_ids }
      });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  deleteClaimimage: async (image_id) => {
    try {
      const response = await api.delete("/deleteClaimimage", {
        data: { image_id }
      });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },
   
};

export default claimService;