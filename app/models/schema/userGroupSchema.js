var mongoose = require('mongoose')
var utils = require('../../utils')
var Schema = mongoose.Schema
var serviceTypeEnum = {
  type: String,
  enum: utils._.values(utils.constants.serviceTypes),
  default: utils.constants.serviceTypes.PUSHNOTIFICATION
}

var UserGroupSchema = new Schema({
  user: {type: Schema.Types.ObjectId, ref: 'User'},
  date: { type: Date, required: true },
  uDate: Date,
  refreshGroups:{type:Boolean,default:false},
  group:{ type: String, ref: 'Group', required: true },
  consoles:[{type:String}],
  serviceEndpoints:[{
    serviceType:serviceTypeEnum,
    consoleType:String,
    topicSubscriptionEndpoint:String,
    topicName:String
  }],
  muteNotification:Boolean
})

UserGroupSchema.index({'user':1})
UserGroupSchema.index({'user':1,'group':1})
UserGroupSchema.index({'group':1,'consoles':1,muteNotification:1})
UserGroupSchema.index({"__v": 1, "_id": 1})


UserGroupSchema.pre('validate', function(next) {
  this.uDate = new Date()
  if (this.isNew) {
    this.date = new Date()
  }
  next()
})


module.exports = {
  schema: UserGroupSchema
}