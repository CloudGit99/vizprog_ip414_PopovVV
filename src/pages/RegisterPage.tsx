import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { register } from "../store/authSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import type { FormEvent } from "react";

/**
 * Страница регистрации.
 *
 * Создает локальный mock-аккаунт и сразу авторизует нового пользователя.
 */
function RegisterPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const authStatus = useAppSelector((state) => state.auth.status);
  const authError = useAppSelector((state) => state.auth.error);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  /**
   * Проверяет форму регистрации и запускает register thunk.
   */
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Введите имя");
      return;
    }

    if (!email.includes("@")) {
      setFormError("Введите корректный email");
      return;
    }

    if (password.length < 8) {
      setFormError("Пароль минимум 8 символов");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Пароли не совпадают");
      return;
    }

    try {
      await dispatch(register({ name, email, password })).unwrap();
      navigate("/dashboard", { replace: true });
    } catch {
      // Error text is stored in authSlice and shown under the form.
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Регистрация</h1>

        <label>
          Имя
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>

        <label>
          Email
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label>
          Пароль
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        <label>
          Подтверждение пароля
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </label>

        {(formError || authError) && (
          <div className="form-error">{formError || authError}</div>
        )}

        <button type="submit" disabled={authStatus === "loading"}>
          Зарегистрироваться
        </button>

        <Link to="/login">Вход</Link>
      </form>
    </div>
  );
}

export default RegisterPage;
