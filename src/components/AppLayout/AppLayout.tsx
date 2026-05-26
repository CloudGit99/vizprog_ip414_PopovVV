import { useEffect } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useBlocker,
  useLocation,
} from "react-router-dom";
import { useAppSelector } from "../../store/hooks";
import "./AppLayout.css";

function AppLayout() {
  const location = useLocation();
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
        <span>mock-auth</span>
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
