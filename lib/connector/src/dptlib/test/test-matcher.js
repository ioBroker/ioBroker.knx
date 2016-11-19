
var assert = require('assert');
var DPTLib = require('..');

assert.ok(DPTLib.resolve(1));
assert.ok(DPTLib.resolve('1'));
assert.ok(DPTLib.resolve('DPT1'));
assert.ok(DPTLib.resolve('DPT5'));
// with subtype
var dpt5 = DPTLib.resolve('DPT5.001');
assert.ok(dpt5);
assert.ok(dpt5.subtype);
