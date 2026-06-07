import {
  ApiError,
  apiRequest,
  clearStoredTokens,
  setStoredTokens,
} from "./apiClient.js";

const USER_STORAGE_KEY = "hes_current_user";

export function setStoredUser(user) {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredUser() {
  localStorage.removeItem(USER_STORAGE_KEY);
}

export async function login(credentials) {
  try {
    const tokenResponse = await apiRequest("/auth/login", {
      method: "POST",
      body: {
        username: credentials.username,
        password: credentials.password,
      },
    });

    if (!tokenResponse.access_token || !tokenResponse.refresh_token) {
      throw new ApiError("Login response did not include valid tokens.", 0, tokenResponse);
    }

    setStoredTokens({
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
    });

    const currentUser = tokenResponse.user ?? await me();

    if (!currentUser) {
      throw new ApiError("Current user could not be loaded.", 0);
    }

    setStoredUser(currentUser);

    return {
      tokens: tokenResponse,
      user: currentUser,
    };
  } catch (error) {
    clearStoredTokens();
    clearStoredUser();
    throw error;
  }
}

export async function refresh(refreshToken) {
  if (!refreshToken) {
    throw new ApiError("Refresh token is missing.", 401);
  }

  const tokenResponse = await apiRequest("/auth/refresh", {
    method: "POST",
    body: { refresh_token: refreshToken },
  });

  setStoredTokens({
    accessToken: tokenResponse.access_token,
    refreshToken,
  });

  return tokenResponse;
}

export async function me() {
  const user = await apiRequest("/auth/me", {
    auth: true,
  });

  setStoredUser(user);

  return user;
}

export async function logout(refreshToken) {
  try {
    if (refreshToken) {
      await apiRequest("/auth/logout", {
        method: "POST",
        auth: true,
        body: { refresh_token: refreshToken },
      });
    }
  } finally {
    clearStoredTokens();
    clearStoredUser();
  }
}
