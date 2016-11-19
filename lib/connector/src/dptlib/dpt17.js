/**
* knx.js - a pure Javascript library for KNX
* (C) 2016 Elias Karakoulakis
*/

//
// DPT17: Scene number
//

// TODO: implement fromBuffer, formatAPDU

// DPT17 basetype info
exports.basetype = {
  bitlength : 8,
  valuetype : 'basic',
  desc : "scene number"
}

// DPT17 subtypes
exports.subtypes = {
  // 17.001 Scene number
  "001" : { use : "G",
      name : "DPT_SceneNumber", desc : "Scene Number",
  },
}
