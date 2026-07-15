"use strict";

exports.__esModule = true;
exports.cloneContent = cloneContent;
exports.convertToDynamicContent = convertToDynamicContent;
exports.offsetVector = offsetVector;
exports.pack = pack;
function pack(...args) {
  let result = {};
  for (let i = 0, l = args.length; i < l; i++) {
    let obj = args[i];
    if (obj) {
      for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
          result[key] = obj[key];
        }
      }
    }
  }
  return result;
}
function offsetVector(vector, x, y) {
  switch (vector.type) {
    case 'ellipse':
    case 'rect':
      vector.x += x;
      vector.y += y;
      break;
    case 'line':
      vector.x1 += x;
      vector.x2 += x;
      vector.y1 += y;
      vector.y2 += y;
      break;
    case 'polyline':
      for (let i = 0, l = vector.points.length; i < l; i++) {
        vector.points[i].x += x;
        vector.points[i].y += y;
      }
      break;
  }
}

// Deep-clones plain objects/arrays but keeps functions (and other non-plain values) by reference,
// unlike JSON round-tripping which drops them — needed so function-valued props (e.g. a table
// layout's paddingLeft) survive in repeated/sticky content.
function cloneContent(value) {
  if (Array.isArray(value)) {
    return value.map(cloneContent);
  }
  if (value !== null && typeof value === 'object' && (value.constructor === Object || value.constructor === undefined)) {
    let result = {};
    for (let key in value) {
      if (value.hasOwnProperty(key)) {
        result[key] = cloneContent(value[key]);
      }
    }
    return result;
  }
  return value;
}
function convertToDynamicContent(staticContent) {
  return () => cloneContent(staticContent);
}