/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

var getGAS = require(__dirname + '/lib/generateGAS');
//var knx         = require('knx');
var knx = require(__dirname + '/lib/knx-mod')
var utils = require(__dirname + '/lib/utils'); // Get common adapter utils
var util = require('util');
var _ = require('underscore');
var select = require('xpath');
var dom = require('xmldom').DOMParser;

var mapping = {};
var states = {};
var knxConnection;
var controlDPTarray = {};

var adapter = utils.adapter({
    // name has to be set and has to be equal to adapters folder name and main file name excluding extension
    name: 'knx',

    // is called if a subscribed object changes
    objectChange: function (id, obj) {
        adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));

    },

    // is called if a subscribed state changes
    stateChange: function (id, state) {
        if (!id) return;

        if (!state) {
            var _ga = states[id].native.address;
            if (state[id]) delete state[id];
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
        var valtype = convertDPTtype(states[id].common.desc);
        var ga = states[id].native.address;

        if (!states[id].common.desc) {
            states[id].common.desc = convertDPTtype(valtype);
        }
        console.log(ga, state.val, valtype);
        knxConnection.write(ga, state.val, valtype);
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
    var tmp = obj;
    //console.log('knx.js');
    if (obj) {
        switch (obj.command) {
            case 'project':
                parseProject(obj.message.xml0, obj.message.knx_master, obj.message.file, function (res) {
                    if (obj.callback) adapter.sendTo(obj.from, obj.command, res, obj.callback);
                });
                break;
            default:
                adapter.log.warn('Unknown command: ' + obj.command);
                break;
        }
    }
    return true;
});

// get xml Files from index.html via adapter.on 'message' and put it into file Obj

function parseProject(xml0, knx_master, file, callback) {

    var hrstart = process.hrtime();
    console.log('knx.js Zeitmessung parseProject start.');

    var fileObjectList = {};
    if (file) {

        for (var key in file){
            adapter.log.info('Found device : ' + file[key].Name);
          //  console.log('Found device : ' + file[key].Name + '       with Id: ' + file[key].DeviceId);

            fileObjectList[key] = {
                Name: file[key].Name,
                DeviceId: file[key].DeviceId,
                ComObjectTable: new dom().parseFromString(file[key].ComObjectTable, 'text/xml'),
                ComObjectRefs: new dom().parseFromString(file[key].ComObjectRefs, 'text/xml'),
              //  DevParameterBlock: new dom().parseFromString(file[key].DevParameterBlock, 'text/xml')
            }
        };
    }

    if (xml0){
        var doc = new dom().parseFromString(xml0);
        fileObjectList['0.xml'] = doc;
        console.log('Wrote 0.xml');
    }

    if (knx_master){
        var doc = new dom().parseFromString(knx_master);
        fileObjectList['knx_master.xml'] = doc;
        console.log('Wrote knx_master.xml');
    }

    var hrend = process.hrtime(hrstart);
    console.log("knx.js Zeitmessung parseProject STOPP : ", hrend[0] + 's  ' +  hrend[1]/1000000 + 'ms');

    fillProject(fileObjectList, callback);
}

//  ==> fileObjectList enthält ALLE Daten und Infos ==> zur Weiterverarbeitung

function fillProject(fileObjectList, callback) {

    var hrstart = process.hrtime();
    console.log('knx.js Zeitmessung fillProject start.');

    getGAS.getGAS(fileObjectList, function (error, result) {
        if (error) {
            callback({error: error});
        } else {
            syncObjects(result, 0, false, function (length) {
                getGAS.getRoomFunctions(fileObjectList, function (error, result) {
                    generateRoomAndFunction(result, function () {
                        callback({error: null, count: length});
                    });
                });
            });
        }
    });

    var hrend = process.hrtime(hrstart);
    console.log("knx.js Zeitmessung fillProject STOPP : ", hrend[0] + 's  ' +  hrend[1]/1000000 + 'ms');
}

function generateRoomAndFunction(roomObj, callback) {
    adapter.getForeignObjects('enum.rooms.*', function (err, actualRooms) {
        adapter.getForeignObjects(adapter.namespace + '.*', function (err, gaObj) {
            var objects = [];
            var enumRoomObjType = 0;
            var adressRefIdByName = {};
            _.each(gaObj, function (fullName) {
                adressRefIdByName[fullName.native.addressRefId] = fullName;
            });

            _.each(roomObj, function (rooms) {
                var facility = rooms.facility;
                var part = rooms.functions.rooms;
                var enumRoomObj = {};

                for (var i = 0; i < part.length; i++) {
                    var membersArray = [];
                    var membersRefIdArray = [];
                    enumRoomObj = {};
                    if (part[i].functions) {
                        membersRefIdArray = part[i].functions.split(',');
                        for (var b = 0; b < membersRefIdArray.length; b++) {
                            if (membersRefIdArray[b] in adressRefIdByName)
                                membersArray.push(adressRefIdByName[membersRefIdArray[b]]._id);
                        }
                    }
                    enumRoomObj = {
                        _id: 'enum.rooms.' + facility + '.' + part[i].room,
                        common: {
                            name: part[i].room,
                            members: membersArray
                        },
                        type: 'enum'
                    };
                    objects.push(enumRoomObj);
                }
            });
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

function isEmptyObject(obj) {
    for (var key in obj) {
        return false;
    }
    return true;
}

function convertDPTtype(dpt) {
    if (dpt.indexOf('-') != -1) {
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

    var cnt_complete = 0;
    var cnt_withDPT = 0;

    knxConnection = knx.Connection({
        ipAddr: adapter.config.gwip,
        ipPort: adapter.config.gwipport,
        physAddr: adapter.config.eibadr,
        //debug: true,
        minimumDelay: 100,
        handlers: {
            connected: function () {
                if (isEmptyObject(controlDPTarray)) {
                    for (var key in mapping) {
                        if ((key.match(/\d*\/\d*\/\d*/)) && ((mapping[key].common.desc) && (mapping[key].common.desc.indexOf('DP') != -1))) {
                            try {
                                // act AND state datapoint
                                if (mapping[key].common.read  ) {
                                    controlDPTarray[key] = new knx.Datapoint({
                                        ga: key,
                                        dpt: convertDPTtype(mapping[key].common.desc),
                                        autoread: true
                                    }, knxConnection);
                                    //console.log(' DP (read) erstellt für : ' + key + '    ' + mapping[key].common.name);
                                } else {
                                    // act-dp with corresponding state
                                    if ( !(mapping[key].native.statusGARefId === '')) {
                                        controlDPTarray[key] = new knx.Datapoint({
                                            ga: key,
                                            status_ga: mapping[key].native.statusGARefId,
                                            dpt: convertDPTtype(mapping[key].common.desc),
                                            autoread: false
                                        }, knxConnection);
                                        //adapter.log.info(' DPP erstellt für : ' + key + '    ' + mapping[key].common.name);
                                        console.log(' DPP erstellt für : ' + key + '    ' + mapping[key].common.name + '   mit Status : ' + mapping[key].native.statusGARefId);

                                    } else {
                                        // only act datapoint
                                        controlDPTarray[key] = new knx.Datapoint({
                                            ga: key,
                                            dpt: convertDPTtype(mapping[key].common.desc),
                                            autoread: false
                                        }, knxConnection);
                                        //adapter.log.info(' DP erstellt für : ' + key + '    ' + mapping[key].common.name);
                                        //console.log(' DP erstellt für : ' + key + '    ' + mapping[key].common.name);
                                    }
                                }
                            }
                            catch (e) {
                                adapter.log.info(' could not create controlDPT for ' + key +' with error: ' + e);
                                adapter.log.info(' maybe missing dptxxx.js definition');
                                console.log(' could not create controlDPT for ' + key + '     ' + controlDPTarray[key] + ' with error: ' + e);
                                console.log(' maybe missing dptxxx.js definition');
                            }
                            cnt_withDPT++;
                        }
                        cnt_complete++;
                    }
                }
                adapter.setState('info.connection', true, true);
                adapter.log.info('Connected!');
                console.log('Connected!   with ' + cnt_withDPT + ' datapoints of ' + cnt_complete + ' Datapoints over all.');
            },


            event: function (evt, src, dest, val) {

                switch (evt) {
                    case 'GroupValue_Read'  :
                        var mappedName;
                        if (mapping[dest]) {
                            mappedName = mapping[dest].common.name;
                            try {
                                adapter.getForeignState(mapping[dest]._id);
                                // adapter.log.debug('Read from ' + src + ' to ' + '(' + dest + ') ' + mappedName);
                                // console.log('Read from ' + src + ' to ' + '(' + dest + ') ' + mappedName);
                            } catch (e) {
                                console.warn(' unable to get Value from ' + dest + ' because of : ' + e);
                            }
                        }
                        break;

                    case 'GroupValue_Response' :
                        var mappedName;
                        if (mapping[dest]) {
                            var obj = mapping[dest];
                            mappedName = mapping[dest].common.name;
                            if (controlDPTarray[dest] && controlDPTarray[dest].current_value)
                                adapter.setForeignState(mapping[dest]._id, {
                                    val: controlDPTarray[dest].current_value,
                                    ack: true
                                });

                            if ( obj.native.actGARefId && !obj.native.actGARefId == '' ){
                                console.info(' on Response update of actGARefId : ' + obj.native.actGARefId + '     of  ' + mapping[obj.native.actGARefId]._id + '   with value  ' + controlDPTarray[dest].current_value);
                                adapter.setForeignState(mapping[obj.native.actGARefId]._id, {
                                    val: controlDPTarray[dest].current_value,
                                    ack: true
                                });
                            }

                        }
                       // adapter.log.info('CHANGE from ' + src + ' to ' + '(' + dest + ') ' + mappedName + ': ' + controlDPTarray[dest].current_value);
                       //   console.log('GROUPVALUE_RESPONSE from ' + src + ' to ' + '(' + dest + ') ' + mappedName + ': ' + controlDPTarray[dest].current_value);
                        break;

                    case 'GroupValue_Write' :
                        var mappedName;
                        if (mapping[dest] && val !== undefined) {
                            var obj = mapping[dest];

                            if (val && typeof val === 'object') {
                                if (controlDPTarray[dest]) {
                                    try {
    //                                    adapter.log.debug('WRITE : mappedName : ' + mapping[dest].common.name + '    dest : ' + dest + '  val: ' + controlDPTarray[dest].toString() + '   (' + convertDPTtype(obj.common.desc) + ') ' + obj._id.replace(/(.*\.)/g, ''));
                                        adapter.setForeignState(mapping[dest]._id, {
                                            val: controlDPTarray[dest].current_value,
                                            ack: true
                                        });
                                        if ( obj.native.actGARefId && !obj.native.actGARefId == '' ){
    //                                        console.info(' update of actGARefId : ' + obj.native.actGARefId + ' of ' + mapping[obj.native.actGARefId]._id + ' to ' + controlDPTarray[dest].current_value );
                                            adapter.setForeignState(mapping[obj.native.actGARefId]._id, {
                                                val: controlDPTarray[dest].current_value,
                                                ack: true
                                            });
                                        }
                                        //console.log(' knx.js : GroupValue_Write : ' + controlDPTarray[dest].current_value + ' mapping[dest]:' + mapping[dest]._id );
                                    } catch (e) {
                                        console.info('Wrong bufferlength on ga:' + obj._id + ' mit ' + e);
                                    }
                                }
                            }
                        } else {
                            adapter.log.warn('Value recieved on unknown GA : ' + dest);
                            //  adapter.setForeignState(mapping[dest]._id, val , true);
                        }
                        break;

                    default:
                        console.log("%s **** KNX EVENT: %j, src: %j, dest: %j, value: %j",
                            new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''),
                            evt, src, dest, val);
                }
            }
        }
    });
}

function main(objGAS) {
    adapter.log.info('Connecting to knx GW:  ' + adapter.config.gwip + ":" + adapter.config.gwipport + '   with phy. Adr:  ' + adapter.config.eibadr);
    adapter.log.info(utils.controllerDir);

    adapter.setState('info.connection', false, true);

    adapter.objects.getObjectView('system', 'state', {
        startkey: adapter.namespace + '.',
        endkey: adapter.namespace + '.\u9999',
        include_docs: true
    }, function (err, res) {
        if (err) {
            adapter.log.error('Cannot get objects: ' + err);
        } else {
            states = {};
            for (var i = res.rows.length - 1; i >= 0; i--) {
                var id = res.rows[i].id;
                states[id] = res.rows[i].value;
                mapping[states[id].native.address] = states[id];
                mapping[states[id].native.addressRefId] = states[id];
            }
            startKnxServer();
        }
    });
}
