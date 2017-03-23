var express = require('express')
var router = express.Router()
var utils = require('../../utils')
var routeUtils = require('../routeUtils')
var models = require('../../models')

function listConfigs(req, res) {
  utils.l.d("listConfigs request: " + JSON.stringify(req.headers["config_token"]))
  if(!req.headers["config_token"]) {
    utils.l.i("config_token missing in headers")
    routeUtils.handleAPIUnauthorized(req, res)
    return
  }


  var configs = {
    mixpanelToken: utils.config.mixpanelKey
  }

  utils.async.waterfall([
    function(callback) {
      models.sysConfig.getSysConfig('CONFIG_TOKEN', callback)
    },
    function(configToken, callback) {
      if(utils._.isInvalidOrBlank(configToken)
        || req.headers["config_token"] != configToken.value.toString()) {
        utils.l.s("The config token key did not match or is not present in the db", configToken)
        return callback({error: "Something went wrong. Please try again later"}, null)
      }
      getLoLRegions(callback)
    },
    function(LoLRegions, callback) {
      configs.LolRegions = LoLRegions.value
      getOnBoardingScreens(null, function(err, onBoardingScreens) {
        configs.onBoardingScreens = onBoardingScreens
        return callback(null, configs)
      })
    }
  ],
  function(err, configs) {
    if(err) {
      routeUtils.handleAPIUnauthorized(req, res)
    } else {
      routeUtils.handleAPISuccess(req, res, configs)
    }
  })
}

function getLoLRegions(callback) {
  models.sysConfig.getSysConfig('LoLRegions', callback)
}

function getOnBoardingScreens(language, callback) {
  var onBoardingScreens = {
  }
  utils.async.parallel({
    required: function(callback) {
      models.onBoarding.getRequiredOnBoardingScreenByLanguage(language, callback)
    },
    optional: function(callback) {
      models.onBoarding.getOptionalOnBoardingScreenByLanguage(language, callback)
    }
  }, function(err, result) {
    if(err){
      utils.l.s("Error in getting the onboarding screens, err: ", err)
    }
    if(utils._.isValidNonEmpty(result.required)){
      onBoardingScreens.required = result.required
    }
    if(utils._.isValidNonEmpty(result.optional)){
      onBoardingScreens.optional = result.optional
    }
    return callback(null, onBoardingScreens)
  })
}

routeUtils.rGet(router, '/', 'listConfigs', listConfigs)

module.exports = router