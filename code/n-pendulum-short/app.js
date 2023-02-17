//*******************************************************************************
//
//  Stable and rigid damped springs using sequential impulses
//
//  Version 0.51, September 2018, Michael "h4tt3n" Nissen
//  Converted to JavaScript spring 2022
//  
//******************************************************************************* 

//   Global constants
const DT      = 1.0 / 60.0;                    //  timestep
const INV_DT  = 1.0 / DT;                      //  inverse timestep
const GRAVITY = 10.0;                           //  GRAVITY
const DENSITY = 0.01;                           //  ball density

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
      this.position = new Vector2();
      this.velocity = new Vector2();
      this.impulse = new Vector2();
      this.radius = new Number();
      this.inverseMass = new Number();
    }
	computeInverseMass(mass) {
        this.inverseMass = mass > 0.0 ? 1.0 / mass : 0.0;
    }
	computeNewState(){
		if( this.inverseMass > 0.0 ){
			this.velocity = this.velocity.add(this.impulse);
			this.position = this.position.add(this.velocity.mul(DT));
			this.velocity = this.velocity.add(new Vector2(0.0, DT*GRAVITY));
		}
		this.impulse = new Vector2();
	}
}

class Spring {
    constructor(){
		this.cStiffness = 1.0;
		this.cDamping = 1.0;
		//this.cWarmstart = 1.0;
        this.unit = new Vector2();
        this.reducedMass = new Number();
        this.restDistance = new Number();
        this.restImpulse = new Number();
        this.particleA = null;
        this.particleB = null;
    }
    computeCorrectiveImpulse(){
        var delta_impulse = this.particleB.impulse.sub(this.particleA.impulse);
        var impulse_error = this.unit.dot(delta_impulse) - this.restImpulse;
        var corrective_impulse = this.unit.mul(-impulse_error * this.reducedMass);
        this.particleA.impulse = this.particleA.impulse.sub(corrective_impulse.mul(this.particleA.inverseMass));
        this.particleB.impulse = this.particleB.impulse.add(corrective_impulse.mul(this.particleB.inverseMass));
    }
	computeReusableData(){
		var distance = this.particleB.position.sub(this.particleA.position);
		var velocity = this.particleB.velocity.sub(this.particleA.velocity);
		this.unit = distance.unit();
		var distance_error = this.unit.dot( distance ) - this.restDistance;
		var velocity_error = this.unit.dot( velocity );
		this.restImpulse = -this.cStiffness * distance_error * INV_DT - this.cDamping * velocity_error;
	}
}

// global vars (yes, I know...)
var canvas = null;
var ctx = null;
var DemoText = "";
var iterations = new Number();

var particle = [];
var spring = [];

initiateSimulation();


// functions
function demo1(){

	DemoText = "The n-pendulum";
	iterations = 5;
	
	var num_Particles = 17;
	var num_Springs = num_Particles-1;
	var SpringLength = 10.0;
	
	//
	clearParticles();
	clearSprings();
	
	// create particles
	for(var i = 0; i < num_Particles; i++){
		var p = new Particle();
		var mass = i == num_Particles-1 ? 1000.0 : 1.0;//1.0 + Math.random() * 100.0;
		p.inverseMass = i == 0 ? 0.0 : 1.0 / mass;
		p.radius = Math.pow((3*mass)/(4*Math.PI*DENSITY), (1/3));
		var center = new Vector2( window.innerWidth/2, window.innerHeight/5 );
		var position = new Vector2(i*SpringLength, 0);
		p.position = center.add(position);	
		particle.push(p);
	}
	
	// create springs
	for(var i = 0; i < num_Springs; i++){
		var s = new Spring();	
		s.particleA = particle[i];
		s.particleB = particle[i+1];
		s.restDistance = ( s.particleB.position.sub(s.particleA.position)).length();
		s.unit = ( s.particleB.position.sub(s.particleA.position)).unit();
		var inverseMass = s.particleA.inverseMass + s.particleB.inverseMass;
		s.reducedMass = inverseMass > 0.0 ? 1.0 / inverseMass : 0.0;
		spring.push(s);
	}
	
	// Randomize position - stability test
	// var displacement = Math.pow(1337, 42);

	// for(var i = 1; i < num_Particles; i++){
	// 	var p = particle[i];
	// 	p.position.x = p.position.x + Math.random(displacement) - Math.random(displacement);
	// 	p.position.y = p.position.x + Math.random(displacement) - Math.random(displacement);
	// }
}

function clearParticles(){
	particle = [];
}

function clearSprings(){
	spring = [];
}

function initiateSimulation(){

	canvas = document.querySelector("#gameCanvas");
	canvas.width = window.innerWidth - 20;
	canvas.height = window.innerHeight - 20;
	ctx = canvas.getContext("2d");

	demo1();

	setInterval(runSimulation, 0);
	updateScreen();
}

function updateScreen(){
	// Clear screen
	ctx.fillStyle = "#000000";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Springs
	ctx.lineWidth = 8.0;
	ctx.strokeStyle = "#404040";
	ctx.lineJoin = "round";

	for(var i = 0; i < spring.length; i++){
		var pSpring = spring[i]
		var xA = pSpring.particleA.position.x
		var yA = pSpring.particleA.position.y
		var xB = pSpring.particleB.position.x
		var yB = pSpring.particleB.position.y
		ctx.beginPath();
		ctx.moveTo(xA, yA);
		ctx.lineTo(xB, yB);
		ctx.stroke();
	}

	// Particles
	ctx.fillStyle = "#FF0000";

	for(var i = 0; i < particle.length; i++){
		var p = particle[i]
		var x = p.position.x;
		var y = p.position.y;
		ctx.beginPath();
		ctx.arc(x, y, p.radius, 0, Math.PI * 2);
		ctx.fill();
		ctx.closePath();
	}

	requestAnimationFrame( updateScreen );
}

function runSimulation(){
	
	computeReusableData();
	for(var i = 0; i < iterations; i++){
		applyCorrectiveLinearImpulse();
	}
	computeNewState();
}

function applyCorrectiveLinearImpulse(){
	for(var i = 0; i < spring.length; i++){
		spring[i].computeCorrectiveImpulse();
	}
	for(var i = spring.length-1; i > 0; --i){
		spring[i].computeCorrectiveImpulse();
	}
}

function computeReusableData(){
	for(var i = 0; i < spring.length; i++){
		spring[i].computeReusableData();
	}
}

function computeNewState(){
	for(var i = 0; i < particle.length; i++){
		particle[i].computeNewState();
	}
}