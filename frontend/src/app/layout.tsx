import type { ReactElement } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { MainLayout } from "./component/layout/MainLayout";
import { ThemeColorProvider } from "./themeColor";
import DashboardPage from "./pages/DashboardPage";
import DriversPage from "./pages/DriversPage";
import FleetPage from "./pages/FleetPage";
import { AlertsPage } from "./pages/AlertsPage";
import SettingsPage from "./pages/SettingsPage";
import { LoginPage } from "./pages/LoginPage";
import MyTripPage from "./pages/MyTripPage";
import UserSettingsPage from "./pages/UserSettingsPage";


export function AppLayout(): ReactElement {
  return (
    <BrowserRouter>
      <ThemeColorProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={<ProtectedApp />} />
          </Routes>
        </AuthProvider>
      </ThemeColorProvider>
    </BrowserRouter>
  );
}

function ProtectedApp(): ReactElement {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas text-sm text-text-secondary">
        Loading session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <MainLayout>
      <Routes>
        <Route
          path="/"
          element={user.role === "admin" ? <DashboardPage /> : <Navigate to="/my-trip" replace />}
        />
        <Route
          path="/my-trip"
          element={user.role === "driver" ? <MyTripPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/drivers"
          element={user.role === "admin" ? <DriversPage /> : <Navigate to="/my-trip" replace />}
        />
        <Route
          path="/trips"
          element={user.role === "admin" ? <FleetPage /> : <Navigate to="/my-trip" replace />}
        />
        <Route path="/fleet" element={<Navigate to="/trips" replace />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route
          path="/settings"
          element={user.role === "admin" ? <SettingsPage /> : <Navigate to="/user-settings" replace />}
        />
        <Route
          path="/user-settings"
          element={user.role === "driver" ? <UserSettingsPage /> : <Navigate to="/settings" replace />}
        />
        <Route
          path="*"
          element={
            <div className="flex flex-1 items-center justify-center p-6">
              <div className="panel px-6 py-8 text-center text-[12px] text-text-secondary">
                Page not found.
              </div>
            </div>
          }
        />
      </Routes>
    </MainLayout>
  );
}
