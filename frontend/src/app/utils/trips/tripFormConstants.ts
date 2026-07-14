import type { StartMyTripPayload } from "../../services/backendApi";

export const TRIP_CODE_MAX_LENGTH = 50;
export const ROUTE_POINT_MAX_LENGTH = 120;

export const EMPTY_TRIP_FORM: StartMyTripPayload = {
  code: "",
  origin: "",
  destination: "",
};
