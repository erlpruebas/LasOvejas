import { Entity, Obstacle } from '../core/Entity';
import { svgEl } from '../core/SVG';
import { Vec2 } from '../core/types';

export class Dog extends Entity {
  selected = false;

  constructor() {
    const g = svgEl('g', { class: 'sprite', 'data-entity': 'dog' }) as SVGGElement;
    super(g);
    this.speed = 160;
    this.radius = 8;

    // Perro detallado: cuerpo, cabeza, oreja, cola
    const body = svgEl('ellipse', { rx: 11, ry: 7, fill: 'url(#grad-dog)', stroke: '#1b252b', 'stroke-width': 1.5, filter: 'url(#ds)' });
    const head = svgEl('ellipse', { cx: 7, cy: -2, rx: 6, ry: 5, fill: '#343f46', stroke: '#1b252b', 'stroke-width': 1.5 });
    const ear = svgEl('path', { d: 'M 10 -6 Q 6 -10 6 -4 Q 7 -2 10 -4 Z', fill: '#222' });
    const eye = svgEl('circle', { cx: 9, cy: -3, r: 1.3, fill: '#fff' });
    const pupil = svgEl('circle', { cx: 9, cy: -3, r: 0.7, fill: '#000' });
    const tail = svgEl('rect', { x: -12, y: -2, width: 7, height: 2, rx: 1, fill: '#343f46' });
    tail.setAttribute('class', 'tail-wag');
    const bob = svgEl('g', { class: 'walk-bob' });
    bob.append(body, tail, head, ear, eye, pupil);
    g.append(bob);
  }

  setSelected(sel: boolean) {
    this.selected = sel;
    this.group.setAttribute('opacity', sel ? '1' : '0.9');
    this.group.setAttribute('filter', sel ? 'drop-shadow(0 0 6px rgba(99,197,218,.9))' : 'none');
  }

  update(dt: number, obstacles: Obstacle[]): void {
    if (this.target) {
      this.steerTowards(this.target, 300);
    } else {
      this.velocity.x *= 0.92; this.velocity.y *= 0.92;
    }
    const v = Math.hypot(this.velocity.x, this.velocity.y);
    const max = this.speed;
    if (v > max) { this.velocity.x = (this.velocity.x / v) * max; this.velocity.y = (this.velocity.y / v) * max; }
    this.integrate(dt);
    this.avoidObstacles(obstacles);
    this.lookAtVelocity();
  }
}


