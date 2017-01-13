var utils = require('../utils');
var config = require('config');
var bitly = require('./bitly');
var accountSid = process.env.twilioAccountSid;
var authToken = process.env.twilioAuthToken;

var Twilio = null;
if (utils._.isValidNonBlank(accountSid) && utils._.isValidNonBlank(authToken)) {
  Twilio = require('twilio')(accountSid, authToken);
}

var TWILIO_FROM_TEST  = "6692362020";
var TWILIO_FROM_PROD  = "6692362020";
var TWILIO_TO_INVALID    = "";

var twilioData = {
  development : false,
  whiteList : [    // temp arrangement to only send to these numbers if
    { 'user' : 'Asif', 'phone': '4084806991'},  // Asif Verizon
    { 'user' : 'AsifG', 'phone': '4083372743'},  // Asif Google Phone
    { 'user' : 'AsifV', 'phone': '4083184546'},  // Asif Verizon Phone
    { 'user' : 'Anand', 'phone': '4082053728'}, // Anand
    { 'user' : 'Swati', 'phone': '4088027841'}, // Swati' +
    { 'user' : 'Swati', 'phone': '4083151276'}, // Swati
    { 'user' : 'Devin', 'phone': '9174710947'}, // Devin
    { 'user' : 'Kevin', 'phone': '4085065269'}, // Kevin
    { 'user' : 'Kevin', 'phone': '9175964667'}, // Kevin
    { 'user' : 'Sandi', 'phone': '4084791656'}, // Sandi
    { 'user' : 'Sean', 'phone': '4159678706'}, // Sean
    { 'user' : 'Mat', 'phone': '6506651546'}, // Mat
    { 'user' : 'Mat', 'phone': '3109264501'}, // Mat
    { 'user' : 'Tina', 'phone': '6506651545'}, // Tina
    { 'user' : 'Tiffany', 'phone': '4252837963'}, // Tiffany
    { 'user' : 'Suman', 'phone': '4155836292'}, // Suman
    { 'user' : 'Tushar', 'phone': '4084977301'}, // Tushar
    { 'user' : 'Paresh', 'phone': '4086247426'}, // Paresh
    { 'user' : 'Paresh', 'phone': '6506565900'}, // Paresh
    { 'user' : 'Jason', 'phone': '4083687500'}, // Jason
    { 'user' : 'Luis', 'phone': '4047696212'}, // Luis
    { 'user' : 'Jahath', 'phone': '3058429391'},  // Android Team
    { 'user' : 'Hardik', 'phone': '6195784243'}, // Android Team
    { 'user' : 'Basant', 'phone': '6175990124'}, // Android/Backend Team
    { 'user' : 'Dimitare', 'phone': '6308431326'}, // Android Team
    { 'user' : 'Karan', 'phone': '4438464594'}, // Android Team
    { 'user' : 'Twilio1', 'phone': '5005550006'},
    { 'user' : 'Twilio2', 'phone': '5005550009'},
    { 'user' : 'Twilio3', 'phone': '4108675309'},
    { 'user' : 'Twilio.Verzion#', 'phone': '6692362020'},
    { 'user' : 'Srivatsan', 'phone': '5102955554'},

    { 'user' : 'Alice', 'phone': '4084838017'},
    { 'user' : 'Bob', 'phone': '4084827767'},
    { 'user' : 'Carol Doe', 'phone': '4084727038'},
    { 'user' : 'Emma', 'phone': '4084729406'},
    { 'user' : 'Don', 'phone': '4083165473'},
    { 'user' : 'Franz', 'phone': '4083166663'},
    { 'user' : 'Nick Chang', 'phone': '4084728298'},

    { 'user' : 'Gyanesh Pandey', 'phone': '6506650644'},  // these two added oct-21 on Karan's request
    { 'user' : 'Bradley Cooper', 'phone': '4083156791'},  // these two added oct-21 on Karan's request
    { 'user' : 'Alice Doe', 'phone': '4084838017'},    // devin's test device
    { 'user' : 'karan google number', 'phone': '4154845942'},    // karan's google voice number
    { 'user' : 'srivatsan test', 'phone': '4084978084'},    // srivatsan test number
    { 'user' : 'sulemain test', 'phone': '4084977673'},    // suleiman test number
    { 'user' : 'luis test', 'phone': '4084977721'},
    { 'user' : 'ashutosh vz', 'phone': '4085828504'},
    { 'user' : 'ashutosh p', 'phone': '5516894664'},
    { 'user' : 'rob', 'phone': '4088324439'},
    { 'user' : 'suraj a', 'phone': '4123784333'},
    { 'user' : 'preeti a', 'phone': '2135907309'},
    { 'user' : 'peter', 'phone': '9178418611'}
  ],
  from : function () {
    if (utils.config.environment != utils.config.ENV_PRODUCTION) {
      return TWILIO_FROM_TEST;
    }
    return TWILIO_FROM_PROD;
  },
  to : function (toPhoneNo) {
    if (utils.config.environment != utils.config.ENV_DEVELOPMENT) {
      return toPhoneNo;  // for production and staging send invites to everybody, for development send only to twilio users.
    }
    var tempUser = utils._.find(this.whiteList, {'phone' : toPhoneNo});
    if (utils._.isInvalid(tempUser))  // use low dash to test
    {
      return TWILIO_TO_INVALID; // don't send message if it's not found in whitelist
    }
    return toPhoneNo;
  }
};

// implement send SMS based on Twilio.
// from depends on development / production.  If production than use the whitelist only
// to depends on development / production.  If production use the phone ONLY if it's from whitelist.
function sendMessage(phoneNo, body, thumbNail) {
  if (!Twilio) {
    utils.l.i('ERROR: Twilio not initialized');
    return;
  }
  if (twilioData.to(phoneNo) == TWILIO_TO_INVALID) {
    utils.l.i('Invalid or unknown phone numbers. Skip sending message ');
    return;
  }

  Twilio.sendMessage({
    body: body,
    MediaUrl: thumbNail,
    to: twilioData.to(phoneNo),
    from: twilioData.from()
  }, function (err, data){
    console.log("Twilio message response", data);
  });
  ;
}

function getAppDownloadUrl() {
  if (utils.config.environment == utils.config.ENV_PRODUCTION) {
    return config.download_URLPattern;
  }else {
    return config.download_staging_URLPattern;
  }
}

function getDownloadUrl(creatorName, chatTitle, callback) {
  bitly.shortenUrl(getAppDownloadUrl(), function(err, downloadUrl) {
    var chatMessage = null;
    if (twilioData.development) {
      chatMessage = config.defaultMessagePattern.replace(/%CREATOR%/g, creatorName).replace(/%CHAT%/g, chatTitle).replace(/%DOWNLOADURL%/g,downloadUrl).replace(/%MODE%/g, "dev");
    } else {
      chatMessage = config.defaultMessagePattern.replace(/%CREATOR%/g, creatorName).replace(/%CHAT%/g, chatTitle).replace(/%DOWNLOADURL%/g,downloadUrl).replace(/%MODE%/g, "live");
    }
    callback(null, chatMessage)
  });
}

function sendDefaultSMSMessage(creatorName, creatorPhoneNo, chatTitle, thumbNail, phoneNo) {
  getDownloadUrl(creatorName, chatTitle, function(err, message) {
      sendMessage(phoneNo, message, thumbNail);
  });
}

module.exports = {
  twilioData: twilioData,
  sendMessage: sendMessage,
  sendDefaultSMSMessage: sendDefaultSMSMessage,
  getDownloadUrl: getDownloadUrl
};