/**
 * knx.js - a pure Javascript library for KNX
 * (C) 2016 Elias Karakoulakis
 */

const util = require('util');
const DPTLib = require('./dptlib');
const KnxProtocol = require('./KnxProtocol');
const KnxConstants = require('./KnxConstants');
const EventEmitter = require('events').EventEmitter;

/*
 * A Datapoint is always bound to:
 * - a group address (eg. '1/2/3')
 * - (optionally) a datapoint type (defaults to DPT1.001)
 * You can also supply a valid connection to skip calling bind()
 */
function Datapoint(options, conn) {
  EventEmitter.call(this);
  // console.log('new datapoint: %j', options);
  if (options == null || options.ga == null) {
    throw "must supply at least { ga, dpt }!";
  }
  this.options = options;
  this.dptid = options.dpt || "DPT1.001";
  this.dpt = DPTLib.resolve(this.dptid);
  // console.log('resolved %s to %j', this.dptid, this.dpt);
  this.current_value = null;
  if (conn) this.bind(conn);
}

util.inherits(Datapoint, EventEmitter);

/*
 * Bind the datapoint to a bus connection
 */
Datapoint.prototype.bind = function(conn) {
  var self = this;
  if (!conn) throw "must supply a valid KNX connection to bind to"
  this.conn = conn;
  // bind generic event handler for our group address
  var gaevent = util.format('event_%s', self.options.ga);
  conn.on(gaevent, function(evt, src, buf) {
    //console.log('EVENT!!! %s %j', evt, buf);
    var jsvalue = buf;
    // get the Javascript value from the raw buffer, if the DPT defines fromBuffer()
    switch (evt) {
      case "GroupValue_Write":
      case "GroupValue_Response":
        if (buf) {
          jsvalue = DPTLib.fromBuffer(buf, self.dpt);
          self.update(jsvalue); // update internal state
        }
        break;
      default:
        // TODO: add default handler; maybe emit warning?
    }
  });
  if (this.options.autoread) {
    // issue a GroupValue_Read request to try to get the initial state from the bus (if any)
    if (conn.conntime) {
      // immediately or...
      this.read();
    } else {
      // ... when the connection is established
      conn.on('connected', function() {
        self.read();
      });
    }
  }
}

Datapoint.prototype.update = function(jsvalue) {
  //console.log('UPDATE %j', jsvalue);
  if (this.current_value != jsvalue) {
    var old_value = this.current_value;
    this.emit('change', this.current_value, jsvalue, this.options.ga);
    this.current_value = jsvalue;
    var ts = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    //console.log("%s **** %s DATAPOINT CHANGE (was: %j)", ts, this.toString(), old_value );
  }
}

/* format a Javascript value into the APDU format dictated by the DPT
   and submit a GroupValue_Write to the connection */
Datapoint.prototype.write = function(value) {
  var self = this;
  // console.log('write %j', value)
  if (!this.conn) throw "must supply a valid KNX connection to bind to";
  if (this.dpt.hasOwnProperty('range')) {
    // check if value is in range
    var range = this.dpt.basetype.range;
    if (value < range[0] || value > range[1]) {
      throw util.format("Value %j(%s) out of bounds(%j) for %s",
        value, (typeof value), range, this.dptid);
    }
  }
  var apdu_data = value;
  // get the raw APDU data for the given JS value
  if (typeof this.dpt.formatAPDU == 'function') {
    apdu_data = this.dpt.formatAPDU(value);
  }
  this.conn.write(this.options.ga, apdu_data, this.dptid, function() {
    // once we've written to the bus, update internal state
    self.update(value);
  });
}

/*
 * Issue a GroupValue_Read request to the bus for this datapoint
 * use the optional callback() to get notified upon response
 */
Datapoint.prototype.read = function(callback) {
  var self = this;
  if (!this.conn) throw "must supply a valid KNX connection to bind to";
  this.conn.read(this.options.ga, function(src, buf) {
    var jsvalue = DPTLib.fromBuffer(buf, self.dpt);
    if (typeof callback == 'function') {
      callback(src, jsvalue);
    }
  });
}

Datapoint.prototype.toString = function() {
  return util.format('(%s) %s %s',
    this.options.ga,
    this.current_value,
    this.dpt.subtype && this.dpt.subtype.unit || ''
  );
}


module.exports = Datapoint;
