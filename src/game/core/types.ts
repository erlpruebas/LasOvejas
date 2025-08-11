export type Vec2 = { x: number; y: number };

export function vec(x = 0, y = 0): Vec2 {
  return { x, y };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function mul(a: Vec2, k: number): Vec2 {
  return { x: a.x * k, y: a.y * k };
}

export function len(a: Vec2): number {
  return Math.hypot(a.x, a.y);
}

export function norm(a: Vec2): Vec2 {
  const l = len(a) || 1;
  return { x: a.x / l, y: a.y / l };
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function mix(A: Vec2, B: Vec2, t: number): Vec2 {
  return { x: lerp(A.x, B.x, t), y: lerp(A.y, B.y, t) };
}

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}



