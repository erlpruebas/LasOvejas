export const Config = {
  sheep: {
    // Aceleración base que aplica a cambios de velocidad por eventos o influencias
    accel: 20, // valores iniciales solicitados
    // Velocidad de giro (mezcla angular) 0..1 por tick lógico
    turnRate: 0.4,
    // Velocidad máxima operativa (cap de estabilidad)
    maxSpeed: 50,
    // Escala del radio de atención (1 = base). Pediste el doble por defecto.
    attentionScale: 1.4,
    // Frecuencia de refresco de movimiento/seguimiento (s)
    movementRefreshSec: 0.1,
    // Intervalo aleatorio para evaluar distracción (s)
    distractionMinSec: 10,
    distractionMaxSec: 30,
    // Parámetros de paseo (cuando no hay pastor y no está distraída)
    stroll: {
      walkSpeedMin: 10,
      walkSpeedMax: 20,
      walkDurMin: 0.8,
      walkDurMax: 1.8,
      idleDurMin: 0.6,
      idleDurMax: 1.4,
    }
  },
  // Grado de inquietud 0..10 (8 = 80% del tiempo en movimiento)
  inquieta: 8,
};


