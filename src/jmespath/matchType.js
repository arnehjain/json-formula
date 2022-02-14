import dataTypes from './dataTypes';
import tokenDefinitions from './tokenDefinitions';

const {
  TYPE_NUMBER,
  TYPE_ANY,
  TYPE_STRING,
  TYPE_ARRAY,
  TYPE_OBJECT,
  TYPE_BOOLEAN,
  TYPE_EXPREF,
  TYPE_NULL,
  TYPE_ARRAY_NUMBER,
  TYPE_ARRAY_STRING,
  TYPE_CLASS,
} = dataTypes;

const {
  TOK_EXPREF,
} = tokenDefinitions;

const TYPE_NAME_TABLE = {
  [TYPE_NUMBER]: 'number',
  [TYPE_ANY]: 'any',
  [TYPE_STRING]: 'string',
  [TYPE_ARRAY]: 'array',
  [TYPE_OBJECT]: 'object',
  [TYPE_BOOLEAN]: 'boolean',
  [TYPE_EXPREF]: 'expression',
  [TYPE_NULL]: 'null',
  [TYPE_ARRAY_NUMBER]: 'Array<number>',
  [TYPE_ARRAY_STRING]: 'Array<string>',
  [TYPE_CLASS]: 'class',
};

export function getTypeName(inputObj, useValueOf = true) {
  if (inputObj === null) return TYPE_NULL;
  const obj = useValueOf ? Object.getPrototypeOf(inputObj).valueOf.call(inputObj) : inputObj;
  switch (Object.prototype.toString.call(obj)) {
    case '[object String]':
      return TYPE_STRING;
    case '[object Number]':
      return TYPE_NUMBER;
    case '[object Array]':
      return TYPE_ARRAY;
    case '[object Boolean]':
      return TYPE_BOOLEAN;
    case '[object Null]':
      return TYPE_NULL;
    case '[object Object]':
      // Check if it's an expref.  If it has, it's been
      // tagged with a jmespathType attr of 'Expref';
      if (obj.jmespathType === TOK_EXPREF) {
        return TYPE_EXPREF;
      }
      return TYPE_OBJECT;
    default:
      return TYPE_OBJECT;
  }
}

export function getTypeNames(inputObj) {
  // return the types with and without using valueOf
  // needed for the cases where we really need an object passed to a function -- not it's value
  const type1 = getTypeName(inputObj);
  const type2 = getTypeName(inputObj, false);
  return [type1, type2];
}

export function matchType(actuals, expectedList, argValue, context, toNumber) {
  const actual = actuals[0];
  if (expectedList.findIndex(
    type => type === TYPE_ANY || actual === type,
  ) !== -1
  ) return argValue;
  // Can't coerce Objects to any other type,
  // and cannot coerce anything to a Class
  if (actual === TYPE_OBJECT || (expectedList.length === 1 && expectedList[0] === TYPE_CLASS)) {
    throw new Error(`TypeError: ${context} expected argument to be type ${TYPE_NAME_TABLE[expectedList[0]]} but received type ${TYPE_NAME_TABLE[actual]} instead.`);
  }
  // no exact match in the list of possible types, see if we can coerce an array type
  let expected = -1;
  if (actual === TYPE_ARRAY) {
    if (expectedList.includes(TYPE_ARRAY_STRING) && expectedList.includes(TYPE_ARRAY_NUMBER)) {
      // choose the array type based on the first element
      if (argValue.length > 0 && typeof argValue[0] === 'string') expected = TYPE_ARRAY_STRING;
      else expected = TYPE_ARRAY_NUMBER;
    }
  }
  if (expected === -1 && [TYPE_ARRAY_STRING, TYPE_ARRAY_NUMBER, TYPE_ARRAY].includes(actual)) {
    expected = expectedList.find(
      e => [TYPE_ARRAY_STRING, TYPE_ARRAY_NUMBER, TYPE_ARRAY].includes(e),
    );
  }
  // no match, just take the first type
  if (expected === -1) [expected] = expectedList;
  if (expected === TYPE_ANY) return argValue;
  if (expected === TYPE_ARRAY_STRING
      || expected === TYPE_ARRAY_NUMBER
      || expected === TYPE_ARRAY) {
    if (expected === TYPE_ARRAY) {
      if (actual === TYPE_ARRAY_NUMBER || actual === TYPE_ARRAY_STRING) return argValue;
      return argValue === null ? [] : [argValue];
    }
    // The expected type can either just be array,
    // or it can require a specific subtype (array of numbers).
    const subtype = expected === TYPE_ARRAY_NUMBER ? TYPE_NUMBER : TYPE_STRING;
    if (actual === TYPE_ARRAY) {
      // Otherwise we need to check subtypes.
      // We're going to modify the array, so take a copy
      const returnArray = argValue.slice();
      for (let i = 0; i < returnArray.length; i += 1) {
        const indexType = getTypeNames(returnArray[i]);
        returnArray[i] = matchType(indexType, [subtype], returnArray[i], context, toNumber);
      }
      return returnArray;
    }
    if ([TYPE_NUMBER, TYPE_STRING, TYPE_NULL, TYPE_BOOLEAN].includes(subtype)) {
      return [matchType(actuals, [subtype], argValue, context, toNumber)];
    }
  } else {
    if (expected === TYPE_NUMBER) {
      if ([TYPE_STRING, TYPE_BOOLEAN, TYPE_NULL].includes(actual)) return toNumber(argValue);
      /* TYPE_ARRAY, TYPE_EXPREF, TYPE_OBJECT, TYPE_ARRAY, TYPE_ARRAY_NUMBER, TYPE_ARRAY_STRING */
      return 0;
    }
    if (expected === TYPE_STRING) {
      if (actual === TYPE_NULL || actual === TYPE_OBJECT) return '';
      return Object.getPrototypeOf(argValue).toString.call(argValue);
    }
    if (expected === TYPE_BOOLEAN) {
      return !!argValue;
    }
    if (expected === TYPE_OBJECT && actuals[1] === TYPE_OBJECT) {
      return argValue;
    }
  }
  throw new Error('unhandled argument');
}
