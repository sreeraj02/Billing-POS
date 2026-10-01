import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api, { clearTokens, getAccess, setTokens } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getAccess()));

  // Restore the session from a stored token.
  useEffect(() => {
    if (!getAccess()) return;
    api
      .get("/auth/me/")
      .then((res) => setUser(res.data))
      .catch(() => clearTokens())
      .finally(() => setLoading(false));
  }, []);

  // The axios interceptor fires this when a token can no longer be refreshed.
  useEffect(() => {
    const onExpired = () => {
      sessionStorage.setItem("notice", "Your session has expired. Please login again.");
      setUser(null);
    };
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, []);

  const login = useCallback(async (username, password) => {
    const { data } = await api.post("/auth/login/", { username, password });
    setTokens(data.access, data.refresh);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, isAdmin: user?.role === "ADMIN" }),
    [user, loading, login, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
