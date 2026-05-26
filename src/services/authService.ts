export type AuthUser = {
  id: string;
  name: string;
  email: string;
  registeredAt: string;
};

type StoredUser = AuthUser & {
  password: string;
};

export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

export type LoginData = {
  email: string;
  password: string;
};

export type RegisterData = {
  name: string;
  email: string;
  password: string;
};

const USERS_KEY = "spreadsheet_users";
const REFRESH_TOKEN_KEY = "spreadsheet_refresh_token";
const API_DELAY = 150;

function delay() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, API_DELAY);
  });
}

function readUsers(): StoredUser[] {
  const value = window.localStorage.getItem(USERS_KEY);

  if (!value) {
    return [];
  }

  try {
    return JSON.parse(value) as StoredUser[];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createToken(userId: string, type: "access" | "refresh") {
  return `${type}.${userId}.${Date.now()}.${Math.random().toString(16).slice(2)}`;
}

function publicUser(user: StoredUser): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    registeredAt: user.registeredAt,
  };
}

function getUserIdFromRefreshToken(token: string) {
  const [, userId] = token.split(".");

  return userId;
}

export const authService = {
  getRefreshToken() {
    return window.localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  saveRefreshToken(token: string) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  clearRefreshToken() {
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    await delay();

    const users = readUsers();
    const normalizedEmail = data.email.toLowerCase();

    if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
      throw new Error("Пользователь уже существует");
    }

    const user: StoredUser = {
      id: createId(),
      name: data.name,
      email: normalizedEmail,
      password: data.password,
      registeredAt: new Date().toISOString(),
    };

    writeUsers([...users, user]);

    const response = {
      user: publicUser(user),
      accessToken: createToken(user.id, "access"),
      refreshToken: createToken(user.id, "refresh"),
    };

    this.saveRefreshToken(response.refreshToken);

    return response;
  },

  async login(data: LoginData): Promise<AuthResponse> {
    await delay();

    const user = readUsers().find(
      (item) =>
        item.email.toLowerCase() === data.email.toLowerCase() &&
        item.password === data.password,
    );

    if (!user) {
      throw new Error("Неверный email или пароль");
    }

    const response = {
      user: publicUser(user),
      accessToken: createToken(user.id, "access"),
      refreshToken: createToken(user.id, "refresh"),
    };

    this.saveRefreshToken(response.refreshToken);

    return response;
  },

  async refresh(): Promise<AuthResponse | null> {
    await delay();

    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      return null;
    }

    const userId = getUserIdFromRefreshToken(refreshToken);
    const user = readUsers().find((item) => item.id === userId);

    if (!user) {
      this.clearRefreshToken();
      return null;
    }

    return {
      user: publicUser(user),
      accessToken: createToken(user.id, "access"),
      refreshToken,
    };
  },

  logout() {
    this.clearRefreshToken();
  },

  async updateName(userId: string, name: string): Promise<AuthUser> {
    await delay();

    const users = readUsers();
    const userIndex = users.findIndex((user) => user.id === userId);

    if (userIndex === -1) {
      throw new Error("Пользователь не найден");
    }

    users[userIndex] = {
      ...users[userIndex],
      name,
    };

    writeUsers(users);

    return publicUser(users[userIndex]);
  },

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    await delay();

    const users = readUsers();
    const userIndex = users.findIndex((user) => user.id === userId);

    if (userIndex === -1) {
      throw new Error("Пользователь не найден");
    }

    if (users[userIndex].password !== oldPassword) {
      throw new Error("Старый пароль неверный");
    }

    users[userIndex] = {
      ...users[userIndex],
      password: newPassword,
    };

    writeUsers(users);
  },
};
