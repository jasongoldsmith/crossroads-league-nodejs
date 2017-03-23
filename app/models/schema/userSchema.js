var mongoose = require('mongoose')
var Schema = mongoose.Schema
var Mixed = Schema.Types.Mixed
var utils = require('../../utils')

var consoleTypeEnum = {
  type: String,
  enum: utils._.values(utils.constants.consoleTypes),
  default: utils.constants.consoleTypes.PC
}

var acctVerifyEnum = {
  type: String,
  enum: utils._.values(utils.constants.accountVerificationStatusTypes),
  default: utils.constants.accountVerificationStatusTypes.NOT_INITIATED
}

var reviewPromptCardStatusEnum = {
  type: String,
  enum: utils._.values(utils.constants.reviewPromptCardStatusTypes),
  default: utils.constants.reviewPromptCardStatusTypes.NEVER_SHOWN
}

var UserSchema = new Schema({
  name: String,
  profileUrl: String,
  userName: {type: String, lowercase: true, trim: true},
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
    gamePlatformId: String,
    gamePlayerLevel: Number,
    imageUrl: String,
    isPrimary: {type: Boolean, default: false},
    region: String
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
    cardId: {type: Schema.Types.ObjectId, ref: 'ReviewPromptCard'}
  },
  hasCompletedOnBoarding: {type: Boolean, default: false}
})

UserSchema.index({'userName': 1}, {unique: true})
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