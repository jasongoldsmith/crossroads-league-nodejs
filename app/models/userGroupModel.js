var utils = require('../utils')
var mongoose = require('mongoose')
var helpers = require('../helpers')

// User Schema
var UserGroupSchema = require('./schema/userGroupSchema')

// Model initialization
var UserGroup = mongoose.model('UsersGroup', UserGroupSchema.schema)

// Public functions
function updateUserGroup(userId,groupId, data, callback) {
  var query={}
  if(utils._.isValidNonBlank(userId))
    query.user=userId
  if(utils._.isValidNonBlank(groupId))
    query.group=groupId
  UserGroup.update(query,{"$set":data},{multi:true},callback)
}

function getByGroup(groupId,callback){

}

function addServiceEndpoints(userId,groupId,serviceEndPoint,callback){
  var query={}
    query.user=userId
    query.group=groupId
  UserGroup.update(query,
    {"$push":{"serviceEndpoints": serviceEndPoint}},
    {safe: true, upsert: true, new : true},
    callback)
}

//Remove existing usergroups and add new usergroups with mute notification flag.
function refreshUserGroup(user,groups,userGroupLst,callback){
  utils.async.waterfall([
    function(callback){
      var groupIds = utils._.map(groups,"groupId")
      var userGroupIds = utils._.map(userGroupLst,"group")
      var groupsToAdd = utils._.difference(groupIds,userGroupIds)
      //Add free lance group
      if(utils._.findIndex(userGroupLst,{group:utils.constants.freelanceBungieGroup.groupId}) < 0)
        groupsToAdd.push(utils.constants.freelanceBungieGroup.groupId)

      var groupsToRemove = utils._.difference(userGroupIds,groupIds)
      utils._.remove(groupsToRemove,function(groupId){
        return groupId == utils.constants.freelanceBungieGroup.groupId
      })

      if(utils._.isValidNonBlank(groupsToRemove))
        UserGroup.collection.remove({user:user._id,group:{"$in":groupsToRemove}},function(err,data){})
      callback(null,groupsToAdd)
    },function(groupsToAdd, callback){
      var userGroups = []
      utils._.map(groupsToAdd,function(groupId){
        var userGroup = utils._.isValidNonBlank(userGroupLst) ?utils._.find(userGroupLst,{group:groupId}):null
        userGroups.push({
          user:user._id,
          refreshGroups:false,
          group:groupId,
          consoles:utils._.map(user.consoles,"consoleType"),
          muteNotification:utils._.isValidNonBlank(userGroup)?userGroup.muteNotification:false,
          date:new Date(),
          uDate:new Date(),
          serviceEndpoints:[]
        })
      })

      userGroup = utils._.isValidNonBlank(userGroupLst) ?utils._.find(userGroupLst,{group:utils.constants.freelanceBungieGroup.groupId}):null
      //Add free lance group
/*
      userGroups.push({
        user:user._id,
        refreshGroups:false,
        group:utils.constants.freelanceBungieGroup.groupId,
        consoles:utils._.map(user.consoles,"consoleType"),
        muteNotification:utils._.isValidNonBlank(userGroup)?userGroup.muteNotification:false,
        date:new Date(),
        uDate:new Date()
      })
*/
      if(utils._.isValidNonBlank(userGroups))
        UserGroup.collection.insert(userGroups,callback)
      else
        return callback(null,null)
    },function(docs, callback){
      getByUser(user._id,null,callback)
    }
  ],callback)
}

function getByUser(userId, groupId,callback) {
  var query={}
  if(utils._.isValidNonBlank(userId))
    query.user=userId
  if(utils._.isValidNonBlank(groupId))
    query.group=groupId
  utils.l.d("userGroups::getByUser::",query)
  UserGroup
    .find(query).populate("group")
    .exec(callback)
}

function getByUserLean(userId, callback) {
  UserGroup
    .find({user:userId})
    .exec(callback)
}

function getUsersByGroup(groupId,muteNotification, consoleType,callback){
  var query = {
    group: groupId,
    consoles: consoleType
  }
  if(utils._.isValidNonBlank(muteNotification))
    query.muteNotification = muteNotification

      //TODO: Remove populate when noitifcation service is refactored to use only users
  UserGroup
    .find(query)
    .select("user")
    .populate("user")
    .exec(function(err,data){
      if(!err) return callback(null,utils._.map(data,"user"))
      else return callback(err,null)
    })
}

function getGroupCountByConsole(groupId,consoleType,callback){
  UserGroup.count({group:groupId,consoles:consoleType}).exec(callback)
}

function getUserCountByGroup(groupId,callback){
  UserGroup.count({group:groupId}).exec(callback)
}

function findUsersPaginated(query, pageNumber, limit, callback){
  UserGroup
    .find(query)
    .populate("user","-passWord")
    .populate("group")
    .skip(pageNumber > 0 ? ((pageNumber) * limit) : 0)
    .limit(limit)
    .exec(callback)
}

function findUsersByGroup(groupId,callback){
  var cursor =  UserGroup
    .find({group:groupId})
    .populate("user","-password")
    .populate("group")
    .stream()
  return callback(null,cursor)
}

module.exports = {
  model: UserGroup,
  updateUserGroup:updateUserGroup,
  getUsersByGroup:getUsersByGroup,
  getByUser:getByUser,
  refreshUserGroup:refreshUserGroup,
  getGroupCountByConsole:getGroupCountByConsole,
  addServiceEndpoints:addServiceEndpoints,
  getByUserLean:getByUserLean,
  getUserCountByGroup:getUserCountByGroup,
  findUsersPaginated:findUsersPaginated,
  findUsersByGroup:findUsersByGroup
}
