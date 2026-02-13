import {isArr, isFunc, isNil, isObj, isUndef} from '../guards';
import {lowercase} from './string';

import type {AO, GF} from '../types';

export const startsWith = (obj: AO, prefix: string): AO => {
  return Object.fromEntries(Object.entries(obj).filter(([key]) => key.startsWith(prefix)));
};

export const replace = (obj: AO, prefix: string): AO => {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      return key === prefix ? [key, value] : [lowercase(key.replace(prefix, ''), 0), value];
    }),
  );
};

export const subAttrs = (obj: AO, prefix: string): AO => {
  return replace(startsWith(obj, prefix), prefix);
};

export const defaultsDeep = (target: AO, sources: AO[], index = 0): AO => {
  if (index >= sources.length) return target;
  const source = sources[index];
  if (!source) return target;
  Object.entries(source).forEach(([key, value]) => {
    if (isObj(value) && !isArr(value)) {
      if (!isObj(target[key])) target[key] = {};
      defaultsDeep(target[key], [value]);
    } else {
      if (isUndef(target[key])) target[key] = value;
    }
  });
  return defaultsDeep(target, sources, index + 1);
};

export const attrOf = (obj: AO, of: undefined | string | GF): unknown => {
  return isNil(of) ? undefined : isFunc(of) ? of(obj) : obj[of];
};

export const groupBy = (arr: AO[], ...keys: (string | GF)[]): AO => {
  if (!keys.length) return arr;
  const key = keys[0];
  const remainingKeys = keys.slice(1);

  const grouped = arr.reduce((acc, item) => {
    const group = String(attrOf(item, key));
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {} as AO);

  if (remainingKeys.length) {
    Object.keys(grouped).forEach(group => {
      grouped[group] = groupBy(grouped[group], ...remainingKeys);
    });
  }

  return grouped;
};

export const flatGroupBy = (arr: AO[], ...keys: (string | GF)[]): AO => {
  return arr.reduce((acc, item) => {
    const group = keys.map(key => attrOf(item, key)).join('-');
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});
};
