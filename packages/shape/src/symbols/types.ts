import type {Path} from 'rendx-path';

export interface SymbolOptions {
  cx: number;
  cy: number;
  r: number;
}

export type SymbolCreator = (path: Path, options: SymbolOptions) => void;
