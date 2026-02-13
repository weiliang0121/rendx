export interface FontOptions {
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  fontVariant: string;
  lineHeight: number;
}

export const convertFontOptionsToCSS = (fontOptions: Partial<FontOptions> = {}) => {
  const {fontSize = 10, fontFamily = 'sans-serif', fontWeight, fontStyle, fontVariant, lineHeight} = fontOptions;
  let cssFont = '';
  if (fontStyle) cssFont += `${fontStyle} `;
  if (fontVariant) cssFont += `${fontVariant} `;
  if (fontWeight) cssFont += `${fontWeight} `;
  if (fontSize) cssFont += `${fontSize}px `;
  if (lineHeight) cssFont += `/${lineHeight}px `;
  if (fontFamily) cssFont += `${fontFamily}`;
  return cssFont.trim();
};
