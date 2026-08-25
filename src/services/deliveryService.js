import api from "./api";

/**
 router.get("/getDelivery",deliveryController.Delivery);
 
 router.post("/createDelivery",deliveryController.createDelivery);
 router.post("/UpdataDelivery",deliveryController.UpdataDelivery);
 
 
 router.delete("/DelDelivery",deliveryController.DelDelivery);
 
 */

export const deliveryService = {
    getDelivery: async () => {
    try {
      const response = await api.get("/getDelivery");
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  createDelivery: async (userData) => {
    try {
      const response = await api.post("/createDelivery", userData);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  updataDelivery: async (userData) => {
    try {
      const response = await api.post("/UpdataDelivery", userData);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },

  delDelivery: async (delivery_id) => {
    try {
      const response = await api.delete("/DelDelivery", 
        {data: {delivery_id}}
      );
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error(error.message);
    }
  },
};

export default deliveryService;