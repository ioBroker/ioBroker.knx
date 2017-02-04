var knx = require('../..');

// this is a WIRED test and requires a real KNX IP router on the LAN
// just define a datapoint that should respond to a a GroupValue_Read request
var connection = new knx.Connection({
  debug: true,
  physAddr: "14.14.14",
  handlers: {
    connected: function() {
      console.log('----------');
      console.log('Connected!');
      console.log('----------');
      var temperature_in = new knx.Datapoint({
        ga: '0/0/15',
        dpt: 'DPT9.001'
      }, connection);
      temperature_in.read(function(src, response) {
        console.log("KNX response from %s: %j", src, response);
        // all OK, just give a chance to acknowledge the L_Data.ind
        setTimeout(function() {
          process.exit(0);
        }, 100);
      });
    },
    event: function(evt, src, dest, value) {
      console.log("%s ===> %s <===, src: %j, dest: %j, value: %j",
        new Date().toISOString().replace(/T/, ' ').replace(/Z$/, ''),
        evt, src, dest, value
      );
    },
    error: function(connstatus) {
      console.log("%s **** ERROR: %j",
        new Date().toISOString().replace(/T/, ' ').replace(/Z$/, ''),
        connstatus);
      process.exit(1);
    }
  }
});

setTimeout(function() {
  console.log('Exiting ...');
  process.exit(0);
}, 1500);
