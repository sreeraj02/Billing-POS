import axios from "axios";

export const API_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");

export const getAccess = () => localStorage.getItem("access");
export const getRefresh = () => localStorage.getItem("refresh");
export const setTokens = (access, refresh) => {
  if (access) localStorage.setItem("access", access);
  if (refresh) localStorage.setItem("refresh", refresh);
};
export const clearTokens = () => {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
};

const api = axios.create({ baseURL: API_URL });

// Send the JWT access token with every request.
api.interceptors.request.use((config) => {
  const token = getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = null; // one shared refresh request when several calls fail at once

const expire = () => {
  clearTokens();
  window.dispatchEvent(new Event("auth:expired"));
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const url = original?.url || "";
    const isAuthCall = url.includes("/auth/login/") || url.includes("/auth/refresh/");

    if (status === 401 && !isAuthCall) {
      if (!original._retry && getRefresh()) {
        original._retry = true;
        try {
          if (!refreshing) {
            refreshing = axios
              .post(`${API_URL}/auth/refresh/`, { refresh: getRefresh() })
              .finally(() => {
                refreshing = null;
              });
          }
          const { data } = await refreshing;
          setTokens(data.access, data.refresh);
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch {
          expire();
          return Promise.reject(error);
        }
      }
      expire();
    }
    return Promise.reject(error);
  }
);

export default api;
