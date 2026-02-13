import {describe, it, expect} from 'vitest';
import {GraphicsTransform} from '../src/transforms/graphics';
import {AttributeTransform} from '../src/transforms/attributes';
import {BaseTransform} from '../src/transforms/base';

// 辅助：简单具体 Transform 用于测试基类逻辑
class TestTransform extends BaseTransform {
  lastT = -1;
  protected apply(t: number) {
    this.lastT = t;
  }
}

describe('BaseTransform - 动画状态机', () => {
  it('初始状态为 start', () => {
    const t = new TestTransform();
    expect(t.status).toBe('start');
    expect(t.active).toBe(true);
  });

  it('duration=0 立即完成（t=1）', () => {
    const t = new TestTransform();
    t.duration(0);
    // 第一次 interpolate: elapsed=0, 0 > 0 为 false → 'running', raw=1
    t.interpolate(0);
    expect(t.status).toBe('running');
    expect(t.lastT).toBe(1);
    // 第二次: elapsed=1 > 0 → 'last'
    t.interpolate(1);
    expect(t.status).toBe('last');
  });

  it('正常 duration 阶段: start → running → last → end', () => {
    const t = new TestTransform();
    t.duration(100);

    // t=0: _time 被设为 0, elapsed=0, running
    t.interpolate(0);
    expect(t.status).toBe('running');
    expect(t.lastT).toBeCloseTo(0);

    // t=50: elapsed=50, t=0.5
    t.interpolate(50);
    expect(t.status).toBe('running');
    expect(t.lastT).toBeCloseTo(0.5);

    // t=100: elapsed=100, t=1.0
    t.interpolate(100);
    expect(t.status).toBe('running');
    expect(t.lastT).toBeCloseTo(1.0);

    // t=101: elapsed > duration → last
    t.interpolate(101);
    expect(t.status).toBe('last');

    // 再次 interpolate → end
    t.interpolate(102);
    expect(t.status).toBe('end');
    expect(t.active).toBe(false);
  });

  it('delay 推迟开始', () => {
    const t = new TestTransform();
    t.duration(100).delay(50);

    t.interpolate(0);
    expect(t.status).toBe('waiting');

    t.interpolate(49);
    expect(t.status).toBe('waiting');

    t.interpolate(50);
    expect(t.status).toBe('running');
    expect(t.lastT).toBeCloseTo(0);

    t.interpolate(100);
    expect(t.lastT).toBeCloseTo(0.5);

    t.interpolate(151);
    expect(t.status).toBe('last');
  });

  it('repeat=true 循环', () => {
    const t = new TestTransform();
    t.duration(100).repeat(true);

    t.interpolate(0);
    t.interpolate(101);
    expect(t.status).toBe('last');

    // 再次 interpolate → 重置为 start 而非 end
    t.interpolate(102);
    expect(t.status).toBe('start');
    expect(t.active).toBe(true);
  });

  it('end 状态后 interpolate 不再执行', () => {
    const t = new TestTransform();
    t.duration(0);
    t.interpolate(0); // → running (raw=1)
    t.interpolate(1); // → last
    t.interpolate(2); // → end
    t.lastT = -999;
    t.interpolate(3); // 应该什么都不做
    expect(t.lastT).toBe(-999);
  });

  it('easing 应用', () => {
    const t = new TestTransform();
    // easeMap key 为 'inQuad' 而非 'easeInQuad'
    t.duration(100).easing('inQuad');
    t.interpolate(0);
    t.interpolate(50);
    // inQuad(0.5) = 0.5^2 = 0.25
    expect(t.lastT).toBeCloseTo(0.25, 1);
  });
});

describe('GraphicsTransform - 几何动画', () => {
  it('translate 插值', () => {
    const gt = new GraphicsTransform({tx: 0, ty: 0, sx: 1, sy: 1, rotate: 0});
    gt.translate(100, 200).duration(100);

    gt.interpolate(0);
    expect(gt.values.tx).toBeCloseTo(0);
    expect(gt.values.ty).toBeCloseTo(0);

    gt.interpolate(50);
    expect(gt.values.tx).toBeCloseTo(50);
    expect(gt.values.ty).toBeCloseTo(100);

    gt.interpolate(100);
    expect(gt.values.tx).toBeCloseTo(100);
    expect(gt.values.ty).toBeCloseTo(200);
  });

  it('scale 插值', () => {
    const gt = new GraphicsTransform({tx: 0, ty: 0, sx: 1, sy: 1, rotate: 0});
    gt.scale(2, 3).duration(100);

    gt.interpolate(0);
    gt.interpolate(50);
    expect(gt.values.sx).toBeCloseTo(1.5);
    expect(gt.values.sy).toBeCloseTo(2.0);
  });

  it('rotate 插值', () => {
    const gt = new GraphicsTransform({tx: 0, ty: 0, sx: 1, sy: 1, rotate: 0});
    gt.rotate(Math.PI).duration(100);

    gt.interpolate(0);
    gt.interpolate(50);
    expect(gt.values.rotate).toBeCloseTo(Math.PI / 2);
  });

  it('连续动画使用上一次终点作为起点', () => {
    const gt = new GraphicsTransform({tx: 0, ty: 0, sx: 1, sy: 1, rotate: 0});
    gt.translate(100, 0).duration(100);

    gt.interpolate(0);
    gt.interpolate(101); // last
    gt.interpolate(102); // end → onEnd clears attrs

    // 模拟引擎 tick() 中 Graphics.translate() 对 V 的同步
    gt.V.tx = gt.values.tx!;
    gt.V.ty = gt.values.ty!;

    // 开始第二段动画
    gt.translate(200, 0).duration(100);

    // 首次 interpolate 设 _time=200, elapsed=0 → running, t=0
    gt.interpolate(200);
    // 再 50ms → elapsed=50, t=0.5 → 100 + (200-100)*0.5 = 150
    gt.interpolate(250);
    expect(gt.values.tx).toBeCloseTo(150);
  });

  it('onEnd() 清理 attrs', () => {
    const gt = new GraphicsTransform({tx: 0, ty: 0, sx: 1, sy: 1, rotate: 0});
    gt.translate(100, 0).duration(0);
    gt.interpolate(0); // running (duration=0, raw=1)
    gt.interpolate(1); // last (elapsed > duration)
    gt.interpolate(2); // end → onEnd
    expect(gt.attrs).toEqual({});
  });
});

describe('AttributeTransform - 属性动画', () => {
  it('数值属性插值', () => {
    const values = {opacity: 1, fill: 'red'};
    const at = new AttributeTransform(values);
    at.attr('opacity', 0).duration(100);

    at.interpolate(0);
    at.interpolate(50);
    expect(values.opacity).toBeCloseTo(0.5);

    at.interpolate(100);
    expect(values.opacity).toBeCloseTo(0);
  });

  it('初始值缺失时使用目标值', () => {
    const values: Record<string, unknown> = {};
    const at = new AttributeTransform(values);
    at.attr('opacity', 0.5).duration(100);

    at.interpolate(0);
    at.interpolate(50);
    // 从 0.5 到 0.5，中间也是 0.5
    expect(values.opacity).toBeCloseTo(0.5);
  });
});
