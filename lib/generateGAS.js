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
var admZip = require("adm-zip");

var fs = require('fs'),
    path = require('path'),
    xml2js = require('xml2js'),
    eibd = require('eibd'),
    xpath = require("xml2js-xpath"),
    _ = require("underscore");



module.exports = function (fileName, callback) {
    var parser = new xml2js.Parser();
    var dpt;
    var obj = [];

    function loadProjFile (knxProjFileName, callback) {
        var knxMaster;
        var xml0;
        if (fs.existsSync(knxProjFileName)) {
            var zip = new admZip(knxProjFileName);
            var zipEntries = zip.getEntries(); // an array of ZipEntry records
            zipEntries.forEach(function (zipEntry) {
                if (zipEntry.name === 'knx_master.xml') {
                    knxMaster = zip.readAsText(zipEntry.entryName) || '';
                    console.log('Extracting : ' + zipEntry.name); // outputs zip entries information

                    if (knxMaster !== undefined && xml0 !== undefined) {
                        callback(null, knxMaster, xml0)
                    }
                }
                if (zipEntry.name === '0.xml') {
                    xml0 = zip.readAsText(zipEntry.entryName) || '';
                    console.log('Extracting : ' + zipEntry.name); // outputs zip entries information
                    if (knxMaster !== undefined && xml0 !== undefined) {
                        callback(null, knxMaster, xml0)
                    }
                }
            });
        } else {
            callback('File "' + knxProjFileName + '" not exists');
        }
    }

    function adr2ga(adr) {
        var str = '';

        var a = (adr >>> 11) & 0xf;
        var b = (adr >> 8) & 0x7;
        var c = adr & 0xff;
        str = a + '/' + b + '/' + c;
        return str;
    }

    function changeValue(value){
        switch (value) {
            case 'Disabled' :
                return false;
            case 'Enabled':
                return true;
        }
    }


    function setValues ( readFlag, writeFlag, updateFlag, dpt,  dptObj, dpstObj) {
        var roleObj = [];
        var dptName = '';

        for (i=0; i < dptObj.length; i++){
            var tmpdpt = dptObj[i];
            if (tmpdpt.$.Id == dpt){
                dptName = tmpdpt.$.Text;
                i = dptObj.length;
            }
        }
        if (!dptName){
            for ( i = 0; i < dpstObj.length; i ++){
                var tmpdpst = dpstObj[i];
                if (tmpdpst.$.Id == dpt){
                    dptName = tmpdpst.$.Text;
                    i = dpstObj.length;
                }
            }
        }


        var setMin, setMax, setRole;

        if (!readFlag) readFlag = 'Disabled';

        if ((readFlag === 'Disabled' || updateFlag === 'Enabled') && (writeFlag === 'Disabled')) {
            stateFlag = 0;
            setRole = 'value';
        }
        if ((readFlag === 'Enabled' || updateFlag === 'Enabled') && (writeFlag === 'Disabled')) {
            stateFlag = 1;
            setRole = 'value';
        }
        if ((readFlag === 'Disabled') && (writeFlag === 'Enabled')) {
            stateFlag = 2;
            setRole = '';
        }
        if ((readFlag === 'Enabled') && (writeFlag === 'Enabled')) {
            stateFlag = 3;
            setRole = 'state';
        }

        switch (dpt) {
            // DPT 1
            case 'DPT-1' :
                setMin = 0;
                setMax = 1;
                setType = 'boolean';
                break;

            // DPT 2
            case 'DPT-2' :
                setMin = 0;
                setMax = 3;
                setType = 'boolean';
                break;

            // DPT 3
            case 'DPT-3' :
                setMin = 0;
                setMax = 7;
                setType = 'number';
                break;

            // DPT 4
            case 'DPT-4' :
                setMin = '';
                setMax = '';
                setType = 'string';
                break;

            // DPT 5
            case 'DPT-5' :
                setMin = 0;
                setMax = 100;
                setType = 'number';
                break;
            case 'DPST-5-1' :
                setMin = 0;
                setMax = 100;
                setType = 'number';
                break;
            case 'DPST-5-3' :
                setMin = 0;
                setMax = 255;
                setType = 'number';
                break;
            case 'DPST-5-4' :
                setMin = 0;
                setMax = 255;
                setType = 'number';
                break;
            case 'DPST-5-5' :
                setMin = 0;
                setMax = 255;
                setType = 'number';
                break;
            case 'DPST-5-6' :
                setMin = 0;
                setMax = 255;
                setType = 'number';
                break;
            case 'DPST-5-10' :
                setMin = 0;
                setMax = 255;
                setType = 'number';
                break;

            // DPT 6
            case 'DPT-6' :
                setMin = -128;
                setMax = 127;
                setType = 'number';
                break;

            // DPT 7
            case 'DPT-7' :
                setMin = 0;
                setMax = 65535;
                setType = 'number';
                break;

            // DPT 9
            case 'DPT-9' :
                setMin = -670760;
                setMax = 670760;
                setType = 'number';
                break;
            case 'DPT-9-1' :
                setMin = -670760;
                setMax = 670760;
                setType = 'number';
                break;
            case 'DPT-9-2' :
                setMin = -670760;
                setMax = 670760;
                setType = 'number';
                break;
            case 'DPT-9-3' :
                setMin = -670760;
                setMax = 670760;
                setType = 'number';
                break;
            case 'DPT-9-4' :
                setMin = -670760;
                setMax = 670760;
                setType = 'number';
                break;
            case 'DPT-9-5' :
                setMin = -670760;
                setMax = 670760;
                setType = 'number';
                break;
            case 'DPT-9-6' :
                setMin = -670760;
                setMax = 670760;
                setType = 'number';
                break;
            case 'DPT-9-7' :
                setMin = -670760;
                setMax = 670760;
                setType = 'number';
                break;
            case 'DPT-9-8' :
                setMin = -670760;
                setMax = 670760;
                setType = 'number';
                break;
            case 'DPT-9-9' :
                setMin = -670760;
                setMax = 670760;
                setType = 'number';
                break;
            case 'DPT-9-10' :
                setMin = -670760;
                setMax = 670760;
                setType = 'number';
                break;
            case 'DPT-9-11' :
                setMin = -670760;
                setMax = 670760;
                setType = 'number';
                break;
            case 'DPT-9-20' :
                setMin = -670760;
                setMax = 670760;
                setType = 'number';
                break;
            case 'DPT-9-21' :
                setMin = -670760;
                setMax = 670760;
                setType = 'number';
                break;
            case 'DPT-9-22' :
                setMin = -670760;
                setMax = 670760;
                setType = 'number';
                break;
            case 'DPT-9-23' :
                setMin = -670760;
                setMax = 670760;
                setType = 'number';
                break;
            case 'DPT-9-24' :
                setMin = -670760;
                setMax = 670760;
                setType = 'number';
                break;
            case 'DPT-9-25' :
                setMin = -670760;
                setMax = 670760;
                setType = 'number';
                break;
            case 'DPT-9-26' :
                setMin = -670760;
                setMax = 670760;
                setType = 'number';
                break;
            case 'DPT-9-27' :
                setMin = -670760;
                setMax = 670760;
                setType = 'number';
                break;
            case 'DPT-9-28' :
                setMin = -670760;
                setMax = 670760;
                setType = 'number';
                break;

            // DPT-16
            case 'DPT-16' :
                setMin = '';
                setMax = '';
                setType = 'string';
                break;
            case 'DPT-16-0' :
                setMin = '';
                setMax = '';
                setType = 'string';
                break;
            case 'DPT-16-1' :
                setMin = '';
                setMax = '';
                setType = 'string';
                break;

            default: {
                dpt = '';
                setMin = 0;
                setMax = 1;
                setType = '';
            }
        }
        roleObj.setType = setType;
        roleObj.setMin = setMin;
        roleObj.setMax = setMax;
        roleObj.setRole = setRole;
        roleObj.setdptName = dptName;
        return roleObj;
    }

    loadProjFile(fileName, function (err, knxMaster, xml0) {

        if (err) {
            return callback(err);
        }
        var dptObj = {};
        var dpstObj = {};
        var roomObj = {};

        // generate object of possible datapoint types
        parser.parseString(knxMaster, function (err, result) {
            dptObj = xpath.find(result, "//DatapointType", "Id");
            dpstObj = xpath.find(result,"//DatapointSubtype", "Id");
        });

        // generate object of building/projectstructure components
        parser.parseString(xml0, function (err, result){
            roomObj = xpath.find(result, "//BuildingPart", "Name");
        });

        // generate json object for adapter with iobroker convention
        parser.parseString(xml0, function (err, result) {
            var tmpobj = {};
            // find all elements: returns xml2js JSON of the element
            var matches = xpath.find(result, "//GroupRange", "Name");
            // console.info(matches);
            for (var ix = 0; ix < matches.length; ix++) {
                var hg = matches[ix];
                //console.info(hg.$.Name);

                var mg_all = xpath.find(hg, "//GroupRange");

                for (var ixmg = 0; ixmg < mg_all.length; ixmg++) {
                    var mg = mg_all[ixmg];
                    //console.info('    ' + mg.$.Name);
                    var ug_all = xpath.find(mg, "//GroupAddress");
                    for (var ixug = 0; ixug < ug_all.length; ixug++) {
                        var ug = ug_all[ixug];

                        var matchesRes = xpath.find(result, "//ComObjectInstanceRef");
                        var readFlag, writeFlag, transmitFlag, updateFlag;
                        for (var iy = 0; iy < matchesRes.length; iy++) {

                            if (matchesRes[iy].$.Description == ug.$.Name) {
                                dpt = matchesRes[iy].$.DatapointType;
                                if (matchesRes[iy].$.ReadFlag) {
                                    readFlag = matchesRes[iy].$.ReadFlag;
                                } else {
                                    readFlag = 'Enabled';
                                }
                                if (matchesRes[iy].$.WriteFlag) {
                                    writeFlag = matchesRes[iy].$.WriteFlag;
                                } else {
                                    writeFlag = 'Enabled';
                                }
                                if (matchesRes[iy].$.updateFlag) {
                                    updateFlag = matchesRes[iy].$.UpdateFlag;
                                } else {
                                    updateFlag = 'Enabled';
                                }
                                if (matchesRes[iy].$.transmitFlag) {
                                    transmitFlag = matchesRes[iy].$.TransmitFlag;
                                } else {
                                    transmitFlag = 'Enabled';
                                }
                            }
                        }
                        var adr = adr2ga(ug.$.Address);
                        var setMin, setMax;
                        var stateFlag = 0;

                        if (dpt === ''){
                            dpt = 'not defined in ETS';
                        }

                        var values = setValues(readFlag, writeFlag, updateFlag, dpt, dptObj, dpstObj);
                        if (!values.setRole){
                            values.setRole = 'indicator';
                        }
                        tmpobj = {
                            _id: hg.$.Name.replace(/[\.\s]/g, '_') + '.' + mg.$.Name.replace(/[\.\s]/g, '_') + '.' + ug.$.Name.replace(/[\.\s]/g, '_'),
                            type: "state",
                            common: {
                                name: ug.$.Name,        // mandatory, default _id ??
                                type: values.setType,              // optional,  default "boolean", number, string
                                read:  changeValue(readFlag),                   // mandatory, default true
                                write: changeValue(writeFlag),                  // mandatory, default false
                                min:  values.setMin,                  // optional,  default false
                                max:  values.setMax,                   // optional,  default true
                                role: values.setRole + '.' + values.setdptName,    // read-only: indicator.(light, alarm, alarm.water), indicator.motion
                                // read-write: state, switch, button, level.(dimmer, blind, rgb.red, rgb.blue, rgb.green, rgb #FFAEEA, hsv.hue, hsv.saturation, hsv.)
                                desc: dpt,                      // optional,  default undefined
                            },
                            native: {
                                address: adr
                            }
                        };
                        obj.push(tmpobj);
                    }
                }
            }
            console.log('Done knx_master.xml and 0.xml');
            if (typeof callback === 'function') callback(null, obj);
        });
    });
};