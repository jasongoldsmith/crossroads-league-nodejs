var request = require('request')
var passwordHash = require('password-hash')
var models = require('../models')
var destinyService = require('./destinyInterface')
var utils = require('../utils')
var userService = require('./userService')
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

/*
function requestResetPassword(userData, callback) {
	utils.async.waterfall([
		function(callback) {
			//TBD: membershiptype is hardcoded to PSN for now. When we introduce multiple channels change this to take it from userdata
			// or send notification to both xbox and psn depending on the ID availability
			if(utils.config.enableBungieIntegration) {
				utils.l.d("Destiny validation enabled")
				destinyService.sendBungieMessage(
					userData.bungieMemberShipId,
					utils.primaryConsole(userData).consoleType,
					utils.constants.bungieMessageTypes.passwordReset,
					function (err, messageResponse) {
						if(err) {
							return callback(err, null)
						} else {
							utils.l.d("messageResponse::token=== " + messageResponse.token)
							userData.passwordResetToken = messageResponse.token
						}
						models.user.save(userData, callback)
					})
			} else {
				utils.l.d("Destiny validation disabled")
				return callback(null, userData)
			}
		}
	], callback)
}
*/

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

function registerUser(req, summonerName, summonerId, region, userName, password, callback) {
	utils.async.waterfall([
		function generateUIDForUser(callback) {
			/* We need this call explicitly incase a new user is trying to
			 create an account from a phone which already had this app */
			models.user.getOrCreateUIDFromRequest(req, true, callback)
		},
		function createNewUserInDb(uId, callback) {
			var data = {
				_id: uId,
				userName: userName,
				passWord: passwordHash.generate(password),
				summonerName: summonerName,
				summonerId: summonerId
			}
			userService.createNewUser(data, callback)
		}
	], callback)
}

function validateSummonerName(summonerName, region, callback) {
	var summonerNameExistsError = {
		error: "This summoner name has already been taken. Does it belong to you?"
	}
	utils.async.waterfall([
		function checkDBForSummonerName(callback) {
			checkDBForSummonerProfile(summonerName, null, function (err, user) {
				if (err) {
					return callback(err, user)
				} else if(utils._.isValidNonBlank(user)) {
					return callback(summonerNameExistsError, callback)
				} else {
					return callback(err, user)
				}
			})
		},
		function getSummonerInfoFromLoLServer(user, callback) {
			var url = "/by-name/" + summonerName
			getSummonerInfo(region, url, callback)
		},
		function checkDBForSummonerId(summonerInfoResponse, callback) {
			checkDBForSummonerProfile(summonerName, summonerInfoResponse[Object.keys(summonerInfoResponse)[0]].id, function (err, user) {
				if (err) {
					return callback(err, user)
				} else if(utils._.isValidNonBlank(user)) {
					return callback(summonerNameExistsError, callback)
				} else {
					return callback(err, summonerInfoResponse)
				}
			})
		}
	], callback)
}

function checkDBForSummonerProfile(summonerName, summonerId, callback) {
	models.user.getUserBySummonerProfile(summonerName, summonerId, callback)
}

function getSummonerInfo(region, url, callback) {
	var baseUrlPlaceHolder = "https://#REGION_ABBR#.api.pvp.net/api/lol/#REGION_ABBR#/v1.4/summoner"
	request({
		baseUrl: baseUrlPlaceHolder
			.replace("#REGION_ABBR#", region.toLowerCase())
			.replace("#REGION_ABBR#", region.toLowerCase()),
		url: url,
		method: "GET",
		qs: {
			api_key: utils.config.riotGamesAPIKey
		}
	},
		function(error, response, results) {
			if(error) {
				utils.l.s("Error for url "  + " and error is::----" + error)
				return callback(error, null)
			}
			else if(response.statusCode == 200){
				return callback(null, JSON.parse(results))
			}

			switch(response.statusCode) {
				case 200:
					utils.l.d("got results:", results)
					return callback(null, JSON.parse(results))
					break
				case 400:
					utils.l.s("Bad request", response)
					return callback({error: "Something went wrong. Please try again later."}, null)
					break
				case 401:
					utils.l.s("Unauthorized", response)
					return callback({error: "Something went wrong. Please try again later."}, null)
					break
				case 404:
					utils.l.d("Summoner not found", response)
					return callback({error: "User with this summoner name does not exist."}, null)
					break
				case 429:
					utils.l.d("Rate limit exceeded", response)
					return callback({error: "Something went wrong. Please try again later."}, null)
					break
				case 500:
					utils.l.i("Internal server error", response)
					return callback({error: "Looks like we are having trouble reaching LoL Servers. Please try again later."}, null)
					break
				case 503:
					utils.l.i("Service unavailable", response)
					return callback({error: "Looks like we are having trouble reaching LoL Servers. Please try again later."}, null)
					break
			}
		})
}

module.exports = {
	//requestResetPassword: requestResetPassword,
	addLegalAttributes: addLegalAttributes,
	createNewUser: createNewUser,
	createInvitees: createInvitees,
	sendVerificationMessage: sendVerificationMessage,

	// --------------------------------------------------------------------------------------------
	// New code

	registerUser: registerUser,
	validateSummonerName: validateSummonerName
}