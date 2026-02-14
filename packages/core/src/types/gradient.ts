/** 渐变类型 */
export type GradientType = 'linear' | 'radial';

/** 渐变色标 */
export type GradientStops = [number, string][];

/** 渐变配置 */
export interface GradientOptions {
  id: string;
  type: GradientType;
  direction: number[];
  stops: GradientStops;
  region?: [number, number, number, number];
}
