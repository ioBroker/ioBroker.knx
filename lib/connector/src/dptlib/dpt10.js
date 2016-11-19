/**
* knx.js - a pure Javascript library for KNX
* (C) 2016 Elias Karakoulakis
*/

//
// DPT10.*: time (3 bytes)
//
const util = require('util');
var timeRegexp = /(\d{1,2}):(\d{1,2}):(\d{1,2})/;

// DPTFrame to parse a DPT10 frame.
// Always 8-bit aligned.

exports.formatAPDU = function(value) {
  var apdu_data = new Buffer(3);
  switch(typeof value) {
    case 'string':
      // try to parse
      match = timeRegexp.exec(value);
      if (match) {
        apdu_data[0] = parseInt(match[1]);
        apdu_data[1] = parseInt(match[2]);
        apdu_data[2] = parseInt(match[3]);
      } else {
        console.trace("DPT10: invalid time format (%s)", value);
      }
      break;
    case 'object':
      if (value.constructor.name != 'Date') {
        console.trace('Must supply a Date or String for DPT10 time');
        break;
      }
    case 'number':
      value = new Date(value);
    default:
      apdu_data[0] = value.getUTCHours();
      apdu_data[1] = value.getUTCMinutes();
      apdu_data[2] = value.getUTCSeconds();
  }
  return apdu_data;
}

// Javascript contains no notion of "time of day", hence this function
// returns a string representation of the time. Beware, no timezone!
exports.fromBuffer = function(buf) {
  if (buf.length != 3) console.trace("DPT10: Buffer should be 3 bytes long")
  else {
    var d = new Date();
    // FIXME: no ability to setDay() without week context
    var hours = buf[0] & 31; //0b00011111;
    var minutes = buf[1];
    var seconds = buf[2];
    if (hours >= 0 & hours <= 23 &
      minutes >= 0 & minutes <= 59 &
      seconds >= 0 & seconds <= 59) {
      return util.format("%d:%d:%d", hours, minutes, seconds);
    } else {
      console.trace(
        "DPT10: buffer %j (decoded as %d:%d:%d) is not a valid time",
        buf, hours, minutes, seconds);
    }
    return d;
  }
}

// DPT10 base type info
exports.basetype = {
  "bitlength" : 24,
  "valuetype" : "composite",
  "desc" : "day of week + time of day"
}

// DPT10 subtypes info
exports.subtypes = {
  // 10.001 time of day
  "001" : {
      "name" : "DPT_TimeOfDay", "desc" : "time of day"
  }
}
