var mongoose = require('mongoose')
var Schema = mongoose.Schema
var Mixed = Schema.Types.Mixed
var consoleTypeEnum = {type: String, enum: ['PS4','XBOX360','XBOXONE','PS3']}
var acctVerifyEnum = {
  type: String,
  enum: ['VERIFIED','INITIATED','FAILED_INITIATION','NOT_INITIATED','INVALID_GAMERTAG','INVITED','INVITATION_MSG_FAILED'],
  default: "NOT_INITIATED"
}
var reviewPromptCardStatusEnum = {
  type: String,
  enum: ['COMPLETED', 'REFUSED', 'NEVER_SHOWN', 'TO_BE_SHOWN'],
  default: "NEVER_SHOWN"
}

var UserSchema = new Schema({
  name: String,
  profileUrl: String,
  userName: {type: String},
  date: {type: Date, required: true},
  passWord: {type: String},
  uniqueID: String,
  verifyStatus: acctVerifyEnum,
  verifyToken: String,
  consoles: [{
    consoleType: consoleTypeEnum,
    consoleId: String,
    verifyStatus: acctVerifyEnum,
    verifyToken: String,
    clanTag: String,
    destinyMembershipId: String,
    imageUrl: String,
    isPrimary: {type: Boolean, default: false}
  }],
  clanId: {type: String, default: "clan_id_not_set"},
  clanName: String,
  clanImageUrl: String,
  imageUrl: String,
  uDate: Date,
  signupDate: Date,
  flags: Mixed,
  bungieMemberShipId: String,
  passwordResetToken: String,
  groups:[{type: Mixed}],
  lastActiveTime: {type:Date, default: new Date()},
  isLoggedIn: {type: Boolean, default: true},
  notifStatus:[{type: String}],
  lastCommentReportedTime: Date,
  commentsReported: {type: Number, default: 0},
  hasReachedMaxReportedComments: {type: Boolean, default: false},
  legal: {
    termsVersion: {type: String, default: "0.0"},
    privacyVersion: {type: String, default: "0.0"}
  },
  stats: {
    eventsCreated: {type: Number, default: 0},
    eventsJoined: {type: Number, default: 0},
    eventsLeft: {type: Number, default: 0},
    eventsFull: {type: Number, default: 0}
  },
  mpDistinctId: String,
  mpDistinctIdRefreshed: {type: Boolean, default: false},
  isInvited: {type: Boolean, default: false},
  reviewPromptCard: {
    status: reviewPromptCardStatusEnum,
    cardId: { type: Schema.Types.ObjectId, ref: 'ReviewPromptCard'}
  }
})

UserSchema.index({'userName': 1})
UserSchema.index({'consoles.consoleId': 1})
UserSchema.index({'consoles.verifyToken': 1})
UserSchema.index({'verifyToken': 1})
UserSchema.index({'date': 1})
UserSchema.index({"groups.groupId": 1})


UserSchema.pre('validate', function(next) {
  this.uDate = new Date()
  if (this.isNew) {
    this.date = new Date()
  }
  next()
})


module.exports = {
  schema: UserSchema
}