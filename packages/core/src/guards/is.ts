import type {GF, AO} from '../types';

export const isNum = (v: unknown): v is number => typeof v === 'number' && !Number.isNaN(v);
export const isArr = (v: unknown): v is unknown[] => Array.isArray(v);
export const isStr = (v: unknown): v is string => typeof v === 'string';
export const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
export const isObj = (v: unknown): v is AO => typeof v === 'object' && v !== null;
export const isFunc = (v: unknown): v is GF => typeof v === 'function';
export const isUndef = (v: unknown): v is undefined => v === undefined;
export const isNull = (v: unknown): v is null => v === null;
export const isNil = (v: unknown): v is undefined | null => isUndef(v) || isNull(v);
export const isNone = (v: unknown): v is 'none' => v === 'none';
export const isNaN = (v: unknown) => Number.isNaN(v);
export const isEmpty = (v: unknown) => {
  if (isNil(v)) return true;
  if (isStr(v)) return v === '';
  if (isArr(v)) return v.length === 0;
  if (isObj(v)) return Object.keys(v).length === 0;
  return false;
};
export const isDateString = (v: unknown) => {
  if (isStr(v)) return !isNaN(Date.parse(v));
  return false;
};
export const isDate = (v: unknown) => {
  return v instanceof Date || isDateString(v);
};
export const isHTMLElement = (v: unknown): v is HTMLElement => v instanceof HTMLElement;
