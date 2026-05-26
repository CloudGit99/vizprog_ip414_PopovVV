import { useAppSelector } from "../store/hooks";

function ProfilePage() {
  const user = useAppSelector((state) => state.auth.user);
  const documentsCount = useAppSelector((state) => state.documents.items.length);

  return (
    <div className="page-panel">
      <h1>Профиль</h1>
      <p>Имя: {user.name}</p>
      <p>Email: {user.email}</p>
      <p>Документов: {documentsCount}</p>
    </div>
  );
}

export default ProfilePage;
