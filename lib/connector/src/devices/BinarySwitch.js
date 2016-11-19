/**
* knx.js - a pure Javascript library for KNX
* (C) 2016 Elias Karakoulakis
*/

const util = require('util');
const knx = require('../../');

function BinarySwitch(options, conn) {
  if (options == null || options.ga == null) {
    throw "must supply at least { ga }!";
  }
  this.control_ga = options.ga;
  this.status_ga = options.status_ga || options.ga;
  this.options = options;
  if (conn) this.bind(conn);
}

BinarySwitch.prototype.bind = function (conn) {
  if (!conn) console.trace("must supply a valid KNX connection to bind to");
  this.conn = conn;
  this.control = new knx.Datapoint({ga: this.control_ga}, conn);
  this.status = new knx.Datapoint({ga: this.status_ga}, conn);
}

BinarySwitch.prototype.switchOn = function () {
  if (!this.conn) console.trace("must supply a valid KNX connection to bind to");
  this.control.write(1);
}

BinarySwitch.prototype.switchOff = function () {
  if (!this.conn) console.trace("must supply a valid KNX connection to bind to");
  this.control.write(0);
}

module.exports = BinarySwitch;
