'use strict';
/**
 * Created by KRingmann on 23.09.2016.
 */
// de- and encoding value with given DPT

module.exports = function (value, dpt) {
    var data;
        if (dpt) {
            var tmpdpt = dpt.match(/[T]-\d*/)[0];
        }

        var statevalue = value;
        switch (tmpdpt) {
            // switch
            case 'T-1' :
                var data = new Array(2);
                data[0] = 0;
                data[1] = 0x80 | value & 0x01;
                //console.info('Schreibe DP' + tmpdpt + ' mit ' + data);
                break;

            // 1-Bit controlled
            case 'T-2' :
                var data = new Array(2);
                data[0] = 0;
                data[1] = 0x80 | value & 0x03;
                //console.info('Schreibe DP' + tmpdpt + ' mit ' + data);
                break;

            // 4-Bit (3-bit controlled)
            case 'T-3' :
                var data = new Array(2);
                data[0] = 0;
                data[1] = 0x80 | value & 0x0F;
                //console.info('Schreibe DP' + tmpdpt + ' mit ' + data);
                break;

            // 8-Bit Character
            case 'T-4' :
                var data = new Array(2);
                data[0] = 0;
                data[1] = 0x80;
                data[2] = 0xFF & value;
                //console.info('Schreibe DP' + tmpdpt + ' mit ' + data);
                break;

            // 8-Bit unsigned value
            case 'T-5' :
               statevalue = value;
              // if ( dpt === 'DPST-5-1'){
              //      statevalue = (value * 2.55);
                    // console.info('DPST-5-1' + ' val: ' + statevalue);
              // }

                var data = new Array(2);
                data[0] = 0;
                data[1] = 0x80;
                data[2] = 0xFF & statevalue;
                console.info('Schreibe DP' + tmpdpt + ' mit ' + data + ' value: ' + statevalue);
                break;

            // 2-byte unsigned
            case 'T-6' :
                var data = new Array(2);
                var byte1 = value & 0xFF;
                var byte2 = (value & 0xFF00) >> 8;
                data[0] = 0;
                data[1] = 0x80;
                data[2] = byte2;
                data[3] = byte1;
                //console.info('Schreibe DP' + tmpdpt + ' mit ' + data);
                break;

            // 2-byte unsigned
            case 'T-7' :
                console.info('not handled Schreibe DP' + tmpdpt + ' mit ' + data);
                break;

            // 2-byte signed value
            case 'T-8' :
                console.info('not handled Schreibe DP' + tmpdpt + ' mit ' + data);
                break;

            // 2-byte float value
            case 'T-9' :
                var tmpar = [0,0];
                // Reverse of the formula: FloatValue = (0,01M)2^E
                var exp = Math.floor(Math.max(Math.log(Math.abs(value)*100)/Math.log(2)-10, 0));
                var mant = value * 100 / (1 << exp);

                //Fill in sign bit
                if(value < 0) {
                    data[0] |= 0x80;
                    mant = (~(mant * -1) + 1) & 0x07ff;
                }

                //Fill in exp (4bit)
                tmpar[0] |= (exp & 0x0F) << 3;

                //Fill in mant
                tmpar[0] |= (mant >> 8) & 0x7;
                tmpar[1] |= mant & 0xFF;

                data[0] = 0x00;
                data[1] = tempar[0];
                data[2] = tempar[1];

                //console.info('Schreibe DP' + tmpdpt + ' mit ' + data);
                break;

            // 4-byte signed value
            case 'T-13':
                var byte1 = value & 0xFF;
                var byte2 = (value >> 8) & 0xFF;
                var byte3 = (value >> 16) & 0xFF;
                var byte4 = (value >> 24) & 0xFF;

                var data = new Array(2);
                data[0] = 0;
                data[1] = 0x80;
                date[2] = byte4;
                data[3] = byte3;
                data[4] = byte2;
                data[5] = byte1;
                break;

            // 112Bit character string
            case 'T-16':

                console.info('not handled Schreibe DP' + tmpdpt + ' mit ' + data);
                break;

            default:
                var data = new Array(2);
                data[0] = 0;
                data[1] = 0x80 | value;

                console.info('DEFAULT Schreibe DP' + tmpdpt + ' mit ' + data);
                break;
        }
    return data;
}


