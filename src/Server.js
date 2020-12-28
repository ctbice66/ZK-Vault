const express = require('express');
const ecurve = require('ecurve');
const BigI = require('bigi');
const crypto = require('crypto');
const {randomInt} = require('mathjs');

const server = express();
server.use(express.text());

server.post('/point', //cors(), 
(request, response) =>{
	//parse input
	let data = handleOPRFIn(request.body);
	
	//send response
	response.send(JSON.stringify(data));
});
console.log('Server running...');
server.listen(8081);

function handleOPRFIn(OPRF_in){
	
	//define new elliptical curve
	let curve = ecurve.getCurveByName('secp256k1');
	
	//get alpha point
	let OPRF_in_values = JSON.parse(OPRF_in);
	let alpha_buffer = Buffer.from(OPRF_in_values.alpha_point);
	let alpha = ecurve.Point.decodeFrom(curve, alpha_buffer);
	
	//get random integer k for blinding
	let k = BigI(randomInt(1, Number(curve.n.toString())).toString());
	
	//get beta value by raising point to k
	let beta_point = alpha.multiply(k);
	
	//get beta point values
	let OPRF_out = {'beta_point': beta_point.getEncoded()};
	
	//return beta point coordinates to client
	return OPRF_out;
}