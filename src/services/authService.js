import api from "./api";

export const loginApi = async (username, password) => {
  const response = await api.post("/checklogin", { username, password });
  return response.data;
};

export const logoutApi = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};