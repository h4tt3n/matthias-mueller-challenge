//*******************************************************************************
//
//  Stable and rigid damped springs using sequential impulses
//
//  Bead-on-a-wire
//  
//******************************************************************************* 

// Global constants
const DT      = 1.0 / 100.0;   // Physics engine timestep
const INV_DT  = 1.0 / DT;      // Physics engine inverse timestep
const ITER    = 1;            // Physics engine impulse iterations
const FPS     = 60;            // Screen Framerate
const GRAVITY = -10.0;          // Gravity
const DENSITY = 2000.0;        // ball density

// Global vars
var canvas = null;
var ctx = null;

var camera = {
	pos : {x : 0, y : 0},
	zoom : 100
};

var particles = [];
var constraints = [];

// Classes
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

class WireConstraint {
    constructor(){
		this.cStiffness = 1;
		this.cDamping = 1;
        this.unit = new Vector2();
        this.pos = new Vector2();
        this.reducedMass = new Number();
        this.radius = new Number();
        this.restImpulse = new Number();
        this.particle = null;
    }
    computeCorrectiveImpulse(){
		// calculate delta, error, and corrective imp
        var delta_impulse = this.particle.imp;
        var impulse_error = this.unit.dot(delta_impulse) - this.restImpulse;
        var corrective_impulse = this.unit.mul(-impulse_error * this.reducedMass);
		// apply impulses
        this.particle.imp = this.particle.imp.sub(corrective_impulse.mul(this.particle.invMass));
    }
	computeReusableData(){
		//
		var distance = this.pos.sub(this.particle.pos);
		var vel = this.particle.vel;
		this.unit = distance.unit();
		// error
		var distance_error = this.unit.dot( distance ) - this.radius;
		var velocity_error = -this.unit.dot( vel );
		// 
		this.restImpulse = -this.cStiffness * distance_error * INV_DT - this.cDamping * velocity_error;
	}
}

startSimulation();

function demo1() {

	var wireRadius = 4.0;
	var center = new Vector2( window.innerWidth/2, window.innerHeight/5 );

    // Bead
    var p = new Particle();
    var mass = 100.0;
    p.computeInverseMass(mass);
    p.radius = Math.pow((3*mass)/(4*Math.PI*DENSITY), (1/3));
    var pos = new Vector2(wireRadius, 0);
    p.pos = center.add(pos);

    console.log(p)

    camera.pos.x = center.x;
    camera.pos.y = center.y;

    particles.push(p);

    // Wire constraint
    var s = new WireConstraint();
    s.particle = particles[0];
    s.pos = center;
    s.radius = wireRadius;
    s.unit = ( s.pos.sub(s.particle.pos)).unit();
    var invMass = s.particle.invMass;
    s.reducedMass = invMass > 0.0 ? 1.0 / invMass : 0.0;
    constraints.push(s);

    console.log(s)
}

function startSimulation() {
	canvas = document.querySelector("#gameCanvas");
	canvas.width = window.innerWidth - 20;
	canvas.height = window.innerHeight - 20;
	ctx = canvas.getContext("2d");

	demo1();

	setInterval(requestScreenUpdate, 1000/FPS);
	setInterval(runSimulation, 1000/INV_DT);
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

	// Constraints
	for(var i = 0; i < constraints.length; i++){
		var c = constraints[i]
        ctx.beginPath();
		ctx.arc(c.pos.x, c.pos.y, c.radius, 0, Math.PI * 2);
        ctx.lineWidth = 0.05;
        ctx.strokeStyle = "#00FF00";
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

function clearParticles(){
	particles = [];
}

function clearConstraints(){
	constraints = [];
}