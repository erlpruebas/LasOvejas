import { Entity } from '../core/Entity';
import { svgEl } from '../core/SVG';
// import { Vec2 } from '../core/types';

export class Shepherd extends Entity {
  hat: SVGElement;
  body: SVGElement;
  legs: SVGGElement;
  arms: SVGGElement;

  constructor() {
    const g = svgEl('g', { class: 'sprite', 'data-entity': 'shepherd' }) as SVGGElement;
    super(g);
    this.speed = 120;
    this.radius = 12;

    // Contenedor animado (bobbing)
    const bob = svgEl('g', { class: 'walk-bob' });

    // Cabeza
    const head = svgEl('circle', { r: 8, cy: -16, fill: 'url(#grad-skin)', stroke: '#083041', 'stroke-width': 1.5 });
    // Sombrero (copa + ala)
    const hatCrown = svgEl('rect', { x: -7, y: -30, width: 14, height: 10, rx: 2, fill: '#0b2b3b' });
    const hatBrim = svgEl('ellipse', { cx: 0, cy: -20, rx: 12, ry: 3, fill: '#0b2b3b' });
    this.hat = svgEl('g');
    this.hat.append(hatCrown, hatBrim);

    // Cuerpo (túnica/poncho)
    const poncho = svgEl('path', {
      d: 'M -14 -8 L 14 -8 L 10 18 Q 0 24 -10 18 Z',
      fill: 'url(#grad-cloth)', stroke: '#073047', 'stroke-width': 2, filter: 'url(#ds)'
    });
    this.body = svgEl('g');
    this.body.append(poncho);

    // Piernas animadas
    this.legs = svgEl('g');
    const legA = svgEl('rect', { x: -7, y: 16, width: 4, height: 10, rx: 1, fill: '#3b4c57' });
    const legB = svgEl('rect', { x: 3, y: 16, width: 4, height: 10, rx: 1, fill: '#3b4c57' });
    legA.setAttribute('class', 'leg-swing-a');
    legB.setAttribute('class', 'leg-swing-b');
    this.legs.append(legA, legB);

    // Brazos y cayado
    this.arms = svgEl('g');
    const arm = svgEl('rect', { x: 10, y: -10, width: 4, height: 14, rx: 2, fill: '#ffe3bd', stroke: '#083041', 'stroke-width': 1 });
    const staff = svgEl('path', { d: 'M 14 -20 Q 28 -26 18 -10 L 18 18', stroke: '#7b4a12', 'stroke-width': 3, fill: 'none' });
    this.arms.append(staff, arm);

    bob.append(this.legs, this.body, head, this.hat, this.arms);
    g.append(bob);
  }

  upgradeSpeed(multiplier: number) { this.speed *= multiplier; }

  update(dt: number, obstacles: any[]): void {
    if (this.target) {
      const dx = this.target.x - this.position.x;
      const dy = this.target.y - this.position.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= this.speed * dt) {
        // Llegó exactamente al punto: detenerse en seco
        this.position.x = this.target.x;
        this.position.y = this.target.y;
        this.velocity.x = 0;
        this.velocity.y = 0;
        this.setTarget(null);
      } else {
        const ux = dx / (dist || 1);
        const uy = dy / (dist || 1);
        this.velocity.x = ux * this.speed;
        this.velocity.y = uy * this.speed;
        this.integrate(dt);
      }
    } else {
      // Sin destino: quedarse prácticamente parado
      this.velocity.x = 0;
      this.velocity.y = 0;
    }
    this.avoidObstacles(obstacles);
    this.lookAtVelocity();
  }
}


