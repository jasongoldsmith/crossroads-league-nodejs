var express = require('express');
var path = require('path');
var morgan = require('morgan');
var db = require('./db');

var session = require('express-session'),
  cookieParser = require('cookie-parser'),
  bodyParser = require('body-parser');

var mongoStore = require('connect-mongo')(session);

var compression = require('compression');

var flash = require('connect-flash');
var methodOverride = require('method-override');

var utils = require('../utils');
var helpers = require('../helpers')
var middlewares = require('./middlewares');

var routeUtils = require('../routes/routeUtils');
var models = require('../models')
var service = require('../service')
module.exports = function (app, passport) {
  app.use(compression({
    threshold: 512
  }));

  utils.config.show();

  app.use(middlewares.handleReqCleanup());

  app.use(middlewares.forceSSL());

  app.set('views', path.join(utils.config.root, 'views'));

  app.set('view engine', 'ejs');

  app.use(express.static(__dirname + '/../'+'views'));

  morgan.token('zuid', function getZuid (req) {
    var headerLog = 'zuid='
    if(req.user)
      headerLog = headerLog + req.user.id
    else
      headerLog = headerLog + req.session.zuid

    headerLog = headerLog + ' ' + getFromHeader(req,'x-osversion','os')
    headerLog = headerLog + ' ' + getFromHeader(req,'x-devicetype','dt')
    headerLog = headerLog + ' ' + getFromHeader(req,'x-devicemodel','dm')
    headerLog = headerLog + ' ' + getFromHeader(req,'x-appversion','av')
    headerLog = headerLog + ' ' + getFromHeader(req,'x-fbooksdk','fb')
    headerLog = headerLog + ' ' + getFromHeader(req,'x-fbasesdk','fr')
    headerLog = headerLog + ' ' + getFromHeader(req,'x-mpsdk','mp')
    headerLog = headerLog + ' ' + getFromHeader(req,'x-branchsdk','br')
    headerLog = headerLog + ' ' + getFromHeader(req,'x-fabricsdk','fa')
    headerLog = headerLog + ' ' + getFromHeader(req,'x-manufacturer','ma')

    return headerLog
  })

  function getFromHeader(req, headerKey, dataKey) {
    var value
    if (utils._.isValid(req.headers[headerKey])) {
      value = req.headers[headerKey]
    } else {
      value = ""
    }

    return dataKey +"="+ value
  }

  app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :zuid'));
  //app.use(morgan('combined'));

  app.use(cookieParser());

  // bodyParser should be above methodOverride
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(methodOverride(function (req, res) {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
      // look in urlencoded POST bodies and delete it
      var method = req.body._method;
      delete req.body._method;
      return method;
    }
  }));

  require('./validator')(app);

  // express/mongo session storage
  app.use(session({
    resave: false,
    saveUninitialized: true,
    secret: 'met8yeIsh1Ed4kUv5sUt2veV2Ec2Oib6cUd0Kop5Cu8Ve5ghij',
    cookie: {
      maxAge: 126144000000
    },
    store: new mongoStore({
      mongooseConnection: db.connection,
      collection: 'sessions'
    })
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  // connect flash for flash messages - should be declared after sessions
  app.use(flash());

  app.use(middlewares.identifyUser());

  app.use(middlewares.visitTracker());

  app.use('/api/v1/a', function(req, res, next) {
    //utils.l.i("req in /api/v1/a", {path: req.path, headers: req.headers, body: req.body, files:req.files});
    utils.l.d('expressStartup::')
    if (!req.isAuthenticated()) {
      return routeUtils.handleAPIUnauthorized(req, res)
    }else{
      var userLastActiveUpdateInterval = utils.config.userLastActiveUpdateInterval
      var timeDiff = utils.moment().utc().diff(req.user.lastActiveTime, 'minutes')
      //Set mixpanel distinct ID for users from old version
      var mpDistincId = helpers.req.getHeader(req,'x-mixpanelid')

      var mpRefreshed = utils._.isValidNonBlank(req.user.mpDistinctIdRefreshed)? req.user.mpDistinctIdRefreshed: false
      utils.l.d('1111:::::mpRefreshNeeded::::::::'+mpRefreshed)
      mpRefreshed = utils._.isValidNonBlank(req.user.mpDistinctId) && mpRefreshed
      utils.l.d('2222:::::mpRefreshNeeded::::::::'+mpRefreshed)
      var updateMpDistinctId = (utils._.isInvalidOrBlank(req.user.mpDistinctId) || !mpRefreshed ) && utils._.isValidNonBlank(mpDistincId) ? true:false

      utils.l.d("expressStartup::timeDiff::"+timeDiff+"::lastActiveTime::"+req.user.lastActiveTime+"::userLastActiveUpdateInterval::"+userLastActiveUpdateInterval)
      utils.l.d("expressStartup::updateMpDistinctId::"+updateMpDistinctId+"::req.user.mpDistinctId::"+req.user.mpDistinctId+"::"+mpDistincId)

      if(timeDiff > userLastActiveUpdateInterval || utils._.isInvalidOrBlank(req.user.lastActiveTime) || updateMpDistinctId){
        var updateData = timeDiff > userLastActiveUpdateInterval || utils._.isInvalidOrBlank(req.user.lastActiveTime) ? {lastActiveTime: new Date(),notifStatus: []}:{}
        if(updateMpDistinctId) {
          updateData.mpDistinctId = mpDistincId
          updateData.mpDistinctIdRefreshed=true
        }
        utils.l.d('updateData::',updateData)
        models.user.findByUserIdAndUpdate(req.user.id,updateData, function (err, user) {
          if (err)
            utils.l.d("error in the authenticated API request", err)
          if(updateMpDistinctId) {
            var data = {trackingData: {}}
            data.trackingData.userId = req.user.id
            data.trackingData.distinct_id = req.user.id
            // expecting trackingData.ads to be in the format "/<source>/<campaign>/<ad>/<creative>?sasda"
            // We have to maintain this order as it is sent by fb and branch as a deep link
            utils._.extend(data.trackingData, utils.constants.existingUserInstallData)

            service.trackingService.trackExistingUser(req, data, function (err, result) {
            })
          }
          next();
        });
      }else next();
    }
    //if (!req.user.isNormal()) {
    //  return res.redirect('/');
    //}

  });
};
