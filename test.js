var knx = require('knx');



Error.stackTraceLimit = Infinity;
var connection = knx.Connection({
    //debug: true,
    //minimumDelay: 10,
    handlers: {
        connected: function() {
            console.log('===========\nConnected! %s \n===========', Date.now());

            dp = new knx.Datapoint({
                ga: '10/4/6',
                status_ga: '10/4/6',
                dpt: 'DPT5.001'
            }, connection);

            dp.write(100);
        },
        error: function( errmsg ) {
            console.error(errmsg);
        }
    }
});