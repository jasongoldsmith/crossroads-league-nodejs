var lodash = require('./lodash');
var str = require('underscore.string');
var url = require('url');
var Chance = require('chance');
var chance = new Chance();
var validator = require('validator');


function formatNumber(number) {
  if (!number) return number;
  if (number.length != 10) return number;
  return '(' + number.substring(0, 3) + ') ' + number.substring(3, 6) + '-' + number.substring(6)
}

function cleanEmail(email) {
  if (!email) {
    return;
  }
  return email.trim().toLowerCase();
}

function cleanNumber(number) {
  if (lodash.isInvalid(number)) {
    return null;
  }
  var phoneNo = number.replace(/[^\d]/g,'');
  if (phoneNo.length === 11) {
    phoneNo = phoneNo.substring(1)
  }
  return phoneNo;
}

function getFirstName(name) {
  var nameParts = str.words(name);
  if (nameParts.length > 0) {
    return nameParts[0];
  }
}

function getLastName(name) {
  var nameParts = str.words(name);
  if (nameParts.length > 1) {
    return nameParts[nameParts.length - 1];
  }
}

function addQueryParam(inputURL, data) {
  var urlObject = url.parse(inputURL, true);
  lodash.extend(urlObject.query, data);
  return url.format(urlObject);
}

function toTitleCase(val) {
  var op = '';
  var tokens = val.split(/[^A-Za-z]+/) || [];
  tokens.forEach(function(token) {
    op += token.charAt(0).toUpperCase() + token.substr(1).toLowerCase() + ' ';
  });
  return op.trim();
}

function getFNameLName(val) {
  return toTitleCase([getFirstName(val), getLastName(val)].join(' '));
}

function randomizeEmail(email) {
  if (!email) {
    return email;
  }
  var emailParts = email.split('@');
  if (emailParts.length != 2) {
    return email;
  }
  var base = emailParts[0] + "+wez" + chance.string({pool: 'abcdefghijklmnopqrstuvwxyz', length:8})
  return base+'@'+emailParts[1];
}

function isEmail(email) {
  return email && validator.isEmail(email);
}

function isPhoneNo(phoneNo) {
  return phoneNo && phoneNo.length == 10;
}

function chanceAlpha(length) {
  length = length || 10;
  return chance.string({pool: "abcdefghijklmnopqrstuvwxyz", length: length});
}

function compareDates(date1, date2) {
  if(date1.getFullYear() != date2.getFullYear() || date1.getMonth() != date2.getMonth()) {
    return 2
  }
  return date1.getDate() - date2.getDate()
}

function getDuplicateMongoErrorKey(err) {
    var field = err.message.split('index: travelerbackend.')[1].split('.$')[1]
    // now we have `email_1 dup key`
    field = field.split(' dup key')[0]
    field = field.substring(0, field.lastIndexOf( '_' ))
    return field
}

function isDuplicateMongoKeyError(err) {
  if(err.message.indexOf("duplicate key error") > -1) {
    return true
  } else {
    return false
  }
}

module.exports = {
  formatNumber: formatNumber,
  cleanNumber: cleanNumber,
  toTitleCase: toTitleCase,
  getFNameLName: getFNameLName,
  getFirstName: getFirstName,
  getLastName: getLastName,
  addQueryParam: addQueryParam,
  randomizeEmail: randomizeEmail,
  chance: chance,
  isEmail: isEmail,
  isPhoneNo: isPhoneNo,
  cleanEmail: cleanEmail,
  chanceAlpha: chanceAlpha,
  compareDates: compareDates,
  getDuplicateMongoErrorKey: getDuplicateMongoErrorKey,
  isDuplicateMongoKeyError: isDuplicateMongoKeyError
};
