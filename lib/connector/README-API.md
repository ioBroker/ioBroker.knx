### Connect to your KNX IP router via multicast

```js
// create a multicast connection, no mandatory arguments.
var connection = knx.IpRoutingConnection();
// optionally specify the multicast address if its not the standard
var connection = knx.IpRoutingConnection( {ipAddr: '224.0.23.12', ipPort: 3671} );
// you'll need to specify the multicast interface if you have more than one interface
// this is common in laptops that have both a wired AND a wireless interface
var connection = knx.IpRoutingConnection( {interface: 'eth0'} );
```

### Connect to your KNX IP interface via tunneling

Use this in case multicast doesn't work for you, this for example could be caused if:
- you only have a "KNX IP Interface" (meaning its only capable of tunneling), or
- your laptop is on wi-fi and your KNX IP router is on wired Ethernet, (most home routers don't route multicast traffic to the LAN segment), or
- you're simply not in the same LAN as the KNX IP router

```js
// create a tunneling (UDP/unicast) connection to a KNX IP router
var connection = knx.IpTunnelingConnection( {ipAddr: '192.168.2.222'} );
// -- OR -- you can optionally specify the port number and the local interface:
var connection = knx.IpTunnelingConnection( {ipAddr: '192.168.2.222', ipPort: 3671, interface: 'eth0'} );
```

### Send some raw telegrams

```js
// sending an arbitrary write request to a binary group address
connection.write("1/0/0", 1);
// you also can be explicit about the datapoint type, eg. DPT9.001 is temperature Celcius
connection.write("2/1/0", 22.5, "DPT9.001");
// send a Read request to get the current state of 1/0/1 group address
// dont forget to register a GroupValue_Response handler!
connection.read("1/0/1");
// you can also pass a callback to capture the response sent by src
connection.read("1/0/1", (src, responsevalue) => { ... });
// you can send a Response telegram to an incoming GroupValue_Read request
connection.response("2/1/0", 22.5, "DPT9.001");)
//
```

Try writing a value to a group address.

```js
// switch on a light
connection.write("1/0/0", true, "DPT1");
// set the thermostat to 21.5 degrees Celcius
connection.write("3/0/3", 21.5, "DPT9.001");
```

**Important**: connection.write() will only accept *raw APDU payloads* and a DPT.
This practically means that for *reading and writing to anything other than a binary
switch* (eg. for dimmer controls) you'll need to declare one or more *datapoints*.

### Declare datapoints based on their DPT

Datapoints correlate an *endpoint* (identifed by a group address such as '1/2/3')
with a *DPT* (DataPoint Type), so that *serialization* of values to and from KNX
works correctly (eg. temperatures as 16bit floats), and values are being translated
to Javascript objects and back.

```js
// declare a simple binary control
var binary_control = new knx.Datapoint({ga: '1/0/1', dpt: 'DPT1.001'});
// bind it to the active connection
binary_control.bind(connection);
// write a new value to the bus
binary_control.write(true); // or false!
// send a read request, and fire the callback upon response
binary_control.read( function (response) {
    console.log("KNX response: %j", response);
  };
// or declare a dimmer control
var dimmer_control = new knx.Datapoint({ga: '1/2/33', dpt: 'DPT3.007'});
```

Datapoints need to be bound to a connection. This can be done either at their
creation, *or* using their `bind()` call. Its important to highlight that before
you start defining datapoints (and devices as we'll see later), your code
*needs to ensure that the connection has been established*, usually by using a Promise:

```js
new Promise(function(resolve, reject) {
  connection.Connect(function() {
    console.log('----------');
    console.log('Connected!');
    console.log('----------');
    resolve();
  });
}).then(function() {
  var dp = new knx.Datapoint({ga: '1/1/1'}, connection);
  // Now send off a couple of requests:
  dp.read((src, value) => {
    console.log("**** RESPONSE %j reports current value: %j", src, value);
  });
  dp.write(1);
});
```


### Declare your devices

You can define a device (basically a set of GA's that are related to a
physical KNX device eg. a binary switch) so that you have higher level of control:

```js
var light = new knx.Devices.BinarySwitch({ga: '1/1/8', status_ga: '1/1/108'}, connection);
console.log("The current light status is %j", light.status.current_value);
light.control.on('change', function(oldvalue, newvalue) {
  console.log("**** LIGHT control changed from: %j to: %j", oldvalue, newvalue);
});
light.status.on('change', function(oldvalue, newvalue) {
  console.log("**** LIGHT status changed from: %j to: %j", oldvalue, newvalue);
});
light.switchOn(); // or switchOff();
```

This effectively creates a pair of datapoints typically associated with a binary
switch, one for controlling it and another for getting a status feedback (eg via
manual operation)
