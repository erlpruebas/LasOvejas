import { LevelConfig } from '../core/Level';

export enum LevelId { Level1 = 'level1', Level2 = 'level2', Level3 = 'level3', Level4 = 'level4' }

export function createLevels(): Record<LevelId, LevelConfig> {
  const baseW = 960, baseH = 540;

  const L1: LevelConfig = {
    id: LevelId.Level1,
    meta: { number: 1, title: 'Campo Abierto' },
    environment: 'field',
    goal: { x: baseW - 120, y: baseH / 2, r: 50 },
    obstacles: [
      { kind: 'stone', x: 360, y: 210, r: 18 },
      { kind: 'stone', x: 520, y: 320, r: 22 },
      { kind: 'stone', x: 700, y: 140, r: 16 }
    ],
    initialSheep: 5,
    shepherdStart: { x: 120, y: baseH / 2 }
  };

  const L2: LevelConfig = {
    id: LevelId.Level2,
    meta: { number: 2, title: 'Camino Rocoso' },
    environment: 'rocky',
    goal: { x: baseW - 100, y: baseH - 100, r: 60 },
    obstacles: [
      { kind: 'stone', x: 280, y: 160, r: 20 },
      { kind: 'stone', x: 460, y: 260, r: 28 },
      { kind: 'hole', x: 600, y: 360, r: 26 },
      { kind: 'hole', x: 720, y: 200, r: 24 }
    ],
    initialSheep: 8,
    shepherdStart: { x: 120, y: baseH - 120 }
  };

  const L3: LevelConfig = {
    id: LevelId.Level3,
    meta: { number: 3, title: 'Bosque' },
    environment: 'forest',
    goal: { x: baseW - 120, y: 120, r: 55 },
    obstacles: [
      { kind: 'tree', x: 300, y: 120, r: 26 },
      { kind: 'tree', x: 360, y: 200, r: 24 },
      { kind: 'tree', x: 420, y: 280, r: 26 },
      { kind: 'tree', x: 480, y: 360, r: 28 },
      { kind: 'tree', x: 540, y: 260, r: 24 },
      { kind: 'tree', x: 600, y: 180, r: 22 }
    ],
    initialSheep: 8,
    shepherdStart: { x: 120, y: baseH - 120 }
  };

  const L4: LevelConfig = {
    id: LevelId.Level4,
    meta: { number: 4, title: 'Tormenta de Nieve' },
    environment: 'snow',
    goal: { x: 120, y: 120, r: 60 },
    obstacles: [
      { kind: 'stone', x: 400, y: 200, r: 22 },
      { kind: 'stone', x: 520, y: 320, r: 24 },
      { kind: 'tree', x: 680, y: 260, r: 20 }
    ],
    initialSheep: 10,
    shepherdStart: { x: baseW - 160, y: baseH - 120 }
  };

  return { [LevelId.Level1]: L1, [LevelId.Level2]: L2, [LevelId.Level3]: L3, [LevelId.Level4]: L4 } as Record<LevelId, LevelConfig>;
}


