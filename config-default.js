// config.js
'use strict';
////////////////////////////////////////////////////////////////////////////////
var keypair = [0,0,0,"~"]; // this is your private keypair, be careful
var rpc = "https://mainnet.helius-rpc.com/?api-key=xxxxxxxxxx"; // helius
var priority = "Medium"; // fee priority
var throttle = 5000; // more seconds if your rpc limits are being stressed
var tolerance = 1.5;
var burner = "GwR3T5wAAWRCCNyjCs2g9aUM7qAtwNBsn2Z515oGTi7i"; // mcburn program
////////////////////////////////////////////////////////////////////////////////
export var keypair, rpc, priority, throttle, tolerance, burner;
