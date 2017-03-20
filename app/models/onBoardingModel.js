var utils = require('../utils')
var mongoose = require('mongoose')
var helpers = require('../helpers')

// User Schema
var onBoardingSchema = require('./schema/onBoardingSchema')

// Model initialization
var onBoarding = mongoose.model('onBoarding', onBoardingSchema.schema)

function getRequiredOnBoardingScreenByLanguage(language, callback){
  var queryLanguage = ""
  if(utils._.isInvalidOrBlank(language)|| !utils._.contains(utils.constants.languagesForOnBoarding, language)) {
    queryLanguage = utils.constants.languagesForOnBoarding.en
  } else{
    queryLanguage = language
  }
  onBoarding.find({
    isRequired: true,
    language: queryLanguage,
    order: {$gte: 0}
  }).sort({order: 1}).exec(callback)
}

function getOptionalOnBoardingScreenByLanguage(language, callback){
  var queryLanguage = ""
  if(utils._.isInvalidOrBlank(language)|| !utils._.contains(utils.constants.languagesForOnBoarding, language)) {
    queryLanguage = utils.constants.languagesForOnBoarding.en
  } else{
    queryLanguage = language
  }
  onBoarding.find({
    isRequired: false,
    language: queryLanguage,
    order: {$gte: 0}
  }).sort({order: 1}).exec(callback)
}

module.exports = {
  model: onBoarding,
  getRequiredOnBoardingScreenByLanguage: getRequiredOnBoardingScreenByLanguage,
  getOptionalOnBoardingScreenByLanguage: getOptionalOnBoardingScreenByLanguage
}