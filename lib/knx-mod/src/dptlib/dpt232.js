/**
 * knx.js - a pure Javascript library for KNX
 * (C) 2016 Elias Karakoulakis
 */

//
// DPT12.*:  4-byte unsigned value
//


// DPT12 base type info
exports.basetype = {
    bitlength : 24,
    valuetype : "basic",
    desc : "3-byte unsigned value"
}

// DPT12 subtype info
exports.subtypes = {
    // 12.001 counter pulses
    "600" : {
        "name" : "DPT_Colour_RGB", "desc" : "RGB value 3x(0..255)"
    }
}
