var utils = require('../utils');
var models = require('../models');
var adminUsability = require('./adminUsability');

module.exports = {
    name: "admin",
    admin: "0000000000", // admin user phoneNo
    auth_basic: 1,
    auth_manage: 2,
    auth_admin: 3,
    authenticate_: function (phoneNo, secret, level, callback) {
        var self = this;
        var isAuthenticated = false;
        var authenticatedUser = null;
        switch (level) {
            case self.auth_basic  : isAuthenticated = (secret == 'jambajuice') || (secret == 'latte') || (secret == 'peppermintmocha'); break;
            case self.auth_manage : isAuthenticated = (secret == 'peppermintmocha') || (secret == 'latte'); break;
            case self.auth_admin  : isAuthenticated = (secret == 'peppermintmocha'); break;
            default:
                isAuthenticated = false;
        }

        if ( isAuthenticated  ) {
            models.user.getByPhoneNo(phoneNo, function (err, user) {
                if (!user)
                    callback(null, {err: 'Auth failed unable to locate user', user: user});
                else
                    callback(null, {err: null, user: user});
            });
        }
        else {
            callback({err: "Unable to validate credentials", user: authenticatedUser})
        }
    },
    getUsers_: function (callback) {
        console.log('Admin.users getUsers');
        utils.async.waterfall(
            [
                function (callback) {
                    models.user.getAll(callback);
                },
                function (users, callback) {
                    var updatedUsers = [];
                    utils.async.forEachSeries(users, function(user, callback) {
                            console.log('USER: ' + user._id + ' - ' +  user.phoneNo + ' - ' + user.name + ' - ' + user.userType);
                            if (user.userType != 'admin' && user.userType == 'normal') {
                                var updatedUser = utils.updateS3Domain(user);
                                updatedUsers.push(updatedUser);
                                callback(null, updatedUser);
                            } else {
                                callback(null, user);
                            }

                        },
                        callback(null, updatedUsers));
                }
            ],
            callback
        );
    },

    
    userDelete_: function (user, callback) {
        var self = this;
        utils.async.waterfall(
          [
              function (callback) {
                  user.userType="invited";
                  user.signupDate=null;
                  models.user.save(user, callback);
              },
              function (user, callback) {
                  if (!user) return callback({err: "Unable to validate user"});
                  models.chat.getByUserId(user._id, callback);
              },
              function (chats, callback) {
                  if(! chats) return callback(null, null);
                  var chatIds = utils._.pluck(chats, "_id");
                  utils.async.map(chatIds, utils._.partial(models.chat.removeMemberFromChat, user._id), callback);
              },
              function (chats, callback) {
                  callback(null, user);
              }
          ],
          callback
        )
    },
    run: function(req, res) {
        console.log('Admin.run');
        var inputObject = req.query;
        res.render('admin', {
            title: 'Admin',
            content: 'Control panel',
            secret: inputObject.secret,
            phoneNo: inputObject.phoneNo,
            data: inputObject.data
        });
    },
    usability: function(req, res) {
        console.log('Admin.run');
        var inputObject = req.query;
        var body = req.body;
        var self = this;


        utils.async.waterfall(
            [
                function (callback) {
                    self.authenticate_ (body.phoneNo, body.secret, self.auth_basic, callback);
                },
                function (auth, callback) {
                    if (auth.err) {
                        callback({err: auth.err},auth);
                    }
                    else {
                        adminUsability.run(req, res);
                    }
                }
            ],
            function(err, contents) {
                if (err) {
                    res.render('admin_results', {
                        title: 'Admin',
                        content: 'Control panel',
                        secret: body.secret,
                        phoneNo: body.phoneNo,
                        result: JSON.stringify(err)
                    });
                }
                else
                {
                    mData = contents;
                    res.render('admin_contents', {
                        title: 'Admin',
                        content: 'Control panel',
                        secret: body.secret,
                        phoneNo: body.phoneNo,
                        contents: mData
                    });

                }

            }
        );

    },
    contentsForHome: function(req, res) {
        console.log('Admin.contentsForHome');
        var inputObject = req.query;
        var body = req.body;
        console.log("admin.contents: " );
        var mData;
        var self = this;

        utils.async.waterfall(
            [
                function (callback) {
                    self.authenticate_ (body.phoneNo, body.secret, self.auth_manage, callback);
                }
            ],
            function(err, contents) {
                if (err) {
                    res.render('admin_results', {
                        title: 'Admin',
                        content: 'Control panel',
                        secret: body.secret,
                        phoneNo: body.phoneNo,
                        result: JSON.stringify(err)
                    });
                }
                else
                {
                    mData = contents;
                    res.render('admin_contentsforhome', {
                        title: 'Admin',
                        content: 'Control panel',
                        secret: body.secret,
                        phoneNo: body.phoneNo,
                        contents: mData
                    });

                }

            });
    },
    contentsForHomeMoments: function(req, res) {
        console.log('Admin.contentsForHomeMoments');
        console.log('Admin.contentsForHome');
        var inputObject = req.query;
        var body = req.body;
        var visibility = body.visibility;
        var contentid = body.contentid;
        var mData;
        var self = this;
        var thisUser = null;
        var thisContent = null;
        var task = body.task;


        utils.async.waterfall(
            [
                function (callback) {
                    self.authenticate_ (body.phoneNo, body.secret, self.auth_admin, callback);
                },
                function (auth, callback) {
                    thisUser = auth.user;
                    models.content.getByIdVisibilityExpanded(contentid, models.content.visibilityType.ALL, true, callback);  // in this case discover everything but set new visibility
                },
                function (content, callback) {
                    thisContent = content;
                    if(task == 'set_visibility'){
                      if (content) {
                        models.content.setVisibility(contentid, visibility, callback);
                      } else {
                        callback({error: 'Content not found'}, null);
                      }
                    } else {
                      callback(null, content);
                    }
                },
                function (content, callback) {
                    if (task == 'create_moment') {
                        models.content.createContentMoments(thisUser, thisContent, false, function (err, result) {
                            console.log('createContentMoment.done');
                            // console.log(err);
                            callback(err, content);
                        });
                        callback(null, content);
                    } else {
                        callback(null, content);
                    }
                },
                function (content, callback) {
                    if (visibility == models.content.visibilityType.HOME) {
                        models.content.saveContentSocialFriends(content, callback);
                    } else {
                        callback(null, content);
                    }
                }
            ],
            function(err, contents) {
                if (err) {
                    res.render('admin_results', {
                        title: 'Admin',
                        content: 'Control panel',
                        secret: body.secret,
                        phoneNo: body.phoneNo,
                        result: JSON.stringify(err)
                    });
                }
                else
                {
                    mData = contents;
                    res.render('admin', {
                        title: 'Admin',
                        content: 'Control panel',
                        secret: body.secret,
                        phoneNo: body.phoneNo,
                        contents: mData
                    });

                }

            });

    },
    contents: function(req, res) {
        console.log('Admin.contents');
        var inputObject = req.query;
        var body = req.body;
        console.log("admin.contents: " );
        var mData;
        var self = this;

        utils.async.waterfall(
            [
                function (callback) {
                    self.authenticate_ (body.phoneNo, body.secret, self.auth_basic, callback);
                },
                function (auth, callback) {
                    if (auth.err) {
                        callback({err: auth.err},null);
                    }
                    else {
                        models.content.getAllVideosExpanded(body.visibility, callback);
                    }
                },
                function (contents, callback) {
                    var updatedContents = [];
                    utils.async.forEachSeries(contents, function(content, callback) {
                        var updatedContent = utils.updateS3Domain(content);
                        updatedContents.push(updatedContent);
                        callback(null, updatedContent);
                    },
                    callback(null, updatedContents));
                }
            ],
            function(err, contents) {
                if (err) {
                    res.render('admin_results', {
                        title: 'Admin',
                        content: 'Control panel',
                        secret: body.secret,
                        phoneNo: body.phoneNo,
                        result: JSON.stringify(err)
                    });
                }
                else
                {
                    mData = contents;
                    res.render('admin_contents', {
                        title: 'Admin',
                        content: 'Control panel',
                        secret: body.secret,
                        phoneNo: body.phoneNo,
                        contents: mData
                    });

                }

            }
        );
    },
    moments: function(req, res) {
        console.log('Admin.moments');
        var inputObject = req.query;
        var body = req.body;
        console.log("admin.moments: " );
        var mData;
        var self = this;

        utils.async.waterfall(
            [
                function (callback) {
                    self.authenticate_ (body.phoneNo, body.secret, self.auth_basic, callback);
                },
                function (auth, callback) {
                    if (auth.err) {
                        callback({err: auth.err},users);
                    }
                    else {
                        models.moment.getAllMomentsExpanded(callback);
                    }
                },
                function (moments, callback) {
                    var updatedMoments = [];
                    utils.async.forEachSeries(moments, function(moment, callback) {
                            var updatedMoment = utils.updateS3Domain(moment);
                            updatedMoments.push(updatedMoment);
                            callback(null, updatedMoment);
                        },
                        callback(null, updatedMoments));
                }
            ],
            function(err, moments) {
                if (err) {
//                    req.routeErr = err;
                    res.render('admin_results', {
                        title: 'Admin',
                        content: 'Control panel',
                        secret: body.secret,
                        phoneNo: body.phoneNo,
                        result: JSON.stringify(err)
                    });
                }
                else
                {
                    mData = moments;
                    res.render('admin_moments', {
                        title: 'Admin',
                        content: 'Control panel',
                        secret: body.secret,
                        phoneNo: body.phoneNo,
                        moments: mData
                    });

                }

            }
        );
    },
    users: function(req, res) {
        console.log('Admin.users');
        var inputObject = req.query;

        req.sanitize('phoneNo').toCleanPhoneNo();
        var body = req.body;
        console.log("admin.users: " + body.phoneNo);
        var mData;
        var self = this;
        var users = [];

        utils.async.waterfall(
            [
                function (callback) {
                    self.authenticate_ (body.phoneNo, body.secret, self.auth_basic, callback);
                },
                function (auth, callback) {
                    if (auth.err) {
                        callback({err: auth.err},users);
                    }
                    else {
                        self.getUsers_(callback);
                    }
                }
            ],
            function(err, users) {
                if (err) {
//                    req.routeErr = err;
                    res.render('admin_results', {
                        title: 'Admin',
                        content: 'Control panel',
                        secret: body.secret,
                        phoneNo: body.phoneNo,
                        result: JSON.stringify(err)
                    });
                }
                else
                {
                    mData = users;
                    res.render('admin_users', {
                        title: 'Admin',
                        content: 'Control panel',
                        secret: body.secret,
                        phoneNo: body.phoneNo,
                        users: mData
                    });

                }

            }
        );
    },
    purge: function (req, res) {
        req.sanitize('phoneNo').toCleanPhoneNo();
        req.assert('phoneNo', "Invalid phoneNo").notEmpty().isPhoneNo();
        var body = req.body;
        var secret = body.secret;
        var deleteUserId = body.userid;
        var phoneNo = body.phoneNo;
        var inputObject = req.query;
        var self = this;

        console.log('admin.purge called');

        utils.async.waterfall(
            [
                function (callback) {
                    self.authenticate_ (body.phoneNo, body.secret, self.auth_admin, callback);
                },
                function (auth, callback) {
                    if (auth.err) {
                        callback({err: auth.err},users);
                    }
                    else {
                        self.getUsers_(callback);
                    }
                },
                function (normalAndInvitedUsers, callback) {
                    utils.async.forEachSeries(normalAndInvitedUsers, function(normalAndInvitedUser, callback) {
                        console.log('Processing : ' + normalAndInvitedUser.name + ' - ' + normalAndInvitedUser.phoneNo);
                        models.user.getByPhoneNo(normalAndInvitedUser.phoneNo, function (err, userForDeletion) {
                            if (!userForDeletion)
                                callback(null, {err: 'Failed to locate user', user: user});
                            else
                                self.userDelete_(userForDeletion, callback);
                        });
                    }, callback(null, normalAndInvitedUsers));
                }
            ],
            function(err, result) {
                if (err) {
                    res.render('admin_results', {
                        title: 'Admin',
                        content: 'Control panel',
                        secret: body.secret,
                        phoneNo: body.phoneNo,
                        result: JSON.stringify(err)
                    });
                }
                else {
                    res.render('admin_results', {
                        title: 'Admin',
                        content: 'Control panel',
                        secret: body.secret,
                        phoneNo: body.phoneNo,
                        result: JSON.stringify({err: "Purge executed"})
                    });
                }
            }
        )

    },
    usersDelete: function (req, res) {
        req.sanitize('phoneNo').toCleanPhoneNo();
        req.assert('phoneNo', "Invalid phoneNo").notEmpty().isPhoneNo();
        var body = req.body;
        var secret = body.secret;
        var deleteUserId = body.userid;
        var phoneNo = body.phoneNo;
        var inputObject = req.query;
        var self = this;


        utils.async.waterfall(
            [
                function (callback) {
                    self.authenticate_ (body.phoneNo, body.secret, self.auth_manage, callback);
                },
                function (auth, callback) {
                    if (auth.err) {
                        callback({err: auth.err},'');
                    }
                    else {
                        self.userDelete_(auth.user, callback);
                    }
                }
            ],
            function(err, result) {
                if (err) {
                    res.render('admin_results', {
                        title: 'Admin',
                        content: 'Control panel',
                        secret: inputObject.secret,
                        phoneNo: body.phoneNo,
                        result: JSON.stringify(err)
                    });
                }
                else {
                    res.render('admin_results', {
                        title: 'Admin',
                        content: 'Control panel',
                        secret: inputObject.secret,
                        phoneNo: body.phoneNo,
                        result: result
                    });

                }
            }
        )
    },
    contentsDelete: function (req, res) {
        var body = req.body;
        var secret = body.secret;
        var deleteContentId = body.contentid;
        var inputObject = req.query;
        var self = this;


        utils.async.waterfall(
            [
                function (callback) {
                    self.authenticate_ (body.phoneNo, body.secret, self.auth_manage, callback);
                },
                function (auth, callback) {
                    if (auth.err) {
                        callback({err: auth.err},'');
                    }
                    else {
                        models.content.getByIdExpanded(deleteContentId, callback);
                    }
                },
                function (content, callback) {
                    if (!content) {
                        callback({err: "Unable to validate content"});
                    }
                    else {
                        if (deleteContentId == content._id) {
                            models.content.deleteContent(content, callback);
                        }
                        else {
                            callback({err: "User information passed is incorrect"})
                        }
                    }
                }
            ],
            function(err, result) {
                if (err) {
//                    req.routeErr = err;
                    res.render('admin_results', {
                        title: 'Admin',
                        content: 'Control panel',
                        secret: inputObject.secret,
                        phoneNo: body.phoneNo,
                        result: JSON.stringify(err)
                    });
                }
                else {
                    res.render('admin_results', {
                        title: 'Admin',
                        content: 'Control panel',
                        secret: inputObject.secret,
                        phoneNo: body.phoneNo,
                        result: result
                    });

                }
            }
        )
    },
    chats: function(req, res) {
        console.log('Admin.chats');
        var inputObject = req.query;
        var self = this;

        req.sanitize('phoneNo').toCleanPhoneNo();
        req.assert('phoneNo', "Invalid phoneNo").notEmpty().isPhoneNo();
        var body = req.body;
        console.log("admin.chatsAll: " + body.phoneNo);
        var mData;

        utils.async.waterfall(
            [
                function (callback) {
                    self.authenticate_ (body.phoneNo, body.secret, self.auth_manage, callback);
                },
                function (auth, callback) {
                    var user = auth.user;
                    if (!user) {
                        callback({err: "Unable to validate user"});
                    }
                    else {
                        utils.l.i("admin.chatsAll: user " + user.profileUrl);
                        var userId = user._id;
                        var mChat = null;
                        models.chat.getByCreatorId(userId, function (err, chat1) {
                            // chat1 = where user is creator
                            // mChat = chat1;
                            models.chat.getByUserId(userId, function (err, chat2)   {
                                // merge chat1 and chat2
                                // mChat = chat2;
                                var mChat = utils._.uniq(utils._.mergeLists.apply(chat1, chat2));
                                callback(null, mChat);

                            });

                        });

                    }
                },
                function (chat, callback) {
                    if (!chat) {
                        callback({err: "Unable to locate chat for user"})

                    };
                    utils.l.i("admin.chatsAll: chat <get all > " );
                    callback(null,chat)

                }

            ],
            function(err, chat) {
                if (err) {
//                    req.routeErr = err;
                    res.render('admin_results', {
                        title: 'Admin',
                        content: 'Control panel',
                        secret: inputObject.secret,
                        phoneNo: body.phoneNo,
                        result: JSON.stringify(err)
                    });
                }
                else
                {
                    mData = chat;
//                return routeUtils.handleAPISuccess(req, res, {value: chat});
                    res.render('admin_chats', {
                        title: 'Admin',
                        content: 'Control panel',
                        secret: inputObject.secret,
                        phoneNo: body.phoneNo,
                        chats: mData
                    });

                }

            }
        );
    },
    chatsDelete: function (req, res) {
        req.sanitize('phoneNo').toCleanPhoneNo();
        req.assert('phoneNo', "Invalid phoneNo").notEmpty().isPhoneNo();
        var body = req.body;
        var secret = body.secret;
        var deleteChatId = body.chatid;
        var phoneNo = body.phoneNo;
        var inputObject = req.query;
        var self = this;


        utils.async.waterfall(
            [
                function (callback) {
                    self.authenticate_ (body.phoneNo, body.secret, self.auth_basic, callback);
                },
                function (auth, callback) {
                    var user = auth.user;
                    if (!user) return callback({err: "Unable to validate user"});
                    if(deleteChatId) {
                        models.chat.removeMemberFromChat(user._id, deleteChatId, callback);
                    }else {
                        models.chat.getByUserId(user._id, function(err, chats) {
                            if(! chats) return callback(null, null);
                            var chatIds = utils._.pluck(chats, "_id");
                            utils.async.map(chatIds, utils._.partial(models.chat.removeMemberFromChat, user._id), callback);
                        });
                    }
                    // incase we need to delete the chats explicitly.
                    /*if(deleteChatId) {
                        models.chat.deleteChat(deleteChatId, callback);
                    }else {
                        models.chat.getByUserId(user._id, function(err, chats) {
                            if(! chats) return callback(null, null);
                            var chatIds = utils._.pluck(chats, "_id");
                            utils.async.map(chatIds, models.chat.deleteChat, callback);
                        });
                    }*/
                }

            ],
            function(err, result) {
                if (err) {
//                    req.routeErr = err;
                    res.render('admin_results', {
                        title: 'Admin',
                        content: 'Control panel',
                        secret: inputObject.secret,
                        phoneNo: body.phoneNo,
                        result: JSON.stringify(err)
                    });
                }
                else {
                    res.render('admin_results', {
                        title: 'Admin',
                        content: 'Control panel',
                        secret: inputObject.secret,
                        phoneNo: body.phoneNo,
                        result: result
                    });

                }
            }
        )
    }
}

