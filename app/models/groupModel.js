var utils = require('../utils')
var mongoose = require('mongoose')
var helpers = require('../helpers')

// User Schema
var GroupSchema = require('./schema/groupSchema')

// Model initialization
var Group = mongoose.model('Group', GroupSchema.schema)

// Public functions
function updateGroupStats(groupId,consoleType,memberCount, callback) {
  Group.update({_id:groupId,"appStats.consoleType":consoleType},{"$set":{"appStats.$.memberCount":memberCount}},{multi:true},callback)
}

function addServiceEndpoints(groupId,serviceEndPoint,callback){
  var query={}
  query._id=groupId
  Group.update(query,
    {"$push":{"serviceEndpoints": serviceEndPoint}},
    {safe: true, upsert: true, new : true},
    callback)
}

function addGroups(groupObjects,consoleTypes, callback){
  var groupIds = utils._.map(groupObjects,"groupId")
  utils.l.d("addGroups::consoleTypes",utils._.values(utils.constants.newGenConsoleType))

  var appStats = utils._.map(utils._.values(utils.constants.newGenConsoleType),function(console){
    return {
      consoleType:console,
      memberCount:1
    }
  })
  utils.l.d("addGroups::appStats",appStats)
  utils.async.waterfall([
    function(callback){
      Group
        .distinct("_id",{_id:{"$in":groupIds}})
        .exec(callback)
    },function(groupIds,callback){
      var newGroupIdArray = utils._.difference(utils._.map(groupObjects,"groupId"),groupIds)
      var newGroups = utils._.map(newGroupIdArray,function(newGroupId){
        var groupObj = utils._.find(groupObjects,{groupId:newGroupId})
        return{
          _id:newGroupId,
          groupName:groupObj.groupName,
          avatarPath:groupObj.avatarPath,
          bungieMemberCount:groupObj.bungieMemberCount,
          clanEnabled:groupObj.clanEnabled,
          date:new Date(),
          uDate:new Date(),
          appStats:appStats,
          serviceEndpoints:[]
        }
      })

      if(utils._.isValidNonBlank(newGroups))
        Group.collection.insert(newGroups,callback)
      else
        return callback(null,null)
    }
  ],callback)
}

function findGroupById(groupId,callback){
  Group.findOne({_id:groupId},callback)
}

function findGroupsPaginated(query, pageNumber, limit, callback){
  Group.find(query).skip(pageNumber > 0 ? ((pageNumber) * limit) : 0).limit(limit).exec(callback)
}

module.exports = {
  model: Group,
  updateGroupStats:updateGroupStats,
  addGroups:addGroups,
  findGroupsPaginated:findGroupsPaginated,
  addServiceEndpoints:addServiceEndpoints,
  findGroupById:findGroupById
}
