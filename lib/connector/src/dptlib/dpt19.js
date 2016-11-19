/**
* knx.js - a pure Javascript library for KNX
* (C) 2016 Elias Karakoulakis
*/

// TODO: implement fromBuffer, formatAPDU

//
// DPT19: 8-byte Date and Time
//

Date.prototype.stdTimezoneOffset = function() {
  var jan = new Date(this.getFullYear(), 0, 1);
  var jul = new Date(this.getFullYear(), 6, 1);
  return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
}

Date.prototype.dst = function() {
  return this.getTimezoneOffset() < this.stdTimezoneOffset();
}

exports.formatAPDU = function(value) {
  if (typeof value != 'object' || value.constructor.name != 'Date')
    console.trace('DPT19: Must supply a Date object')
  else {
    var apdu_data = new Buffer(8);
    apdu_data[0] = value.getFullYear() - 1900;
    apdu_data[1] = value.getMonth() + 1;
    apdu_data[2] = value.getDate();
    apdu_data[3] = value.getDay() << 5 + value.getHours();
    apdu_data[4] = value.getMinutes();
    apdu_data[5] = value.getSeconds();
    apdu_data[6] = 1 & value.dst(); //0b00000001 & value.dst();
    apdu_data[7] = 0;
    return apdu_data;
  }
}

exports.fromBuffer = function(buf) {
  if (buf.length != 8) console.trace("DPT19: Buffer should be 8 bytes long")
  else {
    //var d = new Date(buf[0]+1900, buf[1]-1, buf[2], buf[3] & 0b00011111, buf[4], buf[5]);
    var d = new Date(buf[0]+1900, buf[1]-1, buf[2], buf[3] & 31, buf[4], buf[5]);
    return d;
  }
}

exports.basetype = {
  "bitlength" : 64,
  "valuetype" : "composite",
  "desc" : "8-byte Date+Time"
}

exports.subtypes = {
  // 19.001
  "001" : {
      "name" : "DPT_DateTime", "desc" : "datetime"
  },
}
