import { Link } from "react-router-dom";

/**
 * Страница для неизвестных маршрутов.
 */
function NotFoundPage() {
  return (
    <div className="page-panel">
      <h1>404</h1>
      <p>Страница не найдена</p>
      <Link to="/dashboard">Вернуться к документам</Link>
    </div>
  );
}

export default NotFoundPage;
