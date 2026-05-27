import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import AppLayout from "./components/AppLayout/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import ProfilePage from "./pages/ProfilePage";
import RegisterPage from "./pages/RegisterPage";
import SpreadsheetPage from "./pages/SpreadsheetPage";
import "./App.css";

/**
 * Дерево маршрутов приложения.
 *
 * /login и /register доступны без входа. Всё внутри ProtectedRoute требует
 * авторизованного пользователя и отрисовывается внутри AppLayout.
 */
const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: "/dashboard",
            element: <DashboardPage />,
          },
          {
            path: "/documents/:documentId",
            element: <SpreadsheetPage />,
          },
          {
            path: "/profile",
            element: <ProfilePage />,
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

/**
 * Корневой компонент, который подключает React Router.
 */
function App() {
  return <RouterProvider router={router} />;
}

export default App;
