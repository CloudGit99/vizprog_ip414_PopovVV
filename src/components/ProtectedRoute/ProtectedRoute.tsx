import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "../../store/hooks";

/**
 * Защищает закрытые маршруты от неавторизованных пользователей.
 *
 * Пока идет восстановление сессии, показывает состояние загрузки. Если пользователя
 * нет, отправляет его на страницу входа и сохраняет адрес, куда он пытался попасть.
 */
function ProtectedRoute() {
  const user = useAppSelector((state) => state.auth.user);
  const status = useAppSelector((state) => state.auth.status);
  const location = useLocation();

  if (status === "loading") {
    return <div className="page-panel">Проверка сессии...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
