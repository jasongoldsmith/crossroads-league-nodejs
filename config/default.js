
var path = require('path')
var lodash = require('lodash')

var development = require('./env/development')
var production = require('./env/production')
var staging = require('./env/staging')
var prodURL = require('./env/prodURL')
var mongoUri = process.env.MONGOLAB_URI ||
  process.env.MONGOHQ_URL || process.env.MONGO_URL ||
  'mongodb://localhost/LoL'



var defaults = {
  root: path.normalize(__dirname + '/../app'),
  mongoUri: mongoUri,
  enableNewRelic: false,
  enforceSSL: true,
  devMode: false,
  logLevel: 'info',
  appName:'LoL',
  tinyUrlHost:'http://dev.crsrd.co/',
  testHostUrl:'http://localhost:3000',
  hostUrl: function() {
    var url = this.hostName
    if (this.portNum !== -1) {
      url = url + ':' + this.portNum
    }
    return url
  },
  confirmNavigation: false,
  mixpanelKey: process.env.mixpanelKey || "6f234a30aa0f9577f5e436380a32737e",
  s3: {
    imageBucket: "feighty-images-dev",
    contentsBucket: "feighty-videos",
    momentsBucket: "feighty-moments"
  },
  ENV_STAGING : "staging",
  ENV_DEVELOPMENT: "development",
  ENV_PRODUCTION: "production",
  ENV_URL_PROD: "prodURL",
  environment: process.env.NODE_ENV || 'development',
  skipMPRequestTracking: process.env.SKIP_MP_REQ_TRACKING || "YES",
  show: function() {
    console.log('environment: ' + this.environment)
    console.log('hostUrl: ' + this.hostUrl())
    console.log('devMode: ' + this.devMode)
    console.log('enforceSSL: ' + this.enforceSSL)
    console.log('logLevel: ' + this.logLevel)
  },
  awsKey: {accessKeyId: process.env.awsAccessKeyId, secretAccessKey: process.env.awsSecretAccessKey, region: "us-east-1"},
  awsSNSKey:{
    accessKeyId: 'AKIAI5ODU5YNUXEMCG4Q',
    secretAccessKey: '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',
    region: 'us-east-1'
  },
  onCueClipUrlHostName: "https://oncue.blob.core.windows.net",
  onCueClipCutterUrl: "http://oncuetest.prototyper.co/api/Videos",
  awsClipUrlHostName: "http://feighty-moments.s3.amazonaws.com",
  awsProfileImageUrl: "http://feighty-images-dev.s3.amazonaws.com/",
  awsContentUrl: "http://d9cq30q0gqp5u.cloudfront.net/", // use CDN url "https://feighty-videos.s3.amazonaws.com/",
  awsCloudFrontMomentUrl: "http://drfnffl4u55gr.cloudfront.net",
  placeholder_awsClipUrlHostName:  "http://S3_MOMENT_DOMAIN",
  placeholder_awsContentUrlHostName: "https://S3_PROFILE_VIDEO_DOMAIN/",
  placeholder_awsProfileUrlHostName: "https://S3_PROFILE_DOMAIN/",
  download_URLPattern: "http://feighty-images-dev.s3.amazonaws.com/download/index.html?mode=%MODE%",
  download_staging_URLPattern: "http://feighty-images-dev.s3.amazonaws.com/download/index_staging.html?mode=%MODE%",
  defaultMessagePattern: "%CREATOR% sent you '%CHAT%'. WATCH and CHAT with %CREATOR%. Download app %DOWNLOADURL% & follow instructions",
  watChatImageUrl: "http://feighty-images-dev.s3.amazonaws.com/intro_phone_login.png",
  bitlyAccessToken: process.env.bitly_access_token,
  f80SecretKey: process.env.f80SecretKey,
  iosAppVersion: process.env.iosAppVersion,
  androidAppVersion: process.env.androidAppVersion,
  forcedUpgradeMessage: process.env.forcedUpgradeMessage,
  optionalUpgradeMessage: process.env.optionalUpgradeMessage,
  currIosAppVersion : process.env.currIosAppVersion,
  currAndroidAppVersion: process.env.currAndroidAppVersion,
  placeholder_versionString: "VERSIONSTRING",
  upgradeTitle: process.env.upgradeTitle,
  googleAPIKey: process.env.googleAPIKey,
  enableBungieIntegration: process.env.enableBungieIntegration|| false,
  bungieCrsRdAppId:"13495568",
  bungieAPIToken:"b5518df2a3a04cafb16c1d34a5f4295e",
  bungieCSRFToken:"7968073564440830385",
  bungieCookie:"__cfduid=d7916e1319d1b63480db79a260d9257381464308262 bungledid=B8uuB7AKbFVNuFwvMkcmLrUp+MNSxIXTCAAA _ga=GA1.2.1210193906.1464308265 bungleloc=lc=en&lcin=true bungled=2672157280055555322 sto-id-sg_www.bungie.net=OJAKHPAK _gat=1 bungleRedir=L2VuL1Byb2ZpbGUvMjU0LzEzMTcyNzA5 bungles=WebView=False bunglefrogblastventcore=1469139034 bunglesony=2jgU.12Odhu22Z2DUeh5ZdMVr-XuU4JbLim5kvL0RQeAAAAAVfDloD6mVVhdCI4QygwD9Rtmwz2wt43O9a2PJVF4FxQc-xWXhWiO6s7L0rfDFxan0RCRgPI7OcNEj6m70Jdpbm4N6P3qcTMWOmnAuMI6i2QuvjekBRUCOaXcUujae8xPgyB5LK.dgBOJtNSBHHsdKtTAj3WXSf5LAGnI8p8K46A_ bungleatk=wa=z0LwajUZyVh7.1iCuU8E53KOL.vWcsuTyV2.3UOICj3gAAAAvJabiPc6bIlOTNuOclNOAMm2RG8aejirDL9hdofaSxzR47hx9KG27Mx5bx7YMZtD-ZTDx4CXid2sfj7lsQjK5SrtFcCQJ6tlY3we4IwZ0q28J2-pX7BS-g.48asQqEnObWjNzUgLASlKNqPCs38nAJft5EsIZ9HSAQhOV1qx-7XpGE14tQZKYOtfo7rfVVmMdY1aIKMmbkvQATp6lypvjsMenmchSq34Jznw8Q1tJKl.GGsq9vLJy-IPBWoVawx87INfIUEYzQH-xPBlDOaJgOVyER.q47IaY79-9HxVtfk_&tk=YAAAAGKZqB6o6aIYeKHuhy8nasMSRH9LesKUIn1UU.r1Fipb0Y9T9F8IMUo36pk.Z3e4lw-AW06V4hPMoLee7pi5b2kjBNOM2SbR5TGRIyOJWTEVZgW2XqFiH8mX1Ld6uN5QTCAAAAD8wQGRUIpnmQFE57dk-bWn5WYdOGgvngUw5UKsNEPPaQ__ bungleme=13495568",
  bungieBaseURL:"https://www.bungie.net",
  bungieDestinySearchURL:"https://www.bungie.net/Platform/Destiny/SearchDestinyPlayer/-1/",
  bungieDestinySearchByPSNURL:"https://www.bungie.net/Platform/Destiny/%MEMBERSHIPTYPE%/Stats/GetMembershipIdByDisplayName/%MEMBERSHIPID%?ignorecase=true",
  bungieUserAccountURL:"https://www.bungie.net/Platform/User/GetBungieAccount/",
  bungieConvURL:"https://www.bungie.net/Platform/Message/CreateConversation/?lc=en&fmt=true&lcin=true",
  bungieItemsURL:"https://www.bungie.net/Platform/Destiny/%MEMBERSHIPTYPE%/Account/%MEMBERSHIPID%/Character/%CHARACTERID%/Inventory/Summary?definitions=true",
  destinyGruopsJoinedURL:"https://www.bungie.net/Platform/Group/User/%MEMBERSHIPID%/",
  accountVerificationSuccess:"Great! Welcome to Crossroadsapp! If you have any issues or suggestions you may contact us at gaming@forcecatalyst.com",
  accountVerification:"Thanks for signing up for Traveler, the Destiny Fireteam Finder mobile app! Click the link below to verify your PSN id. %HOST%/api/v1/auth/verify/%TOKEN%",
  firebaseURL: process.env.firebaseURL || "https://lolapp-dev.firebaseio.com",
  triggerIntervalMinutes: 5,
  triggerReminderInterval: 120,
  triggerUpcomingReminderInterval: -5,
  eventExpiryInterval:-40,
  userTimeoutInterval:-20,
  preUserTimeoutInterval:-5,
  userLastActiveUpdateInterval:2,
  disableEnvetUpdateForComments: process.env.DISABLE_EVENT_UPDATE_COMMENTS || true,
  defaultHelmetUrl: 'https://www.bungie.net/common/destiny_content/icons/3e0b919ea55d420156cdf384b66a7f8a.jpg',
  minUsersForGroupNotification: 0,

  // ------------------------------------------------------------------------------------------------------------------
  // New Code

  riotGamesAPIKey: process.env.riotGamesAPIKey || "RGAPI-0dbb58f1-5652-43a9-ba57-746323393d5d"
}

/**
 * Expose
 */

var currentEnvironment = process.env.NODE_ENV || 'development'
console.log("Current environment: " + currentEnvironment)


function myConfig(myConfig) {
  var mergedConfig = lodash.extend(lodash.clone(defaults), myConfig)
  return mergedConfig
}

module.exports = {
  development: myConfig(development),
  production: myConfig(production),
  staging: myConfig(staging),
  prodURL: myConfig(prodURL)
}[currentEnvironment]
