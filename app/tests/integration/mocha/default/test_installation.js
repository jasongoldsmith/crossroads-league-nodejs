var utils = require("../../../../utils")
var models = require("../../../../models")
var helpers = require('../../../../helpers')
var service = require('../../../../service')
var mongoose = require('mongoose')
var loginDataProvider = require('../../../data/utils/loginUtils')
var usersData = require('../../../data/users.json')

describe("Successful installation object create test cases: ", function() {
	this.timeout(30000)
	describe("test installation: ", function() {
		var loginData = {}
		loginData.consoleType = "PS4"

		it("Create a new installation object: ", function(done) {
			utils.l.d("BEGINING:Create a new installation object::")
			var user = null
			utils.async.waterfall([
				function(callback){
					models.user.createUserFromData(usersData.sreeharshadasa,callback)
				},function(userDB,callback){
					user = userDB
					service.installationService.updateInstallation("apn","c56d4bd5434f73b4d9decd313f7a0daafffd809b8318eafcabcca7f62156f37c",user,callback)
				},function(installation, callback){
					validateInstallation(installation)
					cleanupData(user,installation,callback)
				}
			],function(err,installation){
				done();
			})
		})

		it("Update an existing installation object: ", function(done) {
			utils.l.d("BEGINING:Update an existing installation object::")
			var user = null
			utils.async.waterfall([
				function(callback){
					models.user.createUserFromData(usersData.tinacplays,callback)
				},function(userDB,callback){
					validateUserObject(userDB)
					user = userDB
					service.installationService.updateInstallation("apn","c56d4bd5434f73b4d9decd313f7a0daafffd809b8318eafcabcca7f62156f37c",user,callback)
				},function(installation, callback){
					validateInstallation(installation)
					service.installationService.updateInstallation("apn","c56d4bd5434f73b4d9decd313f7a0daafffd809b8318eafcabcca7f62156ffff",user,callback)
				},function(installation, callback){
					validateInstallation(installation)
					cleanupData(user,installation,callback)
				}
			],function(err,installation){
				utils.l.d("END:Update an existing installation object::")
				done();
			})
		})
	})

	after(function() {
	})
})

/*describe("Unsuccessful test cases: ", function() {
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
})*/

function validateErrorSignupObject(err, errorData) {
	utils.assert.isDefined(errorData, "error was expected but was not found")
	utils.assert.isDefined(errorData.error,"error message was expected but was not found")
}

function validateUserObject(data) {
	utils.assert.isDefined(data.clanId, "clanId property not defined in user response object")
	utils.assert.isDefined(data.imageUrl, "imageUrl property not defined in user response object")
	utils.assert.isDefined(data.date, "date property not defined in user response object")
	utils.assert.isDefined(data.uDate, "uDate property not defined in user response object")
	utils.assert.isDefined(data.clanId, "clanId property not defined in user response object")
	utils.assert.isDefined(data.bungieMemberShipId, "bungieMemberShipId property not defined in user response object")
}

function validateInstallation(installation){
	utils.assert.isDefined(installation.deviceSubscription, "deviceSubscription is not defined in installation")
	utils.assert.isDefined(installation.deviceSubscription.deviceEndpointArn, "device end point is not defined in installation")
	utils.assert.isDefined(installation.deviceSubscription, "device not subscribed to all users topic")
}

function cleanupData(user,installation,callback){
	utils.async.waterfall([
		function(callback){
			helpers.sns.unRegisterDeviceToken(user,installation,callback)
		},function(installation,callback){
			models.user.model.remove({_id:user._id},function(err,data){})
			models.installation.model.remove({user:user._id},function(err,data){})
			models.userGroup.model.remove({"user" : user._id},function(err,data){})
			utils.l.d("END:Update an existing installation object::")
			callback(null,null)
		}
	],callback)
}