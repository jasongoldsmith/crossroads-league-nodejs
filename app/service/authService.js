// External modules
var request = require('request')
var fs = require('fs')
var passwordHash = require('password-hash')

// Internal modules
var models = require('../models')
var destinyService = require('./destinyInterface')
var utils = require('../utils')
var userService = require('./userService')
var trackingService = require('./trackingService')
var tinyUrlService = require('./tinyUrlService')
var helpers = require('../helpers')

function createNewUser(signupData,validateBungie,verifyStatus,messageType,messageDetails,callback){
	var primaryConsole = utils.primaryConsole(signupData)
	signupData.imageUrl = primaryConsole.imageUrl
	utils.async.waterfall([
		function(callback){
			if(validateBungie) {
				sendVerificationMessage(signupData,primaryConsole.consoleType,messageType,messageDetails,verifyStatus,callback)
			}else {
				return callback(null, signupData)
			}
		},function(newUser,callback){
			newUser.clanName=utils.constants.freelanceBungieGroup.groupName
			getCurrentLegalObject(function(err,legal){
				newUser.legal = legal
				utils.l.d('signup::getCurrentLegalObject',newUser)
				utils.l.d("creating user", utils.l.userLog(newUser))
				models.user.createUserFromData(newUser, callback)  // don't send message
			})
		}
	],callback)
}

function sendVerificationMessage(signupData,consoleType,messageType,messageDetails,verifyStatus,callback){
	destinyService.sendBungieMessageV2(signupData.bungieMemberShipId,
			utils._.get(utils.constants.consoleGenericsId, consoleType),
			messageType,
			messageDetails,
			function (error, messageResponse) {
				utils.l.d('messageResponse', messageResponse)
				utils.l.d('signupUser::sendBungieMessage::error', error)
				if (messageResponse) {
					utils.l.d("messageResponse::token===" + messageResponse.token)
					signupData.verifyStatus = verifyStatus
					signupData.verifyToken = messageResponse.token
					return callback(null, signupData)
				} else {
					if(messageType == utils.constants.bungieMessageTypes.eventInvitation){
						signupData.verifyStatus = "INVITATION_MSG_FAILED"
						return callback(null, signupData)
					}else if(messageType == utils.constants.bungieMessageTypes.accountVerification){
						signupData.verifyStatus = "FAILED_INITIATION"
						return callback(null, signupData)
					}else{
						return callback(error, null) //This is the case where user is signing up in the normal flow
					}
				}
			})
}

function addLegalAttributes(user,callback){
	var userLegal = JSON.parse(JSON.stringify(user))
	models.sysConfig.getSysConfigList([utils.constants.sysConfigKeys.termsVersion,utils.constants.sysConfigKeys.privacyPolicyVersion], function(err, sysConfigs) {
		var termsVersionObj =  utils._.find(sysConfigs, {"key": utils.constants.sysConfigKeys.termsVersion})
		var privacyObj = utils._.find(sysConfigs, {"key": utils.constants.sysConfigKeys.privacyPolicyVersion})
		if(userLegal.legal.termsVersion != termsVersionObj.value.toString()) userLegal.legal.termsNeedsUpdate = true
		else userLegal.legal.termsNeedsUpdate = false

		if(userLegal.legal.privacyVersion != privacyObj.value.toString()) userLegal.legal.privacyNeedsUpdate = true
		else userLegal.legal.privacyNeedsUpdate = false

		return callback(null,userLegal)
	})
}

function getCurrentLegalObject(callback){
		models.sysConfig.getSysConfigList([utils.constants.sysConfigKeys.termsVersion,utils.constants.sysConfigKeys.privacyPolicyVersion],function(err, sysConfigs){
			var termsVersionObj =  utils._.find(sysConfigs, {"key": utils.constants.sysConfigKeys.termsVersion})
			var privacyObj = utils._.find(sysConfigs, {"key": utils.constants.sysConfigKeys.privacyPolicyVersion})
			var legal = {termsVersion:termsVersionObj.value.toString(),
										privacyVersion:privacyObj.value.toString()}
			return callback(null, legal)
		})
}

function createInvitees(consoleIdList, consoleType, messageDetails, callback){
	utils.async.waterfall([
		function(callback){
			utils.async.mapSeries(consoleIdList,function(consoleId,asyncCallback){
				utils.l.d("^^^^^^^^^^^^^^^^^^^^^")
				validateInviteeConsole({
					consoleId: consoleId,
					consoleType: consoleType,
				},asyncCallback)
				utils.l.d("^^^^^^^^^^^^^^^^^^^^^")
			},function(errors, bungieMemberList){
				return callback(errors,bungieMemberList)
			})
		},function(bungieMembersList,callback){
			utils.l.d("******************************************************************:bungieMembersList::",bungieMembersList)
			utils.async.mapSeries(bungieMembersList, function(bungieMember,asyncCallback){
				utils.l.d("**********************",bungieMember)
				createInvitedUsers(bungieMember,consoleType,messageDetails,asyncCallback)
				utils.l.d("**********************")
			},function(errors, userList){
				return callback(errors,userList)
			})
		}
	],callback)
}

function validateInviteeConsole(console, callback){

	userService.checkBungieAccount(console,false,function(err,bungieResponse){
		var bungieMember = {
			consoleId: console.consoleId,
			consoleType: console.consoleType,
		}

		if(utils._.isInvalidOrBlank(bungieResponse) || utils._.isValidNonBlank(err)) {
			bungieMember.verifyStatus="INVALID_GAMERTAG"
		}else{
			bungieMember.bungieMemberShipId= bungieResponse.bungieMemberShipId
			bungieMember.destinyProfile= bungieResponse.destinyProfile
			bungieMember.verifyStatus="INVITED"
		}

		return callback(null,bungieMember)
	})
}

function createInvitedUsers(bungieMembership,consoleType,messageDetails,callback){
	utils.l.d("**********************createInvitedUsers::",bungieMembership)
	var userData = null
	var validateBungie = false
	if(bungieMembership.verifyStatus == "INVALID_GAMERTAG"){
		userData = userService.getNewUserData("crossroads",utils.constants.freelanceBungieGroup.groupId,null,false,null,consoleType)
		userData.imageUrl=utils.config.defaultHelmetUrl

		validateBungie = false
		var consolesList =  []
		var consoleObj = {}
		consoleObj.imageUrl = utils.config.defaultHelmetUrl
		consoleObj.consoleType =  bungieMembership.consoleType
		consoleObj.consoleId=bungieMembership.consoleId
		consoleObj.isPrimary = true
		consoleObj.verifyStatus = bungieMembership.verifyStatus
		consolesList.push(consoleObj)
		userData.consoles = consolesList
		userData.verifyStatus = bungieMembership.verifyStatus
	}else{
		validateBungie = utils.config.enableBungieIntegration
		userData = userService.getNewUserData("crossroads",utils.constants.freelanceBungieGroup.groupId,null,false,bungieMembership,consoleType)
		userData.verifyStatus = bungieMembership.verifyStatus
		utils._.map(userData.consoles, function(console){
			console.verifyStatus=bungieMembership.verifyStatus
		})
	}

	var uid = utils.mongo.ObjectID()
	userData._id = uid

	utils.async.waterfall([
		function(asyncCallback){
			if(utils._.isValidNonBlank(userData.bungieMemberShipId))
				models.user.getUserByData({bungieMemberShipId: userData.bungieMemberShipId},asyncCallback)
			else
				return asyncCallback(null,null)
		},function(user,asynCallback){
			if(utils._.isValidNonBlank(user))
				callback(null,user)
			else
				createNewUser(userData,validateBungie,bungieMembership.verifyStatus,utils.constants.bungieMessageTypes.eventInvitation,messageDetails, asynCallback)
		}
	],function(err,newUser){
		if(!err)
			helpers.firebase.createUser(newUser)
		return callback(err,newUser)
	})
}

// -------------------------------------------------------------------------------------------------
// New Code

function registerUser(req, userName, passWord, callback) {
	utils.async.waterfall([
		function generateUIDForUser(callback) {
			/* We need this call explicitly incase a new user is trying to
			 create an account from a phone which already had this app */
			models.user.getOrCreateUIDFromRequest(req, true, callback)
		},
		function createNewUserInDb(uId, callback) {
			var data = {
				_id: uId,
				userName: userName.toLowerCase().trim(),
				passWord: passwordHash.generate(passWord.trim())
			}
			userService.createNewUser(req, data, callback)
		},
		function (user, callback) {
			sendWelcomeEmail(user, function (err, response) {
				if(err) {
					utils.l.s("There was an error in sending welcome email", err)
				} else {
					utils.l.d("Email was sent successfully to: " + user.userName)
				}
				return callback(null, user)
			})
		}
	], callback)
}


function sendWelcomeEmail(user, callback) {
	utils.async.waterfall([
		function readHtmlFile(callback) {
			fs.readFile(utils.constants.WELCOME_EMAIL_HTML_TEMPLATE_PATH, 'utf8', function (err, html) {
				if(err) {
					return callback(err, null)
				} else {
					var emailMsg =  {
						subject: "Welcome to Crossroads For League of Legends",
						body: html
					}
					return callback(null, emailMsg)
				}
			})
		},
		function (emailMsg, callback) {
			if(utils.config.enableSESIntegration) {
				utils.l.d("SES integration is enabled")
				helpers.ses.sendEmail([user.userName], utils.constants.SES_EMAIL_SENDER, emailMsg.subject,
					emailMsg.body, callback)
			} else {
				utils.l.i("SES integration is disabled")
			}
		}
	], callback)
}

function registerLoginUserinMixpanel(req, user, callback) {
	//TODO: change it once we implement invite user
	var isInvitedUserInstall = false

	var updateMpDistinctId = trackingService.needMPIdfresh(req, user)
	var existingUserZuid = req.zuid
	if(updateMpDistinctId) {
		// An existing user logging for first time after installing the app. Create mp user
		req.zuid = user._id
		req.adata.distinct_id = user._id
		trackingService.trackUserLogin(req, user, updateMpDistinctId, existingUserZuid,
			isInvitedUserInstall, function(err, data) {
				if(! err) {
					utils.l.d('setting mp refresh data')
					user.mpDistinctId = helpers.req.getHeader(req, 'x-mixpanelid')
					user.mpDistinctIdRefreshed = true
				}
				userService.updateUser(user, callback)
			})
	} else {
		// An existing user logging in either as a result of log out or app calling login when launched.
		req.zuid = user._id
		req.adata.distinct_id = user._id
		if(existingUserZuid.toString() != user._id.toString()) {
			//app calling due to log out then zuid and user._id are different.
			// With logout cookie is cleared and next api call will issue new zuid
			// Fire appInit and remove mp user created due to new session id.
			helpers.m.removeUser(existingUserZuid)
			helpers.m.incrementAppInit(req)
			helpers.m.trackRequest("appInit", {}, req, user)
		}
		userService.updateUser(user, callback)
	}
}

function requestResetPassword(userName, callback) {
	utils.async.waterfall([
		function getUserByUserName(callback) {
			models.user.getUserByData({userName: userName.toLowerCase().trim()}, callback)
		},
		function setPasswordTokenOnUser(user, callback) {
			if(utils._.isInvalidOrBlank(user)) {
				return callback({error:"An account with that email address does not exist."}, null)
			}
			helpers.uuid.getRandomUUID()
			user.passwordResetToken = helpers.uuid.getRandomUUID()
			models.user.save(user, callback)
		},
		function createEmailMsg(updatedUser, callback) {
			var emailMsg = {
				subject: "Reset Password request for Crossroads for League of Legends"
			}
			var longUrl = utils.config.hostUrl() + "/api/v1/auth/resetPasswordLaunch/" + updatedUser.passwordResetToken
			var msg = utils.constants.bungieMessages.passwordReset
				.replace(/%URL%/g, longUrl)
				.replace(/%APPNAME%/g, utils.config.appName)
			utils.l.d("resetPassword msg to send::" + msg)
			utils.l.d("resetPassword msg to send::" + msg)
			emailMsg.body = msg
			return callback(null, emailMsg)

			//TODO: To use tinyURL once we build a dedicated db for it
			//tinyUrlService.createTinyUrl(longUrl, function(err, shortUrl) {
			//	var msg = utils.constants.bungieMessages.passwordReset
			//		.replace(/%URL%/g, shortUrl)
			//		.replace(/%APPNAME%/g, utils.config.appName)
			//	utils.l.d("resetPassword msg to send::" + msg)
			//	emailMsg.body = msg
			//	return callback(null, emailMsg)
			//})
		},
		function (emailMsg, callback) {
			if(utils.config.enableSESIntegration) {
				utils.l.d("SES integration is enabled")
				helpers.ses.sendEmail([userName], utils.constants.SES_EMAIL_SENDER, emailMsg.subject,
					emailMsg.body, function(err, response) {
						if(err) {
							utils.l.s("err in send email", err)
							return callback({error: "Something went wrong. Please try again later"}, callback)
						} else {
							utils.l.d("response in send email", response)
							return callback(err, response)
						}
					})
			} else {
				utils.l.i("SES integration is disabled")
				return callback({error: "Reset password has been disabled temporarily. Please try again later"})
			}
		}
	], callback)
}

module.exports = {
	addLegalAttributes: addLegalAttributes,
	createNewUser: createNewUser,
	createInvitees: createInvitees,
	sendVerificationMessage: sendVerificationMessage,

	// --------------------------------------------------------------------------------------------
	// New code

	registerUser: registerUser,
	registerLoginUserinMixpanel: registerLoginUserinMixpanel,
	requestResetPassword: requestResetPassword
}