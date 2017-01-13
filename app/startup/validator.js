var utils = require('../utils');
var models = require('../models');
var helpers = require('../helpers');
var expressValidator = require('express-validator');


function isPhoneNo(value) {
  return utils.format.isPhoneNo(value);
}

function isValidPlan(value) {
  return utils._.isValid(models.plan.nameToPlan[value]);
}

function isAlphaSpace(value) {
  var validate = null;
  validate = value && value.match(/\w\s/);
  return validate;
}

function isAlphaNumeric(value) {
  var validate = null;
  if (value.length == 1) {
    validate =  value && value.match(/^[a-zA-Z]*$/);
  }
  else {
    validate = value && value.match(/^[a-zA-Z0-9\ ]*$/);
  }
  return validate;
}

function isName(value) {
  return value && value.length >= 1 && value.length < 50;
}

function isSingleLevelObject(object) {
  if (!utils._.isObject(object)) {
    return false;
  }
  var hasInvalidEntries = utils._.any(object, function(value, key) {
    return utils._.isObject(value) || !utils._.isString(key)
  });

  return !hasInvalidEntries;
}

var customValidators = {
  isPhoneNo: isPhoneNo,
  isValidPlan: isValidPlan,
  isAlphaSpace: isAlphaSpace,
  isAlphaNumeric: isAlphaNumeric,
  isName: isName,
  isSingleLevelObject: isSingleLevelObject
};

module.exports = function (app) {
  function toDate(dateInput) {
    return utils.m.moment(parseInt(dateInput)).toDate();
  }

  function toCleanPhoneNo(phoneNo) {
    return utils.format.cleanNumber(phoneNo);
  }

  function toCleanEmail(email) {
    return utils.format.cleanEmail(email);
  }

  var validator = expressValidator.validator;
  validator.extend('toCleanPhoneNo', toCleanPhoneNo);
  validator.extend('toCleanEmail', toCleanEmail);
  validator.extend('toDate', toDate);

  app.use(expressValidator({
    customValidators: customValidators
  }));

  app.use(function (req, res, next) {
    req.vError = function() {
      var err = req.validationErrors();
      if (err) {
        return new helpers.errors.createValidationError(err);
      } else {
        return null
      }
    };
    next();
  });
};