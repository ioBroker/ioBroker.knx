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

exports.formatAPDU = function(value) {
  if (!value || typeof value != 'number')
    console.trace('DPT14: Must supply a number value');
  var apdu_data = new Buffer(4);
  apdu_data.writeFloatBE(value,0);
  return apdu_data;
}

exports.fromBuffer = function(buf) {
  if (buf.length != 4) console.trace("DPT14: Buffer should be 4 bytes long");
  return buf.readFloatBE(0);
}

// DPT14 base type info
exports.basetype = {
  "bitlength" : 32,
  "valuetype" : "basic",
  "desc" : "32-bit floating point value"
}

// DPT14 subtypes info
exports.subtypes = {
  // TODO
  /*
14.007
DPT_Value_AngleDeg°
1 °
angle, degree

14.019
DPT_Value_Electric_Current
A
1 A
electric current

14.027
DPT_Value_Electric_Potential
V
1 V
electric potential

14.028
DPT_Value_Electric_PotentialDifference
V
1 V
electric potential difference

14.031
DPT_Value_Energ
y
J
1 J
energy

14.032
DPT_Value_Force
N
1 N
force

14.033
DPT_Value_Frequency
Hz = s
-
1
1 Hz
frequency

14.036
DPT_Value_Heat_FlowRate
W
1 W
heat flow rate

14.037
DPT_Value_Heat_Quantity
J
1 J
heat, quantity of

14.038
DPT_Value_Impedance
Ω
1
Ω
impedance

14.039
DPT_Value_Length
m
1 m
length

14.051
DPT_Value_Mass
kg
1 kg
mass

14.056
DPT_Value_Power
W
1 W
power

14.065
DPT_Value_Speed
m s
-
1
1 m s
-
1
speed

14.066
DPT_Value_Stress
Pa = N m
-
2
1 Pa
stress

14.067
DPT_Value_Surface_Tension
N m
-
1
1 N m
-
1
surface tension

14.068
DPT_Value_Common_Temperature
°C
1°C
temperature, common

14.069
DPT_Value_Absolute_Temperature
K
vK
temperature (absolute)

14.070
DPT_Value_TemperatureDifference
K
1 K
temperature difference

14.078
DPT_Value_Weight
N
1 N
weight

14.079
DPT_Value_Work
J
1 J
work
*/
}
