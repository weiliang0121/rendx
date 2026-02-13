import {BoundingBox} from '@dye/bounding';
import type {FontMap} from './type';
import {FontOptions} from './font';
import {PingFangSC} from './fonts/pingfangsc';
import {YouSheBiaoTiHei} from './fonts/youshebiaotihei';
import {SimHei} from './fonts/simhei';

const fonts: Record<string, FontMap> = {
  'pingfang sc': PingFangSC,
  youshebiaotihei: YouSheBiaoTiHei,
  simhei: SimHei,
};

export const getTextBoundingBoxByStatic = (font: Partial<FontOptions>, text: string) => {
  const {fontSize = 12, fontFamily = 'pingfang sc', fontWeight, fontStyle, lineHeight = 1} = font ?? {};
  const fontMap = fonts[fontFamily.toLowerCase()];
  if (!fontMap) throw new Error(`Font family "${fontFamily}" is not supported.`);
  const i = 0 + (fontWeight === 'bold' ? 1 : 0) + (fontStyle === 'italic' ? 2 : 0);
  const total = text.split('').reduce((sum, char) => sum + (fontMap[char] ?? fontMap.x)[i], 0);
  return BoundingBox.fromRect(0, 0, (total * fontSize) / 100, fontSize * lineHeight);
};
