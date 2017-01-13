var VError = require('verror');
var utils = require('../utils');

var mod_util = require('util');

function createError(name, base) {
  var NewError = function () {
    VError.apply(this, Array.prototype.slice.call(arguments));
  };
  var baseClass = base || VError.WError;
  mod_util.inherits(NewError, baseClass);
  NewError.prototype.name = name;
  return NewError;
}

PhoneNoExistsError = createError('PhoneNoExistsError');

ValidationError = createError('ValidationError');

function createValidationError(err) {
  var err =  new ValidationError(JSON.stringify(err));
  return err;
}

function getFirstErrorFromValidationError(routeErr) {
  var errMessage = routeErr.message;
  var errData;
  try {
    errData = JSON.parse(errMessage);
  } catch(ex) {
    utils.l.i("Error in JSON.parse", errMessage);
    errData = {};
  }
  if (errData.length > 0) {
    var firstErr = errData[0];
    return {type: 'error', message: firstErr.msg};
  }
  return null;
}

module.exports = {
  PhoneNoExistsError: PhoneNoExistsError,
  ValidationError: ValidationError,
  createValidationError: createValidationError,
  WError: VError.WError,
  getFirstErrorFromValidationError: getFirstErrorFromValidationError
};