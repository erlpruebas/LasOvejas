import { Vec2, vec, add, sub, mul, len, norm } from './types';

export interface Obstacle {
  kind: 'stone' | 'tree' | 'hole';
  x: number;
  y: number;
  r: number;
}

export abstract class Entity {
  position: Vec2 = vec();
  velocity: Vec2 = vec();
  speed: number = 100; // px/s
  radius: number = 10;
  group: SVGGElement;

  protected target: Vec2 | null = null;

  constructor(group: SVGGElement) {
    this.group = group;
  }

  setTarget(pos: Vec2 | null) {
    this.target = pos ? { ...pos } : null;
  }

  setPosition(pos: Vec2) {
    this.position = { ...pos };
  }

  lookAtVelocity() {
    // Translación por defecto; las subclases pueden añadir escala/rotación.
    this.group.setAttribute('transform', `translate(${this.position.x},${this.position.y})`);
  }

  steerTowards(target: Vec2, maxForce = 120): void {
    const desired = sub(target, this.position);
    const d = len(desired);
    if (d < 1) return;
    const desiredVel = mul(norm(desired), this.speed);
    const steer = sub(desiredVel, this.velocity);
    const l = len(steer);
    const limited = l > maxForce ? mul(norm(steer), maxForce) : steer;
    this.velocity = add(this.velocity, mul(limited, 1 / 60));
  }

  integrate(dt: number) {
    this.position = add(this.position, mul(this.velocity, dt));
  }

  clampToBounds(width: number, height: number) {
    const minX = this.radius + 2;
    const maxX = width - this.radius - 2;
    const minY = this.radius + 2;
    const maxY = height - this.radius - 2;
    if (this.position.x < minX) { this.position.x = minX; if (this.velocity.x < 0) this.velocity.x = 0; }
    if (this.position.x > maxX) { this.position.x = maxX; if (this.velocity.x > 0) this.velocity.x = 0; }
    if (this.position.y < minY) { this.position.y = minY; if (this.velocity.y < 0) this.velocity.y = 0; }
    if (this.position.y > maxY) { this.position.y = maxY; if (this.velocity.y > 0) this.velocity.y = 0; }
  }

  avoidObstacles(obstacles: Obstacle[]) {
    for (const o of obstacles) {
      const dir = sub(this.position, { x: o.x, y: o.y });
      const d = len(dir);
      const minD = this.radius + o.r + 6;
      if (d < minD) {
        const push = mul(norm(dir), (minD - d) * 6);
        this.position = add(this.position, push);
        this.velocity = add(this.velocity, push);
      }
    }
  }

  abstract update(dt: number, obstacles: Obstacle[]): void;
}


