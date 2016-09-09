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
      //  console.info('from : ' + state.from);
        //id = id.replace(/(knx.\d.)/g, '');
        if (!id) return;
        //console.info(state[id]);
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
        var data2buffer = new Buffer(1);
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
                            adapter.log.info(valtype + ' encoded ');
                            eibdConnection.sendAPDU(data, function () {
                                tempCon.end();
                            });
                            break;
                        default :
                            dataValid = false;
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
            // adapter.log.info('cleaned everything up...');
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

/*function parseXml(text, callback) {
    //adapter.log.info(' text : ' + text);
    parseString(text, function (err, result) {
        //Extract the value from the data element
        adapter.log.info('function parseXML' + JSON.stringify(text));
        callback(err, result ? result['GroupAddress-Export'] : null);
    });
}*/

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

         //   console.info('mappedName:  ' +  mappedName);
            /* Message received to a GA */
            adapter.log.info('Write from ' + src + ' to ' + '(' + dest + ') ' + mappedName + ': ' + val + ' (' + dpt + ')');
           // valtype = dpt;
            // adapter.log.info('====>> ESF File : ' + esf.Name);

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
            // create mapping
            /*for (var id in states) {
                if (!states.hasOwnProperty(id)) continue;
                mapping[states[id].native.address] = states[id];
            }*/
            for (var id in objGAS) {
                if (!objGAS.hasOwnProperty(id)) continue;
                states[adapter.namespace + '.' + objGAS[id]._id] = objGAS[id];
                mapping[objGAS[id].native.address] = objGAS[id];
            }

            startKnxServer();
        });
   });

    /*function parseGARange(gaRange, path) {
        if (!gaRange) return adapter.log.error('Unknown XML format. No GroupRange found');
        path = path || '';
        // Main groups
        for (var ix = 0; ix < gaRange.length; ix++) {
            var gar = gaRange[ix];
            if (gar.GroupRange) {
                var locpath = path;
                if (gar.$ && gar.$.Name) {
                    locpath += (path ? '.' : '') + gaRange[ix].$.Name.replace(/\./g, '_').replace(/\s/g, '_');
                }
                parseGARange(gaRange[ix].GroupRange, locpath);
            } else if (gar.GroupAddress) {
                var locpath = path;
                if (gar.$ && gar.$.Name) {
                    locpath += (path ? '.' : '') + gar.$.Name.replace(/\./g, '_').replace(/\s/g, '_');
                }
                for (var gaIX = 0; gaIX < gar.GroupAddress.length; gaIX++) {
                    var ga = gar.GroupAddress[gaIX].$;
                    var obj = {
                        _id: (locpath ? locpath + '.' : '') + ga.Address.replace(/\//g, '_'),
                        type: 'state',
                        common: {name: ga.Name},
                        native: {address: ga.Address}
                    };
                    adapter.extendObject(obj._id, obj);
                    mapping[ga.Address] = obj;
                }
            }
        }
    }*/



    //parseKNXObj(knxobj, function(error,result){
    //adapter.log.info('parseKNXObj');
    //for (var ix = 0; ix < objGAS.length; ix++) {
   //     adapter.extendObject(objGAS[ix]._id, objGAS[ix]);
    //}
    //});


    //parseXml(adapter.config.gaTable, function (error, result) {
        //adapter.log.info('parseXml');
        //if (result) {
        //    parseGARange(result.GroupRange);
        //}

        // and setup the message parser
    //});

}
