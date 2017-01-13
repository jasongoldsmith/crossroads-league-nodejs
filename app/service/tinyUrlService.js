var models = require('../models')
var utils = require('../utils')

function createTinyUrl(longUrl, callback) {
	utils.async.waterfall([
    function(callback){
      models.tinyUrl.createTinyUrl(longUrl, callback)
    },function(tinyUrlHash,callback){
      callback(null,utils.config.tinyUrlHost+tinyUrlHash)
    }
  ],callback)

}

function getLongUrl(tinyUrl, callback) {
	models.tinyUrl.getLongUrl(tinyUrl, callback)
}

module.exports = {
  createTinyUrl: createTinyUrl,
  getLongUrl: getLongUrl
}