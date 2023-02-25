//*******************************************************************************
//
//  Stable and rigid damped springs using sequential impulses
//
//  Wrecking ball
//  Chain particles all have mass = 1, ball mass = 100.
//  No visible stretching
//
//  Version 0.51, September 2018, Michael "h4tt3n" Nissen
//  Converted to JavaScript constraints 2022
//  
//******************************************************************************* 

//   Global constants
const DT      = 1/100;   // Physics engine timestep (s)
const INV_DT  = 1/DT;    // Physics engine inverse timestep (1/s)
const ITER    = 20;      // Physics engine impulse iterations
const FPS     = 60;      // Screen frames per second
const GRAVITY = -9.82;   // Gravity (m/s^2)
const DENSITY = 7850.0;  // Steel ball density (kg/m^3)

//	classes
class Vector2 {
    constructor(x, y) {
        this.x = x || 0;
        this.y = y || 0;
    }
    add(v){ 
        return new Vector2(this.x + v.x, this.y + v.y); 
    }
    sub(v){ 
        return new Vector2(this.x - v.x, this.y - v.y);
    }
    mul(s){ 
        return new Vector2(this.x * s, this.y * s);
    }
    div(s){ 
        return new Vector2(this.x/s, this.y/s);
    }
    abs() { 
        return new Vector2( Math.abs(this.x), Math.abs(this.y) ); 
    }
    dot(v){ 
        if (v instanceof Vector2){
            return this.x * v.x + this.y * v.y; 
        }
        else { 
            return new Vector2(this.x * v, this.y * v); 
        }
    }
    length() { 
        return Math.sqrt(this.x*this.x+this.y*this.y);
    }
    lengthSquared() { 
    	return this.x*this.x+this.y*this.y;
    }
    unit() { 
        var length = Math.sqrt(this.x*this.x+this.y*this.y);
        return length > 0 ? new Vector2(this.x/length, this.y/length) : new Vector2();
    }
};

class Particle {
    constructor() {
      this.pos = new Vector2();
      this.vel = new Vector2();
      this.imp = new Vector2();
      this.radius = new Number();
      this.invMass = new Number();
    }
	computeInverseMass(mass) {
        this.invMass = mass > 0.0 ? 1.0 / mass : 0.0;
    }
	computeNewState(){
		if( this.invMass > 0.0 ){
			this.vel = this.vel.add(this.imp);
			this.pos = this.pos.add(this.vel.mul(DT));
			this.vel = this.vel.add(new Vector2(0.0, DT*GRAVITY));
		}
		this.imp = new Vector2();
		//this.imp = new Vector2(0.0, DT*GRAVITY);
	}
}

class Spring {
    constructor(){
		this.cStiffness = 1.0;
		this.cDamping = 1.0;
        this.unit = new Vector2();
        this.reducedMass = new Number();
        this.restDistance = new Number();
        this.restImpulse = new Number();
        this.particleA = null;
        this.particleB = null;
    }
    computeCorrectiveImpulse(){
		// calculate delta, error, and corrective imp
        var delta_impulse = this.particleB.imp.sub(this.particleA.imp);
        var impulse_error = this.unit.dot(delta_impulse) - this.restImpulse;
        var corrective_impulse = this.unit.mul(-impulse_error * this.reducedMass);
		// apply impulses
        this.particleA.imp = this.particleA.imp.sub(corrective_impulse.mul(this.particleA.invMass));
        this.particleB.imp = this.particleB.imp.add(corrective_impulse.mul(this.particleB.invMass));
    }
	computeReusableData(){
		//
		var distance = this.particleB.pos.sub(this.particleA.pos);
		var vel = this.particleB.vel.sub(this.particleA.vel);
		this.unit = distance.unit();
		// error
		var distance_error = this.unit.dot( distance ) - this.restDistance;
		var velocity_error = this.unit.dot( vel );
		// 
		this.restImpulse = -this.cStiffness * distance_error * INV_DT - this.cDamping * velocity_error;
	}
}

// global vars (yes, I know...)
var canvas = null;
var ctx = null;

var camera = {
	pos : {x : 0, y : 0},
	zoom : 100
};

var particles = [];
var constraints = [];

initiateSimulation();


// functions
function demo1(){

	var num_Particles = 16;
	var num_Springs = num_Particles-1;
	var SpringLength = 0.4;
	var center = new Vector2( window.innerWidth/2, window.innerHeight/5 );
	
	//
	clearParticles();
	clearConstraints();
	
	// create particles
	for(var i = 0; i < num_Particles; i++){
		var p = new Particle();
		var mass = i == num_Particles-1 ? 100.0 : 1.0;
		p.invMass = i == 0 ? 0.0 : 1.0 / mass;
		p.radius = Math.pow((3*mass)/(4*Math.PI*DENSITY), (1/3));
		
		var pos = new Vector2(i*SpringLength, 0);
		p.pos = center.add(pos);

		camera.pos.x = center.x;
		camera.pos.y = center.y-3;

		particles.push(p);
	}
	
	// create springs
	for(var i = 0; i < num_Springs; i++){
		var s = new Spring();	
		s.particleA = particles[i];
		s.particleB = particles[i+1];
		s.restDistance = ( s.particleB.pos.sub(s.particleA.pos)).length();
		s.unit = ( s.particleB.pos.sub(s.particleA.pos)).unit();
		var invMass = s.particleA.invMass + s.particleB.invMass;
		s.reducedMass = invMass > 0.0 ? 1.0 / invMass : 0.0;
		constraints.push(s);
	}
	
	// Randomize pos - stability test
	// var displacement = 100;

	// for(var i = 1; i < num_Particles; i++){
	// 	var p = particles[i];
	// 	p.pos.x = p.pos.x + (Math.random() - Math.random()) * displacement;
	// 	p.pos.y = p.pos.y + (Math.random() - Math.random()) * displacement;
	// }
}

function clearParticles(){
	particles = [];
}

function clearConstraints(){
	constraints = [];
}

function initiateSimulation(){

	canvas = document.querySelector("#gameCanvas");
	canvas.width = window.innerWidth - 20;
	canvas.height = window.innerHeight - 20;
	ctx = canvas.getContext("2d");

	demo1();

	setInterval(requestScreenUpdate, 1000/FPS);
	setInterval(runSimulation, 1000/INV_DT);
	// setInterval(runSimulation, 0);
	// updateScreen();
}

function requestScreenUpdate() {
	requestAnimationFrame(updateScreen);
}

function updateScreen(){
	// Clear screen
	ctx.resetTransform();
	ctx.fillStyle = "#000000";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	var x = -camera.pos.x * camera.zoom + canvas.width * 0.5;
    var y = camera.pos.y * camera.zoom + canvas.height * 0.5;

	ctx.transform(camera.zoom, 0, 0, -camera.zoom, x, y);

	// Springs
	ctx.lineWidth = 0.04;
	ctx.strokeStyle = "#404040";
	ctx.lineJoin = "round";

	for(var i = 0; i < constraints.length; i++){
		var pSpring = constraints[i]
		ctx.beginPath();
		ctx.moveTo(pSpring.particleA.pos.x, pSpring.particleA.pos.y);
		ctx.lineTo(pSpring.particleB.pos.x, pSpring.particleB.pos.y);
		ctx.stroke();
	}

	// Particles
	ctx.fillStyle = "#FF0000";

	for(var i = 0; i < particles.length; i++){
		var p = particles[i]
		ctx.beginPath();
		ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
		ctx.fill();
		ctx.closePath();
	}
}

function runSimulation(){
	
	computeReusableData();
	for(var i = 0; i < ITER; i++){
		applyCorrectiveLinearImpulse();
	}
	computeNewState();
}

function applyCorrectiveLinearImpulse(){
	for(var i = constraints.length-1; i > 0; --i){
		constraints[i].computeCorrectiveImpulse();
	}
	for(var i = 0; i < constraints.length; i++){
		constraints[i].computeCorrectiveImpulse();
	}
}

function computeReusableData(){
	for(var i = 0; i < constraints.length; i++){
		constraints[i].computeReusableData();
	}
}

function computeNewState(){
	for(var i = 0; i < particles.length; i++){
		particles[i].computeNewState();
	}
}