var AWS = require('aws-sdk');
var utils = require('../utils')
//var models = require('../models')

AWS.config.update(utils.config.awsSNSKey)
var sns = new AWS.SNS()

function createTopic(topicName,callback){
  //var models = require('../models')
  var params = {
    Name: topicName /* required */
  };
  utils.async.waterfall([
    function (callback){
      sns.createTopic(params, callback);
    }
  ],function(err,topicArn){
    if(!err)
      return callback(null,{key:topicName,value:topicArn.TopicArn,description:topicName})
    else
      return callback(err, null)
  })
}

function deleteTopic(topicEndPoint,callback){
  //var models = require('../models')
  var params = {
    TopicArn: topicEndPoint /* required */
  };
  utils.async.waterfall([
    function (callback){
      sns.deleteTopic(params, callback);
    }
  ],function(err,topicArn){
    if(!err)
      return callback(null,topicArn)
    else
      return callback(err, null)
  })
}

function getTopicARNEndpoint(consoleType, groupId,topicSource,callback){
  var models = require('../models')
  var topicARNKey = getTopicARNKey(consoleType,groupId)
  utils.async.waterfall([
    function(callback){
      if(topicSource == "GROUP"){
        callback(null,null)
      }else{
        models.sysConfig.getSysConfig(topicARNKey,callback)
      }
    },function(topicARNConfig,callback){
      if(utils._.isInvalidOrBlank(topicARNConfig))
        createTopic(topicARNKey,callback)
      else
        return callback(null, topicARNConfig)
    }
  ],function(err,topicEndPoint){
    utils.l.d("got the topicEndpoint",topicEndPoint)
    if(utils._.isValidNonBlank(err))
      return callback(null,null)
    else
      return callback(null,topicEndPoint)
  })
}

function getGroupTopicARNEndpoint(consoleType, group){
  var serviceEndPoint = utils._.find(group.serviceEndpoints,{consoleType:consoleType,serviceType:utils.constants.serviceTypes.PUSHNOTIFICATION})
  if(utils._.isValidNonBlank(serviceEndPoint))
    return {key:serviceEndPoint.topicName,value:serviceEndPoint.topicEndpoint}
  else{
    return getTopicARNEndpoint(consoleType,group._id,"GROUP")
  }
}

function getApplicationArnEndPoint(deviceType,callback) {
  var models = require('../models')
  var appARNKey =  utils.constants.sysConfigKeys.awsSNSAppArn
    .replace(/%DEVICE_TYPE%/g, deviceType)
    .replace(/%ENV%/g, utils.config.environment)
  models.sysConfig.getSysConfig(appARNKey, function(err,data){
    if(!err) return callback(null, data)
    else return callback(null,null)
  })
}

/**
 * @param user - required
 * @param installation - requried
 * @param callback
 *
 *   - Register a device token to an app
 *   - Subscribe to all users topic
 */
function unRegisterDeviceToken(user,installation,callback){
  var models = require('../models')
  var config = {}
  utils.async.waterfall([
    function(callback) {
      sns.deleteEndpoint({
        EndpointArn: installation.deviceSubscription.deviceEndpointArn
      }, callback)
    },function(deviceEndPoint,callback){
      sns.unsubscribe({SubscriptionArn: installation.deviceSubscription.allUsersTopicSubscriptionArn}, callback)
    },function(subscriptionEndPoint, callback) {
      unSubscribeUser(user,callback)
    },function(subscribeEndPoint, callback) {
      models.installation.findByIdAndUpdate(installation._id,
        {deviceSubscription: null}, callback)
    }
  ],callback)
}

function unSubscribeGroup(groupId,callback){
  var models = require('../models')
  utils.async.waterfall([
    function(callback){
      models.groups.findGroupById(groupId,callback)
    },function(group,callback){
      utils.async.mapSeries(group.serviceEndpoints,
        function(serviceEndpoint,asyncCallback){
          deleteTopic(serviceEndpoint.topicEndpoint,asyncCallback)
        },
        function(errors, results){
          callback(errors,results)
        }
      )
    }
  ],callback)
}
/**
 * @param user - required
 * @param installation - requried
 * @param callback
 *
 *   - Register a device token to an app
 *   - Subscribe to all users topic
 */
function registerDeviceToken(user,installation,callback){
  var models = require('../models')
  var config = {}
  utils.l.d("registering for insllation::"+installation._id)
  utils.async.waterfall([
    function(callback) {
      getApplicationArnEndPoint(installation.deviceType,callback)
    },function(appArnEndpoint,callback){
      utils.l.d("appArnEndpoint",appArnEndpoint)
      config.appArnEndpoint = appArnEndpoint
      getTopicARNEndpoint('All_Platforms','All_Groups',"SYSTEM",callback)
    },function(topicArnEndpoint,callback){
      config.allUsersTopicArnEndpoint = topicArnEndpoint
      sns.createPlatformEndpoint({
        PlatformApplicationArn: config.appArnEndpoint.value,
        Token: installation.deviceToken,
        Attributes: {Enabled: 'true'}
      }, callback)
    },
    function(deviceEndPoint, callback) {
      utils.l.d("deviceEndPoint",deviceEndPoint)
      config.deviceEndPointArn = deviceEndPoint.EndpointArn
      sns.subscribe({
        Protocol: 'application',
        TopicArn: config.allUsersTopicArnEndpoint.value,
        Endpoint: deviceEndPoint.EndpointArn
      }, callback)
    },
    function(subscribeEndPoint, callback) {
      if(installation.deviceSubscription) {
        installation.deviceSubscription.deviceEndpointArn = config.deviceEndPointArn
        installation.deviceSubscription.allUsersTopicSubscriptionArn=subscribeEndPoint.SubscriptionArn
      }else{
        installation.deviceSubscription= {deviceEndpointArn: config.deviceEndPointArn,
                                          allUsersTopicSubscriptionArn: subscribeEndPoint.SubscriptionArn}
      }
      models.installation.findByIdAndUpdate(installation._id,
      {deviceSubscription: installation.deviceSubscription}, callback)
    }
  ],callback)
}

/**
 * register topic for each console
 *
 * @param group
 * @param consoles
 * @param callback
 */
function subscribeGroup(group,consoleType,callback){
  var models = require('../models')
  var serviceEndPoint = utils._.find(group.serviceEndpoints,{consoleType:consoleType,serviceType:utils.constants.serviceTypes.PUSHNOTIFICATION})
  if(utils._.isValidNonBlank(serviceEndPoint))
    return callback(null,null)
  else{
    utils.async.waterfall([
      function(callback){
        getTopicARNEndpoint(consoleType,group._id,"GROUP",callback)
      },function(topic,callback){
        var newServiceEndpoint = {}
        newServiceEndpoint.serviceType =utils.constants.serviceTypes.PUSHNOTIFICATION
        newServiceEndpoint.consoleType = consoleType
        newServiceEndpoint.topicEndpoint = topic.value
        newServiceEndpoint.topicName = topic.key
        models.groups.addServiceEndpoints(group._id,newServiceEndpoint,callback)
      }
    ],function(err,data){
      callback(null,null)
    })
  }
}

/**
 * @param userGroup
 * @param callback
 *
 * Subscribe to a given user group. userGroup has console and group information
 */
function subscirbeUserGroup(userGroup,installation, callback){
  utils.async.waterfall([
    function(callback){
      if(utils._.isValidNonBlank(installation.deviceSubscription) && utils._.isValidNonBlank(installation.deviceSubscription.deviceEndpointArn))
        callback(null,installation)
      else
        registerDeviceToken(userGroup.user,installation,callback)
    },function(installationUpdated, callback){
      if(utils._.isValidNonBlank(installationUpdated.deviceSubscription) && utils._.isValidNonBlank(installationUpdated.deviceSubscription.deviceEndpointArn)){
        utils.async.mapSeries(userGroup.consoles,
          function(consoleType,asyncCallback){
            var appStats = utils._.find(userGroup.group.appStats,{consoleType:consoleType})
            if(utils._.isValidNonBlank(appStats) && appStats.memberCount >= utils.config.minUsersForGroupNotification && !userGroup.muteNotification)
              createUserGroupEndPoints(userGroup,consoleType,installationUpdated.deviceSubscription.deviceEndpointArn,asyncCallback)
            else asyncCallback(null,null)
          },
          function(errList,results){
            callback(null,null)
          }
        )
      }else
        callback(null,null)
    }
  ],callback)
}

function createUserGroupEndPoints(userGroup, consoleType, deviceEndpointArn, callback){
  var models = require('../models')
  utils.async.waterfall([
    function(callback){
      var serviceEndPoint = utils._.find(userGroup.serviceEndpoints,{consoleType:consoleType,serviceType:utils.constants.serviceTypes.PUSHNOTIFICATION})
      if(utils._.isValidNonBlank(serviceEndPoint)){
        return callback(null, null)
      }else{
        var topic = getGroupTopicARNEndpoint(consoleType,userGroup.group)
        subscibeTopic(deviceEndpointArn,topic.value,function(err,subscribeEndPoint){
          if(!err) {
            var newServiceEndpoint = {}
            newServiceEndpoint.serviceType =utils.constants.serviceTypes.PUSHNOTIFICATION
            newServiceEndpoint.consoleType = consoleType
            newServiceEndpoint.topicSubscriptionEndpoint = subscribeEndPoint.SubscriptionArn
            newServiceEndpoint.topicName = topic.key
            return callback(null, newServiceEndpoint)
          }else{
            callback(null,null)
          }
        })
      }
    },function(serviceEndpoint,callback){
      utils.l.d("createUserGroupEndPoints::serviceEndpoint",serviceEndpoint)
      if(utils._.isValidNonBlank(serviceEndpoint)){
        var user = utils._.isValidNonBlank(userGroup.user._id)?userGroup.user._id:userGroup.user
        models.userGroup.addServiceEndpoints(user,userGroup.group._id,serviceEndpoint,callback)
      }else
        callback(null,null)
    }
  ],callback)
}

function reSubscirbeUserGroup(userGroup,installation, callback){
//unsubscribe and then subscribe for notifications
}

function subscibeTopic(deviceEndpointArn, topicARN, callback){
  sns.subscribe({
    Protocol: 'application',
    TopicArn: topicARN,
    Endpoint: deviceEndpointArn
  }, callback)
}

function unSubscirbeUserGroup(userGroup,callback){
  utils.async.waterfall([
    function(callback){
        utils.async.mapSeries(userGroup.serviceEndpoints,
          function(endPoint,asyncCallback){
            if(utils._.isValidNonBlank(endPoint))
              sns.unsubscribe({SubscriptionArn: endPoint.topicSubscriptionEndpoint}, asyncCallback)
            else asyncCallback(null,null)
          },
          function(errList,results){
            callback(null,null)
          }
        )
    }
  ],callback)
}

function unSubscribeAllUserGroups(userGroupList, callback){
  utils.async.mapSeries(userGroupList,
    function(userGroup,asyncCallback){
      unSubscirbeUserGroup(userGroup,asyncCallback)
    },
    function(errList,results){
      return callback(null,null)
    }
  )
}

function unSubscribeUser(user,callback){
  var models = require('../models')
  utils.async.waterfall([
    function(callback){
      models.userGroup.getByUser(user._id,null,callback)
    },function(userGroupList, callback){
      unSubscribeAllUserGroups(userGroupList,callback)
    },function(results,callback){
      models.userGroup.updateUserGroup(user,null,{serviceEndpoints:[]},callback)
    }
  ],callback)
}

/*
function registerDeviceToken(user,installation,callback){
  //var models = require('../models')
  //get deviceToken from installation
  //Register devicetoken with SNS for app_%DEVICE_TYPE%_%ENV%_%GROUP%_%CONSOLETYPE%
  //Store endpointurl for device in user as deviceEndPoints:[{app_%DEVICE_TYPE%_%ENV%_%GROUP%_%CONSOLETYPE%:endpoint}]
  // e.g. {app_apn_dev_clan_id_not_set_PS4:endpoint from aws}
  var config = {}
  var installationObj = null
  utils.async.waterfall([
    function(callback){
      if(utils._.isValidNonBlank(installation))
        return callback(null,installation)
      else
        models.installation.getInstallationByUser(user,callback)
    },
    function(installation, callback) {
      config.deviceToken = installation.deviceToken
      config.deviceType = installation.deviceType
      config.groupId = user.clanId
      installationObj = installation
      var console = utils.primaryConsole(user)
      config.consoleType = console.consoleType
      getApplicationArn(installation.deviceType, callback)
    },
    function(sysconfigARN, callback) {
      config.appARN = sysconfigARN.value
      getTopicARN(config.consoleType, config.groupId, callback)
    },
    function(sysconfigTopic, callback) {
      config.topicARN = sysconfigTopic.value
      sns.createPlatformEndpoint({
        PlatformApplicationArn: config.appARN,
        Token: config.deviceToken,
        Attributes: {Enabled: 'true'}
      }, callback)
    },
    function(deviceEndPoint, callback) {
      config.endPointArn = deviceEndPoint.EndpointArn
      sns.subscribe({
        Protocol: 'application',
        TopicArn: config.topicARN,
        Endpoint: deviceEndPoint.EndpointArn
      }, callback)
    },
    function(subscribeEndPoint, callback) {
      var subEndpointObj = {key: getTopicARNKey(config.consoleType, config.groupId),
        subscriptionArn: subscribeEndPoint.SubscriptionArn, endPointArn: config.endPointArn}
      installationObj.deviceSubscriptions.push(subEndpointObj)
      models.installation.findByIdAndUpdate(installationObj._id,
        {deviceSubscriptions: installationObj.deviceSubscriptions}, callback)
    }
  ], callback)
}

function getDeviceEndpoints(userList, callback) {
  //get user specific device endpoint for sending messages to specific userlist
}

function unsubscribeAllEndpoints(user, isUserLoggedIn, callback) {
  utils.async.waterfall([
    function(callback) {
      models.installation.getInstallationByUser(user, callback)
    },
    function(installation, callback) {
      utils.async.mapSeries(user.groups, function(userGroup, asyncCallback) {
        //if this method is called from the mute notification flow, unsubsribe for only the groups which have mute turned on
        if(isUserLoggedIn && userGroup.muteNotification)
          utils._.map(user.consoles, function (userConsole) {
            unsubscribeEndpoint(user, userGroup.groupId, userConsole.consoleType, installation, asyncCallback)
          })
        else if(!isUserLoggedIn)
          utils._.map(user.consoles,function(userConsole) {
            unsubscribeEndpoint(user, userGroup.groupId, userConsole.consoleType, installation, asyncCallback)
          })
        else asyncCallback(null, null)
      },
        function(err, data) {
        if(err) {
          utils.l.d('Error:Unsubscribing all user endpoints', err)
          return callback({error: "There was a problem in muting notifications"}, null)
        } else {
          utils.l.d('Completed unsubscription of endpoints for user', data)
          return callback(null, {success: true})
        }
      })
    }
  ], callback)
}

function unsubscribeEndpoint(user, groupId, consoleType, installation, callback) {
  utils.async.waterfall([
    function(callback) {
/!*
      getTopicARN(config.consoleType,config.groupId,function(err,sysconfigTopic){
        if(!err) {
          var topicARN = sysconfigTopic.value
          var subscriptionArn = getSubscriptionArn(user,groupId,consoleType,installation)
          sns.unsubscribe({SubscriptionArn:subscriptionArn},callback)
        }else return callback({error:"unable to lookup topic subscription details."},null)
      })
*!/
      var deviceSubscription = getSubscriptionArn(user, groupId, consoleType, installation)
      var subscriptionArn = deviceSubscription.subscriptionArn.toString()
      //Unsubscribe from AWS
      if(utils._.isValidNonBlank(deviceSubscription))
        sns.unsubscribe({SubscriptionArn: subscriptionArn}, function(err, data) {
          //regardless of err or successful update with AWS, remove the subscription in local DB.
        })

      //Remove subscription ARN in installation object for this topic
      deviceSubscription.subscriptionArn = null
      models.installation.findByIdAndUpdate(installation._id,
        {deviceSubscriptions: installation.deviceSubscriptions}, callback)
    }
  ], callback)
}


function getSubscriptionArn(user, groupId, consoleType, installation) {
  var deviceSubscription = utils._.filter(installation.deviceSubscriptions,
    {key: getTopicARNKey(consoleType, groupId)})
  return deviceSubscription
}

function getApplicationArn(deviceType, callback) {
  //var models = require('../models')
  var appARNKey =  utils.constants.sysConfigKeys.awsSNSAppArn
    .replace(/%DEVICE_TYPE%/g, deviceType)
    .replace(/%ENV%/g, utils.config.environment)
  utils.l.d('appARNKey::', appARNKey)
  models.sysConfig.getSysConfig(appARNKey, callback)
}
 */

function getTopicARN(consoleType, groupId, callback) {
  var models = require('../models')
  utils.async.waterfall([
    function(callback){
      models.groups.findGroupById(groupId,callback)
    },function(group,callback){
      var serviceEndPoint = utils._.find(group.serviceEndpoints,{consoleType:consoleType,serviceType:utils.constants.serviceTypes.PUSHNOTIFICATION})
      if(utils._.isValidNonBlank(serviceEndPoint) && utils._.isValidNonBlank(serviceEndPoint.topicEndpoint))
        return callback(null,{key:serviceEndPoint.topicName,value:serviceEndPoint.topicEndpoint})
      else
        return callback({error:"No topic registered for this group"},null)

    }
  ],callback)

  //models.sysConfig.getSysConfig(topicARN, callback)
}

function getTopicARNKey(consoleType,groupId){
  var topicARNKey = utils.constants.sysConfigKeys.awsSNSTopicArn
    .replace(/%CONSOLETYPE%/g, consoleType)
    .replace(/%GROUP%/g, groupId)
    .replace(/%ENV%/g, utils.config.environment)
  return topicARNKey
}

function publishToSNSTopic(consoleType, groupId, customPayload, alert,callback) {
  var topicARN = null
  utils.async.waterfall([
    function(callback) {
      getTopicARN(consoleType, groupId, callback)
    },
    function(topicARN, callback) {
      var payload = {}
      payload.default = 'Hello World'


      var apsData = {
        aps: {
          alert: alert,
          sound: 'default',
          badge: 1
        }
      }

      payload.APNS = apsData
      payload.APNS.payload = customPayload
      payload.APNS_SANDBOX = apsData
      payload.APNS_SANDBOX.payload = customPayload

      /*
      if(utils.config.environment == 'production' || utils.config.environment == 'staging')
        payload.APNS = apsData
      else
        payload.APNS_SANDBOX = apsData
      */
      payload.GCM = {
          "data": {
            "message": alert,
            "payload": customPayload
            }
          }


      utils.l.i('publishToSNSTopic::topicARN', topicARN)
      utils.l.i('payloadJson', payload)
      // first have to stringify the inner APNS object...
      payload.APNS = JSON.stringify(payload.APNS);
      payload.APNS_SANDBOX = JSON.stringify(payload.APNS_SANDBOX)
      payload.GCM = JSON.stringify(payload.GCM)
      // then have to stringify the entire message payload
      //payload.payload = JSON.stringify(payload.payload);
     payload = JSON.stringify(payload)

      utils.l.i('payload', payload)
      utils.l.i('alert',alert)
      var params = {
        Message: payload,
        MessageStructure: 'json',
        TopicArn: topicARN.value
      };

      sns.publish(params, callback)
    }
  ],
    function(err, data) {
      if (err) {
        console.log(err.stack)
        return
      }
      console.log('push sent')
      console.log(data)
    })
}

function sendPush() {
  console.log('inside sendPush')
  sns.createPlatformEndpoint({
    PlatformApplicationArn: 'arn:aws:sns:us-west-2:412817206882:app/APNS_SANDBOX/app_apn_dev_clan_id_not_set_PS4',
    Token: '001d20bec1ff5b47faea5957cd487cca34df68fa34a478dea9dc97bbcddfa375',
    Attributes: {
      Enabled:'true'
    }
  },
    function (err, data) {
      if (err) {
        console.log(err.stack)
        return
    }
      var endpointArn = data.EndpointArn
      var payload = {
        default: 'Hello World',
        APNS: {
          aps: {
            alert: 'Hello World',
            sound: 'default',
            badge: 1
          }
        }
      }

    // first have to stringify the inner APNS object...
    // payload.APNS = JSON.stringify(payload.APNS);
    // then have to stringify the entire message payload
    payload = JSON.stringify(payload)

    console.log('sending push')
    sns.publish({
      Message: payload,
      MessageStructure: 'json',
      TargetArn: endpointArn
    },
      function (err, data) {
        if (err) {
          console.log(err.stack)
          return
        }
        console.log('push sent')
        console.log(data)
      })
    })
}

module.exports = {
  sendPush: sendPush,
  registerDeviceToken: registerDeviceToken,
  publishToSNSTopic: publishToSNSTopic,
  //unsubscribeAllEndpoints: unsubscribeAllEndpoints,
  subscribeGroup:subscribeGroup,
  subscirbeUserGroup:subscirbeUserGroup,
  reSubscirbeUserGroup:reSubscirbeUserGroup,
  unRegisterDeviceToken:unRegisterDeviceToken,
  unSubscribeUser:unSubscribeUser,
  unSubscirbeUserGroup:unSubscirbeUserGroup,
  deleteTopic:deleteTopic,
  unSubscribeGroup:unSubscribeGroup
}