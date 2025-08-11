import { svgEl } from './SVG';
import { Vec2, dist, add, sub, norm, mul } from './types';
import { Obstacle } from './Entity';
import { Shepherd } from '../entities/Shepherd';
import { Sheep } from '../entities/Sheep';
import { Dog } from '../entities/Dog';
import { LevelConfig } from './Level';
import { GameStore } from '../ui/Store';
import { Sfx } from './Audio';

export class Game {
  private host: HTMLElement;
  private svg: SVGSVGElement;
  private scene: SVGGElement;
  private obstaclesLayer: SVGGElement;
  private entitiesLayer: SVGGElement;
  private fxLayer: SVGGElement;

  private W = 960;
  private H = 540;

  private shepherd!: Shepherd;
  private sheep: Sheep[] = [];
  private dogs: Dog[] = [];
  private selectedDog: Dog | null = null;
  private goal = { x: 800, y: 270, r: 60 };
  private obstacles: Obstacle[] = [];
  private level?: LevelConfig;

  private ts = performance.now();
  private store: GameStore;
  // private followUpdateTimer = 0; // para actualizar factor cada 10s
  private sfx = new Sfx();
  private paused = false;
  private initialSheepPositions: Vec2[] = [];

  constructor(host: HTMLElement, store: GameStore) {
    try {
      this.host = host;
      this.store = store;
      console.log('Game constructor - host:', host);
      
      this.svg = svgEl('svg', { class: 'game-svg', viewBox: `0 0 ${this.W} ${this.H}`, 'aria-label': 'Juego Ovejas' }) as SVGSVGElement;
      this.scene = svgEl('g');
      this.obstaclesLayer = svgEl('g');
      this.entitiesLayer = svgEl('g');
      this.fxLayer = svgEl('g');
      this.scene.append(this.obstaclesLayer, this.entitiesLayer, this.fxLayer);
      this.svg.append(this.scene);
      this.host.innerHTML = '';
      this.host.append(this.svg);
      console.log('Game constructor - SVG created and appended');

      this.setupDefs();
      this.setupInput();
      this.tick = this.tick.bind(this);
      requestAnimationFrame(this.tick);
      window.addEventListener('resize', () => this.resize());
      this.resize();
      console.log('Game constructor - completed successfully');
    } catch (error) {
      console.error('Error in Game constructor:', error);
      throw error;
    }
  }

  loadLevel(level: LevelConfig) {
    try {
      console.log('Loading level:', level.id);
      this.level = level;
      this.goal = { ...level.goal };
      this.obstacles = level.obstacles.map(o => ({ ...o }));
      this.entitiesLayer.innerHTML = '';
      this.obstaclesLayer.innerHTML = '';
      this.fxLayer.innerHTML = '';
      this.sheep = [];
      this.dogs = [];
      this.selectedDog = null;

    // render goal (corral/cobertizo)
    const goalG = svgEl('g');
    const ring = svgEl('circle', { cx: this.goal.x, cy: this.goal.y, r: this.goal.r * 1.2, fill: 'rgba(126,224,129,.18)', stroke: '#7EE081', 'stroke-width': 3 });
    const shed = svgEl('g', { transform: `translate(${this.goal.x - 18}, ${this.goal.y - 22})`, filter: 'url(#ds)' });
    const roof = svgEl('path', { d: 'M 0 10 L 18 0 L 36 10 Z', fill: '#ef5350', stroke: '#bf3b39', 'stroke-width': 2 });
    const body = svgEl('rect', { x: 4, y: 10, width: 28, height: 22, rx: 2, fill: '#ffffff', stroke: '#7EE081', 'stroke-width': 2 });
    const door = svgEl('rect', { x: 16, y: 16, width: 8, height: 14, rx: 1, fill: '#7EE081' });
    shed.append(roof, body, door);
    goalG.append(ring, shed);
    this.fxLayer.append(goalG);

      // render obstacles
    for (const o of this.obstacles) {
      let el: SVGElement;
      if (o.kind === 'stone') {
        el = svgEl('circle', { cx: o.x, cy: o.y, r: o.r, fill: '#95a5ae', stroke: '#5d6b74', 'stroke-width': 2 });
      } else if (o.kind === 'tree') {
        el = svgEl('g');
        const trunk = svgEl('rect', { x: o.x - 4, y: o.y, width: 8, height: o.r, fill: '#7b4a12' });
        const crown = svgEl('circle', { cx: o.x, cy: o.y, r: o.r, fill: '#5ac06b', stroke: '#3c8f48', 'stroke-width': 2 });
        el.append(trunk, crown);
      } else { // hole
        el = svgEl('circle', { cx: o.x, cy: o.y, r: o.r, fill: '#1f2d38', stroke: '#0e1820', 'stroke-width': 2, opacity: 0.9 });
      }
      this.obstaclesLayer.append(el);
    }

    // entities
    this.shepherd = new Shepherd();
    // Pastor arranca en la posición inicial del nivel
    this.shepherd.setPosition(level.shepherdStart);
    this.entitiesLayer.append(this.shepherd.group);

    const followFn = () => this.shepherd.position;
    const cx = this.W * 0.25, cy = this.H * 0.5;
    this.initialSheepPositions = [];
    for (let i = 0; i < level.initialSheep; i++) {
      const pos = { x: cx + (i % 3) * 16 - 16, y: cy + Math.floor(i / 3) * 16 - 16 };
      const s = new Sheep(followFn);
      s.setPosition(pos);
      s.currentSpeed = 0;
      this.sheep.push(s);
      this.entitiesLayer.append(s.group);
      this.initialSheepPositions.push(pos);
    }

    // environment FX
    if (level.environment === 'snow') {
      const veil = svgEl('rect', { x: 0, y: 0, width: this.W, height: this.H, fill: 'rgba(255,255,255,.65)' });
      this.fxLayer.append(veil);
    }
    console.log('Level loaded successfully. Sheep count:', this.sheep.length);
    } catch (error) {
      console.error('Error loading level:', error);
      throw error;
    }
  }

  spawnDog() {
    const d = new Dog();
    const base = this.shepherd.position;
    d.setPosition({ x: base.x + 20, y: base.y + 20 });
    this.dogs.push(d);
    this.entitiesLayer.append(d.group);
    // selectable
    d.group.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.selectedDog === d) {
        d.setSelected(false); this.selectedDog = null;
      } else {
        this.dogs.forEach(x => x.setSelected(false));
        d.setSelected(true); this.selectedDog = d;
      }
    });
  }

  upgradeShepherdSpeed(multiplier: number) {
    this.shepherd.upgradeSpeed(multiplier);
  }

  private setupDefs() {
    const defs = svgEl('defs');
    const ds = svgEl('filter', { id: 'ds', x: '-20%', y: '-20%', width: '140%', height: '140%' });
    ds.append(
      svgEl('feDropShadow', { dx: 0, dy: 1, stdDeviation: 1.2, 'flood-color': 'rgba(7,48,71,.25)' })
    );
    const gradSkin = svgEl('linearGradient', { id: 'grad-skin', x1: '0%', y1: '0%', x2: '0%', y2: '100%' });
    gradSkin.append(svgEl('stop', { offset: '0%', 'stop-color': '#ffe7c8' }), svgEl('stop', { offset: '100%', 'stop-color': '#ffd8a6' }));
    const gradCloth = svgEl('linearGradient', { id: 'grad-cloth', x1: '0%', y1: '0%', x2: '0%', y2: '100%' });
    gradCloth.append(svgEl('stop', { offset: '0%', 'stop-color': '#78e6f6' }), svgEl('stop', { offset: '100%', 'stop-color': '#63C5DA' }));
    const gradFleece = svgEl('linearGradient', { id: 'grad-fleece', x1: '0%', y1: '0%', x2: '0%', y2: '100%' });
    gradFleece.append(svgEl('stop', { offset: '0%', 'stop-color': '#ffffff' }), svgEl('stop', { offset: '100%', 'stop-color': '#e8f1f6' }));
    const gradDog = svgEl('linearGradient', { id: 'grad-dog', x1: '0%', y1: '0%', x2: '0%', y2: '100%' });
    gradDog.append(svgEl('stop', { offset: '0%', 'stop-color': '#4a575f' }), svgEl('stop', { offset: '100%', 'stop-color': '#2f3d46' }));
    defs.append(ds, gradSkin, gradCloth, gradFleece, gradDog);
    this.svg.prepend(defs);
  }

  private setupInput() {
    this.svg.addEventListener('click', (e) => {
      const pt = this.getMouseSVGPoint(e);
      if (this.selectedDog) {
        this.selectedDog.setTarget(pt);
      } else {
        // Primer clic: si pulsas sobre el pastor => silbo
        const clickedOnShepherd = Math.hypot(pt.x - this.shepherd.position.x, pt.y - this.shepherd.position.y) <= 16;
        if (clickedOnShepherd && this.store.whistles > 0) {
          this.store.whistles -= 1;
          this.sfx.whistle();
          // +5 atención y orientar hacia el pastor: aplicar varias veces con frecuencia de 0.5s
          // durante 2 segundos (4 impulsos)
          let impulses = 4;
          const interval = setInterval(() => {
            for (const s of this.sheep) {
              s.setAttention((s.attention ?? 0) + 5);
              s.steerTowards(this.shepherd.position, 0.65);
            }
            impulses -= 1;
            if (impulses <= 0) clearInterval(interval);
          }, 500);
          this.updateHudWhistles();
        } else if (!clickedOnShepherd) {
          // Solo mover si no se clicó encima del pastor
          this.shepherd.setTarget(pt);
        }
      }
    });
  }

  private getMouseSVGPoint(evt: MouseEvent): Vec2 {
    const rect = this.svg.getBoundingClientRect();
    const x = ((evt.clientX - rect.left) / rect.width) * this.W;
    const y = ((evt.clientY - rect.top) / rect.height) * this.H;
    return { x, y };
  }

  private resize() {
    this.svg.style.width = '100%';
    this.svg.style.height = '100%';
    this.svg.style.display = 'block';
  }

  // private spawnAngryBolt(p: Vec2) {
  //   const g = svgEl('g');
  //   const bolt = svgEl('path', { d: 'M 0 -8 L 6 -2 L 2 -2 L 8 6 L -2 2 L 2 2 Z', fill: '#ff6b6b', stroke: '#bf3b39', 'stroke-width': 1 });
  //   g.setAttribute('transform', `translate(${p.x},${p.y - 16})`);
  //   this.fxLayer.append(g);
  //   g.append(bolt);
  //   setTimeout(() => g.remove(), 350);
  //   // sonido de balido
  //   this.sfx.bleat();
  // }

  private updateHudWhistles() {
    const el = document.getElementById('whistles');
    if (el) el.textContent = `Silbos: ${this.store.whistles}`;
  }

  private tick(now: number) {
    const dt = Math.min(0.033, (now - this.ts) / 1000);
    this.ts = now;

    if (this.level) {
      if (this.paused) { requestAnimationFrame(this.tick); return; }
      // update entities
      this.shepherd.update(dt, this.obstacles);
      this.shepherd.clampToBounds(this.W, this.H);
      for (const d of this.dogs) { d.update(dt, this.obstacles); d.clampToBounds(this.W, this.H); }

      // Simple herding: dogs empujan ovejas si están cerca, hacia el pastor
      for (let i = 0; i < this.sheep.length; i++) {
        const s = this.sheep[i];
        // Dog pressure
        for (const d of this.dogs) {
          const dd = dist(s.position, d.position);
          if (dd < 60) {
            s.steerTowards(this.shepherd.position, 0.3);
          }
        }

        // Avoid other sheep (resolución de colisión oveja-oveja) + cohesión (fuerza de rebaño)
        let nearest: { sheep: typeof s | null; d: number } = { sheep: null, d: Infinity };
        for (let j = 0; j < this.sheep.length; j++) {
          const t = this.sheep[j];
          if (t === s) continue;
          const d = dist(s.position, t.position);
          const minD = s.radius + t.radius + 2;
          if (d < minD) {
            const dir = norm(sub(s.position, t.position));
            const push = (minD - d) * 0.5;
            s.position = add(s.position, mul(dir, push));
            t.position = add(t.position, mul(dir, -push));
            s.velocity = add(s.velocity, mul(dir, 60 * dt));
          }
          if (d < nearest.d) nearest = { sheep: t, d };
        }
        // Cohesión desactivada al dejar herdForce = 0 en Sheep

        // Oveja-pastor: no montan encima, mantienen mínima distancia
        const dToShep = dist(s.position, this.shepherd.position);
        const minShep = s.radius + this.shepherd.radius + 6;
        if (dToShep < minShep) {
          const dir = norm(sub(s.position, this.shepherd.position));
          const push = (minShep - dToShep);
          s.position = add(s.position, mul(dir, push));
        }

        // Holes can make sheep lost in Level 2 scenario
        const inHole = this.obstacles.find(o => o.kind === 'hole' && dist(s.position, { x: o.x, y: o.y }) < o.r - 2);
        if (inHole) {
          s.lost = true;
          s.group.setAttribute('opacity', '0.4');
        }

        // Eliminada lógica anterior de followFactor

        // Si el pastor está a la izquierda de la oveja: no desaparecer; evitarlo forzando zIndex y clamp visible
        // Interpretación de tu reporte: probablemente se iban fuera por exceso de atracción+velocidad
        // Aquí garantizamos visibilidad reforzando límites y anulando empuje lateral cuando el pastor queda muy a la izquierda
        if (this.shepherd.position.x < s.position.x - 5 && s.position.x <= s.radius + 2) {
          // si está pegada al borde izquierdo y el pastor está aún más a la izquierda, anula componente x hacia fuera
          if (s.velocity.x < 0) s.velocity.x = 0;
          s.position.x = s.radius + 2;
        }

        s.update(dt, this.obstacles);
        s.clampToBounds(this.W, this.H);
      }

      // Eliminado el temporizador de followFactor (nueva atención por oveja dentro de Sheep)

      // Check goal
      const aliveSheep = this.sheep.filter(s => !s.lost);
      const inside = aliveSheep.filter(s => dist(s.position, this.goal) <= this.goal.r - 6).length;
      if (aliveSheep.length > 0 && inside === aliveSheep.length) {
        // Reiniciar estado inicial sin alert ni premio
        this.resetPositions();
        // Reiniciar silbos
        this.store.whistles = 3;
        const el = document.getElementById('whistles');
        if (el) el.textContent = `Silbos: ${this.store.whistles}`;
      }
    }

    requestAnimationFrame(this.tick);
  }

  getSheepCount() { return this.sheep.length; }

  setAllSheepSpeed(v: number) {
    for (const s of this.sheep) { s.currentSpeed = v; s.velocity.x = 0; s.velocity.y = 0; }
  }

  resetPositions() {
    // Restablecer pastor y ovejas al inicio del nivel
    if (!this.level) return;
    this.shepherd.setPosition({ x: this.goal.x, y: this.goal.y });
    for (let i = 0; i < this.sheep.length; i++) {
      const s = this.sheep[i];
      const pos = this.initialSheepPositions[i] || { x: this.W * 0.25, y: this.H * 0.5 };
      s.setPosition(pos);
      s.currentSpeed = 0;
      s.velocity.x = 0; s.velocity.y = 0;
    }
  }

  togglePause() { this.paused = !this.paused; }
  isPaused() { return this.paused; }
}


