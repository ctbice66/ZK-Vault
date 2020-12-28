import React from 'react';
import ReactDOM from 'react-dom';
import BigI from 'bigi';
import ecurve from 'ecurve';
import crypto from 'crypto';
import { randomInt } from 'mathjs';
import './style.css';

class Form extends React.Component {
	constructor(props) {
		super(props);
		this.password = React.createRef();
		this.parseSubmission = this.parseSubmission.bind(this);
	}
	
	hashIntoCurve(plaintext, curve){
		//try-and-increment method
		const hash_function = crypto.createHash('sha256');
		let iterations = 0;
		let hash = hash_function.update(plaintext + iterations).digest('hex');
		let hash_point = curve.G.multiply(BigI(hash));
		
		//multiply hash of plaintext || iteration counter by generator function to find valid point on curve
		while (!curve.isOnCurve(hash_point) || curve.isInfinity(hash_point)){
			iterations++;
			hash = hash_function.update(plaintext + iterations).digest('hex');
			hash_point = curve.G.multiply(BigI(hash));
		}
		return hash_point;
	}
	
	async hashIntoEC(plaintext){
		
		//new elliptical curve
		let curve = ecurve.getCurveByName('secp256k1');
		
		//get point on curve from hashing plaintext || iteration counter
		let hash_point = this.hashIntoCurve(plaintext, curve);
		
		//random value for blinding
		let r = BigI(randomInt(1, Number(curve.n.toString())).toString());
		
		//alpha point on curve from hash point using blinding factor
		let alpha_point = hash_point.multiply(r);
		
		//compress point
		let OPRF_in = {'alpha_point': alpha_point.getEncoded()};
		
		//send alpha to server to get beta
		let rwd = await this.getFromServer(OPRF_in, curve, r);
		
		return rwd;
	}
	
	async getFromServer(OPRF_in, curve, r) {
		//send alpha to server
		let response = await fetch('http://127.0.0.1:8081/point', {
			headers: {
				'Content-Type': 'text/plain'
			},
			method: 'POST',
			body: JSON.stringify(OPRF_in),
		});
		
		//get beta as JSON
		let OPRF_out = JSON.parse(await response.text());
		
		//get beta point
		let beta_buffer = Buffer.from(OPRF_out.beta_point);
		let beta = ecurve.Point.decodeFrom(curve, beta_buffer);
		
		//deblind beta point with inverse of blinding factor
		let r_inv = r.modInverse(curve.n);
		let deblind = beta.multiply(r_inv);
		
		//hash key + beta to generate rwd
		let rwd_string = deblind.toString();
		let rwd_hash = crypto.createHash('sha256').update(rwd_string).digest('hex');
		console.log(rwd_hash);
		
		//map hex to random characters
		let rwd = '';
		for (let i = 0; i < (rwd_hash.length / 2); i++){
			
			//convert hex to random character
			rwd += String.fromCharCode(this.getRandomIntInclusive(33, 126));
			}
		
		return rwd;
	}
	
	getRandomIntInclusive(min, max){
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min + 1) + min);
		}
	
	async parseSubmission(event){
		
		//prevent default form submission behavior
		event.preventDefault();
		
		//hash password and domain into elliptic curve
		let plaintext = this.password.current.value;
		
		//get random password
		let rwd = await this.hashIntoEC(plaintext);
		
		//render new element with rwd
		const element = (
			<div className="center-div">
				<div className="center-div inner">
					<h3>Random Password</h3>
					<label>{rwd}</label>
					<input className="button" type="button" value="Home" onClick={() => window.location.reload()} />
				</div>
			</div>
		);
		
		ReactDOM.render(element, document.getElementById('root'));
	}

	render() {
		return (
			<form onSubmit={this.parseSubmission}>
				<h1>Zero-Knowledge Password Vault</h1>
				<h3>Password</h3>
				<input type="password" name='password' ref={this.password} required/>
				<input className="button" type="submit" value="Submit" />
			</form>
		);
	}
}

export default Form;