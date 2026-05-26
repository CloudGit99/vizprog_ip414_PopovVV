import { useState } from "react";
import { changePassword, updateProfileName } from "../store/authSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import type { FormEvent as FormEventType } from "react";

function ProfilePage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const authError = useAppSelector((state) => state.auth.error);
  const documentsCount = useAppSelector((state) => state.documents.items.length);
  const [name, setName] = useState(user?.name ?? "");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  if (!user) {
    return <div className="page-panel">Пользователь не найден</div>;
  }

  async function handleNameSubmit(event: FormEventType) {
    event.preventDefault();
    setMessage("");

    if (!name.trim()) {
      setMessage("Введите имя");
      return;
    }

    await dispatch(updateProfileName(name.trim()));
    setMessage("Имя сохранено");
  }

  async function handlePasswordSubmit(event: FormEventType) {
    event.preventDefault();
    setMessage("");

    if (newPassword.length < 8) {
      setMessage("Новый пароль минимум 8 символов");
      return;
    }

    await dispatch(changePassword({ oldPassword, newPassword }));
    setOldPassword("");
    setNewPassword("");
    setMessage("Пароль изменён");
  }

  return (
    <div className="page-panel">
      <h1>Профиль</h1>
      <p>Имя: {user.name}</p>
      <p>Email: {user.email}</p>
      <p>Дата регистрации: {new Date(user.registeredAt).toLocaleDateString("ru-RU")}</p>
      <p>Документов: {documentsCount}</p>

      <form className="profile-form" onSubmit={handleNameSubmit}>
        <h2>Изменить имя</h2>
        <input value={name} onChange={(event) => setName(event.target.value)} />
        <button type="submit">Сохранить имя</button>
      </form>

      <form className="profile-form" onSubmit={handlePasswordSubmit}>
        <h2>Сменить пароль</h2>
        <input
          type="password"
          placeholder="Старый пароль"
          value={oldPassword}
          onChange={(event) => setOldPassword(event.target.value)}
        />
        <input
          type="password"
          placeholder="Новый пароль"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
        <button type="submit">Сменить пароль</button>
      </form>

      {(message || authError) && <p>{authError ?? message}</p>}
    </div>
  );
}

export default ProfilePage;
