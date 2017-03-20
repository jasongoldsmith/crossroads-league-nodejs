var mongoose = require('mongoose')
var Schema = mongoose.Schema
var utils = require('../../utils')


var languages =  utils._.values(utils.constants.languagesForOnBoarding)

var onBoardingSchema = new Schema({
  date: Date,
  uDate: Date,
  language: {type: String, enum: languages, default: utils.constants.languagesForOnBoarding.en},
  isRequired: {type: Boolean, default: true},
  order: Number,
  backgroundImageUrl: String,
  heroImageUrl: String,
  textImageUrl: String
})

onBoardingSchema.index({'order': 1})

onBoardingSchema.pre('validate', function(next) {
  this.uDate = new Date()
  if (this.isNew) {
    this.date = new Date()
  }
  next()
})

module.exports = {
  schema: onBoardingSchema
}