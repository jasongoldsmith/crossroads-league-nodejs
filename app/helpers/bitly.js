var utils = require('../utils');
var config = require('config');
var Bitly = require('bitly');

var bitly = new Bitly(config.bitlyAccessToken);


function shortenUrl(url, callback) {
  bitly.shorten(url, function (err, response) {
    if (err)
      callback(err, response);
    var short_url = response.data.url;
    callback(null, short_url)
  });

}

module.exports = {
  shortenUrl:shortenUrl
};
