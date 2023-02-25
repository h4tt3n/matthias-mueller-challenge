//*******************************************************************************
//
//  Stable, rigid constraints using sequential impulses and warmstart
//
//  Version 0.51, September 2018, Michael "h4tt3n" Nissen
//  Converted to JavaScript spring 2022
//	
//******************************************************************************* 

//   Global constants
const DT      = 1/100;   // Physics engine timestep (s)
const INV_DT  = 1/DT;    // Physics engine inverse timestep (1/s)
const ITER    = 20;      // Physics engine impulse iterations per loop
const FPS     = 60;      // Screen frames per second
const GRAVITY = -9.82;   // Graviational accelleration (m/s^2)
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
        return new Vector2(this.x / s, this.y / s );
    }
    abs() { 
        return new Vector2( Math.abs(this.x), Math.abs(this.y) ); 
    }
    angleFromUnitVector(n) { 
        if (v instanceof Vector2){
            return Math.atan2(n.y, n.x);
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
    dot(v){ 
        if (v instanceof Vector2){
            return this.x * v.x + this.y * v.y; 
        }
        else { 
            return new Vector2(this.x * v, this.y * v); 
        }
    }
    length() { 
        return Math.sqrt(this.lengthSquared());
    }
    lengthSquared() { 
        return this.dot(this);
    }
    perp() { 
        return new Vector2(-this.y, this.x); 
    }
    perpDot(v) { 
        if (v instanceof Vector2){
            return this.x * v.y - this.y * v.x; 
        } 
        else { 
            return new Vector2(-this.y * v, this.x * v); 
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
    randomizeCircle(b) {	
        var a = Math.random() * 2.0 * Math.Math.PI; 
        var r = Math.sqrt( Math.random() * b * b ); 
        return new Vector2( Math.cos(a) * r, Math.sin(a) * r ); 
    }
    randomizeSquare(b) { 
        var x = ( Math.random() - Math.random() ) * b;
		var y = ( Math.random() - Math.random() ) * b;
		return new Vector2( x, y ); 
    }
    rotate(v) { 
        if (v instanceof Vector2){
            var vec = new Vector2(v.x, -v.y);
            return new Vector2(vec.dot(this), vec.perpDot(this));
        } 
        else {
            return new Vector2();
        }
    }
    unit() { 
        var length = this.length();
        if(length === 0){
            return new Vector2();
        } else {
            return new Vector2( this.x / length, this.y / length );
        }
    }
    unitVectorFromAngle(a) { 
        return new Vector2(Math.cos(a), Math.sin(a)); 
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
		this.cWarmstart = 1.0;
        this.accumulatedImpulse = new Vector2();
        this.unit = new Vector2();
        this.reducedMass = new Number();
        this.restDistance = new Number();
        this.restImpulse = new Number();
        this.inverseInertia = new Number();
        this.angularVelocity = new Number();
        this.particleA = null;
        this.particleB = null;
    }
	applyWarmstart(){
		var projected_impulse = this.unit.dot(this.accumulatedImpulse);
		if( projected_impulse < 0.0 ){
			var warmstart_impulse = this.unit.mul(this.cWarmstart * projected_impulse);
			this.particleA.impulse = this.particleA.impulse.sub(warmstart_impulse.mul(this.particleA.inverseMass));
			this.particleB.impulse = this.particleB.impulse.add(warmstart_impulse.mul(this.particleB.inverseMass));
		}
		this.accumulatedImpulse = new Vector2();
		//this.accumulatedImpulse = this.accumulatedImpulse.mul(0.25);
	}
    computeCorrectiveImpulse(){
		//
        var delta_impulse = this.particleB.impulse.sub(this.particleA.impulse);
        var impulse_error = this.unit.dot(delta_impulse) - this.restImpulse;
        var corrective_impulse = this.unit.mul(-impulse_error * this.reducedMass);
		//
        this.particleA.impulse = this.particleA.impulse.sub(corrective_impulse.mul(this.particleA.inverseMass));
        this.particleB.impulse = this.particleB.impulse.add(corrective_impulse.mul(this.particleB.inverseMass));
		//
        this.accumulatedImpulse = this.accumulatedImpulse.add(corrective_impulse);
    }
	computeReusableData(){
		// 
		var distance = this.particleB.position.sub(this.particleA.position);
		var velocity = this.particleB.velocity.sub(this.particleA.velocity);
		this.unit = distance.unit();
		// errors
		var distance_error = this.unit.dot( distance ) - this.restDistance;
		var velocity_error = this.unit.dot( velocity );
		this.restImpulse = -(this.cStiffness * distance_error * INV_DT + this.cDamping * velocity_error);
		// for angular springs
		var inertia = distance.lengthSquared() * this.reducedMass;
		this.inverseInertia = inertia > 0.0 ? 1.0 / inertia : 0.0;
		this.angularVelocity = distance.perpDot( velocity.mul(this.reducedMass)) * this.inverseInertia;
	}
}

class AngularSpring {
    constructor(){
		this.cStiffness = 1.0;
		this.cDamping = 1.0;
		this.cWarmstart = 1.0;
        this.angle = new Vector2();
        this.restAngle = new Vector2();
        this.reducedInertia = new Number();
        this.restImpulse = new Number();
        this.accumulatedImpulse = new Number();
        this.springA = null;
        this.springB = null;
    }
	applyWarmstart(){
		//
        var distance_a = this.springA.particleB.position.sub(this.springA.particleA.position);
        var distance_b = this.springB.particleB.position.sub(this.springB.particleA.position);
		var warmstart_impulse = this.cWarmstart * this.accumulatedImpulse;
		var new_angular_impulse_a = warmstart_impulse * this.springA.inverseInertia;
		var new_angular_impulse_b = warmstart_impulse * this.springB.inverseInertia;
		var new_impulse_a = distance_a.perpDot( new_angular_impulse_a ).mul(this.springA.reducedMass);
		var new_impulse_b = distance_b.perpDot( new_angular_impulse_b ).mul(this.springB.reducedMass);
		// apply impulses
        this.springA.particleA.impulse = this.springA.particleA.impulse.add(new_impulse_a.mul(this.springA.particleA.inverseMass));
        this.springA.particleB.impulse = this.springA.particleB.impulse.sub(new_impulse_a.mul(this.springA.particleB.inverseMass));
        this.springB.particleA.impulse = this.springB.particleA.impulse.sub(new_impulse_b.mul(this.springB.particleA.inverseMass));
        this.springB.particleB.impulse = this.springB.particleB.impulse.add(new_impulse_b.mul(this.springB.particleB.inverseMass));
		//
		this.accumulatedImpulse = 0.0;
	}
    computeCorrectiveImpulse(){
        // compute current linear perpendicular impulse
        var distance_a = this.springA.particleB.position.sub(this.springA.particleA.position);
        var distance_b = this.springB.particleB.position.sub(this.springB.particleA.position);
        var impulse_a = this.springA.particleB.impulse.sub(this.springA.particleA.impulse);
        var impulse_b = this.springB.particleB.impulse.sub(this.springB.particleA.impulse);
        var local_impulse_a = distance_a.perpDot( impulse_a ) * this.springA.reducedMass;
        var local_impulse_b = distance_b.perpDot( impulse_b ) * this.springB.reducedMass;
        var angular_impulse_a = local_impulse_a * this.springA.inverseInertia;
        var angular_impulse_b = local_impulse_b * this.springB.inverseInertia;
        // compute corrective angular impulse
        var delta_impulse = angular_impulse_b - angular_impulse_a;
        var impulse_error = delta_impulse - this.restImpulse;
        var corrective_impulse = -impulse_error * this.reducedInertia;
        var new_angular_impulse_a = corrective_impulse * this.springA.inverseInertia;
        var new_angular_impulse_b = corrective_impulse * this.springB.inverseInertia;
        // convert to linear perpendicular impulse
		var new_impulse_a = distance_a.perpDot( new_angular_impulse_a ).mul(this.springA.reducedMass);
		var new_impulse_b = distance_b.perpDot( new_angular_impulse_b ).mul(this.springB.reducedMass);
        // Apply linear impulses
		this.springA.particleA.impulse = this.springA.particleA.impulse.add(new_impulse_a.mul(this.springA.particleA.inverseMass));
        this.springA.particleB.impulse = this.springA.particleB.impulse.sub(new_impulse_a.mul(this.springA.particleB.inverseMass));
        this.springB.particleA.impulse = this.springB.particleA.impulse.sub(new_impulse_b.mul(this.springB.particleA.inverseMass));
        this.springB.particleB.impulse = this.springB.particleB.impulse.add(new_impulse_b.mul(this.springB.particleB.inverseMass));
        // save for warmstart
        this.accumulatedImpulse += corrective_impulse;
    }
	computeReusableData(){
		this.angle = new Vector2( this.springA.unit.dot( this.springB.unit ), this.springA.unit.perpDot( this.springB.unit ));
		// errors
		var angle_error = this.restAngle.perpDot( this.angle );
		var velocity_error = this.springB.angularVelocity - this.springA.angularVelocity;
		// reduced moment of inertia denominator
		var inverse_inertia = this.springA.inverseInertia + this.springB.inverseInertia;
		this.reducedInertia = inverse_inertia > 0.0 ? 1.0 / inverse_inertia : 0.0;
		this.restImpulse = -(this.cStiffness * angle_error * INV_DT + this.cDamping * velocity_error);
	}
}

// global vars (yes, I know...)
var canvas = null;
var ctx = null;
var warmstart = false;

var camera = {
	position : {x : 0, y : 0},
	zoom : 100
};

var particle = [];
var spring = [];
var angularspring = [];

initiateSimulation();


// functions
function demo1(){

	warmstart  = true;
	
	var num_Particles       = 128;
	var num_Springs         = num_Particles-1;
	var num_angular_Springs = num_Springs-1;
	var SpringLength        = 0.4;
	var Angle               = 2/4 * 2 * Math.PI;
	var delta_angle         = 0.04 * 2 * Math.PI;
	
	//
	clearParticles();
	clearSprings();
	clearAngularSprings();
	
	// create particles
	for(var i = 0; i < num_Particles; i++){
		var p = new Particle();
		var mass = i == 0 ? 100.0 : 1.0 ;
		p.inverseMass = i > num_Particles-2 ? 0.0 : 1.0 / mass;
		p.radius = Math.pow((3*mass)/(4*Math.PI*DENSITY), (1/3));
		var center = new Vector2( window.innerWidth/2, window.innerHeight/5 );
		var position = new Vector2( Math.cos(Angle), Math.sin(Angle) ).mul(SpringLength);
		p.position = center.add(position);
		Angle += delta_angle;
		SpringLength += 0.008;
		camera.position.x = center.x-1;
		camera.position.y = center.y-4;
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
	
	// create angular springs
	for(i = 0; i < num_angular_Springs; i++){
		
		var a = new AngularSpring();
		
		a.springA = spring[i];
		a.springB = spring[i+1];
		
		a.restAngle = new Vector2( a.springA.unit.dot( a.springB.unit ), a.springA.unit.perpDot( a.springB.unit ));
		
		angularspring.push(a);
	}
	
	// randomize state ( stability test )
	// for(var i = 0; i < num_Particles-2; i++){
		
	// 	p = particle[i]
		
	// 	var randomPosition = new Vector2().randomizeCircle(1000); // 1000000
	// 	var randomVelocity = new Vector2().randomizeCircle(1000); // 1000000

	// 	p.position = p.position.add(randomPosition);
	// 	p.velocity = p.velocity.add(randomVelocity);
	// }
}

function clearParticles(){
	particle = [];
}

function clearSprings(){
	spring = [];
}

function clearAngularSprings(){
	angularspring = [];
}

function clearWarmstart(){
	for(var i = 0; i < spring.length; i++){
		spring[i].accumulatedImpulse = new Vector2();
	}
	for(var i = 0; i < angularspring.length; i++){
		angularspring[i].accumulatedImpulse = 0.0;
	}
}

function initiateSimulation(){

	// canvas
	canvas = document.querySelector("#gameCanvas");
	canvas.width = window.innerWidth - 20;
	canvas.height = window.innerHeight - 20;
	ctx = canvas.getContext("2d");

	// context
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
	
	var x = -camera.position.x * camera.zoom + canvas.width * 0.5;
    var y = camera.position.y * camera.zoom + canvas.height * 0.5;

	ctx.transform(camera.zoom, 0, 0, -camera.zoom, x, y);

	// Springs
	ctx.lineWidth = 0.06;
	ctx.strokeStyle = "#444444";
	ctx.lineJoin = "round";

	for(var i = 0; i < spring.length; i++){
		var pSpring = spring[i]
		ctx.beginPath();
		ctx.moveTo(pSpring.particleA.position.x, pSpring.particleA.position.y);
		ctx.lineTo(pSpring.particleB.position.x, pSpring.particleB.position.y);
		ctx.stroke();
	}

	// Particles
	ctx.fillStyle = "#FF0000";

	for(var i = 0; i < particle.length; i++){
		var p = particle[i]
		ctx.beginPath();
		ctx.arc(p.position.x, p.position.y, p.radius, 0, Math.PI * 2);
		ctx.fill();
		ctx.closePath();
	}
}

function runSimulation(){
	computeReusableData();
	if( warmstart == true ){
		applyWarmstart();
	} 
	for(var i = 0; i < ITER; i++){
		applyCorrectiveLinearImpulse();
		applyCorrectiveAngularImpulse();
	}
	computeNewState();
}

function applyCorrectiveLinearImpulse(){
	for(var i = spring.length-1; i > 0; --i){
		spring[i].computeCorrectiveImpulse();
	}
	for(var i = 0; i < spring.length; i++){
		spring[i].computeCorrectiveImpulse();
	}
}

function applyCorrectiveAngularImpulse(){
	for(var i = angularspring.length-1; i > 0; --i){
		angularspring[i].computeCorrectiveImpulse();
	}
	for(var i = 0; i < angularspring.length; i++){
		angularspring[i].computeCorrectiveImpulse();
	}
}

function applyWarmstart(){
	for(var i = 0; i < spring.length; i++){
		spring[i].applyWarmstart();
	}
	for(i = 0; i < angularspring.length; i++){
		angularspring[i].applyWarmstart();
	}
}

function computeReusableData(){
	for(var i = 0; i < spring.length; i++){
		spring[i].computeReusableData();
	}
	for(i = 0; i < angularspring.length; i++){
		angularspring[i].computeReusableData();
	}
}

function computeNewState(){
	for(var i = 0; i < particle.length; i++){
		particle[i].computeNewState();
	}
}