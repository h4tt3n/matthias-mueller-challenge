//*******************************************************************************
//
//  Stable and rigid damped springs using sequential impulses and warmstart
//
//  Version 0.51, September 2018, Michael "h4tt3n" Nissen
//  Converted to JavaScript spring 2022
//	
//******************************************************************************* 

//   Global constants
const DT                    = 1.0 / 60.0;                    //  timestep
const INV_DT                = 1.0 / DT;                      //  inverse timestep
const GRAVITY               = 10.0;                           //  GRAVITY
const DENSITY               = 0.5;                           //  ball density
const PI                    = Math.PI;                       //  PI
const SCREEN_WID            = 1000;                          //  screen width
const SCREEN_HGT            = 800;                           //  screen height
const PICK_DISTANCE         = 256.0;                         //  mouse PIck distance
const PICK_DISTANCE_SQUARED = Math.pow(PICK_DISTANCE, 2.0);  //  mouse pick distance squared

//	classes
class Vector2 {
    
    constructor(x, y) {
        this.x = x || 0;
        this.y = y || 0;
    }

    //
    add(v){ 
        //if (v instanceof Vector2){
            return new Vector2(this.x + v.x, this.y + v.y); 
        //}
    }
    sub(v){ 
        //if (v instanceof Vector2){
            return new Vector2(this.x - v.x, this.y - v.y);
        //}
    }
    mul(s){ 
        // if (s instanceof Vector2){
        //     return new Vector2(this.x * s.x, this.y * s.y);
        // }
        // else {
            return new Vector2(this.x * s, this.y * s);
        //}
    }
    div(s){ 
        return new Vector2(this.x / s, this.y / s );
    }

    //
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
        let a = Math.random() * 2.0 * Math.PI; 
        let r = Math.sqrt( Math.random() * b * b ); 
        return new Vector2( Math.cos(a) * r, Math.sin(a) * r ); 
    }
    randomizeSquare(b) { 
        return new Vector2( ( Math.random() - Math.random() ) * b, ( Math.random() - Math.random() ) * b ); 
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
		this.cWarmstart = 0.5;
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

        var delta_impulse = this.particleB.impulse.sub(this.particleA.impulse);
        var impulse_error = this.unit.dot(delta_impulse) - this.restImpulse;
        var corrective_impulse = this.unit.mul(-impulse_error * this.reducedMass);
        
        this.particleA.impulse = this.particleA.impulse.sub(corrective_impulse.mul(this.particleA.inverseMass));
        this.particleB.impulse = this.particleB.impulse.add(corrective_impulse.mul(this.particleB.inverseMass));
        
        this.accumulatedImpulse = this.accumulatedImpulse.add(corrective_impulse);
    }
	computeReusableData(){

		var distance = this.particleB.position.sub(this.particleA.position);
		var velocity = this.particleB.velocity.sub(this.particleA.velocity);

		this.unit = distance.unit();

		var distance_error = this.unit.dot( distance ) - this.restDistance;
		var velocity_error = this.unit.dot( velocity );

		this.restImpulse = -(this.cStiffness * distance_error * INV_DT + this.cDamping * velocity_error);

		var inertia = distance.lengthSquared() * this.reducedMass;
		this.inverseInertia = inertia > 0.0 ? 1.0 / inertia : 0.0;

		this.angularVelocity = distance.perpDot( velocity.mul(this.reducedMass)) * this.inverseInertia;
	}
}

class AngularSpring {
    constructor(){
		this.cStiffness = 1.0;
		this.cDamping = 1.0;
		this.cWarmstart = 0.5;
        this.angle = new Vector2();
        this.restAngle = new Vector2();
        this.reducedInertia = new Number();
        this.restImpulse = new Number();
        this.accumulatedImpulse = new Number();
        this.springA = null;
        this.springB = null;
    }
	applyWarmstart(){

        var distance_a = this.springA.particleB.position.sub(this.springA.particleA.position);
        var distance_b = this.springB.particleB.position.sub(this.springB.particleA.position);
		
		var warmstart_impulse = this.cWarmstart * this.accumulatedImpulse;
		
		var new_angular_impulse_a = warmstart_impulse * this.springA.inverseInertia;
		var new_angular_impulse_b = warmstart_impulse * this.springB.inverseInertia;
		
		var new_impulse_a = distance_a.perpDot( new_angular_impulse_a ).mul(this.springA.reducedMass);
		var new_impulse_b = distance_b.perpDot( new_angular_impulse_b ).mul(this.springB.reducedMass);
        
        this.springA.particleA.impulse = this.springA.particleA.impulse.add(new_impulse_a.mul(this.springA.particleA.inverseMass));
        this.springA.particleB.impulse = this.springA.particleB.impulse.sub(new_impulse_a.mul(this.springA.particleB.inverseMass));
        
        this.springB.particleA.impulse = this.springB.particleA.impulse.sub(new_impulse_b.mul(this.springB.particleA.inverseMass));
        this.springB.particleB.impulse = this.springB.particleB.impulse.add(new_impulse_b.mul(this.springB.particleB.inverseMass));

		this.accumulatedImpulse = 0.0;
		//this.accumulatedImpulse *= 0.25;
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

class Mouse {
	constructor() {
		this.position_ = new Vector2();
		this.positionPrev_ = new Vector2();
		this.button_ = new Number();
		this.buttonPrev_ = new Number();
		this.wheel_ = new Number();
		this.wheelPrev_ = new Number();
	}
}


// global vars (yes, I know...)
var canvas = null;
var ctx = null;
var DemoText = "";

var iterations = new Number();
var warmstart = new Number();

var mouse = new Mouse();

var Temp_Dist
var Picked_Rest_Dist
var Pick_State
var Picked_mass_
var Prod_State

var particle = [];
var spring = [];
var angularspring = [];

initiateSimulation();


// functions
function demo1(){

	DemoText   = "Mechanical wind-up clock spring"
	iterations = 5
	warmstart  = 1
	
	var num_Particles       = 64;
	var num_Springs         = 63;
	var num_angular_Springs = 62;
	var SpringLength        = 60.0;
	var Angle               = 1/4 * 2 * PI;
	var delta_angle         = 0.05 * 2 * PI;
	
	//
	clearParticles();
	clearSprings();
	clearAngularSprings();
	
	// create particles
	for(var i = 0; i < num_Particles; i++){
		
		var p = new Particle();
		
		var mass = i == 0 ? 1000.0 : 1.0 ;
		
		p.inverseMass = i > num_Particles-3 ? 0.0 : 1.0 / mass;
		p.radius = Math.pow((( mass / DENSITY ) / (4/3) * PI), 1/3); // TODO: Check this equation
		
		var center = new Vector2( SCREEN_WID * 0.5, SCREEN_HGT * 0.3 );
		var position = new Vector2( Math.cos(Angle), Math.sin(Angle) ).mul(SpringLength);

		p.position = center.add(position);
		
		Angle += delta_angle;
		SpringLength += 1;

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

function createScreen(wid, hgt){

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
	ctx.resetTransform();

	// Mouse event handlers
	canvas.addEventListener('click', mouseClickEventHandler, false);
	canvas.addEventListener('mousedown', mouseDownEventHandler, false);
	canvas.addEventListener('mouseup', mouseUpEventHandler, false);
	canvas.addEventListener('mousemove', mouseMoveEventHandler, false);
	canvas.addEventListener('wheel', mouseWheelEventHandler, false);

	demo1();

	setInterval(runSimulation, 0);
}

function updateMouseInput(){

	mouse.Psn_old = mouse.position_
	mouse.wheelPrev_ = mouse.wheel_
	mouse.buttonPrev_ = mouse.button_

	//  on mouseklick, find nearest particle
	if (mouse.button_ == 1) {

		if (Pick_State == false) {

			Temp_Dist = PICK_DISTANCE_SQUARED

			for (var j = 0; j < particle.length; j++) {

				var dst = mouse.position_.sub(particle[j].position)

				if (Math.abs(dst.x) > PICK_DISTANCE) { continue }
				if (Math.abs(dst.y) > PICK_DISTANCE) { continue }

				var distanceSquared = dst.lengthSquared()

				if (distanceSquared > PICK_DISTANCE_SQUARED) { continue }
				if (distanceSquared > Temp_Dist) { continue }

				Temp_Dist = distanceSquared

				Picked_mass_ = j
			}
		}
	}

	if (Picked_mass_ != -1) {

		Pick_State = true
		Picked_Rest_Dist = Math.sqrt(Temp_Dist)
	  }

	if (mouse.button_ == 2) { Prod_State = true }

	if (mouse.button_ == 0) {
		Pick_State = false
		Picked_mass_ = -1
		Prod_State = false
	}

	// set mouse - blob fixedAngleSprings_ impulse
	if (Pick_State == true) {

		var Dist = particle[Picked_mass_].position.sub(mouse.position_)
		var Distance = Dist.length()

		if (Distance > Picked_Rest_Dist) {

			var impulse = -(Distance - Picked_Rest_Dist) * 24; //particle[Picked_mass_].mass * 64

			particle[Picked_mass_].impulse = particle[Picked_mass_].impulse.add(Dist.div(Distance).mul(impulse))

		}
	}
}

function updateKeyInput(){

}

function updateScreen(){

	// Clear screen
	ctx.resetTransform();
	ctx.fillStyle = "#000000";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	
	// Particles
	ctx.fillStyle = "#FFFFFF";

	for(var i = 0; i < particle.length; i++){

		var p = particle[i]

		var x = p.position.x;
		var y = p.position.y;
		ctx.setTransform(1, 0, 0, 1, x, y);
		ctx.beginPath();
		ctx.arc(0, 0, p.radius, 0, PI * 2);
		//ctx.fillRect(-2, -2, 4, 4);
		ctx.fill();
		ctx.closePath();
	}

	// Springs
	ctx.lineWidth = 2.0;
	ctx.strokeStyle = "#ffffff";
	ctx.lineJoin = "round";
	ctx.setTransform(1, 0, 0, 1, 0.0, 0.0);

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
}

function runSimulation(){
	
	updateMouseInput();
	updateKeyInput();
	computeReusableData();
	requestAnimationFrame( updateScreen );

	if( warmstart == 1 ){
		applyWarmstart();
	} 

	for(var i = 0; i < iterations; i++){

		applyCorrectiveAngularImpulse();
		applyCorrectiveLinearImpulse();
	}

	computeNewState();
}

function applyCorrectiveLinearImpulse(){
	
	for(var i = spring.length-1; i > 0; --i){
		//if(i % 2 == 1){
			spring[i].computeCorrectiveImpulse();
		//}
	}

	for(var i = 0; i < spring.length; i++){
		//if(i % 2 == 0){
			spring[i].computeCorrectiveImpulse();
		//}
	}
}

function applyCorrectiveAngularImpulse(){

	for(var i = angularspring.length-1; i > 0; --i){
		//if(i % 2 == 1){
			angularspring[i].computeCorrectiveImpulse();
		//}
	}

	for(var i = 0; i < angularspring.length; i++){
		//if(i % 2 == 0){
			angularspring[i].computeCorrectiveImpulse();
		//}
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

// Mouse eventhandlers
function mouseClickEventHandler(e) {
	//console.log('mouseClickEventHandler called!', e);
	mouse.button_ = e.buttons
	//console.log(mouse.button_)
  };
  
  function mouseUpEventHandler(e) {
	//console.log('mouseUpEventHandler called!', e);
	//mouse.button_ = 0
  };
  
  function mouseDownEventHandler(e) {
	//console.log('mouseDownEventHandler called!', e);
	mouse.button_ = e.buttons
	//console.log(mouse.button_)
  };
  
  function mouseMoveEventHandler(e) {
	//console.log('mouseMoveEventHandler called!', e);
	mouse.position_.x = e.clientX
	mouse.position_.y = e.clientY
	//console.log("mouse position: ", mouse.position_.x, mouse.position_.y)
  };
  
  function mouseWheelEventHandler(e) {
	//console.log('mouseWheelEventHandler called!', e);
  };
