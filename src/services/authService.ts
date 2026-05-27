/**
 * Публичные данные пользователя, которые можно безопасно хранить в Redux state.
 *
 * Пароль специально не входит в этот тип.
 */
export type AuthUser = {
  id: string;
  name: string;
  email: string;
  registeredAt: string;
};

/**
 * Внутренняя форма пользователя в localStorage.
 *
 * Это только mock-модель авторизации для учебного задания.
 */
type StoredUser = AuthUser & {
  password: string;
};

/**
 * Ответ, который возвращают вход, регистрация и восстановление сессии.
 */
export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

/**
 * Payload формы входа.
 */
export type LoginData = {
  email: string;
  password: string;
};

/**
 * Payload формы регистрации.
 */
export type RegisterData = {
  name: string;
  email: string;
  password: string;
};

const USERS_KEY = "spreadsheet_users";
const REFRESH_TOKEN_KEY = "spreadsheet_refresh_token";
const API_DELAY = 150;

/**
 * Имитирует задержку backend для запросов авторизации.
 */
function delay() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, API_DELAY);
  });
}

/**
 * Читает пользователей из локального хранилища.
 *
 * Некорректный JSON игнорируется, чтобы битое хранилище не ломало приложение.
 */
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

/**
 * Сохраняет полный список пользователей в localStorage.
 */
function writeUsers(users: StoredUser[]) {
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/**
 * Создает простой уникальный id для локальных mock-пользователей.
 */
function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Создает строку mock-токена.
 *
 * Токен не является криптографически безопасным; его достаточно только для локального demo-flow.
 */
function createToken(userId: string, type: "access" | "refresh") {
  return `${type}.${userId}.${Date.now()}.${Math.random().toString(16).slice(2)}`;
}

/**
 * Убирает пароль из сохраненного пользователя перед возвратом в приложение.
 */
function publicUser(user: StoredUser): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    registeredAt: user.registeredAt,
  };
}

/**
 * Достает user id из mock refresh token.
 */
function getUserIdFromRefreshToken(token: string) {
  const [, userId] = token.split(".");

  return userId;
}

/**
 * Локальный mock API для авторизации и операций профиля.
 */
export const authService = {
  /**
   * Возвращает текущий сохраненный refresh token.
   */
  getRefreshToken() {
    return window.localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  /**
   * Сохраняет refresh token, чтобы restoreSession работал после перезагрузки страницы.
   */
  saveRefreshToken(token: string) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  /**
   * Удаляет refresh token при выходе или невалидной сессии.
   */
  clearRefreshToken() {
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  /**
   * Регистрирует нового пользователя и сразу создает авторизованную сессию.
   */
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

  /**
   * Авторизует пользователя по email и паролю.
   */
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

  /**
   * Восстанавливает текущую сессию по refresh token из localStorage.
   */
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

  /**
   * Локально завершает текущую сессию.
   */
  logout() {
    this.clearRefreshToken();
  },

  /**
   * Обновляет отображаемое имя текущего пользователя.
   */
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

  /**
   * Меняет пароль пользователя после проверки старого пароля.
   */
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
