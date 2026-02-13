import {getTextBoundingBox} from './measure';
import {FontOptions} from './font';

const PLACEHOLDER = '...';

export const omitText = (text: string, w: number, style: Partial<FontOptions>, position: string): string => {
  text = String(text);

  if (getTextBoundingBox(style, text).width <= w) return text;
  if (getTextBoundingBox(style, PLACEHOLDER).width >= w) return '';

  let w0 = getTextBoundingBox(style, text + PLACEHOLDER).width;

  if (position === 'start') {
    let i = 0;
    while (i < text.length && w0 > w) {
      i++;
      w0 = getTextBoundingBox(style, PLACEHOLDER + text.slice(i)).width;
    }
    return PLACEHOLDER + text.slice(i);
  }

  if (position === 'middle') {
    let l = Math.floor(text.length / 2);
    let r = text.length - l;
    let flag = 1;
    while (l > 0 && r < text.length && w0 > w) {
      if (flag) {
        l--;
      } else {
        r++;
      }
      w0 = getTextBoundingBox(style, text.slice(0, l) + PLACEHOLDER + text.slice(r)).width;
      flag = 1 - flag;
    }
    return text.slice(0, l) + PLACEHOLDER + text.slice(r);
  }

  if (position === 'end') {
    let w0 = getTextBoundingBox(style, text + PLACEHOLDER).width;
    let i = text.length - 1;
    while (i >= 0 && w0 > w) {
      i--;
      w0 = getTextBoundingBox(style, text.slice(0, i + 1) + PLACEHOLDER).width;
    }
    return text.slice(0, i + 1) + PLACEHOLDER;
  }

  return '';
};
