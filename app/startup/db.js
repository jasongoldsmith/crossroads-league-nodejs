var mongoose = require('mongoose');
var config = require('config');
var utils = require('../utils');

//if (utils.config.logLevel === 'debug') {
//  mongoose.set('debug', true);
//}

utils.l.d('Mongourl', config.mongoUri);

var dbConnect = function () {
  var options = { server: { socketOptions: { keepAlive: 1 } } };
  mongoose.connect(config.mongoUri, options)
};
dbConnect();
var db = mongoose.connection;

db.once('open', function callback() {
  utils.l.i('Connected to MongoDB');
});

// Error handler
db.on('error', function (err) {
  utils.l.s('DB error' + err)
});

// Reconnect when closed
db.on('disconnected', function () {
  dbConnect();
});

module.exports = mongoose;