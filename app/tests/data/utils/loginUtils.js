var utils = require("../../../utils")
var models = require("../../../models")
var tUtils = require('../../utils')

var baseUrl = utils.config.testHostUrl
var loginUrl = "/api/v1/auth/validateUserLogin"

var bungieResponse = require('../bungieResponseData.json')

function loginUser(consoleId, consoleType,invitation, callback){
  var loginData = {}
  var bungieData = utils._.find(bungieResponse,{consoleId:consoleId,consoleType:consoleType})
//  utils.l.d("bungieData",bungieData)
  loginData.bungieResponse = bungieData.bungieResponse
  loginData.consoleType = consoleType
  loginData.invitation = invitation
  tUtils.tPost(baseUrl, {path:loginUrl , data: loginData},
    {status: 200},
    function(err,res){
      setTimeout(function(){
        if(!err ) {
          var user = JSON.parse(res.text).value
          return models.user.getById(user._id, callback)
        }else
          return callback(err,null)
      }, 3000);
    })
}

function logoutUser(user,callback){

}

module.exports = {
  loginUser: loginUser,
  logoutUser: logoutUser
};