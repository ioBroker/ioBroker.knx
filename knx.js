/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

var getGAS      = require(__dirname + '/lib/generateGAS');
//var knx         = require(__dirname + '/lib/connector');
var knx         = require('knx');
var utils       = require(__dirname + '/lib/utils'); // Get common adapter utils
var util        = require('util');

var mapping = {};
var states  = {};
var knxConnection;
var controlDPTarray = {};

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

        if (!state) {
            var _ga = states[id].native.address;
            if (state[id])   delete state[id];
            if (mapping[_ga]) delete mapping[_ga];
            return;
        }

        if (!knxConnection) {
            adapter.log.warn('stateChange: not ready');
            return;
        }

        if (state.ack || !state.from) return;

        if (!states[id]) {
            adapter.log.warn('Unknown ID: ' + id);
            return;
        }
        var valtype = states[id].common.desc;
        var ga = states[id].native.address;

        if (!states[id].native.dpt) {
                states[id].native.dpt = convertDPTtype(valtype);
        }

        knxConnection.write(ga, state.val, states[id].native.dpt);

    },

    // is called when adapter shuts down - callback has to be called under any circumstances!
    unload: function (callback) {
        try {
            if (knxConnection) {
                knxConnection.Disconnect();
            }
        } finally {
            callback();
        }
    },

    // is called when databases are connected and adapter received configuration.
    // start here!
    ready: function () {
        adapter.subscribeStates('*');
        adapter.subscribeForeignObjects('enum.rooms', true);
        main();
    }
});

// New message arrived. obj is array with current messages
adapter.on('message', function (obj) {
    if (obj) {
        switch (obj.command) {
            case 'project':
                pasrseProject(obj.message.xml0, obj.message.knx_master, function (res) {
                    if (obj.callback) adapter.sendTo(obj.from, obj.command, res, obj.callback);
                    setTimeout(function () {
                        process.exit();
                    }, 2000);
                });
                break;

            default:
                adapter.log.warn('Unknown command: ' + obj.command);
                break;
        }
    }

    return true;
});

function pasrseProject(xml0, knx_master, callback) {
    getGAS.getGAS(xml0, knx_master, function (error, result) {
        if (error) {
            callback({error: error});
        } else {
            syncObjects(result, 0, false, function (length) {
                getGAS.getRoomFunctions(xml0, knx_master, function (error, result) {
                    generateRoomAndFunction(result, function () {
                        callback({error: null, count: length});
                    });
                });
            });
        }
    });
}

function getKeysWithValue(gaRefId, obj) {
    return Object.keys(obj).filter(function (k) {
        //console.info(k);
        return obj[k].native.addressRefId === gaRefId;
    });
}

function generateRoomAndFunction(roomObj, callback) {
/* roomObj = [{
                building: <Name of Building>
                functions: <csv String of names of adressgroups>
                room: <name of room>
                }]
*/

    adapter.getForeignObjects('enum.rooms.*', function (err, actualRooms){

        adapter.getForeignObjects(adapter.namespace + '.*', function (err, gaObj) {
            var objects = [];
            var enumRoomObjType = 0;
            // Type 0 : building + room
            // Type 1 : building + buildingpart + room
            // Type 2 : building + buildingpart + floor + room
            for (var a = 0; a < roomObj.length; a++) {
                var tmproomObj = roomObj[a];
                var membersRefIdArray = [];
                var membersArray = [];
                var enumRoomObj = {};
                if (tmproomObj.hasOwnProperty('floor')){
                    enumRoomObjType = 1;
                    for (var c = 0; c < tmproomObj.floor.rooms.length; c++ ) {
                        membersArray = [];
                        membersRefIdArray = [];
                        enumRoomObj = {};
                        if (tmproomObj.floor.rooms[c].functions) {
                            membersRefIdArray = tmproomObj.floor.rooms[c].functions.split(',');
                            for (var b = 0; b < membersRefIdArray.length; b++) {
                                var memberId = getKeysWithValue(membersRefIdArray[b], gaObj);
                                membersArray.push(memberId[0]);
                            }

                        }

                        enumRoomObj = {
                            _id: 'enum.rooms.' + tmproomObj.building + '.' + tmproomObj.part + '.' + tmproomObj.floor.rooms[c].room,
                            common: {
                                name: tmproomObj.floor.rooms[c].room,
                                members: membersArray
                            },
                            type: 'enum'
                        };
                        objects.push(enumRoomObj);
                    }
                }

                if ( ! tmproomObj.hasOwnProperty('floor')) {
                    membersArray = [];
                    membersRefIdArray = [];
                    enumRoomObj = {};
                    if (tmproomObj.functions) {
                        membersRefIdArray = tmproomObj.functions.split(',');
                        for (var b = 0; b < membersRefIdArray.length; b++) {
                            var memberId = getKeysWithValue(membersRefIdArray[b], gaObj);
                            membersArray.push(memberId[0]);
                        }
                    }

                    enumRoomObj = {
                        _id: 'enum.rooms.' + tmproomObj.building + '.' + tmproomObj.room,
                        common: {
                            name: tmproomObj.room,
                            members: membersArray
                        },
                        type: 'enum'
                    };
                    objects.push(enumRoomObj);
                }


            }
            syncObjects(objects, 0, true, callback);
        });
    });
}

function syncObjects(objects, index, isForeign, callback) {
    if (index >= objects.length) {
        if (typeof callback === 'function') callback(objects.length);
        return;
    }
    if (isForeign) {
        adapter.getForeignObject(objects[index]._id, function (err, obj) {
            if (!obj) {
                adapter.setForeignObject(objects[index]._id, objects[index], function () {
                    setTimeout(syncObjects, 0, objects, index + 1, isForeign, callback);
                });
            } else {
                if (objects[index].common.members) {
                    obj.common = obj.common || {};
                    obj.common.members = obj.common.members || [];
                    for (var m = 0; m < objects[index].common.members.length; m++) {
                        if (obj.common.members.indexOf(objects[index].common.members[m]) === -1) obj.common.members.push(objects[index].common.members[m]);
                    }
                }
                adapter.setForeignObject(obj._id, obj, function () {
                    setTimeout(syncObjects, 0, objects, index + 1, isForeign, callback);
                });
            }
        });
    } else {
        adapter.extendObject(objects[index]._id, objects[index], function () {
            setTimeout(syncObjects, 0, objects, index + 1, isForeign, callback);
        });
    }

}

function roundDec(nbr, dec_places){
    var mult = Math.pow(10,dec_places);
    return Math.round(nbr * mult) / mult;
}

function isEmptyObject(obj) {
    for (var key in obj) {
        return false;
    }
    return true;
}

function convertDPTtype( dpt ){
    if (dpt.indexOf('-') != -1){
        var parts = dpt.split('-'); // DPST, 9, 4
        if (parts.length == 3) {
            if (parts[2].length === 1) {
                parts[2] = '00' + parts[2]
            } else if (parts[2].length === 2) {
                parts[2] = '0' + parts[2]
            }
            dpt = ('DPT' + parts[1] + '.' + parts[2]).replace(/' ', ''/);
        } else {
            dpt = ('DPT' + parts[1]).replace(/' ', ''/);
        }
    }
    return dpt;
}

function startKnxServer() {

    knxConnection = knx.Connection({
        ipAddr:     adapter.config.gwip,
        ipPort:     adapter.config.gwipport,
        physAddr:   adapter.config.eibadr,
        minimumDelay: 0,
        handlers: {
            connected: function() {
                var cnt = 0;
                if (isEmptyObject(controlDPTarray)) {
                    for (var key in mapping) {
                        if ((key.match(/\d*\/\d*\/\d*/)) && ((mapping[key].common.desc) && (mapping[key].common.desc.indexOf('DP') != -1))) {
                            try {
                                    if (mapping[key].common.read) {
                                        controlDPTarray[key] = new knx.Datapoint({
                                            ga: key,
                                            dpt: convertDPTtype(mapping[key].common.desc),
                                            autoread: true
                                        }, knxConnection);
                                        console.log(cnt + '  generate controlDPT : ' + controlDPTarray[key].options.ga + '     ' + controlDPTarray[key].options.dpt + ' READABLE');
                                    } else {
                                        controlDPTarray[key] = new knx.Datapoint({
                                            ga: key,
                                            dpt: convertDPTtype(mapping[key].common.desc)
                                        }, knxConnection);
                                        console.log(cnt + '  generate controlDPT : ' + controlDPTarray[key].options.ga + '     ' + controlDPTarray[key].options.dpt);
                                    }


                                cnt++;
                            }
                            catch (e) {
                                console.warn(' could not create controlDPT for ' + key + ' with error: ' + e );
                            }
                        }
                    }
                }
                adapter.setState('info.connection', true, true);
                console.log('Connected!');
            },

            event: function (evt, src, dest, val) {
                switch (evt){
                    case 'GroupValue_Read'  :
                        var mappedName;
                        if (mapping[dest]) {
                            mappedName = mapping[dest].common.name;
                            try {
                                adapter.getForeignState(mapping[dest]._id);
                                adapter.log.info('Read from ' + src + ' to ' + '(' + dest + ') ' + mappedName);

                            } catch (e){
                                console.warn(' unable to get Value from ' + dest + ' because of : ' + e);
                            }
                        }
                    break;

                    case 'GroupValue_Response' :
                        var mappedName;
                        if (mapping[dest]) {
                            mappedName = mapping[dest].common.name;
                            adapter.setForeignState(mapping[dest]._id, {val: controlDPTarray[dest].current_value, ack:true});
                        }
                        adapter.log.info('CHANGE from ' + src + ' to ' + '(' + dest + ') ' + mappedName + ': '+val);
                    break;

                    case 'GroupValue_Write' :
                        var mappedName;

                        if (mapping[dest] && val !== undefined) {
                            var obj = mapping[dest];
                            //controlDPTarray[dest].current_value = val;
                            if (controlDPTarray[dest]) {
                                console.log('Write Value of ' + dest + ' ' + controlDPTarray[dest].current_value);
                            } else {
                                console.log('No controlDPTarray for ' + dest);
                            }

                            if (val && typeof val === 'object') {
                                if (controlDPTarray[dest]){
                                    try {
                                        adapter.log.debug('WRITE : mappedName : ' + mapping[dest].common.name + '    dest : ' + dest + '  val: ' + controlDPTarray[dest].toString() + '   (' + convertDPTtype(obj.common.desc) + ') ' + obj._id.replace(/(.*\.)/g, ''));
                                        adapter.setForeignState(mapping[dest]._id, {val: controlDPTarray[dest].current_value, ack:true});
                                    } catch(e){
                                        console.info('Wrong bufferlength on ga:' + obj._id + ' mit ' + e);
                                    }
                                }
                            }
                        } else {
                            adapter.log.warn('Value recieved on unknown GA : ' + dest );
                            //  adapter.setForeignState(mapping[dest]._id, val , true);
                        }
                    break;

                    default:    console.log("%s **** KNX EVENT: %j, src: %j, dest: %j, value: %j",
                                    new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''),
                                    evt, src, dest, val);
                }

            }
        }
    });

   //knxConnection.debug = true;
}

function main(objGAS) {
    adapter.log.info('Connecting to knx GW:  ' + adapter.config.gwip + ":" +adapter.config.gwipport + '   with phy. Adr:  ' + adapter.config.eibadr);
    adapter.log.info(utils.controllerDir);

    adapter.setState('info.connection', false, true);

    adapter.objects.getObjectView('system', 'state', {startkey: adapter.namespace + '.', endkey: adapter.namespace + '.\u9999', include_docs: true}, function (err, res) {
        if (err) {
            adapter.log.error('Cannot get objects: ' + err);
        } else {
            states = {};
            for (var i = res.rows.length - 1; i >= 0; i--) {
                var id = res.rows[i].id;
                states[id] = res.rows[i].value;
                mapping[states[id].native.address]      = states[id];
                mapping[states[id].native.addressRefId] = states[id];
            }
            startKnxServer();
        }
    });
}
