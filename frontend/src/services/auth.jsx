import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getCurrentUser, login as loginRequest, logout as logoutRequest, signup as signupRequest } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getCurrentUser()
      .then((data) => {
        if (isMounted) setUser(data.user);
      })
      .catch(() => {
        if (isMounted) setUser(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function login(payload) {
    const data = await loginRequest(payload);
    setUser(data.user);
    return data.user;
  }

  async function signup(payload) {
    const data = await signupRequest(payload);
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    await logoutRequest();
    setUser(null);
  }

  const value = useMemo(() => ({
    user,
    loading,
    isAdmin: Boolean(user?.is_admin),
    login,
    logout,
    signup,
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
