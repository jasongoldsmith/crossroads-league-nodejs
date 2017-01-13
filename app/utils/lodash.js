var lodash = require('lodash');
var ustr = require('underscore.string');
var chai = require('chai');
chai.use(require('chai-datetime'));
var expect = chai.expect;
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

function iterPull(mylist, key) {
  return lodash.zipObject(lodash.map(mylist, function(val) {return [val[key], val]}))
}
function isInvalid(value) {
  return lodash.isUndefined(value) || lodash.isNull(value);
}

function isInvalidOrBlank(value) {
  return lodash.isUndefined(value) || lodash.isNull(value) || ustr.isBlank(value);
}

function isValid(value) {
  return !isInvalid(value);
}

function isValidNonBlank(value) {
  return !isInvalidOrBlank(value);
}

function filterInvalid(items) {
  items = items || [];
  items = lodash.without(items, null);
  items = lodash.without(items, undefined);
  return items.length > 0 ? items : null;
}

function addIfValid(dict, key, value) {
  expect(key).to.be.a('string');
  if (isValid(value)) {
    dict[key] = value;
  }
}

function chunk(array, chunkSize) {
  if(!array || array.length == 0)
    return [];
  return [].concat.apply([],
      array.map(function(elem, i) {
          return i % chunkSize ? [] : [array.slice(i, i + chunkSize)];
      })
  );
}

function deepObjectExtend(target, source) {
  for (var prop in source) {
    if (prop in target) {
      deepObjectExtend(target[prop], source[prop]);
    }
    else if (source[prop]) {
      target[prop] = lodash.cloneDeep(source[prop], function(value) {
        if (value instanceof ObjectId) {
          return value;
        }
      });
    }
  }
  return target;
}

function deepGet(target, path, defaultVal) {
  var paths = path.split('\.');
  var value = null;
  lodash.reduce(paths, function(result, key) {
    value = result ? result[key] : null;
    return value;
  }, target);
  return value || defaultVal;
}

function mergeLists() {
  function concat(list1, list2) {
    return list1.concat(list2);
  }
  return lodash.reduce(arguments, concat, []);
}

function hasElement(targetArray,searchTxt){
  var searchResult = lodash.find(targetArray,function(element){
      if(element.trim().toLowerCase() == searchTxt.trim().toLocaleLowerCase())
        return true
    })
  return isValidNonBlank(searchResult)
}

lodash.mixin({
  iterPull: iterPull,
  isInvalid: isInvalid,
  isInvalidOrBlank: isInvalidOrBlank,
  isValid: isValid,
  isValidNonBlank: isValidNonBlank,
  addIfValid: addIfValid,
  filterInvalid: filterInvalid,
  chunk: chunk,
  deepObjectExtend: deepObjectExtend,
  mergeLists: mergeLists,
  deepGet: deepGet,
  hasElement:hasElement
});

module.exports = lodash;