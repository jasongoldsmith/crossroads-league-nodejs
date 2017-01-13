var utils = require("../../../../utils")
var models = require("../../../../models")
var tUtils = require('../../../utils')
var helpers = require('../../../../helpers')
var mongoose = require('mongoose')
var loginDataProvider = require('../../../data/utils/loginUtils')
var baseUrl = utils.config.testHostUrl
var loginUrl = "/api/v1/auth/validateUserLogin"

describe("Successful login test cases: ", function() {
	var bungieResponseValid = require('../../../data/bungieResponseData.json')
	var user = null

	this.timeout(30000)
	describe("test login: ", function() {
		var loginData = {}
		loginData.consoleType = "PS4"

		it("signup a new user: ", function(done) {
			loginDataProvider.loginUser("sreeharshadasa","PS4",null,function(err,userObj){
				user = userObj
				validateSuccessfulSignupObject(user)
				done();
			})
		})

		it("login existing user: ", function(done) {
			loginDataProvider.loginUser("sreeharshadasa","PS4",null,function(err,userObj){
				utils.assert.equal(userObj._id.toString(), user._id.toString(), "existing user login failed")
				validateSuccessfulSignupObject(user)
				done();
			})
		})
	})

	after(function() {
		utils.l.d("Removing user",user)
		models.user.model.remove({_id:user._id},function(err,data){})
		models.userGroup.model.remove({"user" : user._id},function(err,data){})
		models.eventInvitation.model.remove({"inviter" : user._id},function(err,data){})
		models.eventInvitation.model.remove({"invitee" : user._id},function(err,data){})
		models.event.model.remove({"players" : user._id},function(err,data){})
	})
})

describe("Unsuccessful test cases: ", function() {
	describe("test invalid login: ", function() {
		var loginData = {}
		loginData.consoleType = "PS4"

		it("failed login without bungieResponse: ", function(done) {
			tUtils.tPost(baseUrl, {path:loginUrl , data: loginData},
				{status: 400},
				function(err,res){
					utils.l.d('validateErrorSignupObject::',err)
					utils.l.d('validateErrorSignupObject::',JSON.parse(res.text))
					validateErrorSignupObject(err,JSON.parse(res.text))
					done();
				})
		})

	})
})

function validateErrorSignupObject(err, errorData) {
	utils.assert.isDefined(errorData, "error was expected but was not found")
	utils.assert.isDefined(errorData.error,"error message was expected but was not found")
}

function validateSuccessfulSignupObject(data) {
	utils.assert.isDefined(data.clanId, "clanId property not defined in user response object")
	utils.assert.isDefined(data.imageUrl, "imageUrl property not defined in user response object")
	utils.assert.isDefined(data.date, "date property not defined in user response object")
	utils.assert.isDefined(data.uDate, "uDate property not defined in user response object")
	utils.assert.isDefined(data.clanId, "clanId property not defined in user response object")
	utils.assert.isDefined(data.bungieMemberShipId, "bungieMemberShipId property not defined in user response object")
}