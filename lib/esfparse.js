/**
 * Created by KRingmann on 02.08.2016.
 */
'use strict';

var esfString = '';

function ESFParser(esf, options) {

    if(!(this instanceof ESFParser)) {
        return new ESFParser(options);
    }

    Readable.call(this, options);

    this._esf = esf;
    this._inputBuffer = new Buffer(0);

    var self = this;
    // hit source end
    this._source.on('end', function() {

    });

    // get data
    this._source.on('data', function(data) {
        self.onData(data);
    });

}

ESFParser.prototype.loadFile = function (){
        var fR = new FileReader;
        fR.readAsArrayBuffer(esf_file);
}
