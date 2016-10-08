/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

var getGAS = require(__dirname + '/lib/generateGAS');
var eibd = require('eibd');
var eibdEncode = require(__dirname + '/lib/dptEncode');
var utils =    require(__dirname + '/lib/utils'); // Get common adapter utils


var mapping = {};
var states;
var isConnected = false;
var eibdConnection;

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

        if (state.ack) return;
        if (!id) {
            adapter.log.warn('stateChange: unknown ID ' + id);
            return;
        }
        var statestmp = states;
        //adapter.log.debug('stateChange ' + id  + '  .....  state : ' + JSON.stringify(states[id]));
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

        var data =  state.val;

        var tempCon = eibd.Connection();


        eibdConnection.socketRemote({host: adapter.config.gwip, port: adapter.config.gwipport}, function (x) {
            if (isConnected) {
                eibdConnection.openTGroup(gad, 0, function (err) {
                    if (err) {
                        adapter.log.error(err);
                        return;
                    }

                    adapter.log.info('valType : ' + valtype);
                    var data = new Array(2);
                    data = eibdEncode(state.val, valtype);
                    if (data) {
                        //console.info('Schreibe ' + data);
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
            getGAS.getGAS(__dirname + '/scratch/' + knxprojfilename, function (error, result) {
                adapter.subscribeStates('*');
                main(result);
            });

            getGAS.getRoomFunctions(__dirname + '/scratch/' + knxprojfilename, function (error, result) {
                generateRoomAndFunction(result);
                adapter.subscribeForeignObjects('enum.rooms',true);
            });

    }
});


function getKeysWithValue(gaRefId, obj) {
    return Object.keys(obj).filter(function (k) {
        //console.info(k);
        return obj[k].native.addressRefId === gaRefId;
    });
}



function generateRoomAndFunction(roomObj) {
/* roomObj = [{
                building: <Name of Building>
                functions: <csv String of names of adressgroups>
                room: <name of room>
                }]
*/

    adapter.getForeignObject('enum.rooms','function',  function (err,obj){
        adapter.getForeignObjects(adapter.namespace + '.*', function (err,gaObj){
            for (var a = 0; a < roomObj.length; a++) {
                var tmproomObj = roomObj[a];
                var membersRefIdArray = [];
                var membersArray = [];
                if (tmproomObj.functions) {
                    membersRefIdArray = tmproomObj.functions.split(",");
                    for (var b = 0; b < membersRefIdArray.length; b++ ){

                        var memberId = getKeysWithValue(membersRefIdArray[b],gaObj);
                        membersArray.push(memberId[0]);
                    }
                }

                var enumRoomObj =
                {
                    "_id": "enum.rooms." + tmproomObj.building + '.' + tmproomObj.room,
                    "common": {
                        "name": tmproomObj.room,
                        "members": membersArray
                    },
                    "type": "enum"
                };
                adapter.setForeignObject('enum.rooms' + '.' + tmproomObj.building + '.' + tmproomObj.room, enumRoomObj,true);
            }


        });
    });
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
                // reverse value modification from vis => knx
                if (dpt === 'DPST-5-1'){
                    val = val / 2.55;
                }
                mapping[dest].common.value = val;
            }

            adapter.log.info('Write from ' + src + ' to ' + '(' + dest + ') ' + mappedName + ': ' + val + ' (' + dpt + ')');
            //console.info('mappedName : ' + adapter.namespace + '.' + mappedName  + '    dest : ' + dest + ' val ' + val + ' (' + dpt + ')' );

            if (mapping[dest]) {
               // console.info('mappedName : ' + adapter.namespace + '.' + mappedName  + '    dest : ' + dest + ' val ' + val + ' (' + dpt + ')' + mapping[dest]._id.replace(/(.*\.)/g, '') );
                adapter.setState(adapter.namespace + '.' + mapping[dest]._id, val, true);
            }
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
                mapping[objGAS[id].native.addressRefId] = objGAS[id];
            }

            startKnxServer();
        });
   });
}
