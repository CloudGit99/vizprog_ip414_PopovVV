import { useEffect } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useBlocker,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { logout } from "../../store/authSlice";
import { clearSpreadsheet } from "../../store/spreadsheetSlice";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import "./AppLayout.css";

/**
 * Общая оболочка для всех страниц после входа.
 *
 * Содержит header, боковое меню, breadcrumbs и Outlet для текущего маршрута.
 * Также блокирует переходы, если в активной таблице есть несохраненные изменения.
 */ 
function AppLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppSelector((state) => state.auth.user);
  const hasUnsavedChanges = useAppSelector(
    (state) => state.spreadsheet.hasUnsavedChanges,
  );
  const activeDocument = useAppSelector((state) =>
    state.documents.items.find(
      (document) => document.id === state.documents.activeDocumentId,
    ),
  );

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (blocker.state !== "blocked") {
      return;
    }

    if (window.confirm("Есть несохранённые изменения. Перейти?")) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker]);

  const isDocumentPage = location.pathname.startsWith("/documents/");

  return (
    <div className="app-shell">
      <header className="app-header">
        <strong>Spreadsheet</strong>
        <span>{user?.email}</span>
        <button
          type="button"
          onClick={() => {
            void dispatch(logout());
            dispatch(clearSpreadsheet());
            navigate("/login");
          }}
        >
          Выйти
        </button>
      </header>

      <div className="app-body">
        <aside className="app-sidebar">
          <NavLink to="/dashboard">Мои документы</NavLink>
          <NavLink to="/profile">Профиль</NavLink>
        </aside>

        <main className="app-main">
          <div className="breadcrumbs">
            <Link to="/dashboard">Мои документы</Link>
            {isDocumentPage && (
              <>
                <span>→</span>
                <span>{activeDocument?.title ?? "Документ"}</span>
              </>
            )}
          </div>

          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
