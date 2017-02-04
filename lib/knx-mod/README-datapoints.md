## Datapoint Types

|DPT   	  | Description       | Value type  	| Example  	| Notes |
|---	    |---	                  |---	|---	|---	|
|DPT1   	| 1-bit control  	      | Boolean/Numeric	|  true/"true"/1 false/"false"/0 | |
|DPT2   	| 1-bit control w/prio  | Object  	| {value: 1, priority: 0}  	|   |
|DPT3   	| 4-bit dimming/blinds  | Object  	| {decr_incr: 1, data: 0}  	|   data: 3-bit (0..7)|
|DPT4   	| 8-bit character  	|   String	| "a"  	|   1st char must be ASCII	|
|DPT5   	| 8-bit unsigned int  | Numeric | 127  	|  0..255 	|
|DPT6   	| 8-bit signed int  	| Numeric | -12  	|  -128..127 	|
|DPT7   	| 16-bit unsigned int  | Numeric  |   	|   	|
|DPT8   	| 16-bit signed integer | Numeric |   	|   	|
|DPT9   	| 16-bit floating point | Numeric |   	|   	|
|DPT10   	| 24-bit time 	|   Date	|  new Date() |   only the time part is used |
|DPT11   	| 24-bit date 	|   Date	|  new Date() |   only the date part is used |
|DPT12   	| 32-bit unsigned int | Numeric |   	|   	|
|DPT13   	| 32-bit signed int   | Numeric |   	|   	|
|DPT14   	| 32-bit floating point | Numeric |   	|  incomplete: subtypes |
|DPT15   	| 32-bit access control |  |   	|   incomplete|
|DPT16   	| ASCII string 	|  String |   	|   	|
|DPT17   	| Scene number 	|   	|   	|  incomplete|
|DPT18   	| Scene control 	|   	|   	|   incomplete|
|DPT19   	| 8-byte Date and Time 	|  Date | new Date() |   	|
|DPT20-255 | feel free to contribute! 	|   |  |   	|
