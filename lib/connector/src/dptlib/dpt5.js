/**
* knx.js - a pure Javascript library for KNX
* (C) 2016 Elias Karakoulakis
*/

//
// DPT5: 8-bit unsigned value
//
// DPT5 is the only (AFAIK) DPT with scalar datatypes (5.001 and 5.003)
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


exports.basetype = {
    "bitlength" : 8,
    "range" : [0, 255],
    "valuetype" : "basic",
    "desc" : "8-bit unsigned value"
}

exports.subtypes = {
    // 5.001 percentage (0=0..ff=100%)
    "001" : {
        "name" : "DPT_Scaling", "desc" : "percent",
        "unit" : "%", "scalar_range" : [0, 100]
    },

    // 5.003 angle (degrees 0=0, ff=360)
    "003" : {
        "name" : "DPT_Angle", "desc" : "angle degrees",
        "unit" : "°", "scalar_range" : [0, 360]
    },

    // 5.004 percentage (0..255%)
    "004" : {
        "name" : "DPT_Percent_U8", "desc" : "percent",
        "unit" : "%",
    },

    // 5.005 ratio (0..255)
    "005" : {
        "name" : "DPT_DecimalFactor", "desc" : "ratio",
        "unit" : "ratio",
    },

    // 5.006 tariff (0..255)
    "006" : {
        "name" : "DPT_Tariff", "desc" : "tariff",
        "unit" : "tariff",
    },

    // 5.010 counter pulses (0..255)
    "010" : {
        "name" : "DPT_Value_1_Ucount", "desc" : "counter pulses",
        "unit" : "pulses",
    },
}
