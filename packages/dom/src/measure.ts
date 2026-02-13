import {FontOptions, convertFontOptionsToCSS} from './font';
import {getTextBoundingBoxByCanvas} from './canvas';
import {getTextBoundingBoxByStatic} from './static';

export const getTextBoundingBox = (font: Partial<FontOptions>, text: string) => {
  const box = getTextBoundingBoxByCanvas(convertFontOptionsToCSS(font), text);
  if (box) return box;
  return getTextBoundingBoxByStatic(font, text);
};
