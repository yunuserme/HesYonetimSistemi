import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ApiError, clearStoredTokens, getStoredTokens, setStoredTokens } from "../services/apiClient.js";
import {
  clearStoredUser,
  login,
  logout,
  me,
  refresh,
  setStoredUser,
} from "../services/authService.js";

const AuthContext = createContext(null);

export function getDefaultPathForRole(role) {
  if (role === "TECHNICIAN") {
    return "/technician/work-orders";
  }

  if (role === "MANAGER") {
    return "/manager/dashboard";
  }

  if (role === "OPERATOR") {
    return "/scada";
  }

  return "/";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const { accessToken, refreshToken } = getStoredTokens();

      if (!accessToken) {
        if (isMounted) {
          setIsInitializing(false);
        }

        return;
      }

      try {
        const currentUser = await me();

        if (isMounted) {
          setUser(currentUser);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401 && refreshToken) {
          try {
            const refreshed = await refresh(refreshToken);
            setStoredTokens({
              accessToken: refreshed.access_token,
              refreshToken,
            });

            const currentUser = await me();

            if (isMounted) {
              setUser(currentUser);
            }

            return;
          } catch {
            clearStoredTokens();
            clearStoredUser();
          }
        } else {
          clearStoredTokens();
          clearStoredUser();
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  async function signIn(credentials) {
    setIsAuthenticating(true);

    try {
      const result = await login(credentials);
      const currentUser = result.user ?? await me();

      setStoredUser(currentUser);
      setUser(currentUser);

      return {
        user: currentUser,
      };
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function signOut() {
    const { refreshToken } = getStoredTokens();

    try {
      await logout(refreshToken);
    } finally {
      clearStoredTokens();
      clearStoredUser();
      setUser(null);
    }
  }

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isInitializing,
      isAuthenticating,
      signIn,
      signOut,
    }),
    [isAuthenticating, isInitializing, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
