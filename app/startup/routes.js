var routeUtils = require('../routes/routeUtils')
var utils = require('../utils')
var admin = require('../controllers/admin')

module.exports = function (app, passport) {
/*
  app.get('/', function(req, res) {
    res.render('home/index')
  })
*/

  app.use('/',require('../routes/v1/auth'))
  app.get('/bo', function(req, res) {
    res.render('index')
  })

  app.get('/terms', function(req, res) {
    res.writeHead(302, {'Location': 'http://w3.crossroadsapp.co/terms'});
    res.end()
  })

  app.get('/privacy', function(req, res) {
    res.writeHead(302, {'Location': 'http://w3.crossroadsapp.co/privacy'});
    res.end()
  })

  app.get('/license', function(req, res) {
    if(req.adata.os_generic == 'iOS' || req.adata.os_generic == 'Mac OS'){
      res.writeHead(302, {'Location': 'http://w3.crossroadsapp.co/license_ios'});
      res.end()
      //res.render('home/license_ios')
    }
    else {
      res.writeHead(302, {'Location': 'http://w3.crossroadsapp.co/license_android'});
      res.end()
      //res.render('home/license_android')
    }
  })

  app.get('/legal', function(req, res) {
    res.render('home/legal')
  })

  app.use('/api/v1/auth', require('../routes/v1/auth'))
  app.use('/api/v1/activity', require('../routes/v1/activity'))
  app.use('/api/v1/reviewPromptCard', require('../routes/v1/reviewPromptCard'))
  app.use('/api/v1/notification', require('../routes/v1/notification'))
  app.use('/api/v1/notificationTrigger', require('../routes/v1/notificationTrigger'))
  app.use('/api/v1/a/event', require('../routes/v1/a/event'))
  app.use('/api/v1/a/feed', require('../routes/v1/a/feed'))
  app.use('/api/v1/feed', require('../routes/v1/a/feed'))
  app.use('/api/v1/a/user', require('../routes/v1/a/users'))
  app.use('/api/v1/a/installation', require('../routes/v1/a/installation'))
  app.use('/api/v1/appVersion', require('../routes/v1/appVersion'))
  app.use('/api/v1/a/messages', require('../routes/v1/a/messages'))
  app.use('/api/v2/report', require('../routes/v1/a/report'))
  app.use('/api/v1/a/report', require('../routes/v1/a/report'))
  app.use('/api/v1/a/account', require('../routes/v1/a/account'))
  app.use('/api/v2/mixpanel', require('../routes/v1/a/mixPanelDataTracking'))
  app.use('/api/v1/a/mixpanel', require('../routes/v1/a/mixPanelDataTracking'))
  app.use('/api/v1/config', require('../routes/v1/config'))
  app.use('/api/v1/gatewayResponse', require('../routes/v1/gatewayResponse'))

  /// catch 404 and forward to error handler
  app.use(function(req, res, next) {
    routeUtils.handleAPINotFound(req, res)
  })

  // production error handler
  // no stacktraces leaked to user
  app.use(function(err, req, res, next) {
    utils.l.sentryError(err)
    utils.l.d("unhandled error: ", err)
    res.status(err.status || 500)
    routeUtils.handleAPIError(req, res, err)
  })

}