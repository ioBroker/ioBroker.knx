/**
 * Created by KRingmann on 01.09.2016.
 */
// generate JSON-object with complete GAS
/* schema from https://github.com/ioBroker/ioBroker/blob/master/doc/SCHEMA.md#object-types
 // state-working (optional)
 {
 "_id": "adapter.instance.channelName.stateName-working", // e.g. "hm-rpc.0.JEQ0205612:1.WORKING"
 "type": "state",
 "parent": "channel or device",       // e.g. "hm-rpc.0.JEQ0205612:1"
 "common": {
 "name":  "Name of state",        // mandatory, default _id ??
 "def":   false,                  // optional,  default false
 "type":  "boolean",              // optional,  default "boolean"
 "read":  true,                   // mandatory, default true
 "write": false,                  // mandatory, default false
 "min":   false,                  // optional,  default false
 "max":   true,                   // optional,  default true
 "role":  "indicator.working"     // mandatory
 "desc":  ""                      // optional,  default undefined
 }
 }
 */

'use strict';

var admZip = require('adm-zip');
var modRoleObj = require(__dirname + '/dpt2iobroker');
var utils = require(__dirname + '/utils'); // Get common adapter utils

var fs = require('fs');
var select = require('xpath');

var xml2js = require('xml2js');
var xpath = require('xml2js-xpath');
var _ = require('underscore');
var dom = require('xmldom').DOMParser;

var similarity = require('similarity');
var util = require('util');
var extend = require('util')._extend;

var devices = {};
var deviceComObjects = {};
var groupAddresses = {};
var functionOnDevice = {};
var building = {};
var fullGAPath = {};

var comObjectRefId = {};
var propertiesOfGroupAddress = {};

var comObjectInstanceRefId_GARefId = {};

module.exports = {
// generate the Groupaddress structure
    getGAS: function (fileObjectList, callback) {

        var hrstart = process.hrtime();
        console.log('Start Zeitmessung getGAS');
        var obj = [];
        var comPairsGetState = {};
        var comPairsGetWrite = {};

        function processFile(err, objectList) {

            if (err) {
                return callback(err);
            }

            parser.parseString(objectList, function (err, result) {

                var doc = objectList['0.xml'];

                _.each(select.select("//*[local-name(.)='Send']", doc), function (gaRefId, callback) {
                    comObjectInstanceRefId_GARefId[gaRefId.parentNode.parentNode.getAttribute('RefId')] = gaRefId.getAttribute('GroupAddressRefId');
                });
                /*
                 #######     Beginn Parsen Gerätekonfig   ############
                 */

                console.log('Start Zeitmessung Objectlistparsing');
                var comObject = {};
                var comPairs = {};
                _.each( objectList , function (value, key) {
                    var hrstart2 = process.hrtime();
                    if (key.match(/M.*?/)) {
                        _.each(select.select("//*[local-name(.)='ComObjectRef']", value.ComObjectRefs), function (comObjectRef, callback) {
                            if (comObjectInstanceRefId_GARefId.hasOwnProperty(comObjectRef.getAttribute('Id'))) {
                                comObjectRefId[comObjectRef.getAttribute('Id')] = {
                                    Text: comObjectRef.getAttribute('Text') || '',
                                    Name: comObjectRef.getAttribute('Name') || '',
                                    FunctionText: comObjectRef.getAttribute('FunctionText') || '',
                                    RefId: comObjectRef.getAttribute('RefId'),
                                    ObjectSize: comObjectRef.getAttribute('ObjectSize') || null,
                                    read: comObjectRef.getAttribute('ReadFlag') || null,
                                    write: comObjectRef.getAttribute('WriteFlag') || null,
                                    transmit: comObjectRef.getAttribute('TransmitFlag') || null
                                }
                            }
                        });
                    }
                    var hrend2 = process.hrtime(hrstart2);
                    console.log("Execution time of Objectlistparsing of : "  + key + '    ' + hrend2[0] + 's  ' +  hrend2[1]/1000000 + 'ms');
                });


                _.each( objectList , function (value, key) {
                    if (key.match(/M.*?/)) {
                        _.each(select.select("//*[local-name(.)='ComObject']", value.ComObjectTable), function (comObjectTable, callback) {
                            comObject[comObjectTable.getAttribute('Id')] = {
                                Text: comObjectTable.getAttribute('Text'),
                                Name: comObjectTable.getAttribute('Name'),
                                FunctionText: comObjectTable.getAttribute('FunctionText'),
                                ObjectSize: comObjectTable.getAttribute('ObjectSize'),
                                read: comObjectTable.getAttribute('ReadFlag'),
                                write: comObjectTable.getAttribute('WriteFlag'),
                                transmit: comObjectTable.getAttribute('TransmitFlag')
                            }
                        });
                    }
                });


                // update comObject properties
                var regPattern = new RegExp(/stat(e|us)|rückmeldung\s|\svalue/);
                var statusObjNames = {};
                var ObjNames = {};
                _.each(comObjectRefId , function (value , key){
                    var tmpkey = key.replace(/_\R.*/g, '');
                    comObjectRefId[key] = {
                        Text: value.Text || comObject[tmpkey].Text,
                        Name: value.Name || comObject[tmpkey].Name,
                        FunctionText: value.FunctionText || comObject[tmpkey].FunctionText,
                        ObjectSize: value.ObjectSize || comObject[tmpkey].ObjectSize,
                        read: value.read || comObject[tmpkey].read,
                        write: value.write || comObject[tmpkey].write,
                        transmit: value.transmit || comObject[tmpkey].transmit,
                    }
                    var textAndFunction = value.Text + '-' + value.Name + '-' + value.FunctionText;
                    if (value.read === 'Enabled' || value.transmit === 'Enabled') {
                        (textAndFunction.toLowerCase().match(regPattern) ? statusObjNames : ObjNames)[textAndFunction] = key;
                    } else {
                        ObjNames[textAndFunction] = key;
                    }

                });




                // find control+status pairs
                var statusObjectNames = Object.keys(statusObjNames);
                var controlObjNames = _.difference(Object.keys(ObjNames), statusObjectNames);

                _.each(statusObjNames, function (statusObj, statusObjName) {

                    var statusObjBaseName = statusObjName.toLowerCase().replace(regPattern, '');
                    var similars = _.max(controlObjNames, function (otherName, callback) {
                        return similarity(statusObjBaseName, otherName.toLowerCase());
                    });
                    var sim = similarity(statusObjBaseName.replace(' ', ''), similars.toLowerCase().replace(' ', ''));
                    if (sim > 0.90) {
                        comObjectRefId[ObjNames[similars]].statusGA = statusObj;
                        comObjectRefId[statusObj].actGA = ObjNames[similars];
                      //  console.log('found similars by DeviceObjects:  ' + statusObjName + '(' + statusObj + ')  <=>  ' + similars + '(' + ObjNames[similars] + ')     sim: ' + sim);
                    }
                });

                /*
                 #######     Ende Parsen Gerätekonfig   ############
                 */
                // map DeviceInstanceRef/@Id => its ComObjectInstanceRefs
                _.each(select.select("//*[local-name(.)='DeviceInstance']", doc), function (device, callback) {
                    var deviceId = device.getAttribute('Id');
                    devices[deviceId] = device;
                    _.each(select.select("./*[local-name(.)='ComObjectInstanceRefs']", device), function (comObjectInstanceRefs, callback) {
                        deviceComObjects[deviceId] = comObjectInstanceRefs;
                    });
                });

                var gaNames = {}; // Name => Id
                var statusGaNames = {}; // Name => Id
                var rePattern = new RegExp(/stat(e|us)|rückmeldung\s|\svalue|rm|r\/:*/);

                _.each(select.select("//*[local-name(.)='GroupAddress' and string(@Address)]", doc), function (ga, callback) {
                    var id = ga.getAttribute('Id');
                    groupAddresses[id] = ga;
                    var gaName = ga.getAttribute('Name');
                    propertiesOfGroupAddress[id] = {
                        Dpt : ga.getAttribute('DatapointType'),
                        Write :  '',
                        Read :  '',
                        Update : '',
                        statusGA:  '',
                        actGA: '',
                        ComObjectInstanceRefId: ''
                        };
                    (gaName.toLowerCase().match(rePattern) ? statusGaNames : gaNames)[gaName] = id;
                    var fullPath = gaName.replace(/[\.\s]/g, '_');
                    if (ga.parentNode.nodeName === 'GroupRange') {
                        fullPath = ga.parentNode.getAttribute('Name').replace(/[\.\s]/g, '_') + '.' + fullPath;
                        if (ga.parentNode.parentNode.nodeName === 'GroupRange') {
                            fullPath = ga.parentNode.parentNode.getAttribute('Name').replace(/[\.\s]/g, '_') + '.' + fullPath;
                        }
                    }
                    fullGAPath[ga.getAttribute('Id')] = fullPath;
                });

                // find properties of GroupAddresses based on ComObjects
                _.each(select.select("//*[local-name(.)='Connectors']/*/@GroupAddressRefId", doc), function (grpAddressRefId) {
                    if (grpAddressRefId.ownerElement.nodeName === 'Send') {
                        var dpt = grpAddressRefId.ownerElement.parentNode.parentNode.getAttribute('DatapointType');
                        var comObjectInstRefId = grpAddressRefId.ownerElement.parentNode.parentNode.getAttribute('RefId');
                        var read = comObjectRefId[grpAddressRefId.ownerElement.parentNode.parentNode.getAttribute('RefId')].read;
                        var write = comObjectRefId[comObjectInstRefId].write;
                        var update = comObjectRefId[comObjectInstRefId].transmit;
                        var statusGA = comObjectInstanceRefId_GARefId[comObjectRefId[comObjectInstRefId].statusGA];
                        var actGA = comObjectInstanceRefId_GARefId[comObjectRefId[comObjectInstRefId].actGA]
                        comObjectRefId[comObjectInstRefId].GARefId = grpAddressRefId.value;

                        if ( !(statusGA === '') )
                            write = 'Enabled';

                        if (!(dpt === '') && propertiesOfGroupAddress[grpAddressRefId.value] && !(propertiesOfGroupAddress[grpAddressRefId.value].Dpt === ''))
                            propertiesOfGroupAddress[grpAddressRefId.value].Dpt = dpt;

                        if ((dpt === '') && propertiesOfGroupAddress[grpAddressRefId.value] && !(propertiesOfGroupAddress[grpAddressRefId.value].Dpt === ''))
                            dpt = propertiesOfGroupAddress[grpAddressRefId.value].Dpt;

                        if ((dpt === '')) {
                            //console.log('No DPT set on gaRefId : ' + comObjectInstRefId + ' ... try to fetch DPT from device config.');
                            switch (comObjectRefId[comObjectInstRefId].ObjectSize) {
                                case '1 Bit' :
                                    dpt = 'DPT-1';
                                    break;
                                case '2 Bit' :
                                    dpt = 'DPT-2';
                                    break;
                                case '4 Bit' :
                                    dpt = 'DPT-3';
                                    break;
                            }
                            //console.log('No DPT set on gaRefId : ' + comObjectInstRefId + ' ... try to fetch DPT from device config.... and found ' + dpt);
                        }
                        if (!propertiesOfGroupAddress[grpAddressRefId.value]) {
                            propertiesOfGroupAddress[grpAddressRefId.value] = {
                                statusGA: statusGA || propertiesOfGroupAddress[grpAddressRefId.value].statusGA,
                                actGA: actGA || propertiesOfGroupAddress[grpAddressRefId.value].actGA,
                                ComObjectInstanceRefId: comObjectInstRefId || propertiesOfGroupAddress[grpAddressRefId.value].ComObjectInstanceRefId,
                                Read: read || propertiesOfGroupAddress[grpAddressRefId.value].Read,
                                Write: write || propertiesOfGroupAddress[grpAddressRefId.value].Write,
                                Update: update || propertiesOfGroupAddress[grpAddressRefId.value].Update,
                                Dpt: dpt
                            }
                        } else {
                            if (propertiesOfGroupAddress[grpAddressRefId.value].Update === 'Enabled'){
                                propertiesOfGroupAddress[grpAddressRefId.value] = {
                                    statusGA: propertiesOfGroupAddress[grpAddressRefId.value].statusGA,
                                    actGA: propertiesOfGroupAddress[grpAddressRefId.value].actGA,
                                    ComObjectInstanceRefId:  propertiesOfGroupAddress[grpAddressRefId.value].ComObjectInstanceRefId,
                                    Read: propertiesOfGroupAddress[grpAddressRefId.value].Read,
                                    Write:  propertiesOfGroupAddress[grpAddressRefId.value].Write,
                                    Update: propertiesOfGroupAddress[grpAddressRefId.value].Update,
                                    Dpt: dpt
                                }
                            } else {
                                propertiesOfGroupAddress[grpAddressRefId.value] = {
                                    statusGA: statusGA,
                                    actGA: actGA,
                                    ComObjectInstanceRefId: comObjectInstRefId,
                                    Read: read,
                                    Write: write,
                                    Update: update,
                                    Dpt: dpt
                                }
                            }
                        }
                    }

                });

                // for each room (or distribution board)...
                _.each(select.select("//*[local-name(.)='DeviceInstanceRef']", doc), function (roomnode, callback) {
                    var location = '';
                    if (roomnode.parentNode.nodeName === 'BuildingPart') {
                        location = roomnode.parentNode.getAttribute('Name');
                        if (roomnode.parentNode.parentNode.nodeName === 'BuildingPart') {
                            location = roomnode.parentNode.parentNode.getAttribute('Name') + '.' + location;
                            if (roomnode.parentNode.parentNode.parentNode.nodeName === 'BuildingPart') {
                                location = roomnode.parentNode.parentNode.parentNode.getAttribute('Name') + '.' + location;
                            }
                        }
                    }
                    building[roomnode.getAttribute('RefId')] = location;

                    _.each(select.select("./*[local-name(.)='DeviceInstanceRef']/@RefId", roomnode.parentNode), function (deviceRefId, callback) {
                        var devicePhysAddr = devices[deviceRefId.value].getAttribute('Address');
                        // for each communication object instance on this device..
                        if (deviceComObjects.hasOwnProperty(deviceRefId.value)) {
                            _.each(select.select("./*[local-name(.)='ComObjectInstanceRef']/*[local-name(.)='Connectors']/*[local-name(.)='Send']/@GroupAddressRefId", deviceComObjects[deviceRefId.value]), function (gaRef) {
                                var ga = groupAddresses[gaRef.value];
                                if (!functionOnDevice[deviceRefId.value])
                                    functionOnDevice[deviceRefId.value] = ga.getAttribute('Id');
                                else
                                    functionOnDevice[deviceRefId.value] = functionOnDevice[deviceRefId.value] + ',' + ga.getAttribute('Id');
                            })
                        }
                    })
                });

                // find control+status pairs
                var statusGroupAddressNames = Object.keys(statusGaNames);
                var controlGroupAddressNames = _.difference(Object.keys(gaNames), statusGroupAddressNames);
                _.each(statusGaNames, function (statusga, statusganame) {
                    var statusgabasename = statusganame.toLowerCase().replace(rePattern, '');
                    var similars = _.max(controlGroupAddressNames, function (otherName) {
                        return similarity(statusgabasename, otherName.toLowerCase());
                    });
                  //  console.log(statusganame + '( ' + statusgabasename.replace(/' 'stat(e|us):*, ''/) +' )  <=>  ' + similars + '    :  '  + similarity(statusgabasename, similars.toLowerCase()));
                    var sim = similarity(statusgabasename, similars.toLowerCase());
                    if ( sim > 0.8) {
                       // console.log('found similars:' + statusgabasename + '  <=>  ' + similars + '     sim: ' + sim);
                        if (propertiesOfGroupAddress[statusga] && propertiesOfGroupAddress[gaNames[similars]]) {

                            if (!(propertiesOfGroupAddress[gaNames[similars]].dpt === '') || ( propertiesOfGroupAddress[statusga] === '')) {
                                if ((propertiesOfGroupAddress[gaNames[similars]].dpt === '') && !( propertiesOfGroupAddress[statusga].dpt === '')) {
                                    propertiesOfGroupAddress[gaNames[similars]].dpt = propertiesOfGroupAddress[statusga].dpt;
                                }
                                if (!(propertiesOfGroupAddress[gaNames[similars]].dpt === '') && ( propertiesOfGroupAddress[statusga] === '')) {
                                    propertiesOfGroupAddress[statusga].dpt = propertiesOfGroupAddress[gaNames[similars]].dpt;
                                }
                            }
                            propertiesOfGroupAddress[gaNames[similars]].statusGA = statusga;
                            propertiesOfGroupAddress[statusga].actGA = gaNames[similars];
                        }
                    }
                });

                var tmpobj = {};

                // generate json object for adapter with iobroker convention
                _.each(groupAddresses, function (groupAddress, callback) {
                    var ga = groupAddress;
                    var id = ga.getAttribute('Id');
                    var gaName = ga.getAttribute('Name');
                    var dpt = "";
                    var fullPath = gaName.replace(/[\.\s]/g, '_');
                    if (ga.parentNode.nodeName === 'GroupRange') {
                        fullPath = ga.parentNode.getAttribute('Name').replace(/[\.\s]/g, '_') + '.' + fullPath;
                        if (ga.parentNode.parentNode.nodeName === 'GroupRange') {
                            fullPath = ga.parentNode.parentNode.getAttribute('Name').replace(/[\.\s]/g, '_') + '.' + fullPath;
                        }
                    }

                    if (propertiesOfGroupAddress[id])
                        dpt = propertiesOfGroupAddress[id].Dpt;

                    //var values = setValues(propertiesOfGroupAddress[id]);
                    var values = setValues(id);
                    var roletmp = '';
                    if (values.setType === "") {
                        roletmp = values.setRole;
                    } else {
                        roletmp = values.setRole + '.' + values.setType;
                    }

                    var readVal = changeValue(propertiesOfGroupAddress[id].Read);
                    var writeVal = changeValue(propertiesOfGroupAddress[id].Write);


                    if (propertiesOfGroupAddress[id].statusGA) {
                        writeVal = true;
                        readVal = false;
                    }
                    if (propertiesOfGroupAddress[id].actGA) {
                        writeVal = false;
                        readVal = true;
                    }

                    tmpobj = {
                        _id: fullPath,
                        type: 'state',
                        common: {
                            name: gaName,                // mandatory, default _id ??
                            type: values.stateType || values.setType,           // optional,  default "boolean", number, string
                            read: readVal,   // mandatory, default true
                            write: writeVal,  // mandatory, default false
                            role: roletmp,              // read-only: indicator.(light, alarm, alarm.water), indicator.motion
                                                        //read-write: state, switch, button, level.(dimmer, blind, rgb.red, rgb.blue, rgb.green, rgb #FFAEEA, hsv.hue, hsv.saturation, hsv.)
                            desc: dpt                   // optional,  default undefined
                        },
                        native: {
                            address: adr2ga(ga.getAttribute('Address')),
                            addressRefId: id,
                            statusGARefId: propertiesOfGroupAddress[id].statusGA || '',
                            actGARefId: propertiesOfGroupAddress[id].actGA || ''
                        }
                    };
                    if (values.setMin !== undefined) tmpobj.common.min = values.setMin;
                    if (values.setMax !== undefined) tmpobj.common.max = values.setMax;
                    obj.push(tmpobj);
                });

                console.log('Done knx_master.xml and 0.xml');
                if (typeof callback === 'function') callback(null, obj);
            });
        }

        // check if fileObjectList is typeof Object
        if (!fileObjectList.hasOwnProperty('push')) {
            processFile(null, fileObjectList);
        } else {
            loadProjFile(fileObjectList, processFile);
        }

        var hrend = process.hrtime(hrstart);
        console.log("Execution time of GetGAS : ", hrend[0] + 's  ' +  hrend[1]/1000000 + 'ms');

    },

    // generate rooms with functions of com-Object of room-assigned components
    getRoomFunctions: function (fileObjectList, callback) {
        var hrstart1 = process.hrtime();
        console.log('Start Zeitmessung getRoomFunctions');
        function processFile(err, objectList) {

            if (err) {
                return callback(err);
            }
            // generate object of building/projectstructure components
            parser.parseString(objectList, function (err, result) {

                var tmproomObj = {};
                var roomFunctionObj = [];
                //var doc = new dom().parseFromString(xml0);
                var doc = objectList['0.xml'];
                _.each(select.select("//*[local-name(.)='BuildingPart' and (@Type='Room' or @Type='DistributionBoard' or @Type='Corridor' or @ Type='Stairway')]", doc), function (roomnode, callback) {
                    var tmpFunctionObj = [];
                    tmpFunctionObj.push({rooms: []});
                    tmpFunctionObj.rooms = [];

                    var part = '';
                    var building = '';
                    var room = '';
                    var facility = '';
                    // for each device in that room...
                    _.each(select.select("./*[local-name(.)='DeviceInstanceRef']/@RefId", roomnode), function (deviceRefId) {
                        var devicePhysAddr = devices[deviceRefId.value].getAttribute('Address');
                        var ugNameList = '';
                        // for each communication object instance on this device..
                        if (deviceComObjects.hasOwnProperty(deviceRefId.value)) {
                            _.each(select.select("./*[local-name(.)='ComObjectInstanceRef']/*[local-name(.)='Connectors']/*[local-name(.)='Send']/@GroupAddressRefId", deviceComObjects[deviceRefId.value]), function (gaRef) {
                                var ga = gaRef.value;
                                if (!(ugNameList === '')) {
                                    ugNameList = ugNameList + ',' + gaRef.value;
                                } else {
                                    ugNameList = gaRef.value;
                                }
                            })
                        }

                        building = roomnode.parentNode.parentNode.getAttribute('Name').replace(/[\.\s]/g, '_');
                        part = roomnode.parentNode.getAttribute('Name').replace(/[\.\s]/g, '_');
                        room = roomnode.getAttribute('Name').replace(/[\.\s]/g, '_');
                        facility = '';
                        tmpFunctionObj.rooms.push({room: room, functions: ugNameList});
                        if (!(building === ''))
                            facility = building;

                        if (!(part === '') && !(facility === ''))
                            facility = facility + '.' + part;
                        else
                            facility = part;
                    })
                    tmproomObj = extend({facility: facility, functions: tmpFunctionObj});
                    roomFunctionObj.push(tmproomObj);
                })
                if (typeof callback === 'function') callback(null, roomFunctionObj);
            });
        }

        if (!fileObjectList.hasOwnProperty('push')) {
            processFile(null, fileObjectList);
        } else {
            loadProjFile(fileObjectList, processFile);
        }
        var hrend1 = process.hrtime(hrstart1);
        console.log("Execution time of GetRoomFunctions : ", hrend1[0] + 's  ' +  hrend1[1]/1000000 + 'ms');
    }
};


var parser = new xml2js.Parser();

function loadProjFile(knxProjFile, callback) {
    if (knxProjFile !== undefined)
        callback(null, knxProjFile);
}

function setValues(propertiesofGA) {
    var roleObj = [];
    var readFlag = propertiesOfGroupAddress[propertiesofGA].Read;
    var writeFlag = propertiesOfGroupAddress[propertiesofGA].Write;
    var updateFlag = propertiesOfGroupAddress[propertiesofGA].Update;
    var dpt = propertiesOfGroupAddress[propertiesofGA].Dpt;
    var statusGA = propertiesOfGroupAddress[propertiesofGA].statusGA;
    var actGA = propertiesOfGroupAddress[propertiesofGA].actGA;
    var stateFlag = 0;
    var choosen = false;
    roleObj.setDPT = dpt;

    if ( statusGA || actGA){
            if (statusGA)
                stateFlag = 4;
            if (actGA)
                stateFlag = 0;
    } else {

        if (((readFlag === 'Enabled' && updateFlag === 'Enabled') && (writeFlag === 'Disabled') || !(propertiesofGA.statusGA === '')) && !choosen) { // || updateFlag === 'Enabled'
            stateFlag = 0;
            choosen = true;
        }

        // K r w U = > value
        if (( (readFlag === 'Disabled' || updateFlag === 'Enabled' ) && (writeFlag === 'Disabled') || !(propertiesofGA.statusGA === '') ) && !choosen) { //|| updateFlag === 'Enabled'
            stateFlag = 0;
            choosen = true;
        }

        // K R w U => value
        if (((readFlag === 'Enabled' || updateFlag === 'Enabled') && (writeFlag === 'Disabled') || !(propertiesofGA.statusGA === '')) && !choosen) { // || updateFlag === 'Enabled'
            stateFlag = 1;
            choosen = true;
        }

        // K r W U => indicator, level, switch
        if (((readFlag === 'Disabled' || updateFlag === 'Enabled' ) && (writeFlag === 'Enabled')) && !choosen) { //|| updateFlag === 'Enabled'
            stateFlag = 2;
            choosen = true;
        }

        // K R W U => indicator, level, switch
        if (((readFlag === 'Enabled' || updateFlag === 'Enabled' ) && (writeFlag === 'Enabled')) && !choosen) { // || updateFlag === 'Enabled'
            stateFlag = 3;
            choosen = true;
        }

        // K u W u => indicator, level, switch
        if ((readFlag === 'Disabled' || updateFlag === 'Disabled' ) && (writeFlag === 'Enabled')) { //|| updateFlag === 'Disabled'
            stateFlag = 4;
            choosen = true;
        }
    }
    roleObj = modRoleObj(roleObj, stateFlag);

    return roleObj;
}

function changeValue(value) {
    switch (value) {
        case 'Disabled' :
            return false;
        case 'Enabled':
            return true;
    }
}

function adr2ga(adr) {
    return util.format('%d/%d/%d', (adr >>> 11) & 0xf, (adr >> 8) & 0x7, adr & 0xff);
}