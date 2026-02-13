import {getTextBoundingBox} from './measure';
import {FontOptions} from './font';

const SPLIT_RULE = /(\s+|\b|[.,!?;:]|[\u4e00-\u9fa5])/;

export const splitText = (text: string, w: number, style: Partial<FontOptions>): string[] => {
  text = String(text);

  if (getTextBoundingBox(style, text).width <= w) return [text];

  const words = text.split(SPLIT_RULE).filter(word => word);
  const lines: string[] = [];
  let line = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const w1 = getTextBoundingBox(style, line + word).width;

    if (w1 > w && line) {
      lines.push(line);
      line = word;
    } else {
      line += word;
    }
  }

  if (line) lines.push(line);

  return lines;
};
