/**
 * SVG 路径命令构建器
 *
 * 使用直接字符串拼接（+=）替代 string[] + join，
 * V8 引擎对 += 使用 cons string（rope）优化，amortized O(1)，
 * 消除了数组分配、push 和 join 的开销。
 */
export class Path {
  #d = '';

  toString() {
    return this.#d;
  }

  clear() {
    this.#d = '';
  }

  // 相对坐标命令
  h(x: number) {
    this.#d += `h${x} `;
    return this;
  }
  v(y: number) {
    this.#d += `v${y} `;
    return this;
  }
  l(x: number, y: number) {
    this.#d += `l${x} ${y} `;
    return this;
  }
  q(x1: number, y1: number, x: number, y: number) {
    this.#d += `q${x1} ${y1} ${x} ${y} `;
    return this;
  }
  c(x1: number, y1: number, x2: number, y2: number, x: number, y: number) {
    this.#d += `c${x1} ${y1} ${x2} ${y2} ${x} ${y} `;
    return this;
  }
  a(rx: number, ry: number, angle: number, largeArcFlag: number, sweepFlag: number, x: number, y: number) {
    this.#d += `a${rx} ${ry} ${angle} ${largeArcFlag} ${sweepFlag} ${x} ${y} `;
    return this;
  }

  // 绝对坐标命令
  M(x: number, y: number) {
    this.#d += `M${x} ${y} `;
    return this;
  }
  H(x: number) {
    this.#d += `H${x} `;
    return this;
  }
  V(y: number) {
    this.#d += `V${y} `;
    return this;
  }
  L(x: number, y: number) {
    this.#d += `L${x} ${y} `;
    return this;
  }
  Q(x1: number, y1: number, x: number, y: number) {
    this.#d += `Q${x1} ${y1} ${x} ${y} `;
    return this;
  }
  C(x1: number, y1: number, x2: number, y2: number, x: number, y: number) {
    this.#d += `C${x1} ${y1} ${x2} ${y2} ${x} ${y} `;
    return this;
  }
  A(rx: number, ry: number, angle: number, largeArcFlag: number, sweepFlag: number, x: number, y: number) {
    this.#d += `A${rx} ${ry} ${angle} ${largeArcFlag} ${sweepFlag} ${x} ${y} `;
    return this;
  }

  // 闭合路径
  Z() {
    this.#d += 'Z ';
    return this;
  }
}
