import React from 'react';
import ReactDOM from 'react-dom';
import BigInt from 'bigi';
import ecurve from 'ecurve';
import crypto from 'crypto';
import './style.css';

class Form extends React.Component {
	constructor(props) {
		super(props);
		this.password = React.createRef();
		this.parseSubmission = this.parseSubmission.bind(this);
	}
	
	async hashIntoEC(plaintext){
		//get SHA-256 hash of password
		let hash = crypto.createHash('sha256').update(plaintext).digest('hex');
		
		//get random integer p for blinding
		let p_buf = new Uint8Array(32);
		crypto.randomFillSync(p_buf);
		let p = BigInt.fromBuffer(p_buf)
		
		//new elliptical curve
		let curve = ecurve.getCurveByName('secp256k1');
		
		//get inverse of p for de-blinding
		let p_inv = p.modInverse(curve.n);
		
		//get point from hash as G ^ hash value
		let hash_point = curve.G.multiply(BigInt.fromHex(hash));
		
		//OPRF in value from raising hash to p
		let alpha = hash_point.multiply(p);
		
		//store as object
		let OPRF_in = {'x': alpha.affineX.toHex(), 'y': alpha.affineY.toHex()};
		
		//get random password
		let rwd = await this.getFromServer(OPRF_in, curve, p_inv);
		
		return rwd;
	}
	
	async getFromServer(OPRF_in, curve, p_inv) {
		//send hash to server
		let response = await fetch('http://127.0.0.1:8081/point', {
			headers: {
				'Content-Type': 'text/plain'
			},
			method: 'POST',
			body: JSON.stringify(OPRF_in),
		});
		
		//get beta as JSON
		let beta = JSON.parse(await response.text());
		
		//get beta points
		let x = BigInt.fromHex(beta.x);
		let y = BigInt.fromHex(beta.y);
		
		//get beta point on curve
		let beta_point = ecurve.Point.fromAffine(curve, x, y);
		
		//deblind beta point with p_inv
		let deblind = beta_point.multiply(p_inv);
		
		//hash key + beta to generate rwd
		let rwd_string = deblind.affineX.toHex() + deblind.affineY.toHex() + this.password
		let rwd_hash = crypto.createHash('sha256').update(rwd_string).digest('hex').toString();
		
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
		let plaintext = this.domain.current.value + this.password.current.value;
		
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