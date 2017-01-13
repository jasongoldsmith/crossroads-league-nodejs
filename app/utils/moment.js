var moment = require('moment-timezone');
var lodash = require('./lodash');

function getFutureInDays(numDays) {
  return createMoment().startOf('day').add(numDays, 'days');
}

function isInPast(dateInput) {
  return createMoment(dateInput).isBefore(createMoment());
}

function isAtleastDaysInPast(dateInput, numDays) {
  var datePlusNdays = createMoment(dateInput).add(numDays, 'days');
  return isInPast(datePlusNdays);
}

function isInFuture(dateInput) {
  return createMoment(dateInput).isAfter(createMoment());
}

function createMoment(timeInput, format) {
  if (lodash.isInvalidOrBlank(timeInput)) {
    return moment.tz("America/Los_Angeles");
  }
  return moment.tz(timeInput, format, "America/Los_Angeles");
}

function isToday(timeInput) {
  return createMoment().startOf('day').isSame(createMoment(timeInput).startOf('day'));
}

function toYYYYMMDD(timeInput) {
  return createMoment(timeInput).format("YYYY-MM-DD");
}

function fromYYYYMMDD(timeInput) {
  return createMoment(timeInput, "YYYY-MM-DD");
}

function within(testedDate, duration, unit, ofDate) {
  var startDateMoment = createMoment(ofDate).subtract(duration, unit);
  var endDateMoment = createMoment(ofDate).add(duration, unit);
  return createMoment(testedDate).isBetween(startDateMoment, endDateMoment);
}

function unique(dates) {
  var uniqueTSs = lodash.uniq(lodash.map(dates, function (date) {
    return moment(date).toDate().getTime();
  }));

  return lodash.map(uniqueTSs, createMoment);
}

module.exports = {
  moment: createMoment,
  getFutureInDays: getFutureInDays,
  isInFuture: isInFuture,
  isInPast: isInPast,
  isAtleastDaysInPast: isAtleastDaysInPast,
  isToday: isToday,
  toYYYYMMDD: toYYYYMMDD,
  fromYYYYMMDD: fromYYYYMMDD,
  within: within,
  unique: unique
};