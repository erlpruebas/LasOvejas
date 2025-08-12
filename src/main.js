// Cargar el juego después de que se cargue la página
document.addEventListener('DOMContentLoaded', () => {
  const stageHost = document.getElementById('stage');
  console.log('Stage host found:', stageHost);

  const moneyHud = document.getElementById('money');
  const sheepHud = document.getElementById('sheepCount');
  const levelHud = document.getElementById('level');
  const whistlesHud = document.getElementById('whistles');
  const pauseBtn = document.getElementById('btn-pause');
  const levelsContainer = document.getElementById('levels');

  const store = new GameStore();
  console.log('GameStore created');

  const levels = createLevels();
  console.log('Levels created:', Object.keys(levels));

  // UI tienda
  const btnBuyDog = document.getElementById('btn-buy-dog');
  btnBuyDog.addEventListener('click', () => {
    if (store.tryBuyDog(200)) {
      game.spawnDog();
      updateHud();
    }
  });

  const btnSpeed = document.getElementById('btn-speed');
  btnSpeed.addEventListener('click', () => {
    if (store.tryBuySpeed(150)) {
      game.upgradeShepherdSpeed(1.1);
      updateHud();
    }
  });

  // Niveles UI
  Object.values(LevelId).forEach((id) => {
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = `Nivel ${levels[id].meta.number}`;
    b.onclick = () => loadLevel(id);
    levelsContainer.appendChild(b);
  });

  console.log('Creating game instance...');
  let game = new Game(stageHost, store);
  console.log('Game instance created');

  function loadLevel(id) {
    console.log('Loading level:', id);
    const config = levels[id];
    console.log('Level config:', config);
    levelHud.textContent = `Nivel ${config.meta.number}`;
    game.loadLevel(config);
    console.log('Level loaded in game');
    // actualizar HUD ovejas
    sheepHud.textContent = `🐑 ${game.getSheepCount()}`;
  }

  function updateHud() {
    moneyHud.textContent = `💰 ${store.money}`;
    whistlesHud.textContent = `Silbos: ${store.whistles}`;
  }

  // Eventos ayuda
  document.getElementById('helpBtn').addEventListener('click', () => {
    alert('Haz clic en el campo para mover al pastor. Las ovejas lo siguen con retraso. Compra perros para ayudar a reagrupar. Lleva todas las ovejas a la meta.');
  });

  // Iniciar
  console.log('Starting game...');
  try {
    loadLevel(LevelId.Level1);
    updateHud();
    console.log('Game started successfully');

    // Ocultar indicador de carga
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.style.display = 'none';
    }
  } catch (error) {
    console.error('Error starting game:', error);
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.textContent = 'Error al cargar el juego. Revisa la consola.';
      loadingEl.style.color = '#ff6b6b';
    }
  }

  // Panel de comandos (atajos de teclado)
  const cmdPanel = document.getElementById('cmd-panel');
  function renderCmdPanel() {
    if (!cmdPanel) return;
    cmdPanel.innerHTML = `
      <div><span class="muted">Pulsa</span> <code>?</code> <span class="muted">para ayuda.</span></div>
      <div><code>A/Z</code> Aceleración ±5: <strong>${Config.sheep.accel.toFixed(0)}</strong></div>
      <div><code>T/G</code> Giro ±0.05: <strong>${Config.sheep.turnRate.toFixed(2)}</strong></div>
      <div><code>V/B</code> Vel máx ±5: <strong>${Config.sheep.maxSpeed.toFixed(0)}</strong></div>
      <div><code>M/N</code> Refresh mov ±0.1: <strong>${Config.sheep.movementRefreshSec.toFixed(2)}</strong></div>
      <div><code>L/K</code> Atención x ±0.1: <strong>${Config.sheep.attentionScale.toFixed(2)}</strong></div>
      <div><code>J/H</code> Distracción min/max (±1s): <strong>${Config.sheep.distractionMinSec.toFixed(0)}–${Config.sheep.distractionMaxSec.toFixed(0)}</strong></div>
    `;
  }
  renderCmdPanel();

  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    let changed = true;
    if (k === 'a') Config.sheep.accel = clamp(Config.sheep.accel + 5, 0, 2000);
    else if (k === 'z') Config.sheep.accel = clamp(Config.sheep.accel - 5, 0, 2000);
    else if (k === 't') Config.sheep.turnRate = clamp(Config.sheep.turnRate + 0.05, 0, 1);
    else if (k === 'g') Config.sheep.turnRate = clamp(Config.sheep.turnRate - 0.05, 0, 1);
    else if (k === 'v') Config.sheep.maxSpeed = clamp(Config.sheep.maxSpeed + 5, 0, 5000);
    else if (k === 'b') Config.sheep.maxSpeed = clamp(Config.sheep.maxSpeed - 5, 0, 5000);
    else if (k === 'm') Config.sheep.movementRefreshSec = clamp(Config.sheep.movementRefreshSec + 0.1, 0.1, 5);
    else if (k === 'n') Config.sheep.movementRefreshSec = clamp(Config.sheep.movementRefreshSec - 0.1, 0.1, 5);
    else if (k === 'l') Config.sheep.attentionScale = clamp(Config.sheep.attentionScale + 0.1, 0.2, 5);
    else if (k === 'k') Config.sheep.attentionScale = clamp(Config.sheep.attentionScale - 0.1, 0.2, 5);
    else if (k === 'j') Config.sheep.distractionMinSec = clamp(Config.sheep.distractionMinSec + 1, 1, Config.sheep.distractionMaxSec);
    else if (k === 'h') Config.sheep.distractionMaxSec = clamp(Config.sheep.distractionMaxSec + 1, Config.sheep.distractionMinSec, 120);
    else if (k === '?') { alert('Comandos:\nA/Z: Aceleración ±5\nT/G: Giro ±0.05\nV/B: Vel máx ±5\nM/N: Refresh mov ±0.1s\nL/K: Atención x ±0.1\nJ: Distracción mínima +1s\nH: Distracción máxima +1s'); changed = false; }
    else changed = false;
    if (changed) renderCmdPanel();
  });

  // Pausa
  pauseBtn.addEventListener('click', () => {
    game.togglePause();
    pauseBtn.textContent = game.isPaused() ? 'Continuar' : 'Pausa';
  });
});
