'use strict';

const test = require('tape');
const DPTLib = require('../../src/dptlib');
const assert = require('assert');

test('resolve', function(t) {
  t.throws(() => {
    DPTLib.resolve('invalid input')
  })

  let d0 = DPTLib.resolve(1)
  t.equal(d0.id, 'DPT1')
  t.equal(d0.subtypeid, undefined)

  let d1 = DPTLib.resolve('DPT9')
  t.equal(d1.id, 'DPT9')
  t.equal(d1.subtypeid, undefined)

  let d2 = DPTLib.resolve('DPT1.002')
  t.equal(d2.id, 'DPT1')
  t.equal(d2.subtypeid, '002')

  let d3 = DPTLib.resolve('DPT1.001')
  t.equal(d3.id, 'DPT1')
  t.equal(d3.subtypeid, '001')

  // Check that dpts are not destroyed by subsequent calls to resolve
  t.equal(d2.id, 'DPT1')
  t.equal(d2.subtypeid, '002')

  let d4 = DPTLib.resolve('1.002')
  t.equal(d4.id, 'DPT1')
  t.equal(d4.subtypeid, '002')

  t.end()
})

test('DPT1 basic tests', function(t) {
  var tests = {
    [0x00]: [false, 0, "false"], [0x01]: [true, 1, "true"],
  };
  let dpt = DPTLib.resolve(1);
  for (var apdu in Object.keys(tests)) {
    for (var i in tests[apdu]) {
      var jsval = tests[apdu][i];
      // backward test (JS value to APDU)
      converted = DPTLib.formatAPDU(jsval, dpt);
      //console.log('%s: %j --> %j', dpt.id, rhs, converted)
      t.ok(apdu == converted,
        `DPT1.formatAPDU(${jsval}:${typeof jsval}) => ${apdu}, got: ${converted}`
      )
    }
    // forward test (raw data to value)
    var converted = DPTLib.fromBuffer(apdu, dpt);
    //console.log('%s: %j --> %j', dpt.id, rhs, converted);
    t.ok(converted == tests[apdu][0],
      `DPT1.fromBuffer(${apdu}) => ${tests[apdu][0]}(${typeof tests[apdu][0]})`
    )
  }

  t.end()
})

test('DPT3 4-bit dimming and blinds control', function(t) {
  var tests = [
    ['DPT3',     [0x00], {decr_incr: 0, data: 0}],
    ['DPT3.007', [0x01], {decr_incr: 0, data: 1}],
    ['DPT3.007', [0x05], {decr_incr: 0, data: 5}],
    ['DPT3.007', [0x08], {decr_incr: 1, data: 0}],
    ['DPT3.007', [0x0f], {decr_incr: 1, data: 7}]
  ];

  for (var i = 0; i < tests.length; i++) {
    let dpt = DPTLib.resolve(tests[i][0]);
    let buf = new Buffer(tests[i][1]);
    let val = tests[i][2];

    // forward test (raw data to value)
    let converted = DPTLib.fromBuffer(buf, dpt);
    //console.log('%s: %j --> %j',dpt.id, val, converted);
    t.deepEqual(converted, val,
      `${tests[i][0]} fromBuffer value ${JSON.stringify(val)}`)

    // backward test (value to raw data)
    converted = DPTLib.formatAPDU(val, dpt);
    //console.log('%j --> %j', val, converted);
    t.ok(Buffer.compare(buf, converted) == 0,
      `formatAPDU(${JSON.stringify(val)})`)
  }

  t.end()
})

test('DPT5 scalar conversion', function(t) {
  var tests = [
    ['DPT5', [0x00], 0.00],
    // 5.001 percentage (0=0..ff=100%)
    ['DPT5.001', [0x00], 0],
    ['DPT5.001', [0x80], 50],
    ['DPT5.001', [0xff], 100],
    // 5.003 angle (degrees 0=0, ff=360)
    ['DPT5.003', [0x00], 0],
    ['DPT5.003', [0x80], 181],
    ['DPT5.003', [0xff], 360],
  ];

  for (var i = 0; i < tests.length; i++) {
    let dpt = DPTLib.resolve(tests[i][0]);
    let buf = new Buffer(tests[i][1]);
    let val = tests[i][2];

    // forward test (raw data to value)
    let converted = DPTLib.fromBuffer(buf, dpt);
    //console.log('%s: %j --> %j',dpt.id, val, converted);
    t.ok(Math.abs(converted - val) < 0.0001,
      `${tests[i][0]} fromBuffer value ${val}`)

    // backward test (value to raw data)
    converted = DPTLib.formatAPDU(val, dpt);
    //console.log('%j --> %j', val, converted)
    t.ok(Buffer.compare(buf, converted) == 0,
      `${tests[i][0]} formatAPDU value ${val}`)
  }

  t.end()
})

test('DPT9 floating point conversion', function(t) {
  var tests = [
    ['DPT9', [0x00, 0x02], 0.02],
    ['DPT9', [0x87, 0xfe], -0.02],
    ['DPT9', [0x0c, 0x24], 21.2],
    ['DPT9', [0x0c, 0x7e], 23],
    ['DPT9', [0x5c, 0xc4], 24985.6],
    ['DPT9', [0xdb, 0x3c], -24985.6],
    ['DPT9', [0x7f, 0xfe], 670433.28],
    ['DPT9', [0xf8, 0x02], -670433.28],
  ];
  for (var i = 0; i < tests.length; i++) {
    let dpt = DPTLib.resolve(tests[i][0]);
    let buf = new Buffer(tests[i][1]);
    let val = tests[i][2];
    // forward test (raw data to value)
    let converted = DPTLib.fromBuffer(buf, dpt);
    t.ok(Math.abs(converted - val) < 0.0001,
        `${tests[i][0]} fromBuffer value ${val}`)
      // backward test (value to raw data)
    converted = DPTLib.formatAPDU(val, dpt);
    t.ok(Buffer.compare(buf, converted) == 0,
      `${tests[i][0]} formatAPDU value ${val}`)
  }
  t.end()
})

function timecompare(date1, sign, date2) {
  var hour1 = date1.getHours();
  var min1 = date1.getMinutes();
  var sec1 = date1.getSeconds();
  var hour2 = date2.getHours();
  var min2 = date2.getMinutes();
  var sec2 = date2.getSeconds();
  if (sign === '===') {
    if (hour1 === hour2 && min1 === min2 && sec1 === sec2) return true;
    else return false;
  } else if (sign === '>') {
    if (hour1 > hour2) return true;
    else if (hour1 === hour2 && min1 > min2) return true;
    else if (hour1 === hour2 && min1 === min2 && sec1 > sec2) return true;
    else return false;
  }
}

test('DPT10 time conversion', function(t) {
  var tests = [
    ['DPT10', [12, 23, 34], '12:23:34'],
    ['DPT10', [15, 45, 56], '15:45:56']
  ]
  for (var i = 0; i < tests.length; i++) {
    let dpt = DPTLib.resolve(tests[i][0]);
    let buf = new Buffer(tests[i][1]);
    let val = tests[i][2];
    // forward test (raw data to value)
    let converted = DPTLib.fromBuffer(buf, dpt);
    t.ok(converted == val,
      `${tests[i][0]} fromBuffer value ${val} => ${converted}`);
    // backward test (value to raw data)
    converted = DPTLib.formatAPDU(val, dpt);
    t.ok(Buffer.compare(buf, converted) == 0,
      `${tests[i][0]} formatAPDU value ${val} => ${converted}`);
  }
  t.end()
})

function dateequals(d1, d2) {
  var d = d1.getDate();
  var m = d1.getMonth();
  var y = d1.getFullYear();
  return (d == d2.getDate() && m == d2.getMonth() && y == d2.getFullYear());
}
test('DPT11 date conversion', function(t) {
  var tests = [
    ['DPT11', [25, 12, 95], new Date('1995-12-25')],
    ['DPT11', [0x16, 0x0B, 0x10], new Date('2016-11-22')]
  ]
  for (var i = 0; i < tests.length; i++) {
    var dpt = DPTLib.resolve(tests[i][0]);
    var buf = new Buffer(tests[i][1]);
    var val = tests[i][2];
    // forward test (raw data to value)
    var converted = DPTLib.fromBuffer(buf, dpt);
    t.ok(dateequals(val, converted),
      `${tests[i][0]} fromBuffer value ${val} => ${JSON.stringify(converted)}`
    );
    // backward test (value to raw data)
    converted = DPTLib.formatAPDU(val, dpt);
    t.ok(Buffer.compare(buf, converted) == 0,
      `${tests[i][0]} formatAPDU value ${val} => ${JSON.stringify(converted)}`
    );
  }
  t.end()
})
