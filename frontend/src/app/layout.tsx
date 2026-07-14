import type { ReactElement } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { MainLayout } from "./component/layout/MainLayout";
import DashboardPage from "./pages/DashboardPage";
import DriversPage from "./pages/DriversPage";
import FleetPage from "./pages/FleetPage";
import { AlertsPage } from "./pages/AlertsPage";
import SettingsPage from "./pages/SettingsPage";
import { LoginPage } from "./pages/LoginPage";
import MyTripPage from "./pages/MyTripPage";


export function AppLayout(): ReactElement {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<ProtectedApp />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

function ProtectedApp(): ReactElement {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas text-sm text-zinc-400">
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
          element={user.role === "admin" ? <SettingsPage /> : <Navigate to="/my-trip" replace />}
        />
        <Route
          path="*"
          element={
            <div className="flex flex-1 items-center justify-center p-6">
              <div className="panel px-6 py-8 text-center text-[12px] text-zinc-400">
                Page not found.
              </div>
            </div>
          }
        />
      </Routes>
    </MainLayout>
  );
}
