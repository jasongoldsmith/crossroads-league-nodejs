var mongoose = require('mongoose')
var Schema = mongoose.Schema
var idValidator = require('mongoose-id-validator')

var consoleTypeEnum = {type: String, enum: ['PS4','XBOX360','XBOXONE','PS3']}
var acctVerifyEnum = {
  type: String,
  enum: ['VERIFIED','INITIATED','FAILED_INITIATION','NOT_INITIATED','INVITED', 'INVALID_GAMERTAG'],
  default: "NOT_INITIATED"
}

var HelmetTrackerSchema = new Schema ({
  user: {type: Schema.Types.ObjectId, ref: 'User'},
  bungieMembershipId:String,
  consoles: [{
    consoleType: consoleTypeEnum,
    consoleId: {type: String},
    verifyStatus: acctVerifyEnum,
    verifyToken: {type: String},
    clanTag: String,
    destinyMembershipId: String,
    imageUrl: String,
    isPrimary: {type: Boolean, default: false}
  }],
  err: {type:Schema.Types.Mixed},  // apn or gcm
  date: Date,
  uDate: Date
})

HelmetTrackerSchema.index({'user':1}, {'unique': true})

HelmetTrackerSchema.pre('validate', function(next) {
  this.uDate = new Date()
  if (this.isNew) {
    this.date = new Date()
  }
  next()
})

module.exports = {
  schema: HelmetTrackerSchema
}

HelmetTrackerSchema.plugin(idValidator)