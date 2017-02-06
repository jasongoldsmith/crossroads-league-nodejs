var utils = require('../utils')
var mongoose = require('mongoose')
var helpers = require('../helpers')
var passwordHash = require('password-hash')

// User Schema
var UserSchema = require('./schema/userSchema')

// Model initialization
var User = mongoose.model('User', UserSchema.schema)

// Public functions
function setFields(user_id, data, callback) {
  getById(user_id, function(err, user) {
    if (err)
      return callback(err)

    utils._.extend(user, data)
    save(user, callback)
  })
}

function getByQuery(query, callback) {
  User
    .find(query)
    .select("-passWord")
    .exec(function (err, users) {
      if(err) {
        utils.l.s("getByQuery on users failed", err)
        return callback({error: "Somethign went wrong. Please try again later"}, null)
      } else {
        return callback(err, users)
      }
    })
}

function getByQueryLite(query, excludeFields, callback) {
  User
    .find(query)
    .select(excludeFields)
    .exec(callback)
}

function getUserIdsByQuery(query, callback) {
  User
    .find(query)
    .select({_id:1,isLoggedIn:1})
    .exec(callback)
}


function getById(id, callback) {
  if (!id) return callback("Invalid id:" + id)
  getByQuery({'_id':id}, utils.firstInArrayCallback(callback))
}

function getByIds(ids, callback) {
  if (utils._.isEmpty(ids)) return callback("Invalid ids:" + ids)
  getByQuery({ '_id': { '$in': ids }}, callback)
}


function save(user, callback) {
  utils.async.waterfall([
    function(callback) {
      // We need this as groups is mixed type
      user.markModified('groups')
      user.save(function(err, c, numAffected) {
        if (err) {
          utils.l.s("Got error on saving user", {err: err, user: user})
          return callback(err, c)
        } else if (!c) {
          utils.l.s("Got null on saving user", {user: user})
          return callback(err, c)
        }
        return callback(null, c)
      })
    }
  ],
  function(err, user) {
    if(err) {
      if(utils.format.isDuplicateMongoKeyError(err)) {
        return callback({error: "An account with that email address already exists. Try logging in."}, user)
      } else {
        return callback(err, user)
      }
    } else {
      return callback(err, user)
    }
  })
}

function deleteUser(data, callback) {
  utils.async.waterfall([
      function(callback) {
        User.findOne({_id: data.id}, callback)
      },
      function(user, callback) {
        if(!user) {
          return callback({error: "User with this id does not exist"}, null)
        }
        utils.l.d("Deleting the user")
        user.remove(callback)
      }
    ],
    function(err, user) {
      if (err) {
        return callback(err, null)
      } else {
        getById(user._id, callback)
      }
    }
  )
}

function getUserByData(data, callback) {
  utils.l.d('getUserByData::data',data)
  User.findOne(data)
    .exec(function(err, user) {
      if(err) {
        utils.l.s("Error in getUserByData", err)
        return callback({error: "Something went wrong. Please try again later"}, null)
      } else {
        return callback(err, user)
      }
    })
}

function getUserByConsole(consoleId, consoleType, bungieMemberShipId, callback) {
  var query= null

  if(utils._.isInvalidOrBlank(bungieMemberShipId)){
    query = {
      consoles: {
        $elemMatch: {
          consoleType: consoleType,
          consoleId:{$regex : new RegExp(["^", consoleId, "$"].join("")), $options:"i"}
        }}
    }
  }else{
    query = {"$or":[
      {bungieMemberShipId:bungieMemberShipId},
      {consoles: {
          $elemMatch: {
            consoleType: consoleType,
            consoleId: {$regex: new RegExp(["^", consoleId, "$"].join("")), $options: "i"}
          }
        }}
    ]}
  }

  utils.l.d("getUserByConsole::",query)
  User.find(query).exec(utils.firstInArrayCallback(callback))
}

function getAll(callback) {
  getByQuery({}, callback)
}

function listUsers(username, consoleId, callback) {
  getByQuery(constructFindUserQuery(username, consoleId), callback)
}


function updateUser(data, allowClanUpdate, callback) {
  utils.async.waterfall([
      function (callback) {
        getById(data.id, callback)
      },
      function(user, callback) {
        if (!user) {
          utils.l.d("no user found")
          return callback({ error: "user with this id does not exist" }, null)
        } else {
          if(!allowClanUpdate && (data.clanId && data.clanId != user.clanId)) {
            return callback({ error: "ClanId Update is not allowed." }, null)
          }else {
            utils.l.d("found user: " + utils.l.userLog(user))
            if (data.passWord) {
              data.passWord = passwordHash.generate(data.passWord)
            }
            if(data.userName) {
              data.userName = data.userName.toLowerCase().trim()
            }
            utils._.extend(user, data)
            user.save(callback)
          }
        }
      }
    ],
    callback)
}

/*
function listMemberCount(ids,consoleType,callback){
  utils.async.map(ids,
     function(id,callback){
       getUserCount(id,consoleType,callback)
     },
    function(err,counts){
      return callback(null,counts)
    }
  )
}

function getUserCount(id,consoleType,callback){
  utils.async.waterfall([
      function(callback){
        User
          .count({"groups.groupId":id,"consoles.consoleType":consoleType,"consoles.verifyStatus":"VERIFIED"})
          .exec(function(err,count){
            if(!err) return callback(null,{_id:id,count:count})
          })
      }
    ],callback
  )
}
*/

function getUserMetrics(callback) {
  User.aggregate([{
    "$group": {"_id": {"consoleType": "$consoles.consoleType", "verifyStatus":"$consoles.verifyStatus"},
    "count": {"$sum": 1}}}], callback)
}

function findByUserIdAndUpdate(id,data,callback){
  User.findByIdAndUpdate(id,{ "$set": data},callback)
}

function findUsersByIdAndUpdate(idList,data,callback){
  utils.l.d('updatingUsers',idList)
  utils.l.d('dataToupdate',data)
  User.update({_id:{"$in":idList}},{ "$set": data},{ multi: true },callback)
}

function filterIfUserExistsForUid(uid, callback) {
  if (utils._.isInvalid(uid)) {
    return callback(null, null)
  }
  utils.async.waterfall(
    [
      function(callback) {
        getById(uid, callback)
      }
    ],
    function (err, user) {
      if (err) {
        return callback(null, null)
      }
      if (utils._.isValid(user)) {
        return callback(null, null)
      }
      return callback(null, uid)
    }
  )
}

function getOrCreateUIDFromRequest(req, enforceNonExisting, callback) {
  if (req.isAuthenticated() && !enforceNonExisting) {
    utils.l.d("getOrCreateUIDFromRequest::is authenticated")
    //req.session.zuid=req.user._id
    return callback(null, req.user.id) // If user exists and it authenticated return right away
  }
  utils.async.waterfall(
    [
      function(callback) {
        var uid = req.session.zuid
        utils.l.d("getOrCreateUIDFromRequest::is session", uid)
        callback(null, uid)
      },
      function (uid, callback) {
        if (enforceNonExisting) {
          filterIfUserExistsForUid(uid, callback)
        } else {
          return callback(null, uid)
        }
      }
    ],
    function(err, uid) {
      if (err) {
        return callback(err)
      }
      if (utils._.isValid(uid)) {
        return callback(null, uid)
      }
      uid = utils.mongo.ObjectID()
      req.session.zuid = uid
      return callback(null, uid)
    }
  )
}

function constructFindUserQuery(username, consoleId) {
  var query = {}

  if(username) {
    query.userName = username
  }

  if(consoleId) {
    query['consoles.consoleId'] = consoleId
  }

  return query
}

function findUsersPaginated(query, pageNumber, limit, callback) {
  User.find(query).skip(pageNumber > 0 ? ((pageNumber) * limit) : 0).limit(limit).exec(callback)
}

function findUserCount(query,callback){
  User.count(query).exec(callback)
}

function updateUserConsoles(user,callback){
  utils.async.waterfall([
    function(callback){
      getById(user._id,callback)
    },function(userDB,callback){
        utils._.extend(userDB,{consoles:user.consoles})
        userDB.imageUrl = user.imageUrl
        userDB.save(function(err, c, numAffected) {
          if (err) {
            utils.l.s("Got error on updateUserConsoles", {err: err, user: user})
          } else if (!c) {
            utils.l.s("Got null on updateUserConsolesr", {user: user})
          }
          return callback(err, c)
        })
      }
  ],
  callback)
}

// -------------------------------------------------------------------------------------------------
// New Code

function getUserBySummonerProfile(consoleId, region, gamePlatformId, callback) {
  var query = null

  if(utils._.isInvalidOrBlank(gamePlatformId)) {
    query = {
      consoles: {
        $elemMatch: {
          consoleId: {$regex : new RegExp(["^", consoleId, "$"].join("")), $options:"i"},
          region: region
        }}
    }
  } else {
    query = {
      consoles: {
        gamePlatformId: gamePlatformId
      }
    }
  }
  User.find(query).exec(utils.firstInArrayCallback(function (err, users) {
    if(err) {
      utils.l.s("Something went wrong in getting summonerProfile from DB", err)
      return callback({error: "Something went wrong. Please try again later"}, null)
    } else {
      return callback (err, users)
    }
  }))
}

function createUserFromData(data, callback) {
  var user = new User(data)
  save(user, callback)
}

function getUserByIdWithPassword(userId, callback) {
  User.findOne({_id: userId}, function (err, user) {
    if(err) {
      utils.l.s("Error in getting user by id", err)
      return callback({error: "Something went wrong. Please try again later"}, null)
    } else if(!user) {
      utils.l.d("no user found")
      return callback({ error: "This user no longer exists"}, null)
    } else {
      utils.l.d("found user: " + utils.l.userLog(user))
      return callback(null, user)
    }
  })
}

module.exports = {
  model: User,
  getByIds: getByIds,
  listUsers:listUsers,
  setFields: setFields,
  save: save,
  deleteUser: deleteUser,
  getUserByData: getUserByData,
  createUserFromData: createUserFromData,
  getAll: getAll,
  getById: getById,
  updateUser: updateUser,
  getByQuery: getByQuery,
  getUserIdsByQuery: getUserIdsByQuery,
  //listMemberCount: listMemberCount,
  getUserMetrics: getUserMetrics,
  findByUserIdAndUpdate: findByUserIdAndUpdate,
  findUsersByIdAndUpdate: findUsersByIdAndUpdate,
  getOrCreateUIDFromRequest: getOrCreateUIDFromRequest,
  getByQueryLite: getByQueryLite,
  findUsersPaginated:findUsersPaginated,
  findUserCount:findUserCount,
  updateUserConsoles:updateUserConsoles,
  getUserByConsole:getUserByConsole,

  // -------------------------------------------------------------------------------------------------
  // New Code

  getUserBySummonerProfile: getUserBySummonerProfile,
  getUserByIdWithPassword: getUserByIdWithPassword

}
