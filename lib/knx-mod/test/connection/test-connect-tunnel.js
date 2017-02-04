var knx = require('../..');

Error.stackTraceLimit = Infinity;

var connection = knx.Connection({
	ipAddr: '192.168.8.4',
	debug: true,
	handlers: {
		connected: function() {
			console.log('----------');
			console.log('Connected!');
			console.log('----------');
			process.exit(0);
		},
		error: function() {
			process.exit(1);
		}
	}
});

// we have to set a timeout, because in CI environments there's probably
// no KNX router
setTimeout(function() {
	console.log('Exiting...');
	process.exit(0);
}, 1500);
