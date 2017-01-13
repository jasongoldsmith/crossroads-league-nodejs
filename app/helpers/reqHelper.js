var utils = require('../utils');
var errors = require('./errors');

function getQueryParamsStartsWith(req, prefix) {
  return utils._.pick(req.query,
    function(value, key) {
      return utils.str.startsWith(key, prefix);
    }
  );
}

function appendToAdata(req, data) {
  if (utils._.isInvalid(req.adata)) {
    req.adata = {};
  }
  if (utils._.isInvalid(data)) {
    return
  }
  utils._.assign(req.adata, utils._.clone(data));
}

function handleVErrorWrapper(req) {
  return function (callback) {
    var err = req.vError();
    if (err) {
      return callback(err);
    }
    return callback(null);
  }
}

function handleFirstVErrorWrapper(req) {
  return function (callback) {
    var err = req.vError();
    if (err) {
      return callback(errors.getFirstErrorFromValidationError(err));
    }
    callback(null);
  }
}

function getHeader(req,headerKey){
  var value = null
  if (utils._.isValidNonBlank(req) && utils._.isValidNonBlank(req.headers[headerKey])) {
    value = req.headers[headerKey]
  }
  utils.l.d('got header for key['+headerKey+']',value)
  return value
}
module.exports = {
  appendToAdata: appendToAdata,
  handleVErrorWrapper: handleVErrorWrapper,
  handleFirstVErrorWrapper: handleFirstVErrorWrapper,
  getHeader:getHeader
};
