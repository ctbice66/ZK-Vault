const express = require('express');
const ecurve = require('ecurve');
const BigInt = require('bigi');
const crypto = require('crypto');
const cors = require('cors');

const server = express();
server.use(express.text());
server.options('/point', cors());

server.post('/point', cors(), (request, response) =>{
	//parse input
	let data = handleOPRFIn(request.body);
	
	//send response
	response.send(JSON.stringify(data));
});
server.listen(8081);

function handleOPRFIn(OPRF_in){
	
	//get x and y values from alpha point
	let OPRF_in_values = JSON.parse(OPRF_in);
	let x = BigInt.fromHex(OPRF_in_values.x);
	let y = BigInt.fromHex(OPRF_in_values.y);
	
	//get random integer k for blinding
	let k_buf = new Uint8Array(32);
	crypto.randomFillSync(k_buf);
	let k = BigInt.fromBuffer(k_buf)
	
	//define new elliptical curve
	let curve = ecurve.getCurveByName('secp256k1');
	
	//get point on curve from random value
	let point = ecurve.Point.fromAffine(curve, x, y);
	
	//get beta value by multiplying point with k
	let beta = point.multiply(k);
	
	//get beta point values
	let beta_out = {'x': beta.affineX.toHex(), 'y': beta.affineY.toHex()};
	
	//return beta point coordinates to client
	return beta_out;
}