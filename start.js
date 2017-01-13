#!/usr/bin/env node

process.on('uncaughtException', function(err) {
  console.log('Uncaught exception')
  console.log(err)
  console.log(err.stack)
})

var debug = require('debug')('LoL')
var app = require('./app/app')
var fs = require('fs')

app.set('port', process.env.PORT || 3000)

var server = app.listen(app.get('port'), function() {
  debug('Express server listening on port ' + server.address().port)
  fs.writeFile("app/tmp/starttime.txt", new Date().getTime())
})
