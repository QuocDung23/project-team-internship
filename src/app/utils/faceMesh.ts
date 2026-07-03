export interface Landmark {
  x: number;
  y: number;
}

export interface MeshGroup {
  /** Closed polygon to outline. */
  ring: number[];
  /** Extra connection segments not in the ring (e.g. eye iris). */
  segments?: Array<[number, number]>;
}

const FACE_W = 0.62;
const CX = 0.5;
const CY = 0.42;

const LANDMARKS: Landmark[] = [
  // 0..16: jawline
  { x: CX - FACE_W * 0.5, y: CY + 0.08 },
  { x: CX - FACE_W * 0.52, y: CY - 0.02 },
  { x: CX - FACE_W * 0.48, y: CY - 0.12 },
  { x: CX - FACE_W * 0.4, y: CY - 0.2 },
  { x: CX - FACE_W * 0.3, y: CY - 0.26 },
  { x: CX - FACE_W * 0.18, y: CY - 0.3 },
  { x: CX - FACE_W * 0.05, y: CY - 0.32 },
  { x: CX, y: CY - 0.33 },
  { x: CX + FACE_W * 0.05, y: CY - 0.32 },
  { x: CX + FACE_W * 0.18, y: CY - 0.3 },
  { x: CX + FACE_W * 0.3, y: CY - 0.26 },
  { x: CX + FACE_W * 0.4, y: CY - 0.2 },
  { x: CX + FACE_W * 0.48, y: CY - 0.12 },
  { x: CX + FACE_W * 0.52, y: CY - 0.02 },
  { x: CX + FACE_W * 0.5, y: CY + 0.08 },
  { x: CX + FACE_W * 0.35, y: CY + 0.2 },
  { x: CX, y: CY + 0.26 },
  // 17..21: left eyebrow
  { x: CX - FACE_W * 0.3, y: CY - 0.2 },
  { x: CX - FACE_W * 0.22, y: CY - 0.24 },
  { x: CX - FACE_W * 0.12, y: CY - 0.26 },
  { x: CX - FACE_W * 0.02, y: CY - 0.24 },
  { x: CX + FACE_W * 0.05, y: CY - 0.21 },
  // 22..26: right eyebrow
  { x: CX + FACE_W * 0.05, y: CY - 0.21 },
  { x: CX + FACE_W * 0.12, y: CY - 0.24 },
  { x: CX + FACE_W * 0.22, y: CY - 0.26 },
  { x: CX + FACE_W * 0.3, y: CY - 0.2 },
  { x: CX + FACE_W * 0.35, y: CY - 0.14 },
  // 27..31: nose bridge + tip
  { x: CX - 0.02, y: CY - 0.16 },
  { x: CX - 0.04, y: CY - 0.04 },
  { x: CX - 0.05, y: CY + 0.04 },
  { x: CX - 0.06, y: CY + 0.08 },
  { x: CX - 0.04, y: CY + 0.1 },
  // 32..36: nose base (nostrils)
  { x: CX - 0.08, y: CY + 0.1 },
  { x: CX - 0.02, y: CY + 0.11 },
  { x: CX + 0.04, y: CY + 0.11 },
  { x: CX + 0.08, y: CY + 0.1 },
  { x: CX + 0.04, y: CY + 0.1 },
  // 37..46: left eye
  { x: CX - FACE_W * 0.22, y: CY - 0.12 },
  { x: CX - FACE_W * 0.16, y: CY - 0.16 },
  { x: CX - FACE_W * 0.1, y: CY - 0.17 },
  { x: CX - FACE_W * 0.05, y: CY - 0.15 },
  { x: CX - FACE_W * 0.06, y: CY - 0.11 },
  { x: CX - FACE_W * 0.1, y: CY - 0.1 },
  { x: CX - FACE_W * 0.16, y: CY - 0.1 },
  { x: CX - FACE_W * 0.2, y: CY - 0.1 },
  { x: CX - FACE_W * 0.22, y: CY - 0.11 },
  { x: CX - FACE_W * 0.2, y: CY - 0.115 },
  // 47..56: right eye
  { x: CX + FACE_W * 0.06, y: CY - 0.115 },
  { x: CX + FACE_W * 0.1, y: CY - 0.1 },
  { x: CX + FACE_W * 0.16, y: CY - 0.1 },
  { x: CX + FACE_W * 0.2, y: CY - 0.1 },
  { x: CX + FACE_W * 0.22, y: CY - 0.11 },
  { x: CX + FACE_W * 0.2, y: CY - 0.115 },
  { x: CX + FACE_W * 0.16, y: CY - 0.16 },
  { x: CX + FACE_W * 0.1, y: CY - 0.17 },
  { x: CX + FACE_W * 0.05, y: CY - 0.15 },
  { x: CX + FACE_W * 0.06, y: CY - 0.11 },
  // 57..64: outer lips
  { x: CX - 0.13, y: CY + 0.06 },
  { x: CX - 0.08, y: CY + 0.04 },
  { x: CX, y: CY + 0.03 },
  { x: CX + 0.08, y: CY + 0.04 },
  { x: CX + 0.13, y: CY + 0.06 },
  { x: CX + 0.1, y: CY + 0.14 },
  { x: CX + 0.04, y: CY + 0.17 },
  { x: CX, y: CY + 0.18 },
  // 65..70: inner lips
  { x: CX - 0.06, y: CY + 0.07 },
  { x: CX - 0.02, y: CY + 0.06 },
  { x: CX + 0.02, y: CY + 0.06 },
  { x: CX + 0.06, y: CY + 0.07 },
  { x: CX + 0.04, y: CY + 0.12 },
  { x: CX, y: CY + 0.13 },
  // 71..76: cheeks anchors (used for face oval frame only)
  { x: CX - FACE_W * 0.45, y: CY + 0.0 },
  { x: CX - FACE_W * 0.42, y: CY + 0.1 },
  { x: CX + FACE_W * 0.42, y: CY + 0.1 },
  { x: CX + FACE_W * 0.45, y: CY + 0.0 },
];

const MESH_GROUPS: MeshGroup[] = [
  // Face oval
  { ring: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] },
  // Left eyebrow
  { ring: [17, 18, 19, 20, 21] },
  // Right eyebrow
  { ring: [22, 23, 24, 25, 26] },
  // Nose
  { ring: [27, 28, 29, 30, 31, 32, 33, 34, 35] },
  // Left eye
  {
    ring: [37, 38, 39, 40, 41, 42, 43, 44, 45],
    segments: [[46, 40]],
  },
  // Right eye
  {
    ring: [47, 48, 49, 50, 51, 52, 53, 54, 55],
    segments: [[56, 49]],
  },
  // Outer lips
  { ring: [57, 58, 59, 60, 61, 62, 63, 64] },
  // Inner lips
  { ring: [65, 66, 67, 68, 69, 70] },
];

export function getFaceLandmarks(): Landmark[] {
  return LANDMARKS;
}

export function getFaceMeshGroups(): MeshGroup[] {
  return MESH_GROUPS;
}
