/**
* knx.js - a pure Javascript library for KNX
* (C) 2016 Elias Karakoulakis
*/
const os = require('os');
const ipv4 = require('ipv4.js');
const dgram = require('dgram');
const machina = require('machina');
const util = require('util');
const KnxConstants = require('./KnxConstants.js');
const KnxNetProtocol = require('./KnxProtocol.js');

module.exports = machina.Fsm.extend({

  initialize: function( options ) {
    //this.debugPrint( util.format('initialize connection: %j', options));
    this.options = options;
    // set the local IP endpoint
    this.localAddress = null;
    this.ThreeLevelGroupAddressing = true;
    this.sentTunnRequests = [];
    this.remoteEndpoint = { addr: options.ipAddr, port: options.ipPort || 3671 };
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
        if (!sm.localAddress) throw "Not bound to an IPv4 non-loopback interface";
        sm.debugPrint(util.format('Connecting to %s...', sm.localAddress));
        // set a connection timer for 3 seconds, 3 retries
        sm.connecttimer = setInterval( function() {
          sm.debugPrint('connection timed out - retrying...');
          sm.send( sm.prepareDatagram( KnxConstants.SERVICE_TYPE.CONNECT_REQUEST ));
          // TODO: handle send err
        }.bind( this ), 3000 );
        delete sm.channel_id;
        delete sm.conntime;
        // send connect request directly
        sm.send( sm.prepareDatagram( KnxConstants.SERVICE_TYPE.CONNECT_REQUEST ));
        // TODO: handle send err
      },
      // _onExit is a special handler that is invoked just before
      // the FSM leaves the current state and transitions to another
      _onExit: function( ) {
        clearInterval( this.connecttimer );
      },
      inbound_CONNECT_RESPONSE: function (datagram) {
        var sm = this;
        sm.debugPrint(util.format('got connect response'));
        // store channel ID into the Connection object
        this.channel_id = datagram.connstate.channel_id;
        // send connectionstate request directly
        sm.send( sm.prepareDatagram( KnxConstants.SERVICE_TYPE.CONNECTIONSTATE_REQUEST ));
        // TODO: handle send err
      },
      inbound_CONNECTIONSTATE_RESPONSE: function (datagram) {
        var sm = this;
        var str = KnxConstants.keyText('RESPONSECODE', datagram.connstate.status);
        sm.debugPrint(util.format(
          'Got connection state response, connstate: %s, channel ID: %d',
          str, datagram.connstate.channel_id));
        // ready to go! Reset sequence counters..
        this.seqnumSend = 0;
        this.seqnumRecv = 0;
        this.conntime = Date.now();
        this.emit('connected');
        this.transition( 'idle');
      },
      "*": function ( data ) {
        this.debugPrint(util.format('*** deferring Until Transition %j', data));
        this.deferUntilTransition( 'idle' );
      },
    },

    disconnecting: {
      _onEnter: function() {
        var sm = this;
        var aliveFor = this.conntime ? Date.now() - this.conntime : 0;
        this.debugPrint(util.format('connection alive for %d seconds', aliveFor/1000));
        sm.disconnecttimer = setTimeout( function() {
          sm.debugPrint("disconnection timed out");
          sm.transition( "uninitialized");
        }.bind( this ), 3000 );
        //
        sm.send( sm.prepareDatagram ( KnxConstants.SERVICE_TYPE.DISCONNECT_REQUEST), function(err) {
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
        // this.debugPrint(util.format('OUTBOUND tunneling request: %j', datagram));
        this.transition( 'sendTunnReq', datagram );
      },
      // 2) receive an INBOUND tunneling request INDICATION (L_Data.ind)
      'inbound_TUNNELING_REQUEST_L_Data.ind': function( datagram ) {
        this.transition( 'recvTunnReqIndication', datagram );
      },
      // 3) receive an INBOUND tunneling request CONFIRMATION (L_Data.con) to one of our sent tunnreq's
      'inbound_TUNNELING_REQUEST_L_Data.con': function ( datagram ) {
        var sm = this;
        sm.debugPrint(util.format(
          'Successful confirmation of seq %d!', datagram.tunnstate.seqnum));
        // TODO: sm.emit('confirmed', ??? )
        var ack = sm.prepareDatagram(
          KnxConstants.SERVICE_TYPE.TUNNELING_ACK,
          datagram);
        ack.tunnstate.seqnum = datagram.tunnstate.seqnum;
        sm.send(ack, function(err) {
          // TODO: handle send err
          sm.emitEvent(datagram);
          sm.transition( 'idle' );
        });
      },
      inbound_DISCONNECT_REQUEST: function( datagram ) {
        this.transition( 'connecting' );
      },
    },

    // if idle for too long, request connection state from the KNX IP router
    requestingConnState: {
      _onEnter: function( ) {
        var sm = this;
        sm.debugPrint('requesting Connection State');
        sm.send (sm.prepareDatagram (KnxConstants.SERVICE_TYPE.CONNECTIONSTATE_REQUEST));
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
        switch (datagram.connstate.status) {
          case 0:
            this.transition( 'idle');
            break;
          default:
            this.debugPrint(util.format(
              '*** error *** (connstate.code: %d)', datagram.connstate.status));
            this.emit('error', KnxConstants.keyText('RESPONSECODE', datagram.connstate.status));
            this.transition( 'connecting' );
        }
      },
      "*": function ( data ) {
        this.debugPrint(util.format('*** deferring Until Transition %j', data));
        this.deferUntilTransition( 'idle' );
      },
    },

    /*
    * 1) OUTBOUND TUNNELING_REQUEST
    */
    sendTunnReq:  {
      _onEnter: function ( datagram ) {
        var sm = this;
        this.debugPrint(util.format('>>>>> seqnum: %d / %d', this.seqnumSend, this.seqnumRecv));
        // send the telegram on the wire
        this.send( datagram, function(err) {
          // TODO: handle send err
          sm.sentTunnRequests[datagram.tunnstate.seqnum] = datagram;
          // and then wait for the acknowledgement
          sm.transition( 'sendTunnReq_waitACK', datagram );
        });
      },
      "*": function ( data ) {
        this.debugPrint(util.format('*** deferring until transition %j', data));
        this.deferUntilTransition( 'idle' );
      }
    },
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
        var sm = this;
        var acked_dg = sm.sentTunnRequests[datagram.tunnstate.seqnum];
        if (acked_dg) {
          delete sm.sentTunnRequests[datagram.tunnstate.seqnum];
          sm.seqnumRecv = datagram.tunnstate.seqnum;
          sm.incSeqSend();
          sm.debugPrint(util.format('===== seqnum: %d / %d', sm.seqnumSend, sm.seqnumRecv));
          if (acked_dg.cemi.ctrl.confirm) {
            // only wait for confirmation if the datagram has the 'confirm' flag
            // TODO: validate meaning of 'confirm' flag, we need to manually flag outgoing requests for confirmation by API call
            this.transition( 'sendTunnReq_waitCon', acked_dg);
          } else {
            delete sm.sentTunnRequests[datagram.tunnstate.seqnum];
            this.transition( 'idle' );
          }
        } else {
          this.deferUntilTransition( 'idle' );
        }
      },
      "*": function ( data ) {
        this.debugPrint(util.format('*** deferring until transition %j', data));
        this.deferUntilTransition( 'idle' );
      },
    },
    // wait for a tunneling request confirmation
    sendTunnReq_waitCon: {
      _onEnter: function ( datagram ) {
        var sm = this;
        this.tunnelingRequestTimer = setTimeout( function() {
          sm.debugPrint('timed out waiting for TUNNELING_REQUEST');
          sm.emit('unacknowledged', datagram);
          sm.transition( 'idle' );
        }.bind( this ), 2000 );
      },
      'inbound_TUNNELING_REQUEST_L_Data.con': function ( datagram ) {
        var sm = this;
        sm.emit('acknowledged', datagram);
        sm.transition( 'idle' );
      },
      "*": function ( data ) {
        this.debugPrint(util.format('*** deferring until transition %j', data));
        this.deferUntilTransition( 'idle' );
      }
    },

    /*
    * 2) INBOUND tunneling request (L_Data.ind)
    */
    recvTunnReqIndication: {
      _onEnter: function (datagram) {
        var sm = this;
        sm.debugPrint(util.format(
          'received L_Data.ind tunelling request (%d bytes)',
          datagram.total_length));
        sm.emitEvent(datagram);
        // check IF THIS IS NEEDED (maybe look at apdu control field for ack)
        var ack = sm.prepareDatagram (KnxConstants.SERVICE_TYPE.TUNNELING_ACK, datagram);
        ack.tunnstate.seqnum = datagram.tunnstate.seqnum;
        sm.send(ack, function(err) {
          // TODO: handle err
          sm.seqnumRecv = datagram.tunnstate.seqnum;
          sm.transition( 'idle' );
        });
      },
      "*": function ( data ) {
        this.debugPrint(util.format('*** deferring Until Transition %j', data));
        this.deferUntilTransition( 'idle' );
      },
    },
  },
  emitEvent: function(datagram) {
    // emit events to our beloved subscribers in a multitude of targets
    // ORDER IS IMPORTANT!
    var evtName = KnxConstants.APCICODES[datagram.cemi.apdu.apci];
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
                "=== candidate interface: %s (%j) ===", iface, intf
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
