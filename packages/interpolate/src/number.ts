/**
 * 线性插值构造器，预计算差值，每次调用只需 1 乘 1 加
 * @param a 起始值
 * @param b 结束值
 * @returns 插值函数 (t) => number
 */
export const lerp = (a: number, b: number) => {
  const d = b - a;
  return (t: number) => a + d * t;
};

/**
 * 归一化函数构造器，预计算倒数避免每次除法
 * @param a 左界
 * @param b 右界
 * @returns 归一化函数
 */
export const normalize = (a: number, b: number) => {
  const d = b - a;
  if (!d) return () => (isNaN(d) ? NaN : 0.5);
  const inv = 1 / d;
  return (x: number) => (x - a) * inv;
};
