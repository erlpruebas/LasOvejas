import { Entity, Obstacle } from '../core/Entity';
import { svgEl } from '../core/SVG';
import { Vec2, dist, sub, norm, mul, add, clamp, len } from '../core/types';
import { Config } from '../core/Config';
import { Sfx } from '../core/Audio';

export class Sheep extends Entity {
  body: SVGElement;
  eye: SVGElement;
  tail: SVGElement;
  legs: SVGGElement;
  private flip: SVGGElement;
  private debugCircle: SVGCircleElement;
  private debugDir: SVGLineElement;
  private attentionLabel: SVGTextElement;
  private questionMark: SVGTextElement;
  followTarget: () => Vec2;
  lost: boolean = false;
  attention: number = 6; // 0..10
  private facing: 1 | -1 = 1; // 1 derecha, -1 izquierda
  // Dirección y velocidad
  private dirAngle: number = 0; // rad
  currentSpeed: number = 0; // px/s
  // Aleatoriedad
  private randomTimer: number = 0;
  private movementRefreshTimer: number = 0; // para aplicar seguimiento/movimiento cada X s
  // Fuerza de rebaño (0..1 aprox). Para pruebas, lo dejaremos a 0 para eliminar cohesión
  herdForce: number = 0;
  // Modo distraído: ignora atracción del pastor mientras >0
  private distractedTimer: number = 0;
  // Paseo/paro cuando no hay pastor
  private strollTimer: number = 0;
  private strolling: boolean = false;
  private sfx = new Sfx();

  constructor(getFollowTarget: () => Vec2) {
    const g = svgEl('g', { class: 'sprite', 'data-entity': 'sheep' }) as SVGGElement;
    super(g);
    this.speed = 10000; // tope absoluto teórico
    this.radius = 9;
    this.followTarget = getFollowTarget;
    // Dirección inicial aleatoria
    this.dirAngle = Math.random() * Math.PI * 2;
    // Timers iniciales
    this.randomTimer = this.nextDistractionInterval();
    this.strollTimer = this.nextIdleDuration();
    this.strolling = false;
    // Fleece: forma nube
    const fleece = svgEl('path', {
      d: 'M -9 0 Q -12 -6 -6 -8 Q -3 -12 1 -8 Q 6 -12 9 -6 Q 12 0 8 3 Q 6 8 0 7 Q -6 8 -8 3 Z',
      fill: 'url(#grad-fleece)', stroke: '#5d6b74', 'stroke-width': 2, filter: 'url(#ds)'
    });
    const head = svgEl('ellipse', { cx: 6, cy: -2, rx: 5, ry: 4, fill: '#2f3d46', stroke: '#1b252b', 'stroke-width': 1.5 });
    const ear = svgEl('ellipse', { cx: 9, cy: -5, rx: 2.5, ry: 1.5, fill: '#2f3d46' });
    this.eye = svgEl('circle', { cx: 7.5, cy: -2, r: 1.1, fill: '#fff' });
    const pupil = svgEl('circle', { cx: 7.5, cy: -2, r: 0.6, fill: '#000' });
    this.tail = svgEl('circle', { cx: -9.5, cy: 1.5, r: 1.8, fill: '#e6eef3', stroke: '#5d6b74', 'stroke-width': 1 });
    this.legs = svgEl('g');
    const l1 = svgEl('rect', { x: -5, y: 6, width: 2, height: 6, rx: 1, fill: '#2f3d46' });
    const l2 = svgEl('rect', { x: -1, y: 6, width: 2, height: 6, rx: 1, fill: '#2f3d46' });
    l1.setAttribute('class', 'leg-swing-a'); l2.setAttribute('class', 'leg-swing-b');
    this.legs.append(l1, l2);
    this.body = svgEl('g');
    this.body.append(fleece);
    const bob = svgEl('g', { class: 'walk-bob' });
    bob.append(this.legs, this.body, this.tail, head, ear, this.eye, pupil);
    this.flip = svgEl('g');
    this.flip.append(bob);
    // Debug visuals (círculo de atención y línea de dirección)
    this.debugCircle = svgEl('circle', { r: 1, fill: 'rgba(99,197,218,.08)', stroke: '#63C5DA', 'stroke-dasharray': '4 4' }) as SVGCircleElement;
    this.debugDir = svgEl('line', { x1: 0, y1: 0, x2: 0, y2: 0, stroke: '#083041', 'stroke-width': 2 }) as SVGLineElement;
    this.attentionLabel = svgEl('text', { x: 0, y: -18, 'text-anchor': 'middle', fill: '#083041', 'font-size': 10, 'font-weight': 800 }) as unknown as SVGTextElement;
    this.questionMark = svgEl('text', { x: 0, y: -28, 'text-anchor': 'middle', fill: '#ff6b6b', 'font-size': 14, 'font-weight': 900, opacity: 0 }) as unknown as SVGTextElement;
    this.questionMark.textContent = '?';
    g.append(this.debugCircle, this.flip, this.debugDir, this.attentionLabel, this.questionMark);
  }

  update(dt: number, obstacles: Obstacle[]): void {
    if (this.lost) return;

    // 1) Evento aleatorio de distracción
    this.randomTimer -= dt;
    if (this.randomTimer <= 0) {
      this.randomTimer = this.nextDistractionInterval();
      // variación de atención -1/0/+1
      const vary = Math.floor(Math.random() * 3) - 1;
      this.setAttention(this.attention + vary);
      // probabilidad logarítmica de distraerse
      const p = this.probDistraction(this.attention);
      if (Math.random() < p) {
        const lack = (10 - this.attention) / 10;
        // impulso suave inicial
        this.dirAngle += (Math.random() - 0.5) * Math.PI * 0.6 * (0.4 + 0.6 * lack);
        this.currentSpeed += Config.sheep.accel * (0.2 + 1.0 * lack);
        // duración = (10 - atención)*2
        const dur = Math.max(0.2, (10 - this.attention) * 2);
        this.distractedTimer = Math.max(this.distractedTimer, dur);
        this.sfx.bleat();
        this.questionMark.setAttribute('opacity', '1');
      }
    }

    // 2) Influencia del pastor si entra en el círculo de atención
    const r = this.getAttentionRadius();
    const shepherdPos = this.followTarget();
    const toShep = sub(shepherdPos, this.position);
    const dShep = len(toShep);
    // 2) Movimiento/seguimiento del pastor aplicado cada movementRefreshSec
    this.movementRefreshTimer -= dt;
    if (this.movementRefreshTimer <= 0) {
      this.movementRefreshTimer = Config.sheep.movementRefreshSec;
      const attNorm = clamp(this.attention / 10, 0, 1);
      const closeFactor = dShep <= r ? (r - dShep) / r : 0; // 0..1

      // Incremento de atención solo si < 6 y el pastor está dentro
      if (dShep <= r && this.attention < 6) {
        const inc = Config.sheep.movementRefreshSec;
        this.setAttention(Math.min(6, this.attention + inc));
      }

      if (this.distractedTimer <= 0 && dShep <= r) {
        // Seguir al pastor: cuanto mayor atención, más giro y aceleración
        const toward = Math.atan2(toShep.y, toShep.x);
        const turnGain = Config.sheep.turnRate * (0.3 + 0.7 * attNorm) * (0.5 + 1.5 * closeFactor);
        const accelGain = Config.sheep.accel * (0.1 + 0.9 * attNorm) * (0.2 + 1.2 * closeFactor);
        this.dirAngle = this.mixAngle(this.dirAngle, toward, turnGain);
        this.currentSpeed += accelGain;
      } else {
        // Patrón movimiento aleatorio lento: 80% movimiento, 20% parada según 'inquieta'
        if (this.distractedTimer <= 0) {
          const moveProb = clamp((Config as any).inquieta ?? 8, 0, 10) / 10; // 0..1
          this.strollTimer -= dt;
          if (this.strollTimer <= 0) {
            if (Math.random() < moveProb) {
              // mover
              this.strolling = true;
              this.dirAngle = Math.random() * Math.PI * 2;
              const smin = Config.sheep.stroll.walkSpeedMin;
              const smax = Config.sheep.stroll.walkSpeedMax;
              this.currentSpeed = clamp(smin + Math.random() * (smax - smin), 0, Config.sheep.maxSpeed);
              this.strollTimer = this.nextWalkDuration();
            } else {
              // parar
              this.strolling = false;
              this.currentSpeed = 0;
              this.strollTimer = this.nextIdleDuration();
            }
          }
          if (this.strolling) {
            // rumbo con pequeñas variaciones + leve drift
            this.dirAngle += (Math.random() - 0.5) * 0.15;
          }
        }
      }
    }

    // 3) Sin rozamiento por frame; solo limitamos por velocidad máxima
    this.currentSpeed = clamp(this.currentSpeed, 0, Config.sheep.maxSpeed);

    // 4) Reducir temporizador de distracción
    if (this.distractedTimer > 0) {
      this.distractedTimer = Math.max(0, this.distractedTimer - dt);
      // dirección contraria al pastor durante la distracción
      const shepherdPos = this.followTarget();
      const away = Math.atan2(this.position.y - shepherdPos.y, this.position.x - shepherdPos.x);
      this.dirAngle = this.mixAngle(this.dirAngle, away, 0.4);
      // leve ruido
      this.dirAngle += (Math.random() - 0.5) * 0.2;
      if (this.distractedTimer === 0) this.questionMark.setAttribute('opacity', '0');
    }

    // 5) Aplicar velocidad a partir de dirección
    const dir = { x: Math.cos(this.dirAngle), y: Math.sin(this.dirAngle) };
    this.velocity.x = dir.x * this.currentSpeed;
    this.velocity.y = dir.y * this.currentSpeed;

    // 6) Integración + colisiones
    this.integrate(dt);
    this.avoidObstacles(obstacles);

    // 7) Visuales y orientación
    if (Math.abs(this.velocity.x) > 2) this.facing = this.velocity.x >= 0 ? 1 : -1;
    this.group.setAttribute('transform', `translate(${this.position.x},${this.position.y})`);
    this.flip.setAttribute('transform', `scale(${this.facing},1)`);
    // círculo de atención
    this.debugCircle.setAttribute('r', String(r));
    // línea de dirección proporcional a velocidad
    const L = Math.min(600, this.currentSpeed * 1.2); // 10x más pequeño que el anterior al ajuste
    this.debugDir.setAttribute('x2', String(Math.cos(this.dirAngle) * L));
    this.debugDir.setAttribute('y2', String(Math.sin(this.dirAngle) * L));
    this.attentionLabel.textContent = String(this.attention);
  }

  getAttentionRadius(): number {
    return (50 + this.attention * 12) * Config.sheep.attentionScale; // mayor atención => mayor radio, escalable
  }

  setAttention(v: number) {
    this.attention = clamp(Math.round(v), 0, 10);
  }

  steerTowards(pos: Vec2, intensity: number) {
    const to = Math.atan2(pos.y - this.position.y, pos.x - this.position.x);
    this.dirAngle = this.mixAngle(this.dirAngle, to, Config.sheep.turnRate * intensity);
    this.currentSpeed += Config.sheep.accel * intensity;
  }

  private mixAngle(a: number, b: number, t: number): number {
    const da = Math.atan2(Math.sin(b - a), Math.cos(b - a));
    return a + da * clamp(t, 0, 1);
  }

  private nextDistractionInterval(): number {
    const min = Math.max(1, Config.sheep.distractionMinSec || 10);
    const max = Math.max(min, Config.sheep.distractionMaxSec || 30);
    return min + Math.random() * (max - min);
  }

  private nextWalkDuration(): number {
    const { walkDurMin, walkDurMax } = Config.sheep.stroll;
    return walkDurMin + Math.random() * (walkDurMax - walkDurMin);
  }

  private nextIdleDuration(): number {
    const { idleDurMin, idleDurMax } = Config.sheep.stroll;
    return idleDurMin + Math.random() * (idleDurMax - idleDurMin);
  }

  // Probabilidad logarítmica decreciente con la atención (0..10)
  private probDistraction(att: number): number {
    const a = clamp(att, 0, 10);
    const p = 1 - Math.log(a + 1) / Math.log(11); // 1 a 0 aprox
    return clamp(p, 0.02, 0.98); // límites de seguridad
  }
}


