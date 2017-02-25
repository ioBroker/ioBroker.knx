/**
* knx.js - a pure Javascript library for KNX
* (C) 2016 Elias Karakoulakis
*/

//
// DPT14.*: 4-byte floating point value
//

/* In sharp contrast to DPT9 (16-bit floating point - JS spec does not support),
*  the case for 32-bit floating point is simple...
*/

/*
 var farr = new Float32Array(2);  // two indexes each 4 bytes
 Store the floating point numbers. These will be stored in IEEE-754 format:

 farr[0] = 26.4;
 farr[1] = 32.2;
 Now we can add another view for the underlying buffer, this time signed 8-bit view:

 var barr = new Int8Array(farr.buffer);   // use the buffer of Float32Array view

 console.log(barr);
 // -> 51,51,-45,65,-51,-52,0,66

 */


exports.formatAPDU = function(value) {
  if (!value || typeof value != 'number')
    console.trace('DPT14: Must supply a number value');
  var apdu_data = new Buffer(4);
  apdu_data.writeFloatBE(value,0);
  return apdu_data;
}

/*
exports.formatAPDU = function(value){
    var floatArray = new Float32Array(1);
    floatArray[0] = value;
    var apdu_data = new Int8Array(floatArray.buffer);
    console.log('DPT14 formatAPDU: ' + apdu_data);
    return apdu_data;
}
*/
exports.fromBuffer = function(buf) {
  //console.log('DPT14 fromBuffer: ' + buf.length + '  FloatBE: ' + buf.readFloatBE(0) + '   floatBE.toFixed(2): ' + buf.readFloatBE(0).toFixed(2));
  if (buf.length != 4) console.trace("DPT14: Buffer should be 4 bytes long");
  return buf.readFloatBE(0).toFixed(2);
  //  return floats64[0];
}

// DPT14 base type info
exports.basetype = {
  "bitlength" : 32,
  "valuetype" : "basic",
  "range" : [0, Math.pow(2, 32)],
  "desc" : "32-bit floating point value"
}

// DPT14 subtypes info
exports.subtypes = {
  // TODO
  "007" : {
    "name" : "DPT_Value_AngleDeg°",
    "desc" : "angle, degree",
    "unit" : "°"
  },

  "019" : {
    "name" : "DPT_Value_Electric_Current",
    "desc" : "electric current",
    "unit" : "A"
  },

  "027" : {
    "name" : "DPT_Value_Electric_Potential",
    "desc" : "electric potential",
    "unit" : "V"
  },

  "028" : {
    "name" : "DPT_Value_Electric_PotentialDifference",
    "desc" : "electric potential difference",
    "unit" : "V"
  },

  "031" : {
    "name" : "DPT_Value_Energ",
    "desc" : "energy",
    "unit" : "J"
  },

  "032" : {
    "name" : "DPT_Value_Force",
    "desc" : "force",
    "unit" : "N"
  },

  "033" : {
    "name" : "DPT_Value_Frequency",
    "desc" : "frequency",
    "unit" : "Hz"
  },

  "036" : {
    "name" : "DPT_Value_Heat_FlowRate",
    "desc" : "heat flow rate",
    "unit" : "W"
  },

  "037" : {
    "name" : "DPT_Value_Heat_Quantity",
    "desc" : "heat, quantity of",
    "unit" : "J"
  },

  "038" : {
    "name" : "DPT_Value_Impedance",
    "desc" : "impedance",
    "unit" : "Ω"
  },

  "039" : {
    "name" : "DPT_Value_Length",
    "desc" : "length",
    "unit" : "m"
  },

  "051" : {
    "name" : "DPT_Value_Mass",
    "desc" : "mass",
    "unit" : "kg"
  },

  "056" : {
    "name" : "DPT_Value_Power",
    "desc" : "power",
    "unit" : "W"
  },

  "065" : {
    "name" : "DPT_Value_Speed",
    "desc" : "speed",
    "unit" : "m/s"
  },

  "066" : {
    "name" : "DPT_Value_Stress",
    "desc" : "stress",
    "unit" : "Pa"
  },

  "067" : {
    "name" : "DPT_Value_Surface_Tension",
    "desc" : "surface tension",
    "unit" : "1/Nm"
  },

  "068" : {
    "name" : "DPT_Value_Common_Temperature",
    "desc" : "temperature, common",
    "unit" : "°C"
  },

  "069" : {
    "name" : "DPT_Value_Absolute_Temperature",
    "desc" : "temperature (absolute)",
    "unit" : "K"
  },

  "070" : {
    "name" : "DPT_Value_TemperatureDifference",
    "desc" : "temperature difference",
    "unit" : "K"
  },

  "078" : {
    "name" : "DPT_Value_Weight",
    "desc" : "weight",
    "unit" : "N"
  },

  "079" : {
    "name" : "DPT_Value_Work",
    "desc" : "work",
    "unit" : "J"
  }
}
