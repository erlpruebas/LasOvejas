import { Vec2 } from './types';
import { Obstacle } from './Entity';

export type Environment = 'field' | 'rocky' | 'forest' | 'snow';

export interface LevelConfig {
  id: string;
  meta: { number: number; title: string };
  environment: Environment;
  goal: { x: number; y: number; r: number };
  obstacles: Obstacle[];
  initialSheep: number;
  shepherdStart: Vec2;
}



