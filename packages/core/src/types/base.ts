/** 通用函数类型 */
export type GF = (...args: any[]) => any;

/** 通用对象类型 */
export type AO = { [key: string]: any };

/** 二维点 */
export type Point = [number, number];

/** 二维向量 */
export type Vec2 = [number, number];

/** 三维向量 */
export type Vec3 = [number, number, number];

/** 二维矩阵 */
export type Mat2d = [number, number, number, number, number, number];

/** 宽高对象 */
export type Size = { width: number; height: number };

/** RGBA */
export type RGBA = [number, number, number, number];

/** RGB */
export type RGB = [number, number, number];
