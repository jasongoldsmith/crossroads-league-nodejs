var config = require('config');
var newrelic;
if (config.enableNewRelic) {
  newrelic = require('newrelic');
}

console.log("mongo url***"+config.mongoUri);

var express = require('express'),
  passport = require('passport');

var app = express();

if (newrelic) {
  app.locals.newrelic = newrelic;
}

app.locals.utils = require('./utils');
app.locals.moment = app.locals.utils.m.moment;

require('./startup/db');

require('./startup/passport')(passport, config);

require('./startup/expressStartup')(app, passport);

require('./startup/routes')(app, passport);

module.exports = app;
