'use strict';
/**
 * Created by KRingmann on 24.09.2016.
 */



module.exports = function (roleObj) {
    var dpt = roleObj.setDPT;
    var setMin, setMax, setType ;
    switch (roleObj.setDPT) {
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
            var dpt = '';
            setMin = 0;
            setMax = 1;
            setType = '';
        }
    }
    roleObj.setDPT = dpt;
    roleObj.setMin = setMin;
    roleObj.setMax = setMax;
    roleObj.setType = setType;
    return roleObj;
}