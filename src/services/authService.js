import {
  ApiError,
  apiRequest,
  clearStoredTokens,
  getStoredTokens,
  setStoredTokens,
} from "./apiClient.js";

const USER_STORAGE_KEY = "hes_current_user";

const mockUsers = [
  {
    id: 1,
    username: "admin",
    password: "Admin123!",
    email: "admin@hestest.com",
    role: "ADMIN",
  },
  {
    id: 3,
    username: "engineer1",
    password: "Engineer123!",
    email: "engineer1@hestest.com",
    role: "ENGINEER",
  },
  {
    id: 4,
    username: "technician1",
    password: "Tech123!",
    email: "technician1@hestest.com",
    role: "TECHNICIAN",
  },
  {
    id: 5,
    username: "manager1",
    password: "Manager123!",
    email: "manager1@hestest.com",
    role: "MANAGER",
  },
];

function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    is_active: true,
    created_at: "2026-05-07T22:36:15Z",
  };
}

function createMockToken(type, username) {
  return `mock-${type}-token-${username}-${Date.now()}`;
}

export function getStoredUser() {
  const rawUser = localStorage.getItem(USER_STORAGE_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredUser() {
  localStorage.removeItem(USER_STORAGE_KEY);
}

export function isMockToken(token) {
  return token?.startsWith("mock-");
}

export async function login(credentials) {
  try {
    const tokenResponse = await apiRequest("/auth/login", {
      method: "POST",
      body: credentials,
    });

    setStoredTokens({
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
    });

    return {
      tokens: tokenResponse,
      user: null,
      source: "api",
    };
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 0) {
      throw error;
    }

    const mockUser = mockUsers.find(
      (user) =>
        user.username === credentials.username &&
        user.password === credentials.password,
    );

    if (!mockUser) {
      throw new ApiError("Invalid username or password.", 401);
    }

    const publicUser = toPublicUser(mockUser);
    const tokenResponse = {
      access_token: createMockToken("access", mockUser.username),
      refresh_token: createMockToken("refresh", mockUser.username),
      token_type: "bearer",
      expires_in: 1800,
    };

    setStoredTokens({
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
    });
    setStoredUser(publicUser);

    return {
      tokens: tokenResponse,
      user: publicUser,
      source: "mock",
    };
  }
}

export async function refresh(refreshToken) {
  if (isMockToken(refreshToken)) {
    return {
      access_token: createMockToken("access", "session"),
      token_type: "bearer",
      expires_in: 1800,
    };
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
  const { accessToken } = getStoredTokens();

  if (isMockToken(accessToken)) {
    return getStoredUser();
  }

  const user = await apiRequest("/auth/me", {
    auth: true,
  });

  setStoredUser(user);

  return user;
}

export async function logout(refreshToken) {
  if (refreshToken && !isMockToken(refreshToken)) {
    await apiRequest("/auth/logout", {
      method: "POST",
      auth: true,
      body: { refresh_token: refreshToken },
    });
  }

  clearStoredTokens();
  clearStoredUser();
}
