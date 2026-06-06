import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ApiError, clearStoredTokens, getStoredTokens, setStoredTokens } from "../services/apiClient.js";
import {
  clearStoredUser,
  getStoredUser,
  isMockToken,
  login,
  logout,
  me,
  refresh,
  setStoredUser,
} from "../services/authService.js";

const AuthContext = createContext(null);

// SENİN EKLEDİĞİN TRAFİK POLİSİ KISMI
export function getDefaultPathForRole(role) {
  switch (role) {
    case "TECHNICIAN":
      return "/technician/work-orders";
    case "MANAGER":
    case "ADMIN":
      return "/manager/dashboard";
    case "ENGINEER":
    case "OPERATOR":
      return "/";
    default:
      return "/login";
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authSource, setAuthSource] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const { accessToken, refreshToken } = getStoredTokens();

      if (!accessToken) {
        if (isMounted) setIsInitializing(false);
        return;
      }

      try {
        if (isMockToken(accessToken)) {
          const storedUser = getStoredUser();
          if (isMounted) {
            setUser(storedUser);
            setAuthSource("mock");
          }
          return;
        }

        const currentUser = await me();
        if (isMounted) {
          setUser(currentUser);
          setAuthSource("api");
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
              setAuthSource("api");
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
        if (isMounted) setIsInitializing(false);
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
      setAuthSource(result.source);

      return {
        user: currentUser,
        source: result.source,
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
      setAuthSource(null);
    }
  }

  const value = useMemo(
    () => ({
      user,
      authSource,
      isAuthenticated: Boolean(user),
      isInitializing,
      isAuthenticating,
      signIn,
      signOut,
    }),
    [authSource, isAuthenticating, isInitializing, user],
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