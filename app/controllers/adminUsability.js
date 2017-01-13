var utils = require('../utils');
var models = require('../models');
var tUtils = require("../tests/utils");
var cookie = require('cookie');
var users = require('../data/usability/users.json');
var chats = require('../data/usability/chats.json');
var helpers = require('../helpers');

module.exports = {
    name: "adminUsability",
    self: null,
    gMyCookie: null,
    chatgroups: [],
    gMyHost: "http://localhost:3000", // default but client can change it
    run: function(req, res) {
        console.log('ADMIN USABILITY: run');
        self = this;
        var inputObject = req.query;
        var body = req.body;
        var setup = req.body.setup;
        self.gMyHost = req.body.host;
        switch (setup) {
            case "users" : console.log('ADMIN USABILITY: users');
                self.setupUsers(req, res);
                break;
            case "users.profile" : console.log('ADMIN USABILITY: users.profile');
                self.setupUsersProfile(req, res);
                break;
            case "chats" : console.log('ADMIN USABILITY: chats');
                self.setupChats(req, res);
                break;
            case "messages" : console.log('ADMIN USABILITY: messages');
                self.setupMessages(req, res);
                break;
            default:
                console.log('ADMIN USABILITY: default');
        }
        res.render('admin_usability', {
            title: 'Admin',
            content: 'Control panel',

            secret: body.secret,
            setup: setup,
            phoneNo: inputObject.phoneNo,
            data: inputObject.data
        });
    },
    getObjectByName : function(name, chatgroups) {
        console.log('ADMIN USABILITY: getObjectByName:name='+name);
        for (var i = 0, len = chatgroups.length; i < len; i++) {
            if (chatgroups[i].chat.groupname === name)
                return chatgroups[i]; // Return as soon as the object is found
        }
        return null; // The searched object was not found
    },
    getCookiesFromRes: function (req, res) {
        console.log('ADMIN USABILITY:  getCookiesFromRes:');
        var cookiesList = res.header["set-cookie"];
        var cookies = {};
        utils._.each(
            cookiesList, function (cString) {
                cString = utils.str.strLeft(cString, ";");
                var cookieObj = cookie.parse(cString);
                utils._.assign(cookies, cookieObj);
            });
        return cookies;
    },
    wait : function (seconds) {
        setTimeout(function () {
            console.log('ADMIN USABILITY: waiting.. '+seconds + ' sec');
        }, 100);
        var end = Date.now() + seconds * 1000;
        while (Date.now() < end) ;
        console.log('ADMIN USABILITY: wait is over ... waited for ' + seconds  + ' sec');
    },

    login: function  (req, res, userPhone, callback) {
        console.log('ADMIN USABILITY:  getObjectByName:userPhone='+userPhone);
        tUtils.tPost(self.gMyHost,
            {path: "/api/v1/auth/login", data: {phoneNo: userPhone}},
            {status: 200},
            function(err, res) {
                if (err) {
                    callback (err, null);
                } else {
                    self.gMyCookie = self.getCookiesFromRes(req, res);
                }

                callback(null, res.body.value);
            }
        );
    },
    setupUsers: function (req, res) {
        console.log('ADMIN USABILITY:  getObjectByName:setupUsers');

        utils.async.forEachSeries(users, function(user, callback) {
            console.log('ADMIN USABILITY: USER: name: ' + user.name + ' - phone: ' + user.phoneNo);
            tUtils.tPost(self.gMyHost,
                {path: "/api/v1/auth/signup", data: {phoneNo: user.phoneNo, name: user.name}},
                {status: 200},
                function (err, res) {
                    if (err) {
                        callback(err, null);
                    }
                    else {
                        self.gMyCookie = self.getCookiesFromRes(req, res);
                        console.log("ADMIN USABILITY:  Signup results - cookie: " + cookie + " - value: " + JSON.stringify(res.body.value))
                        callback(null, res.body.value);
                    }
                }
            );
        });
    },
    setupUsersProfile: function (req, res) {
        console.log('ADMIN USABILITY:  getObjectByName:setupUsers profiles');

        utils.async.forEachSeries(users, function(user, callback) {
            console.log('ADMIN USABILITY: USER PROFILE: name: ' + user.name + ' - phone: ' + user.phoneNo);
            tUtils.tPost(self.gMyHost,
                {path: "/api/v1/auth/login", data: {phoneNo: user.phoneNo}},
                {status: 200},
                function (err, res) {
                    if (err) {
                        callback(err, null);
                    }
                    else {
                        self.gMyCookie = self.getCookiesFromRes(req, res);
                        console.log("ADMIN USABILITY:  Signup results - cookie: " + cookie + " - value: " + JSON.stringify(res.body.value))
                        // user is here
                        var storedUser = res.body.value;
                        models.user.setFields(storedUser._id, {profileUrl : user.imageUrl }, callback);
                        // storedUser.profileUrl = user.imageUrl;

                        // callback(null, res.body.value);
                    }
                }
            );
        });
    },
    createChat : function (req, res, chat, callback) {
        console.log('ADMIN USABILITY:  getObjectByName:createChat');
        this.wait(5);
        var gMyPhone = chat.sender;
        console.log('ADMIN USABILITY:  createChat  - ' + chat.sender );
        self.login(req, res, chat.sender, function (err, data) {
            console.log('ADMIN USABILITY: login done');
            var recipients = chat.recipients.split(",");
            var message = chat.message + ' ' ;

            if (chat.messagetype == "chat" ) chat.messagetype = "text";  // transform - this is needed to separate chat group from text message
            tUtils.tPost(self.gMyHost,
                {
                    path: "/api/v1/a/chats",
                    data: {phoneNos: recipients, name: chat.groupname, message: {type:chat.messagetype, text:message}},
                    cookies: self.gMyCookie
                },
                {status: 200},
                function(err, res) {
                    if (err) {
                        callback(err, null);
                    }
                    myChatId = res.body.value._id;

                    chat.chatId = myChatId;
                    self.chatgroups.splice(0,0, { "chatid" : myChatId, "chat" : chat} );

                });
        });
    },

    setupChats: function (req, res) {
        console.log('ADMIN USABILITY:  getObjectByName:setupChats');
        this.wait(5);
        console.log("ADMIN USABILITY: -----------------------------: Setup Chats. 1");
        self.chatgroups = [];
        utils.async.forEachSeries(chats, function(chat, callback) {
            console.log('ADMIN USABILITY:  CHATS: sender: ' + chat.sender + ' - groupname: ' + chat.groupname + ' - message: ' + chat.message + ' - recipients: ' + chat.recipients);
            var mChat = chat;
            self.login(req, res, chat.sender, function (err, data) {
                if (mChat.messagetype == "chat") {
                    self.createChat(req, res, mChat, function (err, data) {
                        console.log ('ADMIN USABILITY: create chat done - ' + data);
                        callback(null, mChat);
                    });
                }
                else {
                    // console.log ('ADMIN USABILITY: not chat - SKIP ' + mChat.messagetype);
                    callback(null, mChat);
                }

            });

        });
    }
    ,
    createChatMessage: function  (req, res, chat, content, moment, callback) {
        console.log('ADMIN USABILITY: getObjectByName:createChatMessage');
        this.wait(5);
        self.login(req, res, chat.sender, function (err, user) {
            var message = chat.message ;
            var messagetype = chat.messagetype
            var myContentId = '';
            var myMomentId = '';

            if (messagetype == "content") {
                // get content from parse id
                myContentId = content._id;

            } else if (messagetype == "moment") {
                // get moment from parse id
                myMomentId = moment._id;
            }
            var messageBody = {type: messagetype, text: message, content: myContentId, moment: myMomentId};
            var myChatGroup = self.getObjectByName(chat.groupname, self.chatgroups);
            var myChatId = myChatGroup.chatid + '';
            var myPath = "/api/v1/a/chats/" + myChatId + "/messages";
            console.log('ADMIN USABILITY: ' + myChatId + ' - ' + myPath + ' - ' + JSON.stringify(messageBody) + ' - ' + JSON.stringify(self.gMyCookie));
            tUtils.tPost(self.gMyHost,
                {
                    path: myPath,
                    data: messageBody,
                    cookies: self.gMyCookie
                },

                {status: 200},
                function (err, res) {
                    if (err) {
                        console.log('ADMIN USABILITY: ERROR: ' + err.message);
                        callback(err, null);
                    }
                });
        })
    },
    createMoment: function (req, res, myContentId, start, end, callback) {
        console.log('ADMIN USABILITY:  getObjectByName:createMoment');
        this.wait(5);
        tUtils.tPost(self.gMyHost,
            {
                path: "/api/v1/a/moment",
                data: {contentId: myContentId, start: start, end: end, trackingId:"1234567890"},
                cookies: self.gMyCookie
            },

            {status: 200},
            function(err, res) {
                if (err) {
                    console.log('ADMIN USABILITY: ERROR: ' + err.message);
                    callback(err, null);
                } else {
                    myMoment = res.body.value;
                    callback(null, myMoment);

                }

            });
    },
    setupMessages: function (req, res) {
        console.log('1. ADMIN USABILITY:  getObjectByName:setupMessages');
        this.wait(5);
        utils.async.forEachSeries(chats, function(chat, callback) {
            console.log('2. USABILITY:  CHATS: sender: ' + chat.sender + ' - groupname: ' + chat.groupname + ' - message: ' + chat.message + ' - recipients: ' + chat.recipients);
            var mChat = chat;
            if (chat.messagetype == "text") {
                console.log('3. ADMIN USABILITY:  ***** chat TEXT message - ' + JSON.stringify(chat));
                self.createChatMessage(req, res, chat, null, null, function (err, data) {
                    console.log('ADMIN USABILITY: done creating text chat');
                    callback(null, chat);
                });
            } else if (chat.messagetype == "content") {
               console.log('4. ADMIN USABILITY:  ***** chat VIDEO message - ' + JSON.stringify(chat));
               models.content.getByParseId(chat.parseid, function(err, content) {
                   if (utils._.isInvalid(content)) {
                       console.log('4b. ADMIN USABILITY:  ***** ERROR **** chat VIDEO message - content not available ... please sync');
                       callback(null, chat);
                   } else {
                       console.log('4b. ADMIN USABILITY:  ***** chat VIDEO message - ');
                       self.createChatMessage(req, res, chat, content, null, function (err, data) {
                           console.log('ADMIN USABILITY: done creating content chat');
                           callback(null, chat);
                       });
                   }

                });


            } else if (chat.messagetype == "moment") {
                console.log('5. ADMIN USABILITY:  ***** chat CLIP message - ' + JSON.stringify(chat));
                models.content.getByParseId(chat.parseid, function(err, content) {
                    if (utils._.isInvalid(content)) {
                        console.log('4b. ADMIN USABILITY:  ***** ERROR **** chat VIDEO message - content not available ... please sync');
                        callback(null, chat);

                    } else {
                        console.log('5b. ADMIN USABILITY:  ***** chat CLIP message - ' + JSON.stringify(chat));
                        self.createMoment(req, res, content._id, chat.momentstart, chat.momentend, function (err, moment) {
                            console.log('5c. ADMIN USABILITY:  ***** chat CLIP message - ' + JSON.stringify(chat));
                            self.createChatMessage(req, res, chat, null, moment, function (err, data) {
                                console.log('ADMIN USABILITY: done creating content chat');
                                callback(null, chat);
                            });

                        });
                    }

                });

            } else {
                console.log('8. ADMIN USABILITY: ..... ');
                callback(null, chat);
            }


        });
    }
}

