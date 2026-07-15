import commonEn from "./resources/en/common.json";
import authEn from "./resources/en/auth.json";
import navigationEn from "./resources/en/navigation.json";
import dashboardEn from "./resources/en/dashboard.json";
import driversEn from "./resources/en/drivers.json";
import tripsEn from "./resources/en/trips.json";
import alertsEn from "./resources/en/alerts.json";
import settingsEn from "./resources/en/settings.json";
import commonVi from "./resources/vi/common.json";
import authVi from "./resources/vi/auth.json";
import navigationVi from "./resources/vi/navigation.json";
import dashboardVi from "./resources/vi/dashboard.json";
import driversVi from "./resources/vi/drivers.json";
import tripsVi from "./resources/vi/trips.json";
import alertsVi from "./resources/vi/alerts.json";
import settingsVi from "./resources/vi/settings.json";
import { SUPPORTED_LANGUAGES } from "./types";

export const namespaces = [
  "common",
  "auth",
  "navigation",
  "dashboard",
  "drivers",
  "trips",
  "alerts",
  "settings",
] as const;

export const defaultNamespace = "common" as const;

export const resources = {
  en: {
    common: commonEn,
    auth: authEn,
    navigation: navigationEn,
    dashboard: dashboardEn,
    drivers: driversEn,
    trips: tripsEn,
    alerts: alertsEn,
    settings: settingsEn,
  },
  vi: {
    common: commonVi,
    auth: authVi,
    navigation: navigationVi,
    dashboard: dashboardVi,
    drivers: driversVi,
    trips: tripsVi,
    alerts: alertsVi,
    settings: settingsVi,
  },
} as const;

export { SUPPORTED_LANGUAGES };
