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
    
    this.setupGame();
  }

  setupGame() {
    // Crear SVG
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('viewBox', '0 0 960 540');
    this.svg.style.width = '100%';
    this.svg.style.height = '100%';
    this.svg.style.background = '#87CEEB';
    
    this.host.innerHTML = '';
    this.host.appendChild(this.svg);
    
    // Crear pastor
    this.shepherd = new Shepherd(100, 270);
    this.svg.appendChild(this.shepherd.element);
    
    // Crear ovejas iniciales
    for (let i = 0; i < 5; i++) {
      const sheep = new Sheep(50 + i * 20, 250 + i * 10);
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

  createGoal() {
    const goal = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    goal.setAttribute('cx', this.goal.x);
    goal.setAttribute('cy', this.goal.y);
    goal.setAttribute('r', this.goal.r);
    goal.setAttribute('fill', 'rgba(126, 224, 129, 0.3)');
    goal.setAttribute('stroke', '#7EE081');
    goal.setAttribute('stroke-width', '3');
    this.svg.appendChild(goal);
  }

  handleClick(e) {
    if (this.paused) return;
    
    const rect = this.svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (960 / rect.width);
    const y = (e.clientY - rect.top) * (540 / rect.height);
    
    this.shepherd.moveTo(x, y);
  }

  gameLoop() {
    if (!this.paused) {
      this.update();
    }
    requestAnimationFrame(() => this.gameLoop());
  }

  update() {
    // Actualizar pastor
    this.shepherd.update();
    
    // Actualizar ovejas
    this.sheep.forEach(sheep => {
      sheep.follow(this.shepherd);
      sheep.update();
    });
    
    // Verificar colisiones con meta
    this.checkGoalCollision();
  }

  checkGoalCollision() {
    this.sheep.forEach(sheep => {
      const dx = sheep.x - this.goal.x;
      const dy = sheep.y - this.goal.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < this.goal.r) {
        sheep.reachedGoal = true;
      }
    });
  }

  spawnDog() {
    const dog = new Dog(this.shepherd.x + 50, this.shepherd.y);
    this.dogs.push(dog);
    this.svg.appendChild(dog.element);
  }

  upgradeShepherdSpeed(factor) {
    this.shepherd.speed *= factor;
  }

  togglePause() {
    this.paused = !this.paused;
  }

  isPaused() {
    return this.paused;
  }

  getSheepCount() {
    return this.sheep.length;
  }

  loadLevel(levelConfig) {
    // Implementación básica de carga de nivel
    console.log('Loading level:', levelConfig);
  }
}

// Clase Pastor
class Shepherd {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.speed = 2;
    
    this.element = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    this.element.setAttribute('cx', x);
    this.element.setAttribute('cy', y);
    this.element.setAttribute('r', '15');
    this.element.setAttribute('fill', '#8B4513');
    this.element.setAttribute('stroke', '#654321');
    this.element.setAttribute('stroke-width', '2');
  }

  moveTo(x, y) {
    this.targetX = x;
    this.targetY = y;
  }

  update() {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 5) {
      this.x += (dx / distance) * this.speed;
      this.y += (dy / distance) * this.speed;
      
      this.element.setAttribute('cx', this.x);
      this.element.setAttribute('cy', this.y);
    }
  }
}

// Clase Oveja
class Sheep {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.reachedGoal = false;
    
    this.element = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    this.element.setAttribute('cx', x);
    this.element.setAttribute('cy', y);
    this.element.setAttribute('r', '8');
    this.element.setAttribute('fill', '#FFFFFF');
    this.element.setAttribute('stroke', '#CCCCCC');
    this.element.setAttribute('stroke-width', '1');
  }

  follow(shepherd) {
    if (this.reachedGoal) return;
    
    const dx = shepherd.x - this.x;
    const dy = shepherd.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 50) {
      this.vx += (dx / distance) * Config.sheep.accel * 0.01;
      this.vy += (dy / distance) * Config.sheep.accel * 0.01;
    }
  }

  update() {
    if (this.reachedGoal) return;
    
    // Aplicar velocidad
    this.x += this.vx;
    this.y += this.vy;
    
    // Limitar velocidad máxima
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > Config.sheep.maxSpeed * 0.01) {
      this.vx = (this.vx / speed) * Config.sheep.maxSpeed * 0.01;
      this.vy = (this.vy / speed) * Config.sheep.maxSpeed * 0.01;
    }
    
    // Fricción
    this.vx *= 0.95;
    this.vy *= 0.95;
    
    // Actualizar posición visual
    this.element.setAttribute('cx', this.x);
    this.element.setAttribute('cy', this.y);
  }
}

// Clase Perro
class Dog {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    
    this.element = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    this.element.setAttribute('cx', x);
    this.element.setAttribute('cy', y);
    this.element.setAttribute('r', '10');
    this.element.setAttribute('fill', '#8B4513');
    this.element.setAttribute('stroke', '#654321');
    this.element.setAttribute('stroke-width', '2');
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
