var knx = require('.');
var util = require('util');

var connection = knx.Connection({
  debug: true,
  minimumDelay: 10,
  handlers: {
    connected: function() {
      console.log('----------');
      console.log('Connected!');
      console.log('----------');
      console.log('Reading room temperature');
      var dp = new knx.Datapoint({ga: '0/0/15', dpt: 'dpt9.001'}, connection);
      dp.on('change', function(oldvalue, newvalue) {
        console.log("**** 0/0/15 changed from: %j to: %j ",
          oldvalue, newvalue);
      });
    },
    event: function (evt, src, dest, value) {
      var ts = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
      var msg = util.format("%s **** KNX EVENT: %j, src: %j, dest: %j", ts, evt, src, dest);
      console.log("%s %s", msg, value == null ? "" : util.format(", value: %j", value));
    }
  });
});
