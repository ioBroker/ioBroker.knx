/**
 * Created by KRingmann on 01.09.2016.
 */
/* search and open a knxproj File on destination dest */

console.info('Hello world.....here we go....ProjFile-open.js');
var path = '../scratch/';

var projfilename;

var admZip = require("adm-zip");

var fs = require('fs');

function ProjFile() {
    var self = this;
}

ProjFile.prototype.loadProjFile = function (KNXprojFilename,callback )
{
    var self = this;
    console.info('loadProjFile :   ' + path+KNXprojFilename);
    projfilename = KNXprojFilename;
    // check if file exist
    if (fileExist(path, KNXprojFilename)) {
        var zip = new admZip(path + KNXprojFilename);
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
    if ((fileExist(path, "0.xml" ) & (fileExist(path, "knx_master.xml")))) {
        return true;
    }
    callback(new Error('ETS projectfile not found'));
    return;
};

ProjFile.prototype.fileExist = function(path, filename){
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


