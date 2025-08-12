// Configuración del juego
const Config = {
  sheep: {
    accel: 200,
    maxSpeed: 100,
    turnRate: 0.3,
    movementRefreshSec: 0.5,
    attentionScale: 1.0,
    distractionMinSec: 2,
    distractionMaxSec: 8
  }
};

// Utilidades SVG
function svgEl(tag, attrs = {}, children = []) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null) continue;
    el.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (typeof c === 'string') el.appendChild(document.createTextNode(c));
    else el.appendChild(c);
  }
  return el;
}

// Clase para manejar el almacén del juego
class GameStore {
  constructor() {
    this.money = 500;
    this.whistles = 3;
  }

  tryBuyDog(cost) {
    if (this.money >= cost) {
      this.money -= cost;
      return true;
    }
    return false;
  }

  tryBuySpeed(cost) {
    if (this.money >= cost) {
      this.money -= cost;
      return true;
    }
    return false;
  }
}

// Clase base para entidades
class Entity {
  constructor(element) {
    this.element = element;
    this.position = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0 };
    this.speed = 100;
    this.radius = 10;
    this.target = null;
  }

  setPosition(x, y) {
    this.position.x = x;
    this.position.y = y;
    this.element.setAttribute('transform', `translate(${x}, ${y})`);
  }

  setTarget(target) {
    this.target = target;
  }

  integrate(dt) {
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.setPosition(this.position.x, this.position.y);
  }

  avoidObstacles(obstacles) {
    // Implementación básica de evasión de obstáculos
  }

  lookAtVelocity() {
    if (Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.y) > 0.1) {
      const angle = Math.atan2(this.velocity.y, this.velocity.x);
      this.element.setAttribute('transform', `translate(${this.position.x}, ${this.position.y}) rotate(${angle * 180 / Math.PI})`);
    }
  }
}

// Clase Pastor con gráficos detallados
class Shepherd extends Entity {
  constructor(x, y) {
    const g = svgEl('g', { class: 'sprite', 'data-entity': 'shepherd' });
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
    
    this.setPosition(x, y);
  }

  moveTo(x, y) {
    this.setTarget({ x, y });
  }

  update(dt, obstacles) {
    if (this.target) {
      const dx = this.target.x - this.position.x;
      const dy = this.target.y - this.position.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= this.speed * dt) {
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
      this.velocity.x = 0;
      this.velocity.y = 0;
    }
    this.avoidObstacles(obstacles);
    this.lookAtVelocity();
  }

  upgradeSpeed(multiplier) {
    this.speed *= multiplier;
  }
}

// Clase Oveja con funcionalidad completa
class Sheep extends Entity {
  constructor(x, y, getFollowTarget) {
    const g = svgEl('g', { class: 'sprite', 'data-entity': 'sheep' });
    super(g);
    this.speed = 10000;
    this.radius = 9;
    this.followTarget = getFollowTarget;
    
    // Propiedades de comportamiento
    this.lost = false;
    this.attention = 6;
    this.facing = 1;
    this.dirAngle = Math.random() * Math.PI * 2;
    this.currentSpeed = 0;
    this.randomTimer = this.nextDistractionInterval();
    this.movementRefreshTimer = 0;
    this.herdForce = 0;
    this.distractedTimer = 0;
    this.strollTimer = this.nextIdleDuration();
    this.strolling = false;

    // Gráficos detallados
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
    l1.setAttribute('class', 'leg-swing-a');
    l2.setAttribute('class', 'leg-swing-b');
    this.legs.append(l1, l2);
    
    this.body = svgEl('g');
    this.body.append(fleece);
    
    const bob = svgEl('g', { class: 'walk-bob' });
    bob.append(this.legs, this.body, this.tail, head, ear, this.eye, pupil);
    
    this.flip = svgEl('g');
    this.flip.append(bob);

    // Debug visuals (círculo de atención y línea de dirección)
    this.debugCircle = svgEl('circle', { 
      r: 1, 
      fill: 'rgba(99,197,218,.08)', 
      stroke: '#63C5DA', 
      'stroke-dasharray': '4 4' 
    });
    this.debugDir = svgEl('line', { 
      x1: 0, y1: 0, x2: 0, y2: 0, 
      stroke: '#083041', 'stroke-width': 2 
    });
    this.attentionLabel = svgEl('text', { 
      x: 0, y: -18, 'text-anchor': 'middle', 
      fill: '#083041', 'font-size': 10, 'font-weight': 800 
    });
    this.questionMark = svgEl('text', { 
      x: 0, y: -28, 'text-anchor': 'middle', 
      fill: '#ff6b6b', 'font-size': 14, 'font-weight': 900, opacity: 0 
    });
    this.questionMark.textContent = '?';
    
    g.append(this.debugCircle, this.flip, this.debugDir, this.attentionLabel, this.questionMark);
    this.setPosition(x, y);
  }

  nextDistractionInterval() {
    return Config.sheep.distractionMinSec + Math.random() * (Config.sheep.distractionMaxSec - Config.sheep.distractionMinSec);
  }

  nextIdleDuration() {
    return 1 + Math.random() * 3;
  }

  probDistraction(attention) {
    return Math.pow(0.3, attention / 2);
  }

  setAttention(value) {
    this.attention = Math.max(0, Math.min(10, value));
  }

  update(dt, obstacles) {
    if (this.lost) return;

    // Evento aleatorio de distracción
    this.randomTimer -= dt;
    if (this.randomTimer <= 0) {
      this.randomTimer = this.nextDistractionInterval();
      const vary = Math.floor(Math.random() * 3) - 1;
      this.setAttention(this.attention + vary);
      
      const p = this.probDistraction(this.attention);
      if (Math.random() < p) {
        const lack = (10 - this.attention) / 10;
        this.dirAngle += (Math.random() - 0.5) * Math.PI * 0.6 * (0.4 + 0.6 * lack);
        this.currentSpeed += Config.sheep.accel * (0.2 + 1.0 * lack);
        const dur = Math.max(0.2, (10 - this.attention) * 2);
        this.distractedTimer = Math.max(this.distractedTimer, dur);
        this.questionMark.setAttribute('opacity', '1');
      }
    }

    // Actualizar timers
    this.distractedTimer = Math.max(0, this.distractedTimer - dt);
    this.movementRefreshTimer += dt;
    this.strollTimer -= dt;

    // Lógica de movimiento
    if (this.distractedTimer > 0) {
      // Modo distraído
      this.currentSpeed = Math.max(0, this.currentSpeed - Config.sheep.accel * dt);
    } else {
      // Modo normal - seguir al pastor
      const target = this.followTarget();
      if (target) {
        const dx = target.x - this.position.x;
        const dy = target.y - this.position.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist > 50) {
          const targetAngle = Math.atan2(dy, dx);
          const angleDiff = targetAngle - this.dirAngle;
          const turnAmount = Config.sheep.turnRate * dt * Config.sheep.attentionScale;
          
          if (Math.abs(angleDiff) > turnAmount) {
            this.dirAngle += Math.sign(angleDiff) * turnAmount;
          } else {
            this.dirAngle = targetAngle;
          }
          
          this.currentSpeed = Math.min(Config.sheep.maxSpeed, this.currentSpeed + Config.sheep.accel * dt);
        } else {
          this.currentSpeed = Math.max(0, this.currentSpeed - Config.sheep.accel * dt);
        }
      }
    }

    // Aplicar movimiento
    if (this.movementRefreshTimer >= Config.sheep.movementRefreshSec) {
      this.movementRefreshTimer = 0;
      
      const vx = Math.cos(this.dirAngle) * this.currentSpeed * dt;
      const vy = Math.sin(this.dirAngle) * this.currentSpeed * dt;
      
      this.position.x += vx;
      this.position.y += vy;
      this.setPosition(this.position.x, this.position.y);
    }

    // Actualizar elementos visuales
    this.updateVisuals();
  }

  updateVisuals() {
    // Actualizar círculo de atención
    const attentionRadius = this.attention * 3;
    this.debugCircle.setAttribute('r', attentionRadius);
    
    // Actualizar línea de dirección
    const dirLength = 20;
    this.debugDir.setAttribute('x2', Math.cos(this.dirAngle) * dirLength);
    this.debugDir.setAttribute('y2', Math.sin(this.dirAngle) * dirLength);
    
    // Actualizar etiqueta de atención
    this.attentionLabel.textContent = this.attention;
    
    // Ocultar signo de interrogación si no está distraído
    if (this.distractedTimer <= 0) {
      this.questionMark.setAttribute('opacity', '0');
    }
    
    // Actualizar orientación
    if (this.currentSpeed > 10) {
      this.facing = Math.cos(this.dirAngle) > 0 ? 1 : -1;
      this.flip.setAttribute('transform', `scale(${this.facing}, 1)`);
    }
  }
}

// Clase Perro
class Dog extends Entity {
  constructor(x, y) {
    const g = svgEl('g', { class: 'sprite', 'data-entity': 'dog' });
    super(g);
    this.speed = 150;
    this.radius = 8;

    // Cuerpo del perro
    const body = svgEl('ellipse', { cx: 0, cy: 0, rx: 8, ry: 5, fill: '#8B4513', stroke: '#654321', 'stroke-width': 1 });
    const head = svgEl('circle', { cx: 8, cy: -2, r: 4, fill: '#8B4513', stroke: '#654321', 'stroke-width': 1 });
    const ear = svgEl('ellipse', { cx: 10, cy: -5, rx: 2, ry: 3, fill: '#654321' });
    const eye = svgEl('circle', { cx: 9, cy: -3, r: 0.8, fill: '#000' });
    const nose = svgEl('circle', { cx: 12, cy: -1, r: 0.5, fill: '#000' });
    const tail = svgEl('path', { d: 'M -8 0 Q -12 -3 -10 2', stroke: '#654321', 'stroke-width': 2, fill: 'none' });
    
    const legs = svgEl('g');
    for (let i = 0; i < 4; i++) {
      const leg = svgEl('rect', { 
        x: -6 + i * 4, y: 4, width: 2, height: 4, 
        rx: 1, fill: '#654321' 
      });
      legs.appendChild(leg);
    }

    g.append(body, head, ear, eye, nose, tail, legs);
    this.setPosition(x, y);
  }

  update(dt, obstacles) {
    // Lógica básica del perro
    this.integrate(dt);
  }
}

// Clase principal del juego
class Game {
  constructor(host, store) {
    this.host = host;
    this.store = store;
    this.sheep = [];
    this.dogs = [];
    this.obstacles = [];
    this.goal = { x: 800, y: 270, r: 60 };
    this.paused = false;
    this.shepherd = null;
    this.lastTime = 0;
    
    this.setupGame();
  }

  setupGame() {
    // Crear SVG con definiciones
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('viewBox', '0 0 960 540');
    this.svg.style.width = '100%';
    this.svg.style.height = '100%';
    this.svg.style.background = '#87CEEB';
    
    // Agregar definiciones SVG
    this.setupDefs();
    
    this.host.innerHTML = '';
    this.host.appendChild(this.svg);
    
    // Crear pastor
    this.shepherd = new Shepherd(100, 270);
    this.svg.appendChild(this.shepherd.element);
    
    // Crear ovejas iniciales
    for (let i = 0; i < 5; i++) {
      const sheep = new Sheep(50 + i * 20, 250 + i * 10, () => this.shepherd.position);
      this.sheep.push(sheep);
      this.svg.appendChild(sheep.element);
    }
    
    // Crear meta
    this.createGoal();
    
    // Eventos
    this.svg.addEventListener('click', (e) => this.handleClick(e));
    
    // Iniciar loop del juego
    this.gameLoop();
  }

  setupDefs() {
    const defs = svgEl('defs');
    
    // Gradientes
    const gradSkin = svgEl('linearGradient', { id: 'grad-skin', x1: '0%', y1: '0%', x2: '100%', y2: '100%' });
    gradSkin.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#ffe3bd' }));
    gradSkin.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#f4d4a3' }));
    
    const gradCloth = svgEl('linearGradient', { id: 'grad-cloth', x1: '0%', y1: '0%', x2: '100%', y2: '100%' });
    gradCloth.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#5d6b74' }));
    gradCloth.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#4a5a63' }));
    
    const gradFleece = svgEl('radialGradient', { id: 'grad-fleece', cx: '50%', cy: '50%', r: '50%' });
    gradFleece.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#e6eef3' }));
    gradFleece.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#d1d8dd' }));
    
    // Filtros
    const ds = svgEl('filter', { id: 'ds', x: '-50%', y: '-50%', width: '200%', height: '200%' });
    const feDropShadow = svgEl('feDropShadow', { 
      dx: '2', dy: '2', stdDeviation: '2', 
      'flood-color': 'rgba(0,0,0,0.3)' 
    });
    ds.appendChild(feDropShadow);
    
    defs.appendChild(gradSkin, gradCloth, gradFleece, ds);
    this.svg.appendChild(defs);
  }

  createGoal() {
    const goalG = svgEl('g');
    const ring = svgEl('circle', { 
      cx: this.goal.x, cy: this.goal.y, r: this.goal.r * 1.2, 
      fill: 'rgba(126,224,129,.18)', stroke: '#7EE081', 'stroke-width': 3 
    });
    
    const shed = svgEl('g', { 
      transform: `translate(${this.goal.x - 18}, ${this.goal.y - 22})`, 
      filter: 'url(#ds)' 
    });
    const roof = svgEl('path', { 
      d: 'M 0 10 L 18 0 L 36 10 Z', 
      fill: '#ef5350', stroke: '#bf3b39', 'stroke-width': 2 
    });
    const body = svgEl('rect', { 
      x: 4, y: 10, width: 28, height: 22, rx: 2, 
      fill: '#ffffff', stroke: '#7EE081', 'stroke-width': 2 
    });
    const door = svgEl('rect', { 
      x: 16, y: 16, width: 8, height: 14, rx: 1, 
      fill: '#7EE081' 
    });
    
    shed.append(roof, body, door);
    goalG.append(ring, shed);
    this.svg.appendChild(goalG);
  }

  handleClick(e) {
    if (this.paused) return;
    
    const rect = this.svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (960 / rect.width);
    const y = (e.clientY - rect.top) * (540 / rect.height);
    
    this.shepherd.moveTo(x, y);
  }

  gameLoop(currentTime = 0) {
    if (!this.paused) {
      const dt = (currentTime - this.lastTime) / 1000;
      this.lastTime = currentTime;
      
      if (dt > 0 && dt < 0.1) { // Evitar saltos grandes
        this.update(dt);
      }
    }
    requestAnimationFrame((time) => this.gameLoop(time));
  }

  update(dt) {
    // Actualizar pastor
    this.shepherd.update(dt, this.obstacles);
    
    // Actualizar ovejas
    this.sheep.forEach(sheep => {
      sheep.update(dt, this.obstacles);
    });
    
    // Actualizar perros
    this.dogs.forEach(dog => {
      dog.update(dt, this.obstacles);
    });
    
    // Verificar colisiones con meta
    this.checkGoalCollision();
  }

  checkGoalCollision() {
    this.sheep.forEach(sheep => {
      const dx = sheep.position.x - this.goal.x;
      const dy = sheep.position.y - this.goal.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < this.goal.r) {
        sheep.lost = true;
        sheep.element.style.opacity = '0.5';
      }
    });
  }

  spawnDog() {
    const dog = new Dog(this.shepherd.position.x + 50, this.shepherd.position.y);
    this.dogs.push(dog);
    this.svg.appendChild(dog.element);
  }

  upgradeShepherdSpeed(factor) {
    this.shepherd.upgradeSpeed(factor);
  }

  togglePause() {
    this.paused = !this.paused;
  }

  isPaused() {
    return this.paused;
  }

  getSheepCount() {
    return this.sheep.filter(s => !s.lost).length;
  }

  loadLevel(levelConfig) {
    console.log('Loading level:', levelConfig);
    // Implementar carga de nivel con obstáculos
    if (levelConfig.obstacles) {
      this.obstacles = levelConfig.obstacles.map(o => ({ ...o }));
    }
  }
}

// Configuración de niveles
const LevelId = {
  Level1: 'Level1',
  Level2: 'Level2',
  Level3: 'Level3'
};

function createLevels() {
  return {
    [LevelId.Level1]: {
      id: LevelId.Level1,
      meta: { number: 1 },
      goal: { x: 800, y: 270, r: 60 },
      obstacles: []
    },
    [LevelId.Level2]: {
      id: LevelId.Level2,
      meta: { number: 2 },
      goal: { x: 800, y: 270, r: 60 },
      obstacles: [
        { x: 400, y: 200, r: 30, kind: 'stone' },
        { x: 600, y: 350, r: 40, kind: 'tree' }
      ]
    },
    [LevelId.Level3]: {
      id: LevelId.Level3,
      meta: { number: 3 },
      goal: { x: 800, y: 270, r: 60 },
      obstacles: [
        { x: 300, y: 150, r: 25, kind: 'stone' },
        { x: 500, y: 300, r: 35, kind: 'tree' },
        { x: 700, y: 200, r: 30, kind: 'stone' }
      ]
    }
  };
}

// Exportar para uso en main.js
window.Game = Game;
window.GameStore = GameStore;
window.Shepherd = Shepherd;
window.Sheep = Sheep;
window.Dog = Dog;
window.Config = Config;
window.LevelId = LevelId;
window.createLevels = createLevels;
