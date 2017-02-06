'use strict';
/**
 * Created by KRingmann on 24.09.2016.
 */

module.exports = function (roleObj, statusFlag) {
    var dpt = roleObj.setDPT;
    var stateFlag = statusFlag.toString();
    var setMin;
    var setMax;
    var setType;
    var setRole;
    var stateType;

    switch (roleObj.setDPT) {
        // DPT 1
        case 'DPT-1' :
            setMin = 0;
            setMax = 1;
            setType = '';
            stateType = 'boolean';// boolean, number, string, array, mixed
            switch (stateFlag) {
                case '0' :
                    setRole = 'value';
                    setType = '';
                    break;
                case '1' :
                    setRole = 'value';
                    setType = '';
                    break;
                case '2' :
                    setRole = 'switch';
                    setType = '';
                    break;
                case '3' :
                    setRole = 'switch';
                    setType = '';
                    break;
                case '4' :
                    setRole = 'switch';
                    setType = '';
                    break;
            }
            break;

        // switch
        case 'DPST-1-1' :
            setMin = 0;
            setMax = 1;
            setType = '';
            stateType = 'boolean';// boolean, number, string, array, mixed
            switch (stateFlag) {
                case '0' :
                    setRole = 'value';
                    setType = '';
                    break;
                case '1' :
                    setRole = 'value';
                    setType = '';
                    break;
                case '2' :
                    setRole = 'switch';
                    setType = '';
                    break;
                case '3' :
                    setRole = 'switch';
                    setType = '';
                    break;
                case '4' :
                    setRole = 'switch';
                    setType = '';
                    break;
            }
            break;

        case 'DPST-1-2' :
            setMin = 0;
            setMax = 1;
            setType = '';
            stateType = 'boolean';// boolean, number, string, array, mixed
            switch (stateFlag) {
                case '0' :
                    setRole = 'value';
                    setType = '';
                    break;
                case '1' :
                    setRole = 'value';
                    setType = '';
                    break;
                case '2' :
                    setRole = 'switch';
                    setType = '';
                    break;
                case '3' :
                    setRole = 'switch';
                    setType = '';
                    break;
                case '4' :
                    setRole = 'switch';
                    setType = '';
                    break;
            }
            break;

        // DPT 2
        case 'DPT-2' :
            setMin = 0;
            setMax = 3;
            setType = '';
            stateType = 'number';
            switch (stateFlag){
                case '0' : setRole = 'value';
                    break;
                case '1' : setRole = 'value';
                    break;
                case '2' : setRole = 'indicator';
                    break;
                case '3' : setRole = 'indicator';
                    break;
                case '4' : setRole = 'indicator';
                    break;
            }
            break;

        // DPT 3
        case 'DPT-3' :
            setMin    = 0;
            setMax    = 7;
            setType   = '';
            stateType = 'number';
            switch (stateFlag){
                case '0' : setRole = 'value';
                    break;
                case '1' : setRole = 'value';
                    break;
                case '2' : setRole = 'indicator';
                    break;
                case '3' : setRole = 'indicator';
                    break;
                case '4' : setRole = 'indicator';
                    break;
            }
            break;

        // DPT 4
        case 'DPT-4' :
            setMin = '';
            setMax = '';
            setType = 'string';
            stateType = 'number';

            switch (stateFlag){
                case '0' : setRole = 'text';
                    break;
                case '1' : setRole = 'text';
                    break;
                case '2' : setRole = 'text';
                    break;
                case '3' : setRole = 'text';
                    break;
                case '4' : setRole = 'text';
                    break;
            }
            break;

        // DPT 5
        case 'DPT-5' :
            setMin = 0;
            setMax = 255;
            setType = '';
            stateType = 'number';

            switch (stateFlag) {
                case '0' :
                    setRole = 'value';
                    setType = '';
                    break;
                case '1' :
                    setRole = "value";
                    setType = "";
                    break;
                case '2' :
                    setRole = "level";
                    setType = "dimmer";
                    break;
                case '3' :
                    setRole = "level";
                    setType = "dimmer";
                    break;
                case '4' :
                    setRole = "level";
                    setType = "dimmer";
                    break;
            }
            break;

        case 'DPST-5-1' :
            setMin = 0;
            setMax = 100;
            setType = '';
            stateType = 'number';

            switch (stateFlag){
                case "0" :
                    setRole = 'value';
                    setType = 'dimmer';
                    break;
                case "1" :
                    setRole = 'value';
                    setType = 'dimmer';
                    break;
                case "2" :
                    setRole = 'level';
                    setType = 'dimmer';
                    break;
                case "3" :
                    setRole = 'level';
                    setType = 'dimmer';
                    break;
                case "4" :
                    setRole = 'level';
                    setType = 'dimmer';
                    break;
            }
            break;

        case 'DPST-5-3' :
            setMin = 0;
            setMax = 255;
            setType = '';
            stateType = 'number';
            switch (stateFlag){
                case '0' : setRole = 'value';
                    break;
                case '1' : setRole = 'value';
                    break;
                case '2' : setRole = 'level';
                    break;
                case '3' : setRole = 'level';
                    break;
                case '4' : setRole = 'level';
                    break;
            }
            break;
        case 'DPST-5-4' :
            setMin = 0;
            setMax = 255;
            setType = '';
            stateType = 'number';
            switch (stateFlag){
                case '0' : setRole = 'value';
                    break;
                case '1' : setRole = 'value';
                    break;
                case '2' : setRole = 'level';
                    break;
                case '3' : setRole = 'level';
                    break;
                case '4' : setRole = 'level';
                    break;
            }
            break;
        case 'DPST-5-5' :
            setMin = 0;
            setMax = 255;
            setType = '';
            stateType = 'number';
            switch (stateFlag){
                case '0' : setRole = 'value';
                    break;
                case '1' : setRole = 'value';
                    break;
                case '2' : setRole = 'level';
                    break;
                case '3' : setRole = 'level';
                    break;
                case '4' : setRole = 'level';
                    break;
            }
            break;
        case 'DPST-5-6' :
            setMin = 0;
            setMax = 255;
            setType = '';
            stateType = 'number';
            switch (stateFlag){
                case '0' : setRole = 'value';
                    break;
                case '1' : setRole = 'value';
                    break;
                case '2' : setRole = 'level';
                    break;
                case '3' : setRole = 'level';
                    break;
                case '4' : setRole = 'level';
                    break;
            }
            break;
/*
        case 'DPST-5-1' :
            setMin = 0;
            setMax = 255;
            setType = '';
            stateType = 'number';
            switch (stateFlag){
                case '0' : setRole = 'value';
                    break;
                case '1' : setRole = 'value';
                    break;
                case '2' : setRole = 'level';
                    break;
                case '3' : setRole = 'level';
                    break;
                case '4' : setRole = 'level';
                    break;
            }
            break;
*/
        // DPT 6
        case 'DPT-6' :
            setMin = -128;
            setMax = 127;
            setType = '';
            switch (stateFlag){
                case '0' : setRole = 'value';
                    break;
                case '1' : setRole = 'value';
                    break;
                case '2' : setRole = 'level';
                    break;
                case '3' : setRole = 'level';
                    break;
                case '4' : setRole = 'level';
                    break;
            }
            break;

        // DPT 7
        case 'DPT-7' :
            setMin = 0;
            setMax = 65535;
            setType = '';
            stateType = 'number';
            switch (stateFlag){
                case '0' : setRole = 'value';
                    break;
                case '1' : setRole = 'value';
                    break;
                case '2' : setRole = 'level';
                    break;
                case '3' : setRole = 'level';
                    break;
                case '4' : setRole = 'level';
                    break;
            }
            break;

        // DPT 9
        case 'DPT-9' :
            setMin = -670760;
            setMax = 670760;
            setType = 'number';
            stateType = 'number';
            switch (stateFlag){
                case '0' : setRole = 'value';
                    break;
                case '1' : setRole = 'value';
                    break;
                case '2' : setRole = 'level';
                    break;
                case '3' : setRole = 'level';
                    break;
                case '4' : setRole = 'level';
                    break;
            }
            break;
        case 'DPST-9-1' :
            setMin = -670760;
            setMax = 670760;
            setType = 'number';
            stateType = 'number';
            switch (stateFlag){
                case '0' : setRole = 'value.temperature';
                    break;
                case '1' : setRole = 'value.temperature';
                    break;
                case '2' : setRole = 'level.temperature';
                    break;
                case '3' : setRole = 'level.temperature';
                    break;
                case '4' : setRole = 'level.temperature';
                    break;
            }
            break;
        case 'DPST-9-2' :
            setMin = -670760;
            setMax = 670760;
            setType = 'number';
            switch (stateFlag){
                case '0' : setRole = 'value.temperature';
                    break;
                case '1' : setRole = 'value.temperature';
                    break;
                case '2' : setRole = 'level.temperature';
                    break;
                case '3' : setRole = 'level.temperature';
                    break;
                case '4' : setRole = 'level.temperature';
                    break;
            }
            break;
        case 'DPST-9-3' :
            setMin = -670760;
            setMax = 670760;
            setType = 'number';
            switch (stateFlag){
                case '0' : setRole = 'value';
                    break;
                case '1' : setRole = 'value';
                    break;
                case '2' : setRole = 'level';
                    break;
                case '3' : setRole = 'level';
                    break;
                case '4' : setRole = 'level';
                    break;
            }
            break;
        case 'DPST-9-4' :
            setMin = -670760;
            setMax = 670760;
            setType = 'number';
            switch (stateFlag){
                case '0' : setRole = 'value.lux';
                    break;
                case '1' : setRole = 'value.lux';
                    break;
                case '2' : setRole = 'level.lux';
                    break;
                case '3' : setRole = 'level.lux';
                    break;
                case '4' : setRole = 'level.lux';
                    break;
            }
            break;
        case 'DPST-9-5' :
            setMin = -670760;
            setMax = 670760;
            setType = 'number';
            switch (stateFlag){
                case '0' : setRole = 'value.speed';
                    break;
                case '1' : setRole = 'value.speed';
                    break;
                case '2' : setRole = 'level.speed';
                    break;
                case '3' : setRole = 'level.speed';
                    break;
                case '4' : setRole = 'level.speed';
                    break;
            }
            break;
        case 'DPST-9-6' :
            setMin = -670760;
            setMax = 670760;
            setType = 'number';
            switch (stateFlag){
                case '0' : setRole = 'value.pressure';
                    break;
                case '1' : setRole = 'value.pressure';
                    break;
                case '2' : setRole = 'level.pressure';
                    break;
                case '3' : setRole = 'level.pressure';
                    break;
                case '4' : setRole = 'level.pressure';
                    break;
            }
            break;
        case 'DPST-9-7' :
            setMin = -670760;
            setMax = 670760;
            setType = 'number';
            switch (stateFlag){
                case '0' : setRole = 'value.humidity';
                    break;
                case '1' : setRole = 'value.humidity';
                    break;
                case '2' : setRole = 'level.humidity';
                    break;
                case '3' : setRole = 'level.humidity';
                    break;
                case '4' : setRole = 'level.humidity';
                    break;
            }
            break;
        case 'DPST-9-8' :
            setMin = -670760;
            setMax = 670760;
            setType = 'number';
            switch (stateFlag){
                case '0' : setRole = 'value';
                    break;
                case '1' : setRole = 'value';
                    break;
                case '2' : setRole = 'level';
                    break;
                case '3' : setRole = 'level';
                    break;
                case '4' : setRole = 'level';
                    break;
            }
            break;
        case 'DPST-9-9' :
            setMin = -670760;
            setMax = 670760;
            setType = 'number';
            switch (stateFlag){
                case '0' : setRole = 'value';
                    break;
                case '1' : setRole = 'value';
                    break;
                case '2' : setRole = 'level';
                    break;
                case '3' : setRole = 'level';
                    break;
                case '4' : setRole = 'level';
                    break;
            }
            break;
        case 'DPST-9-10' :
            setMin = -670760;
            setMax = 670760;
            setType = 'number';
            switch (stateFlag){
                case '0' : setRole = 'value';
                    break;
                case '1' : setRole = 'value';
                    break;
                case '2' : setRole = 'level';
                    break;
                case '3' : setRole = 'level';
                    break;
                case '4' : setRole = 'level';
                    break;
            }
            break;
        case 'DPST-9-11' :
            setMin = -670760;
            setMax = 670760;
            setType = 'number';
            switch (stateFlag){
                case '0' : setRole = 'value';
                    break;
                case '1' : setRole = 'value';
                    break;
                case '2' : setRole = 'level';
                    break;
                case '3' : setRole = 'level';
                    break;
                case '4' : setRole = 'level';
                    break;
            }
            break;
        case 'DPST-9-20' :
            setMin = -670760;
            setMax = 670760;
            setType = 'number';
            switch (stateFlag){
                case '0' : setRole = 'value';
                    break;
                case '1' : setRole = 'value';
                    break;
                case '2' : setRole = 'level';
                    break;
                case '3' : setRole = 'level';
                    break;
                case '4' : setRole = 'level';
                    break;
            }
            break;
        case 'DPST-9-21' :
            setMin = -670760;
            setMax = 670760;
            setType = 'number';
            switch (stateFlag){
                case '0' : setRole = 'value';
                    break;
                case '1' : setRole = 'value';
                    break;
                case '2' : setRole = 'level';
                    break;
                case '3' : setRole = 'level';
                    break;
                case '4' : setRole = 'level';
                    break;
            }
            break;
        case 'DPST-9-22' :
            setMin = -670760;
            setMax = 670760;
            setType = 'number';
            switch (stateFlag){
                case '0' : setRole = 'value';
                    break;
                case '1' : setRole = 'value';
                    break;
                case '2' : setRole = 'level';
                    break;
                case '3' : setRole = 'level';
                    break;
                case '4' : setRole = 'level';
                    break;
            }
            break;
        case 'DPST-9-23' :
            setMin = -670760;
            setMax = 670760;
            setType = 'number';
            switch (stateFlag){
                case '0' : setRole = 'value';
                    break;
                case '1' : setRole = 'value';
                    break;
                case '2' : setRole = 'level';
                    break;
                case '3' : setRole = 'level';
                    break;
                case '4' : setRole = 'level';
                    break;
            }
            break;
        case 'DPST-9-24' :
            setMin = -670760;
            setMax = 670760;
            setType = 'number';
            switch (stateFlag){
                case '0' : setRole = 'value';
                    break;
                case '1' : setRole = 'value';
                    break;
                case '2' : setRole = 'level';
                    break;
                case '3' : setRole = 'level';
                    break;
                case '4' : setRole = 'level';
                    break;
            }
            break;
        case 'DPST-9-25' :
            setMin = -670760;
            setMax = 670760;
            setType = 'number';
            switch (stateFlag){
                case '0' : setRole = 'value';
                    break;
                case '1' : setRole = 'value';
                    break;
                case '2' : setRole = 'level';
                    break;
                case '3' : setRole = 'level';
                    break;
                case '4' : setRole = 'level';
                    break;
            }
            break;
        case 'DPST-9-26' :
            setMin = -670760;
            setMax = 670760;
            setType = 'number';
            switch (stateFlag){
                case '0' : setRole = 'value';
                    break;
                case '1' : setRole = 'value';
                    break;
                case '2' : setRole = 'level';
                    break;
                case '3' : setRole = 'level';
                    break;
                case '4' : setRole = 'level';
                    break;
            }
            break;
        case 'DPST-9-27' :
            setMin = -670760;
            setMax = 670760;
            setType = 'number';
            switch (stateFlag){
                case '0' : setRole = 'value';
                    break;
                case '1' : setRole = 'value';
                    break;
                case '2' : setRole = 'level';
                    break;
                case '3' : setRole = 'level';
                    break;
                case '4' : setRole = 'level';
                    break;
            }
            break;
        case 'DPST-9-28' :
            setMin = -670760;
            setMax = 670760;
            setType = 'number';
            switch (stateFlag){
                case '0' : setRole = 'value';
                    break;
                case '1' : setRole = 'value';
                    break;
                case '2' : setRole = 'level';
                    break;
                case '3' : setRole = 'level';
                    break;
                case '4' : setRole = 'level';
                    break;
            }
            break;

        // DPT-13
        case 'DPT-13':
            setMin = '−2147483648';
            setMax = '2147483647';
            setType = 'number';
            switch (stateFlag){
                case '0' : setRole = 'value';
                    break;
                case '1' : setRole = 'value';
                    break;
                case '2' : setRole = 'level';
                    break;
                case '3' : setRole = 'level';
                    break;
                case '4' : setRole = 'level';
                    break;
            }
            break;

        // DPT-16
        case 'DPT-16' :
            setMin = '';
            setMax = '';
            setType = 'string';
            switch (stateFlag){
                case '0' : setRole = 'text';
                    break;
                case '1' : setRole = 'text';
                    break;
                case '2' : setRole = 'text';
                    break;
                case '3' : setRole = 'text';
                    break;
                case '4' : setRole = 'text';
                    break;
            }
            break;
        case 'DPST-16-0' :
            setMin = '';
            setMax = '';
            setType = 'string';
            switch (stateFlag){
                case '0' : setRole = 'text';
                    break;
                case '1' : setRole = 'text';
                    break;
                case '2' : setRole = 'text';
                    break;
                case '3' : setRole = 'text';
                    break;
                case '4' : setRole = 'text';
                    break;
            }
            break;
        case 'DPST-16-1' :
            setMin = '';
            setMax = '';
            setType = 'string';
            switch (stateFlag){
                case '0' : setRole = 'text';
                    break;
                case '1' : setRole = 'text';
                    break;
                case '2' : setRole = 'text';
                    break;
                case '3' : setRole = 'text';
                    break;
                case '4' : setRole = 'text';
                    break;
            }
            break;

        default: {
            var dpt = '';
            setMin = 0;
            setMax = 1;
            setType = '';
            switch (stateFlag){
                case '0' : setRole = 'value';
                    break;
                case '1' : setRole = 'value';
                    break;
                case '2' : setRole = 'indicator';
                    break;
                case '3' : setRole = 'indicator';
                    break;
                case '4' : setRole = 'indicator';
                    break;
            }
        }

    }
   // if (setRole === undefined){
   //     setRole = 'indicator';
   // }
    var retRole = {
        setDPT:  dpt,
        setMin:  setMin,
        setMax:  setMax,
        setType: setType,
        setRole: setRole,
        stateType: stateType
    };

    return retRole;
};