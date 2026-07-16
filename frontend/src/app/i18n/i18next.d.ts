import "i18next";
import type common from "./resources/en/common.json";
import type auth from "./resources/en/auth.json";
import type navigation from "./resources/en/navigation.json";
import type dashboard from "./resources/en/dashboard.json";
import type drivers from "./resources/en/drivers.json";
import type trips from "./resources/en/trips.json";
import type alerts from "./resources/en/alerts.json";
import type settings from "./resources/en/settings.json";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    returnNull: false;
    resources: {
      common: typeof common;
      auth: typeof auth;
      navigation: typeof navigation;
      dashboard: typeof dashboard;
      drivers: typeof drivers;
      trips: typeof trips;
      alerts: typeof alerts;
      settings: typeof settings;
    };
  }
}
