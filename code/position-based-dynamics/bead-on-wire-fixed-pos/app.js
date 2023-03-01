//*******************************************************************************
//
//  Position Based Dynamics (PBD) - velocity version
//  
//  Bead-on-a-wire using single spring
//
//  
//  
//******************************************************************************* 

//   Global constants
const DT      = 1/100;   // Physics engine timestep (s)
const INV_DT  = 1/DT;    // Physics engine inverse timestep (1/s)
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
	component(v) { 
        if (v instanceof Vector2){
            if(v === new Vector2()){
                return new Vector2();
            } else {
                var result = v.mul( this.dot(v)) / (v.dot(v) ); 
                return new Vector2(result.x, result.y);
            }
        }
    }
	project(v) { 
        if (v instanceof Vector2){
            if(this === new Vector2()){
                return new Vector2();
            } else {
                var result = (this.mul( v.dot(this) / this.dot(this) ));
                return new Vector2(result.x, result.y);
            }
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
	  this.prevPos = new Vector2();
	  this.startPos = new Vector2();
      this.vel = new Vector2();
      this.radius = new Number();
      this.invMass = new Number();
    }
	addGravity() {
		if( this.invMass > 0.0 ){
			this.vel = this.vel.add(new Vector2(0.0, DT*GRAVITY));
		}
	}
	computeInverseMass(mass) {
        this.invMass = mass > 0.0 ? 1.0 / mass : 0.0;
    }
	computeNewPosition(){
		if( this.invMass > 0.0 ){
			//this.prevPos = this.pos;
			this.pos = this.pos.add(this.vel.mul(DT));	
		}
	}
	computeNewVelocity(){
		if( this.invMass > 0.0 ){
			//this.vel = (this.pos.sub(this.prevPos)).mul(INV_DT);
			//this.vel = this.vel.add((this.pos.sub(this.prevPos)).mul(INV_DT));
			// var delta_pos = this.pos.sub(this.prevPos);
			// var projected_vel = delta_pos.project(this.vel);
			// this.vel = projected_vel;
			// this.vel = this.vel.add((this.pos.sub(this.prevPos)).mul(INV_DT));
		}
	}
}

class Spring {
    constructor(){
		this.cStiffness = 1.0;
		this.cDamping = 0.0; // -1.0 conserves energy.
        this.unit = new Vector2();
        this.reducedMass = new Number();
        this.restDistance = new Number();
        this.restPosition = new Number();
		this.restVelocity = new Number();
        this.particleA = null;
        this.particleB = null;
    }
	applyCorrectivePosition(){
		
		var delta_position = this.particleB.pos.sub(this.particleA.pos);
		//var delta_velocity = this.particleB.vel.sub(this.particleA.vel);
		
		this.unit = delta_position.unit();
		
		var position_error = this.unit.dot(delta_position) - this.restDistance;
		//var velocity_error = this.unit.dot(delta_velocity); // - this.restPosition * INV_DT;

		this.restPosition = -this.cStiffness * position_error; // - this.cDamping * velocity_error * DT;

		//var velocity_error = this.unit.dot(delta_velocity); // - this.restPosition * INV_DT;
		//var velocity_error = -this.restPosition * INV_DT;
		  
		//var corrective_velocity = this.unit.mul(-velocity_error * this.reducedMass);
		//var corrective_position = this.unit.mul(this.restPosition * this.reducedMass * INV_DT);
		var corrective_position = this.unit.mul(this.restPosition * this.reducedMass);
		
		// apply impulses
		this.particleA.pos = this.particleA.pos.sub(corrective_position.mul(this.particleA.invMass));
        this.particleB.pos = this.particleB.pos.add(corrective_position.mul(this.particleB.invMass));

		//this.particleA.vel = this.particleA.vel.sub(corrective_position.mul(this.particleA.invMass));
        //this.particleB.vel = this.particleB.vel.add(corrective_position.mul(this.particleB.invMass));
    }
}

// global vars (yes, I know...)
var canvas = null;
var ctx = null;

var camera = {
	pos : {x : 0, y : 0},
	zoom : 400
};

var particles = [];
var constraints = [];

initiateSimulation();


// functions
function demo1(){

	var num_Particles = 2;
	var num_Springs = num_Particles-1;
	var SpringLength = 1.0;
	var ballAngle = 0.23*Math.PI*2;
	var center = new Vector2( window.innerWidth/2, window.innerHeight/5 );
	
	//
	clearParticles();
	clearConstraints();
	
	// create particles
	for(var i = 0; i < num_Particles; i++){
		var p = new Particle();
		var mass = 1.0;
		p.invMass = i == 0 ? 0.0 : 1.0 / mass;
		p.radius = Math.pow((3*mass)/(4*Math.PI*DENSITY), (1/3));
		var pos = new Vector2(i*Math.cos(ballAngle)*SpringLength, i*Math.sin(ballAngle)*SpringLength);
		p.pos = center.add(pos);
		p.startPos = p.pos;

		camera.pos.x = center.x;
		camera.pos.y = center.y;

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
	//var displacement = 100;

	//particles[1].pos = particles[1].pos.add(new Vector2(0.1, 0.1));
	//particles[1].pos = particles[1].pos.add(new Vector2((Math.random() - Math.random()) * displacement, (Math.random() - Math.random()) * displacement));

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

	setInterval(function(){ requestAnimationFrame(updateScreen); }, 1000/FPS);
	setInterval(runSimulation, 1000/INV_DT);
	//setInterval(runSimulation, 0);
	//runSimulation();
	// updateScreen();
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
	for(var i = 0; i < constraints.length; i++){
		var pSpring = constraints[i]
		
		// Constraint
		// ctx.beginPath();
		// ctx.moveTo(pSpring.particleA.pos.x, pSpring.particleA.pos.y);
		// ctx.lineTo(pSpring.particleB.pos.x, pSpring.particleB.pos.y);
		// ctx.stroke();

		// Wire
		ctx.beginPath();
		ctx.arc(pSpring.particleA.pos.x, pSpring.particleA.pos.y, pSpring.restDistance, 0, Math.PI * 2);
        ctx.lineWidth = 0.01;
        ctx.strokeStyle = "#00FF00";
        ctx.stroke();
	}

	// Particles
	ctx.fillStyle = "#FF0000";

	for(var i = 0; i < particles.length; i++){
		var p = particles[i]

		if( p.invMass == 0){ continue; }
		
		// Start position
		ctx.beginPath();
		ctx.arc(p.startPos.x, p.startPos.y, p.radius, 0, Math.PI * 2);
		ctx.lineWidth = 0.01;
        ctx.strokeStyle = "#FFFFFF";
        ctx.stroke();

		// Current position
		ctx.beginPath();
		ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
		ctx.fill();
		ctx.closePath();
	}
}

function runSimulation(){
	addGravity();
	computeNewPosition();
	applyCorrectivePosition();
	computeNewVelocity();
}

function addGravity(){
	for(var i = 0; i < particles.length; i++){
		particles[i].addGravity();
	}
}

function applyCorrectivePosition(){
	for(var i = 0; i < constraints.length; i++){
		constraints[i].applyCorrectivePosition();
	}
}

function computeNewPosition(){
	for(var i = 0; i < particles.length; i++){
		particles[i].computeNewPosition();
	}
}
function computeNewVelocity(){
	for(var i = 0; i < particles.length; i++){
		particles[i].computeNewVelocity();
	}
}