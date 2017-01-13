var express = require('express');
var router = express.Router();
var config = require('config');
var utils = require('../../utils');
var helpers = require('../../helpers');
var routeUtils = require('../routeUtils');
var platform = {
  ios : "ios",
  android: "android"
};
var MESSAGE_APP_UPTODATE = "app upto date";


function getVersionNumber(versionString) {
  if(versionString.indexOf(".") < 0 ){
    return parseInt(versionString) ;
  }else {
    return 0;
  }
  /*if(utils._.isValid(versionString)) {
    var versionsArray = utils._.map(versionString.split('.').reverse(), function(x) {return parseInt(x)});
    var index = 1;
    var versionNumber = utils._.reduce(versionsArray, function(total , arrElement) {
      index++;
      return total + (Math.pow(10, index) * arrElement);
    });
    return versionNumber;
  }else {
    return -1;
  }*/
}

function formMessageWithVersion(message, version) {
  return message.replace(config.placeholder_versionString, version);
}

function getUpgradeMessage(isForceUpgrade, isUpgrade, version) {
  if(isUpgrade) {
    return isForceUpgrade ? formMessageWithVersion(config.forcedUpgradeMessage, version) : formMessageWithVersion(config.optionalUpgradeMessage, version);
  }else {
    return MESSAGE_APP_UPTODATE;
  }
}

function getDownloadUrl() {
  if (utils.config.environment == utils.config.ENV_PRODUCTION) {
    return config.download_URLPattern.replace(/%MODE%/g, "live");
  }else {
    return config.download_staging_URLPattern.replace(/%MODE%/g, "live");
  }
}

function getVersionData(configVersionString) {
  if(utils._.isInvalid(configVersionString)) {
    return {};
  }
  var versionData = configVersionString.split('-');
  return {
    version: versionData[0],
    versionNumber: versionData[1]
  };
}

function getMinimumUpgradeVersionData(platformType) {
  return getVersionData(getMinimumUpgradeStringFromConfig(platformType))
}

function getMinimumUpgradeStringFromConfig(platformType) {
  if(platformType == platform.android) {
    return config.androidAppVersion;
  }else if(platformType == platform.ios) {
    return config.iosAppVersion;
  }
}

function getLatestAppVersionData(platformType) {
  return getVersionData(getLatestVersionStringFromConfig(platformType))
}

function getLatestVersionStringFromConfig(platformType) {
  if(platformType == platform.ios) {
    return config.currIosAppVersion;
  }else if(platformType == platform.android) {
    return config.currAndroidAppVersion;
  }
}

function getUpgradeTitle() {
  return config.upgradeTitle;
}

function formJSONResponse(fUpgradeVersion, appVersion, latestAppVersion) {
  var minUpgradeVersionNumber = utils._.result(fUpgradeVersion, 'versionNumber'); //getVersionNumber(fUpgradeVersion);
  var appVersionNumber =  getVersionNumber(appVersion);
  var latestAppVersionNumber = utils._.result(latestAppVersion, 'versionNumber'); //getVersionNumber(latestAppVersion);
  var latestAppVersionName = utils._.result(latestAppVersion, 'version');
  if(appVersionNumber <= minUpgradeVersionNumber) {
    return {
      isUpgrade: 2,
      versionNumber: latestAppVersionNumber,
      version: latestAppVersionName,
      message: getUpgradeMessage(true, true, latestAppVersionName),
      title: getUpgradeTitle(),
      buttons:[{caption: "Install", action: "install", downloadUrl: getDownloadUrl() }, {caption: "Exit", action: "exit" }]};
  }else if(appVersionNumber > minUpgradeVersionNumber && appVersionNumber < latestAppVersionNumber ) {
    return {
      versionNumber: latestAppVersionNumber,
      version: latestAppVersionName,
      isUpgrade: 1,
      message: getUpgradeMessage(false, true, latestAppVersionName),
      title: getUpgradeTitle(),
      buttons:[{caption: "Install", action: "install", downloadUrl: getDownloadUrl() }, {caption: "Continue", action: "continue" }]};
  }else if(appVersionNumber >= latestAppVersionNumber) {
    return { versionNumber: latestAppVersionNumber,
      version: latestAppVersionName,
      isUpgrade: 0,
      message: getUpgradeMessage(false, false, latestAppVersionName)};
  }

}

function init(req, res) {
  req.assert('appVersion').notEmpty();
  req.assert('platformType').notEmpty();
  var platformType = req.param("platformType");
  utils.async.waterfall([
      helpers.req.handleVErrorWrapper(req),
      function (callback) {
        var jsonResponse = formJSONResponse(getMinimumUpgradeVersionData(platformType), req.body.appVersion, getLatestAppVersionData(platformType));
        callback(null, jsonResponse)
      }
    ],
    function (err, versionData) {
      if (err) {
        req.routeErr = err;
        return routeUtils.handleAPIError(req, res, err);
      }
      return routeUtils.handleAPISuccess(req, res, {value: versionData});
    }
  );
}


routeUtils.rPost(router, '/:platformType', 'init', init);

module.exports = router;