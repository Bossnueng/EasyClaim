import api from "./api";

export const loginApi = async (username, password) => {
  try {
    const response = await api.post("/checklogin", { username, password });
    const { status, token, data } = response.data;

    if (status) {
      if (token) localStorage.setItem("token", token);
      if (data) localStorage.setItem("user", JSON.stringify(data));
    }

    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error(error.message);
  }
};

export const logoutApi = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};