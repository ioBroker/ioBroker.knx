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

/*
    function dpt2type(dpt){

        if (!dpt){
            dpt = 'DPT-1';
        }
        // console.info('generateGAS: dpt2type  dpt:'  + dpt);
        var re = /s([T]-\d*)/i;
        var tmp = re.exec(dpt);
        var dptt;
        if (tmp) {
            dptt = tmp[1];
        }
        switch (dptt) {
            case 'T-1' :
                return 'boolean';
                break
            case 'T-2' :
                return '';
            default:
                return 'boolean';
        }
    }
*/

    function setValues ( readFlag, writeFlag, dpt,  dptObj, dpstObj) {
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
        if ((readFlag === 'Disabled') && (writeFlag === 'Disabled')) {
            stateFlag = 0;
            setRole = '';
        }
        if ((readFlag === 'Enabled') && (writeFlag === 'Disabled')) {
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
            case 'DPT-1' :
                setMin = 0;
                setMax = 1;
                setType = 'boolean';
                break;
            case 'DPT-1' :
                setMin = 0;
                setMax = 1;
                setType = 'boolean';
                break;

            default: {
                dpt = 'DPT-1';
                setMin = 0;
                setMax = 1;
                setType = 'boolean';
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

        // generate object of possible datapoint types
        parser.parseString(knxMaster, function (err, result) {
            //var tmpdpt = {};
            dptObj = xpath.find(result, "//DatapointType", "Id");
            dpstObj = xpath.find(result,"//DatapointSubtype", "Id");
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
                                }
                                if (matchesRes[iy].$.transmitFlag) {
                                    transmitFlag = matchesRes[iy].$.TransmitFlag;
                                }
                            }
                        }
                        var adr = adr2ga(ug.$.Address);
                        var setMin, setMax;
                        var stateFlag = 0;
                        if (dpt === ''){
                            dpt = 'DPT-1';
                        }
                        var values = setValues(readFlag, writeFlag, dpt, dptObj, dpstObj);
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