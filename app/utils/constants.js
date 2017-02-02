var lodash = require('./lodash')
var config =  require('config')

var reportListStatus = {
  all:['new', 'resolved', 'defered', 'open'],
  unresolved:['new','open'],
  new:'new',
  open:'open',
  resolved:'resolved',
  defered:'defered'
}

var eventAction = {
  leave: 'leave',
  join: 'join'
}

var eventLaunchStatusTypes = {
    now:'now',
    upcoming:'upcoming'
}

var eventStatusTypes = {
  new:'new',
  open:'open',
  full:'full',
  can_join:'can_join'
}

var reviewPromptCardStatus = {
  COMPLETED: 'COMPLETED',
  REFUSED: 'REFUSED',
  NEVER_SHOWN: 'NEVER_SHOWN',
  TO_BE_SHOWN: 'TO_BE_SHOWN'
}

var bungieMemberShipType = {
  PSN:2,
  XBOX:1,
  PS3:2,
  PS4:2,
  XBOX360:1,
  XBOXONE:1,
  bungieNetUser:254
}

var newGenConsoleType = {
  2:"PS4",
  1:"XBOXONE"
}
var consoleGenericsId = {
  PSN:"PlayStation Gamertag",
  XBOX:"Xbox Gamertag",
  PS3:"PlayStation Gamertag",
  PS4:"PlayStation Gamertag",
  XBOX360:"Xbox Gamertag",
  XBOXONE:"Xbox Gamertag"
}
var bungieMessageTypes = {
  accountVerification:'accountVerification',
  passwordReset:'passwordReset',
  eventInvitation:'eventInvitation'
}

var bungieMessages = {
  accountVerification:'Open the link to verify your %CONSOLETYPE% on Crossroads %URL%. If you have any questions, please email us at support@crossroadsapp.co because this mailbox is unmonitored',
  passwordReset: 'Hi, Guardian! We received a request to reset your password. Please follow the link: %URL%. If you did not forget your password, please disregard this message.',
  addConsoleErrorMsg: "Oops! We could not find the #CONSOLE_TYPE# #CONSOLE_ID# publicly linked to your bungie account. Make sure your profile is public and try again.",
  bungieMembershipLookupError: "Looks like your #CONSOLE_TYPE# #CONSOLE_ID# isn't publicly linked to your Bungie account. Check Profile > Settings > Linked Accounts to make sure it's public and try again.",
  eventInvitationCurrent:"I reserved you a Fireteam spot for %ACTIVITY_NAME%. Respond on Crossroads %EVENT_DEEPLINK%.",
  eventInvitationUpcoming:"I reserved you a Fireteam spot for %ACTIVITY_NAME% at %EVENT_TIME%. Respond on Crossroads %EVENT_DEEPLINK%.",
  eventInvitationDefault:"I reserved you a Fireteam spot for %ACTIVITY_NAME%. Respond on Crossroads %EVENT_DEEPLINK%."
}

var bungieErrorMessage= function(messageId) {
  switch (messageId) {
    case "UserCannotResolveCentralAccount":
      return  {
        error: "We couldn’t find a Bungie.net profile linked to the %CONSOLETYPE% you entered.",
        errorType: "BungieLoginError"
      }
      break
    case "NotParsableError" || "DestinyInvalidClaimException" || "DestinyUnexpectedError" || "DestinyShardRelayClientTimeout":
      return {
        error: "We are unable to contact Bungie.net. Please try again in a few minutes.",
        errorType: "BungieConnectError"
      }
      break
    case "WebAuthRequired":
      return {
        error: "We are unable to contact Bungie.net. Please try again in a few minutes.",
        errorType: "BungieLoginError"
      }
      break
    case "BungieLegacyConsoleError":
      return {
        error: "In line with Rise of Iron, we now only support next-gen consoles. When you’ve upgraded your console, please come back and join us!",
        errorType: "BungieLegacyConsoleError"
      }
    break
    default:
      return {
        error: "We are unable to contact Bungie.net. Please try again in a few minutes.",
        errorType: "BungieConnectError"
      }
      break
  }
}
var eventNotificationTrigger = {
  launchUpcomingEvents:'launchUpcomingEvents',
  launchEventStart:'launchEventStart',
  eventStartReminder:'eventStartReminder',
  dailyOneTimeReminder:'dailyOneTimeReminder',
  launchUpComingReminders:'launchUpComingReminders',
  eventExpiry:'eventExpiry',
  userTimeout:'userTimeout',
  preUserTimeout:'preUserTimeout'
}

var userNotificationTrigger = {
  userSignup:'userSignup'
}
var freelanceBungieGroup = {
  "groupId": "clan_id_not_set",
  "groupName": "Freelance Lobby",
  "avatarPath": config.hostName+"/img/iconGroupCrossroadsFreelance.png",
  "clanEnabled": false
}

var existingUserInstallData = {
  ads:"mvpUser/mvpCampaign/mvpAd/mvpCreative"
}

var invitedUserInstallData = {
  ads:"invitedUser/inviteCampaign/invitepAd/inviteCreative"
}

var sysConfigKeys = {
  awsSNSAppArn:'app_%DEVICE_TYPE%_%ENV%',
  awsSNSTopicArn:'topic_%ENV%_%GROUP%_%CONSOLETYPE%',
  eventExpiryTimeInMins:"eventExpiryTimeInMins",
  userTimeoutInMins:"userTimeoutInMins",
  preUserTimeoutInMins:"preUserTimeoutInMins",
  bungieCookie: "bungieCookie",
  bungieCsrfToken: "bungieCsrfToken",
  termsVersion: "termsVersion",
  privacyPolicyVersion: "privacyPolicyVersion",
  commentsReportMaxValue: "commentsReportMaxValue",
  commentsReportCoolingOffPeriod: "commentsReportCoolingOffPeriod",
  userActiveTimeOutInMins: "userActiveTimeOutInMins",
  deleteFullEventsTimeOutInMins: "deleteFullEventsTimeOutInMins",
  notificationDelayPeriodInMins: "notificationDelayPeriodInMins"
}

// These keys map to the method names in eventBasedPushNotification
var notificationQueueTypeEnum = {
  join: "sendPushNotificationForJoin",
  leave: "sendPushNotificationForLeave",
  kick: "sendPushNotificationForKick",
  newCreate: "sendPushNotificationForNewCreate",
  addComment: "sendPushNotificationForAddComment",
  creatorChange: "sendPushNotificationForCreatorChange",
  eventInvite: "sendPushNotificationForEventInvites",
  eventInviteAccept: "sendInviteAcceptNotification"
}

var serviceTypes = {
  PUSHNOTIFICATION:'PUSHNOTIFICATION',
  EMAIL: 'EMAIL'
}


// ------------------------------------------------------------------------------------------------------------------
// New Code


var baseImageUrl = "https://s3-us-west-1.amazonaws.com/w3.crossroadsapp.co/lol/"
var imageFiles = [
  "profile1.jpg",
  "profile2.jpg",
  "profile3.jpg",
  "profile4.jpg",
  "profile5.jpg",
  "profile6.jpg",
  "profile7.jpg",
  "profile8.jpg",
  "profile9.jpg",
  "profile10.jpg",
  "profile11.jpg",
  "profile12.jpg"
]

var LoLRegions = {
  "BR": "Brazil" ,
  "EUNE": "EU Nordic & East",
  "EUW": "EU West",
  "JP": "Japan",
  "KR": "Korea",
  "LAN": "Latin America North",
  "LAS": "Latin America South",
  "NA": "North America",
  "OCE": "Oceania",
  "RU": "Russia",
  "TR": "Turkey"
}

var consoleTypes = {
  PS4: 'PS4',
  XBOX360: 'XBOX360',
  XBOXONE: 'XBOXONE',
  PS3: 'PS3',
  PC: 'PC'
}

var accountVerificationStatusTypes = {
  VERIFIED: 'VERIFIED',
  INITITATED: 'INITIATED',
  FAILED_INITIATION: 'FAILED_INITIATION',
  NOT_INITIATED: 'NOT_INITIATED',
  INVALID_GAMERTAG: 'INVALID_GAMERTAG',
  INVITED: 'INVITED',
  INVITATION_MSG_FAILED: 'INVITATION_MSG_FAILED'
}

var reviewPromptCardStatusTypes = {
  COMPLETED: 'COMPLETED',
  REFUSED: 'REFUSED',
  NEVER_SHOWN: 'NEVER_SHOWN',
  TO_BE_SHOWN: 'TO_BE_SHOWN'
}

module.exports = {
  l: lodash,
  reportListStatus: reportListStatus,
  eventAction: eventAction,
  eventLaunchStatusTypes: eventLaunchStatusTypes,
  bungieMemberShipType:bungieMemberShipType,
  eventNotificationTrigger: eventNotificationTrigger,
  userNotificationTrigger: userNotificationTrigger,
  bungieMessageTypes: bungieMessageTypes,
  bungieMessages: bungieMessages,
  freelanceBungieGroup: freelanceBungieGroup,
  bungieErrorMessage: bungieErrorMessage,
  consoleGenericsId: consoleGenericsId,
  sysConfigKeys: sysConfigKeys,
  eventStatusTypes: eventStatusTypes,
  reviewPromptCardStatus: reviewPromptCardStatus,
  notificationQueueTypeEnum: notificationQueueTypeEnum,
  existingUserInstallData:existingUserInstallData,
  newGenConsoleType:newGenConsoleType,
  invitedUserInstallData:invitedUserInstallData,
  serviceTypes:serviceTypes,

  // ------------------------------------------------------------------------------------------------------------------
  // New Code
  
  baseImageUrl: baseImageUrl,
  imageFiles: imageFiles,
  LoLRegions: LoLRegions,
  consoleTypes: consoleTypes,
  accountVerificationStatusTypes: accountVerificationStatusTypes,
  reviewPromptCardStatusTypes: reviewPromptCardStatusTypes
}