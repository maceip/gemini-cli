/**
 * Browser shim for Node.js util module
 */

export const promisify = (fn: Function) => {
  return (...args: any[]) => {
    return new Promise((resolve, reject) => {
      fn(...args, (err: any, result: any) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  };
};

export const deprecate = (fn: Function, msg: string) => {
  let warned = false;
  return function(...args: any[]) {
    if (!warned) {
      console.warn(`DeprecationWarning: ${msg}`);
      warned = true;
    }
    return fn.apply(this, args);
  };
};

export const inherits = (ctor: any, superCtor: any) => {
  ctor.super_ = superCtor;
  ctor.prototype = Object.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true,
    },
  });
};

export const inspect = (obj: any, options?: any) => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
};

export const format = (f: string, ...args: any[]) => {
  let i = 0;
  return f.replace(/%[sdj%]/g, (match) => {
    if (match === '%%') return '%';
    if (i >= args.length) return match;
    switch (match) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]).toString();
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch {
          return '[Circular]';
        }
      default:
        return match;
    }
  });
};

export const isArray = Array.isArray;
export const isBoolean = (arg: any): arg is boolean => typeof arg === 'boolean';
export const isNull = (arg: any): arg is null => arg === null;
export const isNullOrUndefined = (arg: any): arg is null | undefined => arg == null;
export const isNumber = (arg: any): arg is number => typeof arg === 'number';
export const isString = (arg: any): arg is string => typeof arg === 'string';
export const isSymbol = (arg: any): arg is symbol => typeof arg === 'symbol';
export const isUndefined = (arg: any): arg is undefined => arg === undefined;
export const isRegExp = (re: any): re is RegExp => re instanceof RegExp;
export const isObject = (arg: any): arg is object => typeof arg === 'object' && arg !== null;
export const isDate = (d: any): d is Date => d instanceof Date;
export const isError = (e: any): e is Error => e instanceof Error;
export const isFunction = (arg: any): arg is Function => typeof arg === 'function';
export const isPrimitive = (arg: any) => {
  return arg === null ||
    typeof arg === 'boolean' ||
    typeof arg === 'number' ||
    typeof arg === 'string' ||
    typeof arg === 'symbol' ||
    typeof arg === 'undefined';
};

export default {
  promisify,
  deprecate,
  inherits,
  inspect,
  format,
  isArray,
  isBoolean,
  isNull,
  isNullOrUndefined,
  isNumber,
  isString,
  isSymbol,
  isUndefined,
  isRegExp,
  isObject,
  isDate,
  isError,
  isFunction,
  isPrimitive,
};