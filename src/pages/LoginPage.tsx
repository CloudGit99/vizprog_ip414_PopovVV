import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { login } from "../store/authSlice";
import type { FormEvent } from "react";

type LocationState = {
  from?: {
    pathname: string;
  };
};

function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppSelector((state) => state.auth.user);
  const authStatus = useAppSelector((state) => state.auth.status);
  const authError = useAppSelector((state) => state.auth.error);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const from = (location.state as LocationState | null)?.from?.pathname ?? "/dashboard";

  if (user) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError("");

    if (!email.includes("@")) {
      setFormError("Введите корректный email");
      return;
    }

    if (password.length < 8) {
      setFormError("Пароль минимум 8 символов");
      return;
    }

    try {
      await dispatch(login({ email, password })).unwrap();
      navigate(from, { replace: true });
    } catch {
      // Error text is stored in authSlice and shown under the form.
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Вход</h1>

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

        {(formError || authError) && (
          <div className="form-error">{formError || authError}</div>
        )}

        <button type="submit" disabled={authStatus === "loading"}>
          Войти
        </button>

        <Link to="/register">Регистрация</Link>
      </form>
    </div>
  );
}

export default LoginPage;
