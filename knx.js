/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

var getGAS = require(__dirname + '/lib/generateGAS');

var eibd = require('eibd');
var eibdEncode = require(__dirname + '/lib/encoder');

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

        var buf ;

        eibdConnection.socketRemote({host: adapter.config.gwip, port: adapter.config.gwipport}, function (x) {
            if (isConnected) {
                eibdConnection.openTGroup(gad, 0, function (err) {
                    if (err) {
                        adapter.log.error(err);
                        return;
                    }

                    var foo = new eibdEncode(data);

                    adapter.log.info('valType : ' + valtype);

                    //var re = /s([T]-\d*)/i;
                    if (valtype) {
                        var tmpdpt = valtype.match(/[T]-\d*/)[0];
                    }
                    var statevalue = state.val;
                    console.info('valType : ' + valtype + '    Switch : ' + tmpdpt);
                    switch (tmpdpt) {
                        // switch
                        case 'T-1' :
                            var data = new Array(2);
                            data[0] = 0;
                            data[1] = 0x80 | state.val & 0x01;
                            console.info('Schreibe DP' + tmpdpt + ' mit ' + data);
                            break;

                        // 1-Bit controlled
                        case 'T-2' :
                            var data = new Array(2);
                            data[0] = 0;
                            data[1] = 0x80 | state.val & 0x03;
                            console.info('Schreibe DP' + tmpdpt + ' mit ' + data);
                            break;

                        // 4-Bit (3-bit controlled)
                        case 'T-3' :
                            var data = new Array(2);
                            data[0] = 0;
                            data[1] = 0x80 | state.val & 0x0F;
                            console.info('Schreibe DP' + tmpdpt + ' mit ' + data);
                            break;

                        // 8-Bit Character
                        case 'T-4' :
                            var data = new Array(2);
                            data[0] = 0;
                            data[1] = 0x80 | state.val & 0xFF;
                            console.info('Schreibe DP' + tmpdpt + ' mit ' + data);
                            break;

                        // 8-Bit unsigned value
                        case 'T-5' :
                            if ( valtype === 'DPST-5-1'){
                                statevalue = statevalue * 2.55;
                            }
                            var data = new Array(2);
                            data[0] = 0;
                            data[1] = 0x80;
                            data[2] = 0xFF & statevalue;
                            console.info('Schreibe DP' + tmpdpt + ' mit ' + data + ' state.val: ' + statevalue);
                            break;

                        // 2-byte unsigned
                        case 'T-6' :
                            var data = new Array(2);
                            data[0] = 0;
                            data[1] = 0x80;
                            data[2] = 0xFF & state.val;
                            data[3] = 0xFF
                            console.info('Schreibe DP' + tmpdpt + ' mit ' + data);
                            break;

                        // 2-byte unsigned
                        case 'T-7' :
                            console.info('Schreibe DP' + tmpdpt + ' mit ' + data);
                            break;

                        // 2-byte signed value
                        case 'T-8' :
                            console.info('Schreibe DP' + tmpdpt + ' mit ' + data);
                            break;

                        // 2-byte float value
                        case 'T-9' :
                            var tmpar = [0,0];
                            // Reverse of the formula: FloatValue = (0,01M)2^E
                            var exp = Math.floor(Math.max(Math.log(Math.abs(state.val)*100)/Math.log(2)-10, 0));
                            var mant = state.val * 100 / (1 << exp);

                            //Fill in sign bit
                            if(value < 0) {
                                data[0] |= 0x80;
                                mant = (~(mant * -1) + 1) & 0x07ff;
                            }

                            //Fill in exp (4bit)
                            tmpar[0] |= (exp & 0x0F) << 3;

                            //Fill in mant
                            tmpar[0] |= (mant >> 8) & 0x7;
                            tmpar[1] |= mant & 0xFF;

                            data[0] = 0;
                            data[1] = tempar[0];
                            data[2] = tempar[1];

                            console.info('Schreibe DP' + tmpdpt + ' mit ' + data);
                            break;

                        default:
                            var data = new Array(2);
                            data[0] = 0;
                            data[1] = 0x80 | state.val;
                            console.info('DEFAULT Schreibe DP' + tmpdpt + ' mit ' + data);
                            break;
                    }

                    if (data) {
                        console.info('Schreibe ' + data);
                        eibdConnection.sendAPDU(data, function () {
                            tempCon.end();
                        });
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

function toHex(i, pad) {

    if (typeof(pad) === 'undefined' || pad === null) {
        pad = 2;
    }

    var strToParse = i.toString(16);

    while (strToParse.length < pad) {
        strToParse = "0" + strToParse;
    }

    var finalVal =  parseInt(strToParse, 16);

    if ( finalVal < 0 ) {
        finalVal = 0xFFFFFFFF + finalVal + 1;
    }

    return finalVal;
}

function syncObjects(objects, index, callback) {
    if (index >= objects.length) {
        if (typeof callback === 'function') callback();
        return;
    }
    adapter.extendObject(objects[index]._id, objects[index], function () {
        setTimeout(syncObjects, 0, objects, index + 1, callback);
    });
}

function encodeDPT1 (value) {
    var buffer = new Buffer(1);
    buffer.writeUInt8(value & 0x1 | 0x80, 0);
    return buffer;
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

            console.info('mappedName : ' + mappedName + '    dest : ' + dest + ' val ' + val + ' (' + dpt + ')');
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
            adapter.getState(dest);
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
