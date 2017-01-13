var user = require('./userModel')
var temporaryUser = require('./temporaryUserModel')
var activity = require('./activityModel')
var reviewPromptCard = require('./reviewPromptCardModel')
var event = require ('./eventModel')
var archiveEvent = require ('./archiveEventModel')
var installation = require('./installationModel')
var report =  require('./reportModel')
var notification = require('./notificationModel')
var notificationTrigger = require('./notificationTriggerModel')
var tinyUrl = require ('./tinyUrlModel')
var sysConfig = require('./sysConfigModel')
var userGroup = require('./userGroupModel')
var notificationQueue = require ('./notificationQueueModel')
var helmetTracker = require('./helmetTrackerModel')
var eventInvitationModel = require('./eventInvitationModel')
var pendingEventInvitationModel = require('./pendingEventInvitationModel')
var groupsModel = require('./groupModel')

module.exports = {
  user: user,
  temporaryUser: temporaryUser,
  activity: activity,
  reviewPromptCard: reviewPromptCard,
  event: event,
  installation: installation,
  archiveEvent: archiveEvent,
  report: report,
  notification: notification,
  notificationTrigger: notificationTrigger,
  tinyUrl: tinyUrl,
  sysConfig: sysConfig,
  userGroup: userGroup,
  notificationQueue: notificationQueue,
  helmetTracker: helmetTracker,
  eventInvitation: eventInvitationModel,
  pendingEventInvitation: pendingEventInvitationModel,
  groups:groupsModel
}
