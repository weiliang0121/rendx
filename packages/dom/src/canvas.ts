import {BoundingBox} from '@dye/bounding';

const canvas = new OffscreenCanvas(1, 1);
const ctx = canvas.getContext('2d');

export const getTextBoundingBoxByCanvas = (font: string, text: string) => {
  if (!ctx) return null;
  ctx.font = font;
  const {actualBoundingBoxAscent: top, actualBoundingBoxDescent: bottom, actualBoundingBoxLeft: left, actualBoundingBoxRight: right} = ctx.measureText(text);
  const width = Math.abs(left) + Math.abs(right);
  const height = Math.abs(top) + Math.abs(bottom);
  return BoundingBox.fromRect(0, 0, width, height);
};
