/**
* knx.js - a pure Javascript library for KNX
* (C) 2016 Elias Karakoulakis
*/
const os = require('os');
const dgram = require('dgram');
const util = require('util');

const ipaddr = require('ipaddr.js');
const machina = require('machina');

const KnxConstants = require('./KnxConstants.js');
const IpRoutingConnection = require('./IpRoutingConnection.js');
const IpTunnelingConnection = require('./IpTunnelingConnection.js');

module.exports = machina.Fsm.extend({

  initialize: function( options ) {
    this.options = options || {};
    // set the local IP endpoint
    this.localAddress = null;
    this.ThreeLevelGroupAddressing = true;
    this.sentTunnRequests = {};
    this.remoteEndpoint = {
      addrstring: options.ipAddr || '224.0.23.12',
      addr: ipaddr.parse(options.ipAddr || '224.0.23.12'),
      port: options.ipPort || 3671
    };
    var range = this.remoteEndpoint.addr.range();
    this.debugPrint(
      util.format('initializing connection to %s (%s)', this.remoteEndpoint.addrstring, range));
    switch (range) {
      case 'multicast':
        IpRoutingConnection(this, options);
        break;
      case 'unicast':
      case 'private':
      case 'loopback':
        IpTunnelingConnection(this, options);
        break;
      default:
        throw util.format("IP address % (%s) cannot be used for KNX", options.ipAddr, range);
    }
  },

  namespace: "knxnet",

  initialState: "uninitialized",

  states: {

    uninitialized: {
      "*": function() {
        this.transition( "connecting" );
      },
    },

    connecting: {
      _onEnter: function( ) {
        var sm = this;
        if (!this.localAddress) throw "Not bound to an IPv4 non-loopback interface";
        this.debugPrint(util.format('Connecting to %s...', sm.localAddress));
        // set a connection timer for 3 seconds, 3 retries
        this.connecttimer = setInterval( function() {
          sm.debugPrint('connection timed out - retrying...');
          sm.send( sm.prepareDatagram( KnxConstants.SERVICE_TYPE.CONNECT_REQUEST ));
          // TODO: handle send err
        }.bind( this ), 3000 );
        delete this.channel_id;
        delete this.conntime;
        delete this.lastSentTime;
        // send connect request directly
        this.send( sm.prepareDatagram( KnxConstants.SERVICE_TYPE.CONNECT_REQUEST ));
        // TODO: handle send err
      },
      _onExit: function( ) {
        clearInterval( this.connecttimer );
      },
      inbound_CONNECT_RESPONSE: function (datagram) {
        var sm = this;
        this.debugPrint(util.format('got connect response'));
        // store channel ID into the Connection object
        this.channel_id = datagram.connstate.channel_id;
        // send connectionstate request directly
        this.send( sm.prepareDatagram( KnxConstants.SERVICE_TYPE.CONNECTIONSTATE_REQUEST ));
        // TODO: handle send err
      },
      inbound_CONNECTIONSTATE_RESPONSE: function (datagram) {
        var str = KnxConstants.keyText('RESPONSECODE', datagram.connstate.status);
        this.debugPrint(util.format(
          'Got connection state response, connstate: %s, channel ID: %d',
          str, datagram.connstate.channel_id));
        // ready to go! Reset outgoing sequence counter..
        this.seqnum = -1;
        /* important note: the sequence counter is SEPARATE for incoming and
          outgoing datagrams. We only keep track of the OUTGOING L_Data.req
          and we simply acknowledge the incoming datagrams with their own seqnum */
        this.lastSentTime = this.conntime = Date.now();
        this.transition( 'idle');
        this.emit('connected');
      },
      "*": function ( data ) {
        this.debugPrint(util.format('*** inbound_CONNECTIONSTATE_RESPONSE deferring Until Transition %j', data));
        this.deferUntilTransition( 'idle' );
      },
    },

    disconnecting: {
      _onEnter: function() {
        var sm = this;
        var aliveFor = this.conntime ? Date.now() - this.conntime : 0;
        this.debugPrint(util.format('connection alive for %d seconds', aliveFor/1000));
        this.disconnecttimer = setTimeout( function() {
          sm.debugPrint("disconnection timed out");
          sm.transition( "uninitialized");
        }.bind( this ), 3000 );
        //
        this.send( this.prepareDatagram ( KnxConstants.SERVICE_TYPE.DISCONNECT_REQUEST), function(err) {
          // TODO: handle send err
          sm.debugPrint('sent DISCONNECT_REQUEST');
        });
      },
      _onExit: function() {
        clearTimeout( this. disconnecttimer )
      },
      inbound_DISCONNECT_RESPONSE: function (datagram) {
        this.debugPrint(util.format('got disconnect response'));
        this.disconnected();
        this.emit( 'disconnected' );
        this.transition( 'uninitialized');
      },
    },

    idle: {
      _onEnter: function() {
        this.idletimer = setTimeout( function() {
          // time out on inactivity...
          this.transition(  "requestingConnState" );
        }.bind( this ), 10000 );
        this.debugPrint( " ... " );
        // process any deferred items from the FSM internal queue
        this.processQueue();
      },
      _onExit: function() {
        clearTimeout( this.idletimer );
      },
      // while idle we can either...
      // 1) queue an OUTGOING tunelling request...
      outbound_TUNNELING_REQUEST: function ( datagram ) {
        var sm = this;
        var elapsed = Date.now() - this.lastSentTime;
        // if no miminum delay set OR the last sent datagram was long ago...
        if (!this.options.minimumDelay || elapsed >= this.options.minimumDelay) {
          // ... send now
          this.transition( 'sendTunnReq', datagram );
        } else {
          // .. or else, let the FSM handle it later
          setTimeout(function () {
            sm.handle( 'outbound_TUNNELING_REQUEST', datagram );
          }, this.minimumDelay - elapsed);
        }
      },
      // 2) receive an INBOUND tunneling request INDICATION (L_Data.ind)
      'inbound_TUNNELING_REQUEST_L_Data.ind': function( datagram ) {
        this.transition( 'recvTunnReqIndication', datagram );
      },
      /* 3) receive an INBOUND tunneling request CONFIRMATION (L_Data.con) to one of our sent tunnreq's
       * We don't need to explicitly wait for a L_Data.con confirmation that the datagram has in fact
       *  reached its intended destination. This usually requires setting the 'Sending' flag
       *  in ETS, usually on the 'primary' device that contains the actuator endpoint
       */
      'inbound_TUNNELING_REQUEST_L_Data.con': function ( datagram ) {
        var msg;
        var confirmed = this.sentTunnRequests[datagram.cemi.dest_addr];
        if (confirmed) {
          msg = 'delivery confirmation (L_Data.con) received';
          delete this.sentTunnRequests[datagram.cemi.dest_addr];
          this.emit('confirmed', confirmed);
        } else {
          msg = 'unknown dest addr';
        }
        this.debugPrint(util.format('%s: '+msg, datagram.cemi.dest_addr));
        this.acknowledge(datagram);
      },
      inbound_DISCONNECT_REQUEST: function( datagram ) {
        this.transition( 'connecting' );
      },
    },

    // if idle for too long, request connection state from the KNX IP router
    requestingConnState: {
      _onEnter: function( ) {
        var sm = this;
        this.debugPrint('requesting Connection State');
        this.send (sm.prepareDatagram (KnxConstants.SERVICE_TYPE.CONNECTIONSTATE_REQUEST));
        // TODO: handle send err
        //
        this.connstatetimer = setTimeout( function() {
          var msg = 'timed out waiting for CONNECTIONSTATE_RESPONSE';
          sm.emit('error', msg);
          sm.debugPrint(msg);
          sm.transition( 'connecting' );
        }.bind( this ), 1000 );
      },
      _onExit: function() {
        clearTimeout( this.connstatetimer );
      },
      inbound_CONNECTIONSTATE_RESPONSE: function ( datagram ) {
        var state = KnxConstants.keyText('RESPONSECODE', datagram.connstate.status);
        switch (datagram.connstate.status) {
          case 0:
            this.transition( 'idle');
            break;
          default:
            this.debugPrint(util.format(
              '*** error: %s *** (connstate.code: %d)', state, datagram.connstate.status));
            this.emit('error', state);
            this.transition( 'connecting' );
        }
      },
      "*": function ( data ) {
        this.debugPrint(util.format('*** deferring %s until transition to idle', data.inputType));
        this.deferUntilTransition( 'idle' );
      },
    },

    /*
    * 1) OUTBOUND TUNNELING_REQUEST
    */
    sendTunnReq:  {
      _onEnter: function ( datagram ) {
        var sm = this;
        // send the telegram on the wire
        this.seqnum += 1;
        datagram.tunnstate.seqnum = this.seqnum & 0xFF;
        this.send( datagram, function(err) {
          // TODO: handle send err
          sm.sentTunnRequests[datagram.cemi.dest_addr] = datagram;
        });
        this.lastSentTime = Date.now();
        this.debugPrint(util.format('>>>>>>> seqnum: %d', this.seqnum));
        // and then wait for the acknowledgement
        this.transition( 'sendTunnReq_waitACK', datagram );
      },
      "*": function ( data ) {
        this.debugPrint(util.format('*** deferring %s until transition to idle', data.inputType));
        this.deferUntilTransition( 'idle' );
      }
    },
    /*
    * Wait for acknowledgement by the IP router; this means the sent UDP packet
    * reached the IP router and NOT that the datagram reached its final destination
    */
    sendTunnReq_waitACK:  {
      _onEnter: function ( datagram ) {
        var sm = this;
        //sm.debugPrint('setting up tunnreq timeout for %j', datagram);
        this.tunnelingAckTimer = setTimeout( function() {
          sm.debugPrint('timed out waiting for TUNNELING_ACK');
          // TODO: resend datagram, up to 3 times
          sm.emit('tunnelreqfailed', datagram);
          sm.transition( 'idle' );
        }.bind( this ), 2000 );
      },
      _onExit: function () {
        clearTimeout( this.tunnelingAckTimer );
      },
      inbound_TUNNELING_ACK: function ( datagram ) {
        this.debugPrint(util.format('===== datagram %d acknowledged by IP router', datagram.tunnstate.seqnum));
        this.transition( 'idle' );
      },
      "*": function ( data ) {
        this.debugPrint(util.format('*** sendTunnReq_waitACK deferring %s until transition to idle', data.inputType));
        this.deferUntilTransition( 'idle' );
      },
    },

    /*
    * 2) INBOUND tunneling request (L_Data.ind)
    */
    recvTunnReqIndication: {
      _onEnter: function (datagram) {
        var sm = this;
        sm.seqnumRecv = datagram.tunnstate.seqnum;
        sm.acknowledge(datagram);
        sm.emitEvent(datagram);
        sm.transition( 'idle' );
      },
      "*": function ( data ) {
        this.debugPrint(util.format('*** recvcTunnReqIndication deferring Until Transition %j', data));
        this.deferUntilTransition( 'idle' );
      },
    },
  },

  acknowledge: function(datagram) {
    var sm = this;
    var ack = this.prepareDatagram( KnxConstants.SERVICE_TYPE.TUNNELING_ACK, datagram);
    /* acknowledge by copying the inbound datagram's sequence counter */
    ack.tunnstate.seqnum = datagram.tunnstate.seqnum;
    this.send(ack, function(err) {
      // TODO: handle send err
    });
  },

  emitEvent: function(datagram) {
    // emit events to our beloved subscribers in a multitude of targets
    // ORDER IS IMPORTANT!
    var evtName = datagram.cemi.apdu.apci;
    // 1.
    // 'event_<dest_addr>', ''GroupValue_Write', src, data
    this.emit(util.format("event_%s", datagram.cemi.dest_addr),
      evtName, datagram.cemi.src_addr, datagram.cemi.apdu.data );
    // 2.
    // 'GroupValue_Write_1/2/3', src, data
    this.emit(util.format("%s_%s", evtName, datagram.cemi.dest_addr),
      datagram.cemi.src_addr, datagram.cemi.apdu.data );
    // 3.
    // 'GroupValue_Write', src, dest, data
    this.emit(evtName,
      datagram.cemi.src_addr, datagram.cemi.dest_addr, datagram.cemi.apdu.data );
    // 4.
    // 'event', 'GroupValue_Write', src, dest, data
    this.emit("event",
      evtName, datagram.cemi.src_addr, datagram.cemi.dest_addr, datagram.cemi.apdu.data );

  },
  // get the local address of the IPv4 interface we're going to use
  getIPv4Interfaces: function() {
    var candidateInterfaces = {};
    var interfaces = os.networkInterfaces();
    for (var iface in interfaces) {
        for (var key in interfaces[iface]) {
            var intf = interfaces[iface][key];
            //console.log('key: %j, intf: %j', key, intf);
            if (intf.family == 'IPv4' && !intf.internal) {
              this.debugPrint(util.format(
                "candidate interface: %s (%j)", iface, intf
              ));
              candidateInterfaces[iface] = intf;
            }
        }
    }
    return candidateInterfaces;
  },
  getLocalAddress: function() {
    var candidateInterfaces = this.getIPv4Interfaces();
    // if user has declared a desired interface then use it
    if (this.options && this.options.interface) {
      if (!candidateInterfaces.hasOwnProperty(this.options.interface))
        throw "Interface "+this.options.interface+" not found or has no useful IPv4 address!"
      else
        return candidateInterfaces[this.options.interface].address;
    } else {
      // just return the first available IPv4 non-loopback interface
      return candidateInterfaces[Object.keys(candidateInterfaces)[0]].address;
    }
    // no local IpV4 interfaces?
    throw "No valid IPv4 interfaces detected";
  }
});
