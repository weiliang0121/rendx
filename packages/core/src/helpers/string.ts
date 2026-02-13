import {isUndef} from '../guards';

export const lowercase = (str: string, start?: number, stop?: number): string => {
  if (isUndef(stop) && !isUndef(start)) {
    return str.slice(0, start) + str.charAt(start).toLowerCase() + str.slice(start + 1);
  } else if (!isUndef(start) && !isUndef(stop)) {
    return str.slice(0, start) + str.slice(start, stop).toLowerCase() + str.slice(stop);
  }
  return str.toLowerCase();
};

export const uppercase = (str: string, start?: number, stop?: number): string => {
  if (isUndef(stop) && !isUndef(start)) {
    return str.slice(0, start) + str.charAt(start).toUpperCase() + str.slice(start + 1);
  } else if (!isUndef(start) && !isUndef(stop)) {
    return str.slice(0, start) + str.slice(start, stop).toUpperCase() + str.slice(stop);
  }
  return str.toUpperCase();
};

export const hashFnv32a = (str: string, asString: boolean, seed?: number): number | string => {
  let val = seed === undefined ? 0x811c9dc5 : seed;
  for (let i = 0; i < str.length; i++) {
    val ^= str.charCodeAt(i);
    val += (val << 1) + (val << 4) + (val << 7) + (val << 8) + (val << 24);
  }
  if (asString) return ('0000000' + (val >>> 0).toString(16)).slice(-8);
  return val >>> 0;
};
