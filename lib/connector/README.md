## KNXnet/IP for Node.JS

A feature-complete KNXnet/IP stack in pure Javascript, capable of talking multicast (routing) and unicast (tunneling). Adding KNX to your Node.JS applications is now finally easy as pie.
- Wide DPT (datapoint type) support (DPT1 - DPT20 supported)
- Extensible Device support (binary lights, dimmers, ...)
- You won't need to install a specialised eibd daemon with its arcane dependencies  and most importantly,
- If you got an IP router and a network that supports IP multicast (such as wired ethernet), you can start talking to KNX within seconds!

## Installation

Make sure your machine has Node.JS (version 4.x or greater) and do:

`npm install knx`

## Usage

At last, here's a **reliable** KNX connection that simply works without any configs. To get a basic KNX monitor, you just need to run this in Node:

```js
var knx = require('knx');
var connection = knx.IpRoutingConnection(); // multicast!
connection.Connect(function() {
  console.log('Connected!');
  connection.on('event', function (evt, src, dest, value) {
  console.log("%s **** KNX EVENT: %j, src: %j, dest: %j, value: %j",
    new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''),
    evt, src, dest, value);
  });
});
```

KNX events, what a joy:

```
> 2016-09-24 05:34:07 **** KNX EVENT: "GroupValue_Write", src: "1.1.100", dest: "5/0/8", value: 1
2016-09-24 05:34:09 **** KNX EVENT: "GroupValue_Write", src: "1.1.100", dest: "5/1/15", value: 0
2016-09-24 05:34:09 **** KNX EVENT: "GroupValue_Write", src: "1.1.100", dest: "5/0/8", value: 0
2016-09-24 05:34:17 **** KNX EVENT: "GroupValue_Write", src: "1.1.100", dest: "5/1/15", value: 0
2016-09-24 05:34:17 **** KNX EVENT: "GroupValue_Write", src: "1.1.100", dest: "5/0/8", value: 1
```

## And why should I bother?

The main cause for writing my own KNX access layer is that I couldn't find a *robust* access layer that properly handles state management.
Connections tend to fail all the time; consider flakey Wi-Fi, RRR's (Recalcitrant Rebooting Routers), bad karma, it happens all the time. A KNX access layer should be *resilient* and be able to recover if needed.

Also, although seemingly innocent, the consecutive calls to *read()* and then *write()* on the same group address will either *confuse* your KNX IP router, or *return incoherent results*.
KNXnet/IP uses **UDP** sockets, which is not ideal from a programmer's perspective. Packets can come and go in any order; very few libraries offer the robustness to reconcile state and ensure a **steady and reliable connection**.

This library is, to the best of my knowledge, the only one that can handle the *serialisation* of tunneling requests in a way that your program will have a *robust and reliable* KNX connection. Try toggling your Wi-Fi or disconnect your Ethernet cable while you're connected; the library will detect this and reconnect when network access is restored :)

```
27 Oct 15:44:24 - [info] Started flows
27 Oct 15:44:24 - [info] [knx-controller:9ab91ab8.547938] KNX: successfully connected to 224.0.23.12:3671
27 Oct 15:44:24 - [info] [knx-controller:9ab91ab8.547938] GroupValue_Read {"srcphy":"15.15.15","dstgad":"0/0/15"}
...
27 Oct 15:44:54 - [info] [knx-controller:9ab91ab8.547938] KNX Connection Error: timed out waiting for CONNECTIONSTATE_RESPONSE
27 Oct 15:45:36 - [info] [knx-controller:9ab91ab8.547938] KNX: successfully connected to 224.0.23.12:3671
27 Oct 15:45:36 - [info] [knx-in:input] GroupValue_Read {"srcphy":"15.15.15","dstgad":"0/0/15"}
```

## Development documentation

- [Basic API usage](../master/README-API.md)
- [List of supported datapoints](../master/README-datapoints.md)
- [List of supported events](../master/README-events.md)
