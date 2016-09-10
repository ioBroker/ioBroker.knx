/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

var getGAS = require(__dirname + '/lib/generateGAS');

var eibd = require('eibd');

var eibdConnection;
var utils =    require(__dirname + '/lib/utils'); // Get common adapter utils

var mapping = {};
//var valtype ='';
var states;
var isConnected = false;

var knxprojfilename = 'KNX concept - Büro Plön.knxproj';
console.info('knx.js:  ' + '/lib/generateGAS.js' + '         ' + knxprojfilename);

var adapter = utils.adapter({
    // name has to be set and has to be equal to adapters folder name and main file name excluding extension
    name:           'knx',

    // is called if a subscribed object changes
    objectChange: function (id, obj) {
        adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
    },

    // is called if a subscribed state changes
    stateChange: function (id, state) {
        if (!id) return;

        if (!state || !eibdConnection) {
            adapter.log.warn('stateChange: not ready');
            return;
        }
        if (!state) {
            var ga = states[id].native.address;
            if (state[id])  delete state[id];
            if (mapping[ga]) delete mapping[ga];
            return;
        }

       // console.info('Auflösung :  id: ' + id + '    mappedName: ' + states[id].native.address );
        if (state.ack) return;
        if (!id) {
            adapter.log.warn('stateChange: unknown ID ' + id);
            return;
        }
        var statestmp = states;
        adapter.log.debug('stateChange ' + id  + '  .....  state : ' + JSON.stringify(states[id]));
        var ga ='';
        var valtype = '';
        if (statestmp){
            valtype = statestmp[id].common.desc;
            ga = statestmp[id].native.address;
        }

        adapter.log.debug('state ack : ' + state.ack + ' ga :' + ga);

        // you can use the ack flag to detect if state is desired or acknowledged
        adapter.log.debug('setting state to ' + state.val);

        var gad =  eibd.str2addr(ga);
        adapter.log.debug('Gad : ' + gad);
        //       / * Todo: Guess DPT */
        var data =  state.val;
        //var data2buffer = new Buffer(1);
        var tempCon = eibd.Connection();
        eibdConnection.socketRemote({host: adapter.config.gwip, port: adapter.config.gwipport}, function (x) {
            if (isConnected) {
                eibdConnection.openTGroup(gad, 0, function (err) {
                    if (err) {
                        adapter.log.error(err);
                        return;
                    }
                    var dataValid = true; //false;
                    var buffer;
                    adapter.log.info('valType : ' + valtype);
                    switch (valtype) {
                        case 'DPT-1' :
                            var data = new Array(2);
                            data[0] = 0;
                            data[1] = 0x80 | state.val;
                            eibdConnection.sendAPDU(data, function () {
                                tempCon.end();
                            });
                            break;

                    }
                });
            }

        });
    },

    // is called when adapter shuts down - callback has to be called under any circumstances!
    unload: function (callback) {
        try {
            if (eibdConnection) {
                /* Workaround against Parser not implementing end() - https://github.com/andreek/node-eibd/issues/7 */
                if (eibdConnection.parser) eibdConnection.parser.end = function(){ /* Dummy */ };
                eibdConnection.end();
            }
        } finally {
            callback();
        }
    },

    // is called when databases are connected and adapter received configuration.
    // start here!
    ready: function () {
        getGAS(__dirname + '/scratch/' + knxprojfilename, function (error, result) {
            adapter.subscribeStates('*');
            main(result);
        });
    }
});

function syncObjects(objects, index, callback) {
    if (index >= objects.length) {
        if (typeof callback === 'function') callback();
        return;
    }
    adapter.extendObject(objects[index]._id, objects[index], function () {
        setTimeout(syncObjects, 0, objects, index + 1, callback);
    });
}

// Establish the eibd connection

// Todo: autoreconnect
function groupSocketListen(opts, callback) {
    eibdConnection = eibd.Connection();
    try {
        eibdConnection.socketRemote(opts, function (err) {

            eibdConnection.socket.on('error', function (err) {
                adapter.log.error(err);
                isConnected = false;
            });
            eibdConnection.socket.on('close', function (err) {
                adapter.log.info('Disconnected');
                isConnected = false;
            });

            if (!err) {
                eibdConnection.openGroupSocket(0, function(parser) {
                    adapter.log.info('Connected to ' + eibdConnection.socket.remoteAddress);
                    isConnected = true;
                    callback && callback(parser);
                });
            }
        });
        //throw 'connectionError';
    } catch (e) {
        if (e == 'connectionError')
            adapter.log.error("Connection Error. I'm not able to write to LAN-KNX Gateway ! Check availability of " + adapter.config.gwip);
    } finally {
    }
}
function startKnxServer() {
    groupSocketListen({host: adapter.config.gwip, port: adapter.config.gwipport}, function (parser) {

        parser.on('write', function(src, dest, dpt, val) {
            var mappedName;
            if (mapping[dest]) {
                mappedName = mapping[dest].common.name;
                dpt = mapping[dest].common.desc;
            }

            adapter.log.info('Write from ' + src + ' to ' + '(' + dest + ') ' + mappedName + ': ' + val + ' (' + dpt + ')');

            console.info('mappedName : ' + mappedName + '    dest : ' + dest );
            adapter.setState(mappedName ,{val: val, ack: true, from: src });
        });

        parser.on('response', function(src, dest, val) {
            var mappedName;
            if (mapping[dest]) mappedName = mapping[dest].common.name;
            adapter.log.info('Response from ' + src + ' to ' + '(' + dest + ') ' + mappedName + ': '+val);
        });

        parser.on('read', function(src, dest) {
            var mappedName;
            if (mapping[dest]) mappedName = mapping[dest].common.name;
            adapter.log.info('Read from ' + src + ' to ' + '(' + dest + ') ' + mappedName);
        });

    });
}

function main(objGAS) {
    // The adapters config (in the instance object everything under the attribute "native") is accessible via
    // adapter.config:
    adapter.log.info('Connecting to eibd ' + adapter.config.gwip + ":" +adapter.config.gwipport);

    adapter.log.info(utils.controllerDir);
    syncObjects(objGAS, 0, function () {
        adapter.getForeignStates(adapter.namespace + '.*', function (err, _states) {
            states = _states;
            for (var id in objGAS) {
                if (!objGAS.hasOwnProperty(id)) continue;
                states[adapter.namespace + '.' + objGAS[id]._id] = objGAS[id];
                mapping[objGAS[id].native.address] = objGAS[id];
            }

            startKnxServer();
        });
   });
}
