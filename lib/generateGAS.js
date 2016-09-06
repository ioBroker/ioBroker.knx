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

module.exports = (function () {

    var admZip = require("adm-zip");

    var fs = require('fs'),
        xml2js = require('xml2js'),
        eibd = require('eibd'),
        xpath = require("xml2js-xpath"),
        xpathtmp = require("xml2js-xpath");

    var fileExists = require('file-exists');

    var parser = new xml2js.Parser();

    var dpt,
        dp,
        building;

    var obj = [];

    var path = __dirname.replace('lib', 'scratch/') ,
        name1 = 'knx_master.xml',
        name2 = '0.xml';

    function fileExist (path, filename){
        console.info(path + filename);
        fs.readFile( path+filename, function( err, data ) {
            if (err) {
                if (err.code === 'ENOENT') {
                    console.log('File Doesn\'t Exist');
                    return false;
                }
                if (err.code === 'EACCES') {
                    console.log('No Permission');
                    return false;
                }
                console.log('Unknown Error');
                return false;
            }
        });
        return true;
    };

    function loadProjFile (KNXprojFilename)
    {
        console.info('loadProjFile :   ' + path + KNXprojFilename);
        // check if file exist
        if (fileExist(path,  KNXprojFilename)) {
            var zip = new admZip(path  + KNXprojFilename);
            var zipEntries = zip.getEntries(); // an array of ZipEntry records
            zipEntries.forEach(function (zipEntry) {
                if (zipEntry.name == "knx_master.xml") {
                    console.log('Extracting : ' + zipEntry.name); // outputs zip entries information
                    zip.extractEntryTo(zipEntry.entryName, path, false, true);
                }
                if (zipEntry.name == "0.xml") {
                    console.log('Extracting : ' + zipEntry.name); // outputs zip entries information
                    zip.extractEntryTo(zipEntry.entryName, path, false, true);
                }
            });
        }
        if ((fileExist(path , "0.xml" ) & (fileExist(path , "knx_master.xml")))) {
            console.info('return loadProjFile  :' + true);
            return true;
        }
        //callback(new Error('ETS projectfile not found'));
        console.info('return loadProjFile  :' + true);
        return false;
    }

    function adr2ga(adr)
    {
        var str = '';

        var a = (adr >>> 11) & 0xf;
        var b = (adr >> 8) & 0x7;
        var c = adr & 0xff;
        str = a + '/' + b + '/' + c;
        return str;
    }

    function generateOutputFile (name) {
        if (!fileExists(path + 'output.gas')) {
            if (!loadProjFile(name)){
                console.info(name + ' existiert nicht');
                var tmp = loadProjFile(name);
                return;
            }
            console.info(path + name2);
            fs.readFile(path + name2, function (err, data) {
                parser.parseString(data, function (err, result) {
                    var gaRjson;
                    var tmpobj = {};
                    // find all elements: returns xml2js JSON of the element
                    var matches = xpath.find(result, "//GroupRange", "Name");
                    // console.info(matches);
                    for (var ix = 0; ix < matches.length; ix++) {
                        var hg = matches[ix];
                        console.info(hg.$.Name);

                        var mg_all = xpath.find(hg, "//GroupRange");

                        for (var ixmg = 0; ixmg < mg_all.length; ixmg++) {
                            var mg = mg_all[ixmg];
                            console.info('    ' + mg.$.Name);
                            var ug_all = xpath.find(mg, "//GroupAddress");
                            for (var ixug = 0; ixug < ug_all.length; ixug++) {
                                var ug = ug_all[ixug];

                                var matchesRes = xpath.find(result, "//ComObjectInstanceRef");

                                //console.info(matchesRes);
                                //var ug = '';
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
                                ;

                                console.info('       ' + ug.$.Name + '     ' + adr2ga(ug.$.Address) + '    ' + ug.$.Id + '       DPT: ' + dpt + '    R:' + readFlag + '   W: ' + writeFlag);
                                tmpobj = {
                                    "_id": ug.$.Name,
                                    "type": "state",
                                    "parent": mg.$.Name,
                                    "common": {
                                        "name": ug.$.Name,        // mandatory, default _id ??
                                        "def": false,                  // optional,  default false
                                        "type": "boolean",              // optional,  default "boolean"
                                        "read": readFlag,                   // mandatory, default true
                                        "write": writeFlag,                  // mandatory, default false
                                        "min": false,                  // optional,  default false
                                        "max": true,                   // optional,  default true
                                        "role": "indicator.working",     // mandatory
                                        "desc": ""                      // optional,  default undefined
                                    }
                                };
                                //output.info(JSON.stringify(tmpobj));
                                obj.push(tmpobj);
                            }
                        }
                    }
                    fs.writeFile(path + 'output.gas', JSON.stringify(obj), (err) => {
                        if (err) throw err;
                    console.log('It\'s saved!');
                });
                    //output.info(JSON.stringify(obj));
                    console.log('Done 0.xml');
                });
            });
        }
    }

    function readOutputFile(name) {
        if (fileExists(path + 'output.gas'))
        {
            fs.readFile(path + 'output.gas', function (err, data) {
                parser.parseString(data, function (err, result) {
                    var obj = JSON.parse(data);
                    console.info(obj);
                });
            });
        } else {
            generateOutputFile(name);
            readOutputFile(name);
        }
        // callback();
        return obj;
    }

    return{
        getGAS : function(name){
            var output = readOutputFile(name);
            //knxprojfilename = name;
            console.info('generateGAS.js:getGAS name: ' +name);
            return output;
        }
    }
});