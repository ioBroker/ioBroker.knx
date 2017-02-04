/**
 * knx.js - a pure Javascript library for KNX
 * (C) 2016 Elias Karakoulakis
 */

const util = require('util');
const dgram = require('dgram');

/**
  Initializes a new KNX routing connection with provided values. Make
 sure the local system allows UDP messages to the multicast group.
**/
function IpRoutingConnection(instance, options) {

  instance.BindSocket = function(cb) {
    var conn = this;
    var udpSocket = dgram.createSocket("udp4");
    udpSocket.bind(function() {
      instance.debugPrint(util.format(
        'IpRoutingConnection.BindSocket %j, add membership for %s',
        udpSocket.address(), conn.remoteEndpoint.addr
      ));
      try {
        conn.socket.addMembership(conn.remoteEndpoint.addr);
      } catch (err) {
        console.log('IPRouting connection: cannot add membership (%s)',
          err);
      }
      cb && cb(udpSocket);
    });
    return udpSocket;
  }

  // <summary>
  ///     Start the connection
  /// </summary>
  instance.Connect = function() {
    var sm = this;
    this.localAddress = this.getLocalAddress();
    this.socket = this.BindSocket(function(socket) {
      socket.on("message", function(msg, rinfo, callback) {
        sm.debugPrint(util.format('Inbound multicast message %j: %j',
          rinfo, msg));
        sm.onUdpSocketMessage(msg, rinfo, callback);
      });
      // start connection sequence
      sm.transition('connecting');
    });
    return this;
  }

  instance.disconnected = function() {
    this.socket.close()
  }

  return instance;
}

module.exports = IpRoutingConnection;
