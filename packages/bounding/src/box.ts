/**
 * 轴对齐包围盒（AABB）
 * 核心数据结构：x, y, width, height
 */
export class BoundingBox {
  x: number = 0;
  y: number = 0;
  width: number = 0;
  height: number = 0;

  // ── 静态工厂 ────────────────────────────────────────

  static fromRect(x: number, y: number, width: number, height: number) {
    const b = new BoundingBox();
    b.x = x;
    b.y = y;
    b.width = width;
    b.height = height;
    return b;
  }

  static fromPoints(x1: number, y1: number, x2: number, y2: number) {
    return BoundingBox.fromRect(x1, y1, x2 - x1, y2 - y1);
  }

  // ── 计算属性 ────────────────────────────────────────

  /** 中心 X */
  get cx() {
    return this.x + this.width / 2;
  }

  /** 中心 Y */
  get cy() {
    return this.y + this.height / 2;
  }

  /** 内切圆半径 */
  get radius() {
    return Math.min(this.width, this.height) / 2;
  }

  /** 宽高比 h/w */
  get aspect() {
    return this.height / this.width;
  }

  /** 右边界 */
  get right() {
    return this.x + this.width;
  }

  /** 下边界 */
  get bottom() {
    return this.y + this.height;
  }

  /** 面积 */
  get area() {
    return this.width * this.height;
  }

  /** 是否为空（宽或高 ≤ 0） */
  get empty() {
    return this.width <= 0 || this.height <= 0;
  }

  // ── 设值 ────────────────────────────────────────────

  /** 设置 x, y, width, height */
  set(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    return this;
  }

  /** 深拷贝 */
  copy() {
    return BoundingBox.fromRect(this.x, this.y, this.width, this.height);
  }

  /** 转为 [x, y, width, height] 元组 */
  toArray(): [number, number, number, number] {
    return [this.x, this.y, this.width, this.height];
  }

  // ── 空间查询 ────────────────────────────────────────

  /** 点 (px, py) 是否在包围盒内 */
  containsPoint(px: number, py: number) {
    return px >= this.x && px <= this.right && py >= this.y && py <= this.bottom;
  }

  /**
   * 点是否在包围盒内
   * @deprecated 使用 containsPoint 代替
   */
  in(px: number, py: number) {
    return this.containsPoint(px, py);
  }

  /** 是否完全包含另一个包围盒 */
  containsBox(box: BoundingBox) {
    return this.x <= box.x && this.right >= box.right && this.y <= box.y && this.bottom >= box.bottom;
  }

  /** 是否与另一个包围盒相交 */
  intersects(box: BoundingBox) {
    return this.x < box.right && this.right > box.x && this.y < box.bottom && this.bottom > box.y;
  }

  // ── 变换（返回新实例） ──────────────────────────────

  /** 与另一个包围盒求交集 */
  intersection(box: BoundingBox) {
    const x0 = Math.max(this.x, box.x);
    const y0 = Math.max(this.y, box.y);
    const x1 = Math.min(this.right, box.right);
    const y1 = Math.min(this.bottom, box.bottom);
    return BoundingBox.fromRect(x0, y0, x1 - x0, y1 - y0);
  }

  /** 与另一个包围盒求并集 */
  union(box: BoundingBox) {
    const x0 = Math.min(this.x, box.x);
    const y0 = Math.min(this.y, box.y);
    const x1 = Math.max(this.right, box.right);
    const y1 = Math.max(this.bottom, box.bottom);
    return BoundingBox.fromRect(x0, y0, x1 - x0, y1 - y0);
  }

  /** 扩展到包含点 (px, py) */
  expandPoint(px: number, py: number) {
    const x0 = Math.min(this.x, px);
    const y0 = Math.min(this.y, py);
    const x1 = Math.max(this.right, px);
    const y1 = Math.max(this.bottom, py);
    return BoundingBox.fromRect(x0, y0, x1 - x0, y1 - y0);
  }

  /** 四边内缩/外扩 padding */
  pad(padding: [number, number, number, number], outward = false) {
    const [t, r, b, l] = padding;
    if (outward) return BoundingBox.fromRect(this.x - l, this.y - t, this.width + l + r, this.height + t + b);
    return BoundingBox.fromRect(this.x + l, this.y + t, this.width - l - r, this.height - t - b);
  }

  /** 全局坐标转本地坐标 */
  localXY(px: number, py: number): [number, number] {
    return [px - this.x, py - this.y];
  }

  // ── 分割 ────────────────────────────────────────────

  /** X 向等分，返回第 index 个子区域 */
  divideX(count: number, index: number) {
    const w = this.width / count;
    return BoundingBox.fromRect(this.x + w * index, this.y, w, this.height);
  }

  /** Y 向等分，返回第 index 个子区域 */
  divideY(count: number, index: number) {
    const h = this.height / count;
    return BoundingBox.fromRect(this.x, this.y + h * index, this.width, h);
  }

  /** 按 scale 函数 X 向分割 */
  divideXByScale(scale: {scale: (i: number) => number; bandwidth: number}, index: number) {
    const x0 = scale.scale(index);
    return BoundingBox.fromRect(x0, this.y, scale.bandwidth, this.height);
  }

  /** 按 scale 函数 Y 向分割 */
  divideYByScale(scale: {scale: (i: number) => number; bandwidth: number}, index: number) {
    const y0 = scale.scale(index);
    return BoundingBox.fromRect(this.x, y0, this.width, scale.bandwidth);
  }

  /** 返回四顶点 [[x0,y0], [x0,y1], [x1,y1], [x1,y0]] */
  vertices(): [[number, number], [number, number], [number, number], [number, number]] {
    const r = this.right;
    const b = this.bottom;
    return [
      [this.x, this.y],
      [this.x, b],
      [r, b],
      [r, this.y],
    ];
  }
}
