import type { ReactElement } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "./component/layout/MainLayout";
import { Login } from "./component/layout/Login";
import { ThemeProvider } from "./component/providers/ThemeProvider";
import DashboardPage from "./pages/DashboardPage";
import { MonitoringView } from "./pages/MonitoringView";
import DriversPage from "./pages/DriversPage";
import FleetPage from "./pages/FleetPage";
import { AlertsPage } from "./pages/AlertsPage";
import SettingsPage from "./pages/SettingsPage";

// Auth guard: wraps routes that require authentication
function ProtectedRoute({ children }: { children: React.ReactNode }): ReactElement | null {
  // In production, check auth state from context/store
  // For now, allow access - add your auth check logic here
  const isAuthenticated = true; // Replace with real auth check

  if (!isAuthenticated) {
    // Redirect to login would go here
    return <Login />;
  }

  return <MainLayout>{children}</MainLayout>;
}

export function AppLayout(): ReactElement {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/monitoring"
            element={
              <ProtectedRoute>
                <MonitoringView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/drivers"
            element={
              <ProtectedRoute>
                <DriversPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/fleet"
            element={
              <ProtectedRoute>
                <FleetPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <ProtectedRoute>
                <AlertsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route
            path="*"
            element={
              <div className="flex flex-1 items-center justify-center p-6">
                <div className="panel px-6 py-8 text-center text-[12px] text-zinc-400">
                  Không tìm thấy trang.
                </div>
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
