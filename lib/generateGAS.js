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
    xpath = require("xml2js-xpath");


module.exports = function (fileName, knx_master, callback) {
    if (typeof knx_master === 'function') {
        callback = knx_master;
        knx_master = null;
    }
    var parser = new xml2js.Parser();
    var dpt;
    var obj = [];

    function loadProjFile (knxProjFileName, callback) {
       // console.info('loadProjFile :   ' + dirName + knxProjFileName);
        // check if file exist
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
                    xml0 = knxMaster = zip.readAsText(zipEntry.entryName) || '';
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

    function changeValue(value) {
        switch (value) {
            case 'Disabled' :
                return false;
            case 'Enabled':
                return true;
        }
    }

    function processFile (err, knxMaster, xml0) {
        if (err) {
            return callback(err);
        }
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
                                }
                                if (matchesRes[iy].$.WriteFlag) {
                                    writeFlag = matchesRes[iy].$.WriteFlag;
                                }
                                if (matchesRes[iy].$.updateFlag) {
                                    updateFlag = matchesRes[iy].$.UpdateFlag;
                                }
                                if (matchesRes[iy].$.transmitFlag) {
                                    transmitFlag = matchesRes[iy].$.TransmitFlag;
                                }
                            }
                        }
                        // console.info('       ' + ug.$.Name + '     ' + adr2ga(ug.$.Address) + '    ' + ug.$.Id + '       DPT: ' + dpt + '    R:' + readFlag + '   W: ' + writeFlag);
                        var adr = adr2ga(ug.$.Address);

                        tmpobj = {
                            _id: hg.$.Name.replace(/[\.\s]/g, '_') + '.' + mg.$.Name.replace(/[\.\s]/g, '_') + '.' + ug.$.Name.replace(/[\.\s]/g, '_'),
                            type: "state",
                            common: {
                                "name": ug.$.Name,        // mandatory, default _id ??
                                "type": dpt,              // optional,  default "boolean", number, string
                                "read":  changeValue(readFlag),                   // mandatory, default true
                                "write": changeValue(writeFlag),                  // mandatory, default false
                                min:  false,                  // optional,  default false
                                max:  true,                   // optional,  default true
                                role: "indicator.working",    // read-only: indicator.(light, alarm, alarm.water), indicator.motion
                                // read-write: state, switch, button, level.(dimmer, blind, rgb.red, rgb.blue, rgb.green, rgb #FFAEEA, hsv.hue, hsv.saturation, hsv.)
                                desc: ""                      // optional,  default undefined
                            },
                            native: {
                                address: adr
                            }
                        };
                        obj.push(tmpobj);
                    }
                }
            }
            console.log('Done 0.xml');
            if (typeof callback === 'function') callback(null, obj);
        });
    }

    if (typeof knx_master === 'string' && typeof fileName === 'string') {
        processFile(null, knx_master, xml0);
    } else {
        loadProjFile(fileName, processFile);
    }

    /*function readOutputFile(name) {
        if (fileExists(dirName + 'output.json'))
        {
            fs.readFile(dirName + 'output.json', function (err, data) {
                parser.parseString(data, function (err, result) {
                    var obj = JSON.parse(data);
                    //console.info(obj);
                });
            });
        } else {
            generateOutputFile(name);
        }
        return obj;
    }*/

    /*return{
        getGAS : function(name){
            var output = readOutputFile(name);
            return output;
        }
    }*/
};
