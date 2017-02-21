var lodash = require('./lodash')
var config =  require('config')

var errorTypes = {
  all: "All",
  signUp: "Sign Up Error",
  signIn: "Sign In Error",
  addConsole : "Add Console",
  updatePassword: "Update Password",
  changePrimaryConsole: "Change Primary Console",
  updateEmail: "Update Email",
  report: "report",
  resetPassword: 'resetPassword'
}

var errorCodes = {
  unknownError: {
    code: 0,
    types : [errorTypes.all],
    title: "Unknown Error",
    message: "Something went wrong. Please try again later. If this error persists, please contact us at support@crossroadsapp.co! Error Code 00."
  },
  internalServerError: {
    code: 1,
    types : [errorTypes.all],
    title: "Internal Server Error",
    message: "Something went wrong. Please try again later. If this error persists, please contact us at support@crossroadsapp.co!"
  },
  invalidEmail : {
    code: 2,
    types: [errorTypes.signUp, errorTypes.signIn, errorTypes.updateEmail, errorTypes.resetPassword],
    title: "Invalid Email Provided",
    message: "Please enter a valid email address."
  },
  invalidPassword: {
    code: 3,
    types: [errorTypes.signUp, errorTypes.signIn, errorTypes.updatePassword, errorTypes.updateEmail],
    title: "Invalid Password Provided",
    message: "Please enter a password with more than 4 characters."
  },
  emailIsAlreadyTaken : {
    code: 4,
    types: [errorTypes.signUp, errorTypes.updateEmail],
    title: "Email is already taken",
    message: "An account already exists with that email address. Try logging in."
  },
  noUserFoundWithTheEmailProvided: {
    code: 5,
    types: [errorTypes.signIn],
    title: "Email Address Error",
    message: "An account with that email address does not exist."
  },
  consoleTypeNotProvided: {
    code: 6,
    types: [errorTypes.addConsole, errorTypes.changePrimaryConsole],
    title: "Console Type not provided",
    message: "Please select a platform."
  },
  invalidConsoleType: {
    code: 7,
    types: [errorTypes.addConsole],
    title: "Invalid console type: Supported types are PC, Xbox One, PS4",
    message: "Please select a valid platform."
  },
  consoleIdNotProvided: {
    code: 8,
    types: [errorTypes.addConsole],
    title: "BattleTag/GamerTag not provided",
    message: "Please enter your BattleTag/Gamertag."
  },
  userAlreadyOwnsThisConsole: {
    code: 9,
    types: [errorTypes.addConsole],
    title: "You already own this console",
    message: "You've already added this console."
  },
  userCannotDowngradeTheConsole: {
    code: 10,
    types: [errorTypes.addConsole],
    title: "You cannot downgrade your console",
    message: "Unable to add that console. Error Code 10."
  },
  tagAlreadyTaken: {
    code: 11,
    types: [errorTypes.addConsole],
    title: "Name Already Taken",
    message: "An account already exists for that BattleTag. " +
    "Please check for any typos. If you believe someone is using your account name, let us know at support@crossroadsapp.co!"
  },
  battleTagEmptyReceivedFromBattleNet: {
    code: 12,
    types: [errorTypes.addConsole],
    title: "Battletag is not available in battle.net",
    message: "We can't find a BattleTag associated with your Battle.net account. Please sign in on Battle.net and create a BattleTag."
  },
  accessTokenProfileNotReceivedFromBattleNet: {
    code: 13,
    types: [errorTypes.addConsole],
    title: "Access Token Or Profile is empty. Try logging in again",
    message: "Sorry, we couldn't load your profile. Please try logging in again!"
  },
  oldPasswordDoesNotMatchTheCurrentPassword: {
    code: 14,
    types: [errorTypes.updatePassword],
    title: "Old password does not match the current password",
    message: "The current password you entered does not match our records."
  },
  newPasswordIsSameAsOldPassword: {
    code: 15,
    types: [errorTypes.updatePassword],
    title: "New password has to be different from the old password",
    message: "Your new password must be different than your current password."
  },
  consoleDoesNotExistForUser: {
    code: 16,
    types: [errorTypes.changePrimaryConsole],
    title: "Console not found.",
    message: "Console not found for user"
  },
  newEmailSameAsCurrentEmail: {
    code: 17,
    types: [errorTypes.updateEmail],
    title: "New email is same as old email",
    message: "The new email must be different than your current one."
  },
  incorrectPassword: {
    code: 18,
    types: [errorTypes.signIn, errorTypes.updatePassword, errorTypes.updateEmail],
    title: "Incorrect Password",
    message: "Please check the password provided."
  },
  missingFields: {
    code: 19,
    types: [errorTypes.all],
    title: "Required fields cannot be empty.",
    message: "Required fields cannot be empty."
  },
  resetPasswordDisabled: {
    code: 20,
    types: [errorTypes.resetPassword],
    title: "Reset Password Disabled",
    message: "Reset password has been disabled temporarily. Please try again later"
  }
}

function formErrorObject(type, errorCodeObj, comments) {
  var data = {
    title: lodash._.isInvalidOrEmpty(errorCodeObj) ? errorCodes.unknownError.title : errorCodeObj.title,
    message: lodash._.isInvalidOrEmpty(errorCodeObj) ? "" : errorCodeObj.message,
    comments: comments
  }

  var error = {
    type: lodash._.isInvalidOrBlank(type) ? "error" : type,
    code: lodash._.isInvalidOrEmpty(errorCodeObj) ? errorCodes.unknownError.code : errorCodeObj.code,
    details: data
  }
  // TODO: Remove the "error" key once all the clients move to the "errorHandling" model
  return {errorHandling: error, error: data.message}
}

module.exports = {
  formErrorObject : formErrorObject,
  errorTypes: errorTypes,
  errorCodes: errorCodes
}