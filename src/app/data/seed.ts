import type { Driver, GeoPoint } from "../types";

const HCM_CENTER: GeoPoint = { lat: 10.762622, lng: 106.660172 };

function offsetKm(kmX: number, kmY: number): GeoPoint {
  // Rough degree-per-km conversion (good enough for a city-scale mock map).
  const dLat = kmY / 111;
  const dLng = kmX / (111 * Math.cos((HCM_CENTER.lat * Math.PI) / 180));
  return { lat: HCM_CENTER.lat + dLat, lng: HCM_CENTER.lng + dLng };
}

const SEED_DRIVERS: ReadonlyArray<
  Omit<
    Driver,
    | "ear"
    | "eyeState"
    | "lastUpdate"
    | "totalAlerts"
    | "status"
    | "onPhone"
    | "seatbelt"
  >
> = [
  {
    id: "D-1041",
    name: "Nguyễn Minh Quân",
    phone: "+84 909 184 712",
    licensePlate: "51H-287.41",
    team: "Khu vực 1",
    position: offsetKm(-2.4, 3.1),
  },
  {
    id: "D-1042",
    name: "Trần Văn Khoa",
    phone: "+84 907 632 118",
    licensePlate: "51F-902.16",
    team: "Khu vực 1",
    position: offsetKm(1.8, 2.6),
  },
  {
    id: "D-1043",
    name: "Lê Hoàng Anh",
    phone: "+84 933 471 092",
    licensePlate: "50L-318.55",
    team: "Khu vực 1",
    position: offsetKm(4.7, -0.4),
  },
  {
    id: "D-1044",
    name: "Phạm Quốc Bảo",
    phone: "+84 988 230 411",
    licensePlate: "60A-117.29",
    team: "Khu vực 2",
    position: offsetKm(-3.6, -2.1),
  },
  {
    id: "D-1045",
    name: "Đặng Thanh Tùng",
    phone: "+84 901 557 803",
    licensePlate: "51C-746.10",
    team: "Khu vực 1",
    position: offsetKm(6.1, 3.4),
  },
  {
    id: "D-1046",
    name: "Võ Đình Khang",
    phone: "+84 915 884 220",
    licensePlate: "50K-552.77",
    team: "Khu vực 2",
    position: offsetKm(0.9, -3.9),
  },
  {
    id: "D-1047",
    name: "Bùi Ngọc Huy",
    phone: "+84 922 119 367",
    licensePlate: "61B-204.83",
    team: "Khu vực 2",
    position: offsetKm(-5.2, 1.2),
  },
  {
    id: "D-1048",
    name: "Hoàng Gia Khang",
    phone: "+84 936 712 904",
    licensePlate: "51H-660.32",
    team: "Khu vực 1",
    position: offsetKm(3.4, 5.7),
  },
  {
    id: "D-1049",
    name: "Ngô Trung Kiên",
    phone: "+84 947 803 511",
    licensePlate: "60C-498.61",
    team: "Khu vực 3",
    position: offsetKm(-1.1, 6.3),
  },
  {
    id: "D-1050",
    name: "Đỗ Phú Thịnh",
    phone: "+84 909 472 663",
    licensePlate: "50G-119.44",
    team: "Khu vực 3",
    position: offsetKm(5.3, -2.7),
  },
  {
    id: "D-1051",
    name: "Lý Hải Đăng",
    phone: "+84 933 651 284",
    licensePlate: "61A-077.15",
    team: "Khu vực 3",
    position: offsetKm(-4.3, 4.5),
  },
  {
    id: "D-1052",
    name: "Phan Bảo Long",
    phone: "+84 988 414 902",
    licensePlate: "51E-833.26",
    team: "Khu vực 2",
    position: offsetKm(2.0, -5.4),
  },
];

const EYE_OPEN_EAR = 0.28;
const EYE_CLOSED_EAR = 0.14;
const EYE_YAWN_EAR = 0.22;

function buildInitialDrivers(): Driver[] {
  const now = Date.now();
  return SEED_DRIVERS.map((d, i) => {
    const eyeState: Driver["eyeState"] =
      i % 5 === 0 ? "closed" : i % 7 === 0 ? "yawning" : "open";
    const onPhone = Math.random() > 0.88;
    return {
      ...d,
      status: "active",
      ear:
        eyeState === "closed"
          ? EYE_CLOSED_EAR
          : eyeState === "yawning"
            ? EYE_YAWN_EAR
            : EYE_OPEN_EAR,
      eyeState,
      lastUpdate: now - i * 4_000,
      totalAlerts: Math.max(0, (i * 37) % 9),
      onPhone,
      seatbelt: true,
    };
  });
}

export function seedDrivers(): Driver[] {
  return buildInitialDrivers();
}

export { EYE_OPEN_EAR, EYE_CLOSED_EAR, EYE_YAWN_EAR };
