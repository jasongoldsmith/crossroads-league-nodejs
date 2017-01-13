var utils = require('../utils')
var mongoose = require('mongoose')

// tiny URL Schema
var SysConfigSchema = require('./schema/sysConfigSchema')

// Model initialization
var SysConfig = mongoose.model('SysConfig', SysConfigSchema.schema)

function createSysConfig(sysConfigData, callback) {
  utils.async.waterfall([
    function(callback) {
      SysConfig.findOne({key: sysConfigData.key}, callback)
    },
    function(sysConfigExists, callback) {
      if(sysConfigExists) {
        return callback({error: "Sys Config with that key already exists"}, null)
      }else{
        var sysConfigObj = new SysConfig(sysConfigData)
        sysConfigObj.save(callback)
      }
    }
  ], function (err, sysConfig) {
    if(err) {
      return callback(err, null)
    }
    if(!sysConfig) {
      return callback({error: "There was some error while saving sysConfig"}, null)
    } else {
      return callback(null, sysConfig)
    }
  })
}

function getSysConfig(key, callback) {
  SysConfig.findOne({key: key}, function (err, sysConfig) {
    if(err) {
      return callback(err, null)
    }
    if(!sysConfig) {
      return callback({error: "This key is invalid",errorType:"InvalidKey"}, null)
    } else {
      return callback(null, sysConfig)
    }
  })
}

function getSysConfigList(keys,callback){
  SysConfig.find({key:{"$in": keys}}, function (err, sysConfig) {
    if(err) {
      return callback(err, null)
    }
    if(!sysConfig) {
      return callback({error: "Unable to lookup. Invalid keys"}, null)
    } else {
      return callback(null, sysConfig)
    }
  })
}

function updateSysConfig(sysConfigData, callback) {
  utils.async.waterfall([
    function(callback) {
      SysConfig.findOne({key: sysConfigData.key}, callback)
    },
    function(sysConfigExists, callback) {
      if(sysConfigExists) {
        return callback({error: "Sys Config with that key already exists"}, null)
      }else{
        var sysConfigObj = new SysConfig(utils._.extend(sysConfigExists,sysConfigData))
        sysConfigObj.save(callback)
      }
    }
  ], function (err, sysConfig) {
    if(err) {
      return callback(err, null)
    }
    if(!sysConfig) {
      return callback({error: "There was some error while saving sysConfig"}, null)
    } else {
      return callback(null, sysConfig)
    }
  })
}

module.exports = {
  model: SysConfig,
  updateSysConfig: updateSysConfig,
  getSysConfig: getSysConfig,
  createSysConfig:createSysConfig,
  getSysConfigList:getSysConfigList
}