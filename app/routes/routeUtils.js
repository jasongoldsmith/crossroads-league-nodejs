var utils = require('../utils');
var url = require('url');
var models = require('../models/index');
var helpers = require('../helpers');
var config = require('config');

var RequestTypeMap = {
  REQUEST: 'REQ'
};

var responseTypesMap = {
  SUCCESS: 'SUC',
  VALIDATION_ERROR: 'VALDTNERR',
  FLASH_ERROR: 'FLASHERR',
  ERROR: 'ERR',
  REDIRECT: 'RED'
};


function handleAPIErrorStatus(status, req, res, err, data, trackingData) {
  data = data || {};
  if (utils._.isValid(err)) {
    console.log("Error: " + JSON.stringify(err));

    if (err instanceof Error) {
      console.log("Error Stack: " + err.stack);
      console.log("Error Message: " + err.message);
    }

    req.routeErr = err;
  }
  handleAPIResponse(req, res, status, responseTypesMap.ERROR, data, trackingData);
}

function handleAPIError(req, res, err, data, trackingData) {
  handleAPIErrorStatus(400, req, res, err, data, trackingData);
}

function handleAPIUnauthorized(req, res, err, data, trackingData) {
  handleAPIErrorStatus(401, req, res, err, data, trackingData);
}

function handleAPINotFound(req, res, err, data, trackingData) {
  handleAPIErrorStatus(404, req, res, err, data, trackingData);
}

function handleAPISuccessMessageToUser(req, data) {
  if (utils._.isValid(req.routeSuccess)) {
    data.message = req.routeSuccess;
  }
}

function track(req, responseType, trackingData, user) {
  var trackingKey = getTrackingKeyFromRequest(req, responseType);

  // Track to mixpanel
  helpers.m.trackRequest(trackingKey, trackingData, req, user);
}

function commonErrorHandling(req, data) {
  var routeErr = req.routeErr;
  if (routeErr && routeErr.track && routeErr.track.key && routeErr.track.data) {
    var track = routeErr.track;
    helpers.m.trackRequest('ERR_'+track.key, track.data, req, data.user);
  }
}

/**
 * This function looks at req.routeErr and decides on how to propagate it to user
 * @returns {*}
 */
function handleAPIErrorMessageToUser(req, data) {
  if (utils._.isValid(req.routeErr)) {
    var routeErr = req.routeErr;

    if (routeErr instanceof helpers.errors.ValidationError) {
      var firstErr = helpers.errors.getFirstErrorFromValidationError(routeErr);
      if (firstErr) {
        data.message = firstErr;
      }
      data.responseType = responseTypesMap.VALIDATION_ERROR;
    } else {
      data.message = {type: 'error', message: routeErr.message};
      data.responseType = responseTypesMap.ERROR;
    }
    commonErrorHandling(req, data);
  }
}


function handleAPIResponse(req, res, responseCode, responseType, data, trackingData) {
  var data = data || {};
  utils.async.waterfall(
    [
      function(callback) {
        if (req.isAuthenticated()) {
          models.user.getById(req.user.id,callback);
        } else {
          return callback(null, null);
        }
      }
    ],
    function(err, user) {
      if (err) {
        utils.l.d("error in the API response", err)
        utils.l.d("error in the API response for user", user)
        responseCode = 500;
        req.routeErr = err;
      }

      handleAPISuccessMessageToUser(req, data);
      handleAPIErrorMessageToUser(req, data);
      track(req, responseType, trackingData, user);
      data.httpStatusCode = responseCode;
      res.status(responseCode).json(data);
    });
}

function handleAPISuccess(req, res, data, trackingData) {
  handleAPIResponse(req, res, 200, responseTypesMap.SUCCESS, data, trackingData);
}

function handleAPIRedirect(req, res, url, trackingData) {
  var data = {
    redirect: true,
    redirectURL: url
  };
  handleAPIResponse(req, res, 200, responseTypesMap.REDIRECT, data, trackingData);
}

function getTrackingKeyFromRequest(req, suffix) {
  var trackingKey = req.trackingKeyBase + '_' + req.method + '_' + suffix;
  return trackingKey;
}

function addTrackingKeyBaseToRequest(trackingKeyBase,trackData) {
  return function(req, res, next) {
    if (utils._.isFunction(trackingKeyBase)) {
      req.trackingKeyBase = trackingKeyBase(req);
    } else {
      req.trackingKeyBase = trackingKeyBase;
    }

    var trackingKey = getTrackingKeyFromRequest(req, RequestTypeMap.REQUEST);
    // Track to mixpanel
    if(trackData && trackData['utm_dnt']) {
      //utils.l.d('routeUtils::addTrackingKeyBaseToRequest::Skipping trackdata[utm_dnt]')
      return next();
    }else{
      utils.l.d('tracking request',utils.config.skipMPRequestTracking)
      if(utils.config.skipMPRequestTracking == "NO")
        helpers.m.trackRequest(trackingKey, {}, req, req.user);
      return next();
    }
  }
}

function rGet(router, path, trackingKey, getFn,trackData) {
  router.route(path).
    all(addTrackingKeyBaseToRequest(trackingKey,trackData))
    .get(getFn);
}

function rPost(router, path, trackingKey, middlewareFn, postFn,trackData) {
  if (!postFn) {
    postFn = middlewareFn;
    router.route(path).
      all(addTrackingKeyBaseToRequest(trackingKey,trackData))
      .post(postFn);
  } else {
    router.route(path).
      all(addTrackingKeyBaseToRequest(trackingKey,trackData))
      .post(middlewareFn, postFn);
  }

}

function rGetPost(router, path, trackingKey, getFn, postFn,trackData) {
  router.route(path).
    all(addTrackingKeyBaseToRequest(trackingKey,trackData))
    .get(getFn)
    .post(postFn);
}

module.exports = {
  handleAPISuccess: handleAPISuccess,
  handleAPIRedirect: handleAPIRedirect,
  handleAPIError: handleAPIError,
  rGet: rGet,
  rPost: rPost,
  rGetPost: rGetPost,
  handleAPIUnauthorized: handleAPIUnauthorized,
  handleAPINotFound: handleAPINotFound
};