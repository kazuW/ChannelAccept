// --------------------------
// Example with websockets:
// --------------------------

const WebSocket = require('ws');
const fs = require('fs');
const readline = require('readline');

const REST_HOST = '127.0.0.1:8080'
const MACAROON_PATH = 'admin macaroon path'

const https = require("https")

let ws = new WebSocket(`wss://${REST_HOST}/v1/channels/acceptor?method=POST`, {
  // Work-around for self-signed certificates.
  rejectUnauthorized: false,
  headers: {
    'Grpc-Metadata-Macaroon': fs.readFileSync(MACAROON_PATH).toString('hex'),
  },
});

let requestBody = {
};


ws.on('open', function() {
    // We always _need_ to send an initial message to kickstart the request.
    // This empty message will be ignored by the channel acceptor though, this
    // is just for telling the grpc-gateway library that it can forward the
    // request to the gRPC interface now. If this were an RPC where the client
    // always sends the first message (for example the streaming payment RPC
    // /v1/channels/transaction-stream), we'd simply send the first "real"
    // message here when needed.
  ws.send('{}');
});

ws.on('error', function(err) {
  console.log('Error: ' + err);
});

ws.on('ping', function ping(event) {
 // console.log('Received ping from server: ' + JSON.stringify(event));
 // console.log('Received ping from server: ' + event); 
});

ws.on('message', function incoming(event) {
  console.log('New channel accept message: ' + event);
  const result = JSON.parse(event).result;
  let acceptChannel = false;
  let fundingNumReq = Number(result.funding_amt);

  // Accept the channel after inspecting it.
  const rs = fs.createReadStream('./ChannelAllowList.txt');
  //インターフェースの設定
  const reader = readline.createInterface({input: rs});

  reader.on('line', (data) => {
   	// console.log(data);

	const pubkey = (Buffer.from(data,'hex')).toString('base64')
	  // console.log(pubkey);
	
	if(result.node_pubkey == pubkey){
    if(fundingNumReq >= 2000000){
  	  ws.send(JSON.stringify({accept: true, pending_chan_id: result.pending_chan_id}));
  		//ws.send(JSON.stringify({accept: false, pending_chan_id: result.pending_chan_id, error: 'denied'}));
  		  console.log('OOOOO Channel accepted!! OOOOO');
      acceptChannel = true;
    } else {
      ws.send(JSON.stringify({accept: false, error: 'your funding amount is less than 2000000.'}));
      console.log('XXXXX Channel refused!!(1) XXXXX');
      acceptChannel = true;
    }
 	} 

  });

  reader.on('close', () => {
    if (!acceptChannel){
      ws.send(JSON.stringify({accept: false, error: 'your pubkey is not registered in the allowlist.'}));
      console.log('XXXXX Channel refused!!(2) XXXXX');
    }
  });


});

