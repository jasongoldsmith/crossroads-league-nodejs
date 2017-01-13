var mongoose = require('mongoose')
var utils = require('../../utils')
var Schema = mongoose.Schema
var serviceTypeEnum = {
  type: String,
  enum: utils._.values(utils.constants.serviceTypes),
  default: utils.constants.serviceTypes.PUSHNOTIFICATION
}

var GroupSchema = new Schema({
  _id:String,
  groupName: String,
  date: { type: Date, required: true },
  uDate: Date,
  avatarPath:String,
  bungieMemberCount:Number,
  clanEnabled:Boolean,
  appStats:[{
    consoleType:String,
    memberCount:Number
  }],
  serviceEndpoints:[{
    serviceType:serviceTypeEnum,
    consoleType:String,
    topicEndpoint:String,
    topicName:String
  }]
})

GroupSchema.index({"__v": 1, "_id": 1})

GroupSchema.pre('validate', function(next) {
  this.uDate = new Date()
  if (this.isNew) {
    this.date = new Date()
  }
  next()
})


module.exports = {
  schema: GroupSchema
}