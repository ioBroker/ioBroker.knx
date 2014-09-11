/* jshint -W097 */// jshint strict:false
/*jslint node: true */
"use strict";

var eibd = require('eibd');
var eibdConnection;

// you have to require the adapter module and pass a options object
var adapter = require(__dirname + '/../../lib/adapter.js')({

    // name has to be set and has to be equal to adapters folder name and main file name excluding extension
    name:           'knx',

    // is called if a subscribed object changes
    objectChange: function (id, obj) {

    },
    // is called if a subscribed state changes
    stateChange: function (id, state) {
        adapter.log.info('stateChange ' + id + ' ' + JSON.stringify(state));

        // you can use the ack flag to detect if state is desired or acknowledged
        if (!state.ack) {
            adapter.log.info('ack is not set!');
        }

    },

    // is called when adapter shuts down - callback has to be called under any circumstances!
    unload: function (callback) {
        try {
            if(eibdConnection)
                eibdConnection.end();
            adapter.log.info('cleaned everything up...');
            callback();
        } catch (e) {
            callback();
        }
    },

    // is called when databases are connected and adapter received configuration.
    // start here!
    ready: function () {
        main();
    }

});

function main() {

    // The adapters config (in the instance object everything under the attribute "native") is accessible via
    // adapter.config:
    adapter.log.info('Connecting to eibd ' + adapter.config.eibdAddress + ":" +adapter.config.eibdPort);
    adapter.log.info('XML table '+adapter.config.gaTable);

    // Establish the eibd connection
    function groupsocketlisten(opts, callback) {
        eibdConnection = eibd.Connection();
        eibdConnection.socketRemote(opts, function() {
            eibdConnection.openGroupSocket(0, callback);
        });
    }

    // and setup the message parser
    groupsocketlisten({ host: adapter.config.eibdAddress, port: adapter.config.eibdPort }, function(parser) {

        parser.on('write', function(src, dest, dpt, val){
            /* Message received to a GA */
            adapter.log.info('Write from '+src+' to '+dest+': '+val+' ('+dpt+')');
            adapter.setState(dest,{val: val, ack: true, from: src});
        });

        parser.on('response', function(src, dest, val) {
            adapter.log.info('Response from '+src+' to '+dest+': '+val);
        });

        parser.on('read', function(src, dest) {
            adapter.log.info('Read from '+src+' to '+dest);
        });

    });

}
