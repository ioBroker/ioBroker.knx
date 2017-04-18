/**
 * knx.js - a pure Javascript library for KNX
 * (C) 2016 Elias Karakoulakis
 */

/*
Datatypes
=========
KNX/EIB Function                   Information length      EIS        DPT     Value
Switch                             1 Bit                   EIS 1      DPT 1	0,1
Dimming (Position, Control, Value) 1 Bit, 4 Bit, 8 Bit     EIS 2	    DPT 3	[0,0]...[1,7]
Time                               3 Byte                  EIS 3	    DPT 10
Date                               3 Byte                  EIS 4      DPT 11
Floating point                     2 Byte                  EIS 5	    DPT 9	-671088,64 - 670760,96
8-bit unsigned value               1 Byte                  EIS 6	    DPT 5	0...255
8-bit unsigned value               1 Byte                  DPT 5.001	DPT 5.001	0...100
Blinds / Roller shutter            1 Bit                   EIS 7	    DPT 1	0,1
Priority                           2 Bit                   EIS 8	    DPT 2	[0,0]...[1,1]
IEEE Floating point                4 Byte                  EIS 9	    DPT 14	4-Octet Float Value IEEE 754
16-bit unsigned value              2 Byte                  EIS 10	    DPT 7	0...65535
16-bit signed value                2 Byte                  DPT 8	    DPT 8	-32768...32767
32-bit unsigned value              4 Byte                  EIS 11	    DPT 12	0...4294967295
32-bit signed value                4 Byte                  DPT 13	    DPT 13	-2147483648...2147483647
Access control                     1 Byte                  EIS 12	    DPT 15
ASCII character                    1 Byte                  EIS 13	    DPT 4
8859_1 character                   1 Byte                  DPT 4.002	DPT 4.002
8-bit signed value                 1 Byte                  EIS 14	    DPT 6	-128...127
14 character ASCII                 14 Byte                 EIS 15	    DPT 16
14 character 8859_1                14 Byte                 DPT 16.001	DPT 16.001
Scene                              1 Byte                  DPT 17	    DPT 17	0...63
HVAC                               1 Byte                  DPT 20	    DPT 20	0..255
Unlimited string 8859_1            .                       DPT 24	    DPT 24
List 3-byte value                  3 Byte                  DPT 232	  DPT 232	RGB[0,0,0]...[255,255,255]
*/


const fs = require('fs');
const path = require('path');
const util = require('util');

var matches;
var dirEntries = fs.readdirSync(__dirname);
var dpts = {};
for (var i = 0; i < dirEntries.length; i++) {
  if (matches = dirEntries[i].match(/(dpt.*)\.js/)) {
    var dptid = matches[1].toUpperCase(); // DPT1..DPTxxx
    var mod = require(__dirname + path.sep + dirEntries[i]);
    if (!mod.hasOwnProperty('basetype') ||
      !mod.basetype.hasOwnProperty('bitlength')) {
      throw 'incomplete ' + dptid + ', missing basetype and/or bitlength!';
    }
    mod.id = dptid;
    dpts[dptid] = mod;
    //console.log('DPT library: loaded %s (%s)', dptid, dpts[dptid].basetype.desc);
  }
}

// a generic DPT resolution function
// DPTs might come in as 9/"9"/"9.001"/"DPT9.001"
dpts.resolve = function(dptid) {
  if (typeof dptid == 'string') {
    var m = dptid.toUpperCase().match(/(\d+)(\.(\d+))?/);
    var dpt = cloneDpt(dpts[util.format('DPT%s', m[1])]);
    if (!dpt) throw "no such DPT: " + dpt;
    if (m[3]) {
      dpt.subtypeid = m[3];
      dpt.subtype = dpt.subtypes[m[3]];
    }
    return dpt;
  }
  if (isFinite(dptid)) {
    // we're passed in a raw number (9)
    return cloneDpt(dpts[util.format('DPT%s', dptid)]);
  }
  console.trace("no such DPT: %j", dpt);
  throw "no such DPT: " + dpt;
}

/* format an APDU from a given Javascript value for the given DPT
 * - either by a custom DPT formatAPDU function
 * - or by this generic version, which:
 * --  1) checks if the value adheres to the range set from the DPT's bitlength
 */
dpts.formatAPDU = function(val, dpt) {
  var value = val;
  var nbytes = Math.ceil(dpt.basetype.bitlength / 8);
  var apdu_data = new Buffer(nbytes);

  if (dpt.basetype.bitlength == 1){
    switch ( value )  {
        case true : value = 1;
          break;
        case false : value = 0;
          break;
    }
    //console.log('index.js returning value :' + value);
    return value;
  }
//    console.log('index.js : value2  ' + value);
//  console.log('knx/index.js : %s: %d bytes', dpt.id, nbytes);

  var tgtvalue;
  // get the raw APDU data for the given JS value
  if (typeof dpt.formatAPDU == 'function') {
    // nothing to do here, DPT-specific formatAPDU implementation will handle everything
    apdu_data = dpt.formatAPDU(value);
  } else {

    if (!isFinite(value)) throw util.format("Invalid value, expected a %s",
      dpt.desc);
    // check if value is in range, be it explicitly defined or implied from bitlength
    var range = (dpt.basetype.hasOwnProperty('range')) ?
      dpt.basetype.range : [0, Math.pow(2, dpt.basetype.bitlength) - 1];
    // is there a scalar range? eg. DPT5.003 angle degrees (0=0, ff=360)
    if (dpt.hasOwnProperty('subtype') && dpt.subtype.hasOwnProperty(
        'scalar_range')) {
      var scalar = dpt.subtype.scalar_range;
      if (value < scalar[0] || value > scalar[1]) {
        console.trace(
          "Value %j(%s) out of scalar range(%j) for %s",
          value, (typeof value), scalar, dpt.id);
      } else {
        // convert value from its scalar representation
        // e.g. in DPT5.001, 50(%) => 0x7F , 100(%) => 0xFF
        var a = (scalar[1] - scalar[0]) / (range[1] - range[0]);
        var b = (scalar[0] - range[0]);
        tgtvalue = Math.round((value - b) / a);
      }
    } else {
      // just a plain numeric value, only check if within bounds
      if (value < range[0] || value > range[1]) {
        console.trace("Value %j(%s) out of bounds(%j) for %s.%s",
          value, (typeof value), range, dpt.id, dpt.subtypeid);
      } else {
        tgtvalue = value;
      }
    }

    if ( true ) {
        for (var i = 0; i < nbytes; i++) {
            apdu_data[i] = tgtvalue % 256;
            //console.log('apdu_data[%d] == %j', i, apdu_data[i]);
            tgtvalue = tgtvalue >> 8;
        }
    }
  }
  //console.log('generic formatAPDU value=%j => apdu=%j', value, apdu_data);
  return apdu_data;
}

/* get the correct Javascript value from a APDU buffer for the given DPT
 * - either by a custom DPT formatAPDU function
 * - or by this generic version, which:
 * --  1) checks if the value adheres to the range set from the DPT's bitlength
 */
dpts.fromBuffer = function(buf, dpt) {
  // sanity check
  if (!dpt) throw util.format("DPT %s not found", dpt);
  var value = 0;
  // get the raw APDU data for the given JS value
  if (typeof dpt.fromBuffer == 'function') {
    // nothing to do here, DPT-specific fromBuffer implementation will handle everything
    value = dpt.fromBuffer(buf);
  } else {
    // get the raw numeric from the buffer
    for (var i = 0; i < buf.length; i++) {
      value += Math.pow(2, i) * buf[i];
    }
   // console.log('Value : ' + value);
   // console.log('%s %j == %j', dpt.id, dpt.basetype, value);
   //console.log(' ../knx/src/index.js : DPT : ' + JSON.stringify(dpt));   // for exploring dpt and implementing description
    if (dpt.hasOwnProperty('subtype') && dpt.subtype.hasOwnProperty(
        'scalar_range')) {
      var range = (dpt.basetype.hasOwnProperty('range')) ?
        dpt.basetype.range : [0, Math.pow(2, dpt.basetype.bitlength) - 1];
      var scalar = dpt.subtype.scalar_range;
      // convert value from its scalar representation
      // e.g. in DPT5.001, 50(%) => 0x7F , 100(%) => 0xFF
      var a = (scalar[1] - scalar[0]) / (range[1] - range[0]);
      var b = (scalar[0] - range[0]);
      value = Math.round(a * value + b);
     // console.log('fromBuffer scalar a=%j b=%j %j', a,b, value);
    }
  }
  //  console.log('generic fromBuffer buf=%j, value=%j', buf, value);
  return value;
}

function cloneDpt(d) {
  result = JSON.parse(JSON.stringify(d));
  result.fromBuffer = d.fromBuffer;
  result.formatAPDU = d.formatAPDU;
  return result;
}

module.exports = dpts;
