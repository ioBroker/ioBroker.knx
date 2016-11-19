/**
* knx.js - a pure Javascript library for KNX
* (C) 2016 Elias Karakoulakis
*/


// Bitstruct to parse a DPT6 frame (8-bit signed integer)
// Always 8-bit aligned.

exports.formatAPDU = function(value) {
    var apdu_data = new Buffer(1);
    apdu_data[0] = (value*2.55) & 0xFF;
    console.info('./knx/src/dpt5.js : input value = ' + value + '   apdu_data = ' + apdu_data.readUInt8(0));
    return apdu_data;
}

exports.fromBuffer = function(buf) {
    if (buf.length != 1) throw "Buffer should be 1 bytes long";
    var ret = Math.round(buf.readUInt8(0) / 2.55);
    console.info('               dpt5.js   fromBuffer : ' + ret);
    return ret;
}


// DPT Basetype info
exports.basetype = {
    "bitlength" : 8,
    "valuetype" : "basic",
    "desc" : "8-bit signed value",
    "range" : [-128, 127]
}

// DPT subtypes info
exports.subtypes = {
    // 6.001 percentage (-128%..127%)
    "001" : {
        "name" : "DPT_Switch", 
		"desc" : "percent",
        "unit" : "%",
    },

    // 6.002 counter pulses (-128..127)
    "002" : {
        "name" : "DPT_Bool", 
		"desc" : "counter pulses",
        "unit" : "pulses"
    },
    //
}
