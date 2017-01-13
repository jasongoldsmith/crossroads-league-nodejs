var mongoose = require('mongoose')
var Schema = mongoose.Schema
var idValidator = require('mongoose-id-validator')

var InstallationSchema = new Schema ({
  user: {type: Schema.Types.ObjectId, ref: 'User'},
  deviceType: String,  // apn or gcm
  deviceToken: String,
  unReadNotificationCount: Number,
  date: Date,
  uDate: Date,
  deviceSubscription:{deviceEndpointArn:String,allUsersTopicSubscriptionArn:String}
})

InstallationSchema.index({'user':1}, {'unique': true})

InstallationSchema.pre('validate', function(next) {
  this.uDate = new Date()
  if (this.isNew) {
    this.date = new Date()
  }
  next()
})

module.exports = {
  schema: InstallationSchema
}

InstallationSchema.plugin(idValidator)