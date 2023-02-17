//*******************************************************************************
//
//  Sequential impulse with warmstart demos
//
//  Version 0.45, july 2017, Michael "h4tt3n" Nissen
//
//  This version includes rigid bodies and hinges
//
//  Controls:
//  
//  Demos                      :  F1 - F6
//  Double / halve iterations  :  1 - 9
//  Inc. / dec. iterations     :  I + up / down
//  Inc. / dec. stiffness      :  S + up / down
//  Inc. / dec. damping        :  D + up / down
//  Inc. / dec. warmstart      :  W + up / down
//  Warmstart on / off         :  Space bar
//  Exit demo                  :  Escape key
//  
//******************************************************************************* 

//   Includes
#Include Once "../Math/vector2.bi"
#Include Once "../Math/Mat22.bi"

//   Global constants
const   dt             = 1.0 / 60.0       //  timestep
const   inv_dt         = 1.0 / dt         //  inverse timestep
const   gravity        = 10.0             //  gravity
const   air_friction   = 1.0             //  gravity
const   density        = 0.05             //  ball density
const   pi             = Math.PI          //  pi
const  screen_wid     = 1000             //  screen width
const  screen_hgt     = 800              //  screen height
const  pick_distance  = 128^2            //  mouse pick up distance
const  max_particles  = 2048             //  particles
const  max_springs    = 2048             //  springs
const  max_boxes      =  512             //  boxes
const  max_hinges     =  512             //  hinges


//	Types
class ParticleType
	
	 Constructor()
	
	vector2 position
	vector2 velocity
	vector2 impulse
	
	 mass
	 inverse_mass
	 radius
  
End class

class SpringType
	
	 Constructor()
	
	vector2 accumulated_impulse
	vector2 unit
	
	 reduced_mass
	 rest_distance
	 rest_impulse
	
	ParticleType Ptr particle_a
	ParticleType Ptr particle_b
  
End class

class BoxType
	
	 Constructor()
	
	vec2 radius
	
	vector2 position
	vector2 velocity
	vector2 impulse
	vector2 angle_vector
	
	 angle
	 angular_velocity
	 angular_impulse
	
	 mass
	 inverse_mass
	 inertia
	 inverse_inertia
	
End class

class HingeType
	
	 Constructor()
	
	vector2 accumulated_impulse
	vector2 anchor_a
	vector2 anchor_b
	vector2 r_a
	vector2 r_b
	
	 reduced_mass
	Mat22 M
	vector2 rest_impulse
	
	BoxType Ptr box_a
	BoxType Ptr box_b
	
End class

class SimulationType
	
	 Constructor()

	 Sub Demo1()
	
	 Sub CreateScreen( ByVal Wid , ByVal Hgt  )
	
	 Function CreateParticle() ParticleType Ptr
	 Function CreateSpring() SpringType Ptr
	 Function CreateBox() BoxType Ptr
	 Function CreateHinge() HingeType Ptr
	
	 Sub ClearParticles()
	 Sub ClearSprings()
	 Sub ClearBoxes()
	 Sub ClearHinges()
	
	 Sub UpdateInput()
	 Sub UpdateScreen()
	
	 Sub RunSimulation()

	 Sub ApplyCorrectiveimpulse()
	 Sub ApplyWarmStart()
	 Sub ComputeRestimpulse()
	 Sub ComputeNewState()
	
	fb.EVENT e
	
	String DemoText
	
	 iterations
	 warmstart
	 numParticles
	 numSprings
	 numBoxes
	 numHinges
	
	 spring_stiffnes
	 spring_damping
	 spring_warmstart
	
	 hinge_stiffnes
	 hinge_damping
	 hinge_warmstart
	
	vector2 position
	vector2 position_prev
	vector2 velocity
	
	 button
	 button_prev
	
	//
	ParticleType Ptr picked
	ParticleType Ptr nearest
	
	ParticleType Ptr ParticleLo
	ParticleType Ptr ParticleHi
	
	SpringType Ptr SpringLo
	SpringType Ptr SpringHi
	
	BoxType Ptr BoxLo
	BoxType Ptr BoxHi
	
	HingeType Ptr HingeLo
	HingeType Ptr HingeHi
	
	//
	ParticleType particle ( 1 To max_particles )
	SpringType   spring   ( 1 To max_springs )
	BoxType      box      ( 1 To max_boxes )
	HingeType    hinge    ( 1 To max_hinges )

End class


//	Create instance and run simulation
Scope

	Dim SimulationType simulation

End Scope


//	Constructors
Constructor ParticleType()
	
	mass         = 0.0
	inverse_mass = 0.0
	radius       = 0.0
	position     = vector2( 0.0, 0.0 )
	velocity     = vector2( 0.0, 0.0 )
	impulse      = vector2( 0.0, 0.0 )
	
End Constructor

Constructor SpringType()
	
	particle_a          = 0
	particle_b          = 0
	reduced_mass        = 0.0
	rest_distance       = 0.0
	rest_impulse        = 0.0
	accumulated_impulse = vector2( 0.0, 0.0 )
	unit                = vector2( 0.0, 0.0 )
	
End Constructor

Constructor BoxType()

	radius = vector2( 0.0, 0.0 )
	
	position     = vector2( 0.0, 0.0 )
	velocity     = vector2( 0.0, 0.0 )
	impulse      = vector2( 0.0, 0.0 )
	angle_vector = vector2( 0.0, 0.0 )
	
	angle            = 0.0
	angular_velocity = 0.0
	angular_impulse  = 0.0
	
	mass            = 0.0
	inverse_mass    = 0.0
	inertia         = 0.0
	inverse_inertia = 0.0

End Constructor

Constructor HingeType()

	accumulated_impulse = vector2( 0.0, 0.0 )
	
	anchor_a = vector2( 0.0, 0.0 )
	anchor_b = vector2( 0.0, 0.0 )
	
	r_a = vector2( 0.0, 0.0 )
	r_b = vector2( 0.0, 0.0 )
	
	reduced_mass = 0.0
	rest_impulse = vector2( 0.0, 0.0 )
	
	box_a = 0
	box_b = 0
	
End Constructor

Constructor SimulationType()
	
	ClearParticles()
	ClearSprings()
	ClearBoxes()
	ClearHinges()
	
	CreateScreen( screen_wid, screen_hgt )
	
	Demo1()
	
	RunSimulation()
	
End Constructor


//	Main loop
Sub SimulationType.RunSimulation()
	
	Do
		UpdateScreen()
		UpdateInput()
		
		// gravity
		For P ParticleType Ptr = ParticleLo To ParticleHi
		
			If ( P->inverse_mass > 0.0 ) Then

				P->velocity *= air_friction
				P->velocity += vector2( 0.0, dt * gravity )
				
			End If
			
		Next
		
		For B BoxType Ptr = BoxLo To BoxHi
		
			If ( B->inverse_mass > 0.0 ) Then
				
				B->angular_velocity *= air_friction
				B->velocity *= air_friction
				B->velocity += vector2( 0.0, dt * gravity )
				
			End If
			
		Next
		
		ComputeRestimpulse()		
		
		If warmstart = 1 Then 
			
			ApplyWarmStart()
			
		Else
			
			For S SpringType Ptr = SpringLo To SpringHi
				
				S->accumulated_impulse = vector2( 0.0, 0.0 )
				
			Next
			
			For J HingeType Ptr = HingeLo To HingeHi
				
				J->accumulated_impulse = vector2( 0.0, 0.0 )
				
			Next
			
		EndIf
		
		For i  = 1 To iterations
		
			ApplyCorrectiveimpulse()
		
		Next
		
		ComputeNewState()
		
	Loop
	
End Sub


// Demos
Sub SimulationType.Demo1()
	
		// Wrecking ball
	
	iterations   = 10
	warmstart    = 1
	spring_stiffnes  = 1.0   
	spring_damping   = 1.0
	spring_warmstart = 1.0
	
	Dim  num_Particles = 17
	Dim  num_Springs   = 16
	Dim  SpringLength  = 20
	
	Dim  num_boxes  = 17
	Dim  num_hinges = 16
	Dim  hinge_pos  = 4
	Dim vec2    box_radius = vec2( 20, 4 )
	
	DemoText = "Demo 1: Wrecking ball. The ball weighs 1000 times more than the smaller masses, but there is no visible deformation."
	
	//
	ClearParticles()
	ClearSprings()
	ClearBoxes()
	ClearHinges()
	
	// Boxes
	Dim BoxType Ptr B1 = CreateBox()
	
	B1->radius = vector2( 15, 30 )
	
	B1->mass = B1->radius.x * B1->radius.y * density
	B1->inverse_mass = 0.0
	
	B1->inertia = B1->mass / 12.0 * ( ( 2.0 * B1->radius.x ) ^ 2 + ( 2.0 * B1->radius.y ) ^ 2 )
	B1->inverse_inertia = 0.0
	
	B1->position.x   = -300
	B1->position.y   = -100
	
	B1->angle = 0.0
	B1->angle_vector = vector2( Cos( B1->angle ), Sin( B1->angle ) )
	
	//
	For i  = 2 To num_boxes
		
		Dim BoxType Ptr B = CreateBox()
		
		B->radius = box_radius
	
		B->mass = ( 2.0 * B->radius.x ) * ( 2.0 * B->radius.y ) * density
		B->inverse_mass = 1.0 / B->mass
		
		If ( i = num_boxes ) Then
			
			B->radius = vector2( 100, 50 )
			B->mass = ( 2.0 * B->radius.x ) * ( 2.0 * B->radius.y ) * density
			B->inverse_mass = 1.0 / B->mass
			
			'B->mass *= 1000
			'B->inverse_mass = 1.0 / B->mass
			
		EndIf
		
		B->inertia = B->mass / 12.0 * ( ( 2.0 * B->radius.x ) ^ 2 + ( 2.0 * B->radius.y ) ^ 2 )
		B->inverse_inertia = 1.0 / B->inertia
		
		B->position.x   = 300 + (i-1) * ( box_radius.x - hinge_pos ) * 2
		B->position.y   = 100
		
		B->angle = 0.0
		B->angle_vector = vector2( Cos( B->angle ), Sin( B->angle ) )
		
		'B->angular_velocity = (Rnd-rnd)*1000
		
	Next
	
	// Hinges
	For i  = 1 To num_hinges
		
		Dim HingeType Ptr J1 = CreateHinge()
		
		J1->box_a = @box(i)
		J1->box_b = @box(i+1)
		
		J1->anchor_a = vector2( 300 + ( box_radius.x - hinge_pos ) + (i-1) * ( box_radius.x - hinge_pos ) * 2, 100 ) - J1->box_a->position
		J1->anchor_b = vector2( 300 + ( box_radius.x - hinge_pos ) + (i-1) * ( box_radius.x - hinge_pos ) * 2, 100 ) - J1->box_b->position
		
	Next
	
	// randomize positions for stability test
	'For i  = 2 To num_boxes
	'	
	'	box(i).position = vector2().RandomizeCircle( 512 )
	'	
	'	box(i).angle = ( Rnd() - Rnd() ) * 2.0 * pi
	'	box(i).angle_vector = vector2( Cos( box(i).angle ), Sin( box(i).angle ) )
	'	
	'Next
	
	// create particles
	Dim particletype Ptr P = CreateParticle()
		
	P->mass         = 1.0
	P->inverse_mass = 0
	P->radius       = ( ( P->mass / density ) / (4/3) * pi ) ^ (1/3) 
	P->position.x   = 0.5 * screen_wid
	P->position.y   = 0.25 * screen_hgt
	
	For i integer = 2 To num_Particles
		
		Dim particletype Ptr P = CreateParticle()
		
		P->mass         = 1.0
		P->inverse_mass = 1.0 / P->mass
		P->radius       = 0.0
		
		If i = num_Particles Then
			
			P->mass *= 1000.0
			P->inverse_mass = 1.0 / P->mass
			P->radius = ( ( P->mass / density ) / (4/3) * pi ) ^ (1/3) 
			
		EndIf
		
		P->position.x   = 0.5 * screen_wid + ( i - 1 ) * SpringLength
		P->position.y   = 0.25 * screen_hgt
		
	Next
	
	//  create springs
	For i  = 1 To num_Springs
		
		Dim SpringType Ptr S = CreateSpring()
				
		S->particle_a    = @particle( i )
		S->particle_b    = @particle( i + 1 )
		S->rest_distance = (S->particle_b->position - S->particle_a->position).length()
		
		Dim  inverseMass = S->particle_a->inverse_mass + S->particle_b->inverse_mass
		
		S->reduced_mass = IIf( inverseMass = 0.0 , 0.0 , 1.0 / inverseMass )
		
	Next
	
End Sub

// Core physics functions
Sub SimulationType.ComputeRestimpulse()
	
	// Compute the impulse needed to satisfy the constraint in one loop
	
	// Springs
	If ( numsprings ) Then
		
		For S SpringType Ptr = SpringLo To SpringHi
			
			Dim vector2 distance = S->particle_b->position - S->particle_a->position
			Dim vector2 velocity = S->particle_b->velocity - S->particle_a->velocity
			
			S->unit = distance.Unit()
			
			Dim  distance_error = S->unit.dot( distance ) - S->rest_distance
			Dim  velocity_error = S->unit.dot( velocity )
			
			S->rest_impulse = -( spring_stiffnes * distance_error * inv_dt + spring_damping * velocity_error )
			
		Next
		
	EndIf
	
	// Hinges
	If ( numhinges ) Then
		
		For J HingeType Ptr = HingeLo To HingeHi
			
			//
			J->r_a = J->box_a->angle_vector.Rotateccw( J->anchor_a )
			J->r_b = J->box_b->angle_vector.Rotateccw( J->anchor_b )
			
			Dim vector2 position_a = J->box_a->position + J->r_a
			Dim vector2 position_b = J->box_b->position + J->r_b
			
			Dim vector2 velocity_a = J->box_a->velocity + J->r_a.Perpdot( J->box_a->angular_velocity )
			Dim vector2 velocity_b = J->box_b->velocity + J->r_b.Perpdot( J->box_b->angular_velocity )
			
			Dim vector2 distance_error = position_b - position_a
			Dim vector2 velocity_error = velocity_b - velocity_a
			
			J->rest_impulse = -( spring_stiffnes * distance_error * inv_dt + spring_damping * velocity_error )
			
			// deltaV = deltaV0 + K * impulse
			// invM = [(1/m1 + 1/m2) * eye(2) - skew(r1) * invI1 * skew(r1) - skew(r2) * invI2 * skew(r2)]
			//      = [1/m1+1/m2     0    ] + invI1 * [r1.y*r1.y -r1.x*r1.y] + invI2 * [r2.y*r2.y -r2.x*r2.y]
			//        [    0     1/m1+1/m2]           [-r1.x*r1.y r1.x*r1.x]           [-r2.x*r2.y r2.x*r2.x]
			Dim Mat22 K1 = Mat22( _
			J->box_a->inverse_mass + J->box_b->inverse_mass, 0.0, _
			0.0									 	              , J->box_a->inverse_mass + J->box_b->inverse_mass )
			
			Dim Mat22 K2 = Mat22( _
			J->box_a->inverse_inertia, 0.0, _
			0.0,	                     J->box_a->inverse_inertia )
			
			Dim Mat22 K3 = Mat22( _
			J->box_b->inverse_inertia, 0.0, _
			0.0,	                     J->box_b->inverse_inertia )
			
			// 
			Dim Mat22 K4 = Mat22( _
			 J->r_a.y * J->r_a.y, -J->r_a.x * J->r_a.y, _
			-J->r_a.x * J->r_a.y,  J->r_a.x * J->r_a.x )
			
			Dim Mat22 K5 = Mat22( _
			 J->r_b.y * J->r_b.y, -J->r_b.x * J->r_b.y, _
			-J->r_b.x * J->r_b.y,  J->r_b.x * J->r_b.x )
						
			'Dim Mat22 K2 = Mat22( _
			' J->box_a->inverse_inertia * J->r_a.y * J->r_a.y, -J->box_a->inverse_inertia * J->r_a.x * J->r_a.y, _
			'-J->box_a->inverse_inertia * J->r_a.x * J->r_a.y,	J->box_a->inverse_inertia * J->r_a.x * J->r_a.x )
			'
			'Dim Mat22 K3 = Mat22( _
			' J->box_b->inverse_inertia * J->r_b.y * J->r_b.y, -J->box_b->inverse_inertia * J->r_b.x * J->r_b.y, _
			'-J->box_b->inverse_inertia * J->r_b.x * J->r_b.y,  J->box_b->inverse_inertia * J->r_b.x * J->r_b.x )
		
			'Dim Mat22 K = K1 + K2 + K3
			Dim Mat22 K = K1 + K2 * K4 + K3 * K5
		
			J->M = K.Inverse()
			
		Next
	
	EndIf
	
End Sub

Sub SimulationType.ApplyCorrectiveimpulse()
	
	// Apply the difference between rest impulse and current impulse.
	// Accumulate applied impulses for warmstarting the next loop.
	
	// Springs
	If ( numsprings ) Then
			
		For S SpringType Ptr = SpringLo To SpringHi
		
			Dim vector2 current_impulse = S->particle_b->impulse - S->particle_a->impulse
			
			Dim  impulse_error = S->unit.dot( current_impulse ) - S->rest_impulse
			
		   Dim vector2 corrective_impulse = -impulse_error * S->reduced_mass * S->unit
			
			S->particle_a->impulse -= corrective_impulse * S->particle_a->inverse_mass
			S->particle_b->impulse += corrective_impulse * S->particle_b->inverse_mass
			
			S->accumulated_impulse += corrective_impulse
			
		Next
		
	EndIf
	
	// Hinges
	If ( numhinges ) Then
		
		For J HingeType Ptr = HingeLo To HingeHi
			
			Dim vector2 impulse_a = J->box_a->impulse + J->r_a.PerpDot( J->box_a->angular_impulse )
			Dim vector2 impulse_b = J->box_b->impulse + J->r_b.PerpDot( J->box_b->angular_impulse )
			
			Dim vector2 current_impulse = impulse_b - impulse_a
			
			Dim vector2 impulse_error = current_impulse - J->rest_impulse
			
			Dim vector2 corrective_impulse = -impulse_error * J->M
			
			J->box_a->impulse -= corrective_impulse * J->box_a->inverse_mass
			J->box_b->impulse += corrective_impulse * J->box_b->inverse_mass
			
			J->box_a->angular_impulse -= J->r_a.PerpDot( corrective_impulse ) * J->box_a->inverse_inertia
			J->box_b->angular_impulse += J->r_b.PerpDot( corrective_impulse ) * J->box_b->inverse_inertia
			
			J->accumulated_impulse += corrective_impulse
			
		Next
		
	EndIf
	
End Sub

Sub SimulationType.ApplyWarmStart()
	
	// Warm starting. Use the sum of previously applied impulses
	// projected onto new normal vector as initial iteration value.
	//	This is roughly equivalent of doubling the number of iterations.
	
	// Springs
	If ( numsprings ) Then
		
		For S SpringType Ptr = SpringLo To SpringHi
			
			Dim  projected_impulse = S->unit.dot( S->accumulated_impulse )
			
			If ( projected_impulse < 0.0 ) Then
				
				Dim vector2 warmstart_impulse = spring_warmstart * projected_impulse * S->unit
				
				S->particle_a->impulse -= warmstart_impulse * S->particle_a->inverse_mass 
				S->particle_b->impulse += warmstart_impulse * S->particle_b->inverse_mass
			
			End If
			
			S->accumulated_impulse = vector2( 0.0, 0.0 )
			
		Next
	
	EndIf
	
	// Hinges
	If ( numhinges ) Then
		
		For J HingeType Ptr = HingeLo To HingeHi
			
			Dim vector2 projected_impulse = J->accumulated_impulse
			
			'Dim vector2 position_a = J->box_a->position + J->r_a
			'Dim vector2 position_b = J->box_b->position + J->r_b
			
			'Dim vector2 dist = position_b - position_a
			
			'If ( Sgn(projected_impulse.x ) = Sgn( dist.x ) And Sgn( projected_impulse.y ) = Sgn( dist.y )) Then
				
				Dim vector2 warmstart_impulse = spring_warmstart * projected_impulse
				
				J->box_a->impulse -= warmstart_impulse * J->box_a->inverse_mass
				J->box_b->impulse += warmstart_impulse * J->box_b->inverse_mass
				
				J->box_a->angular_impulse -= J->r_a.PerpDot( warmstart_impulse ) * J->box_a->inverse_inertia
				J->box_b->angular_impulse += J->r_b.PerpDot( warmstart_impulse ) * J->box_b->inverse_inertia
				
			'EndIf
			
			J->accumulated_impulse = vector2( 0.0, 0.0 )
			
		Next
	
	EndIf
	
End Sub

Sub SimulationType.ComputeNewState()
	
	// Particles
	If ( numparticles ) Then
		
		For P ParticleType Ptr = ParticleLo To ParticleHi
			
			If ( P->inverse_mass > 0.0 ) Then
				
				P->velocity += P->impulse
				P->position += P->velocity * dt 
				
			End If
			
			P->impulse = vector2( 0.0, 0.0 )
			
		Next
	
	EndIf
	
	// Boxes
	If ( numboxes ) Then
		
		For B BoxType Ptr = BoxLo To BoxHi
			
			//
			If ( B->inverse_mass > 0.0 ) Then
				
				B->velocity += B->impulse
				B->position += B->velocity * dt 
				
			End If
			
			B->impulse = vector2( 0.0, 0.0 )
			
			//
			If ( B->inverse_inertia > 0.0 ) Then
				
				B->angular_velocity += B->angular_impulse
				B->angle            += B->angular_velocity * dt
				
				B->angle_vector = vector2( Cos( B->angle ), Sin( B->angle ) )
				
			EndIf
			
			B->angular_impulse = 0.0
			
		Next
	
	EndIf
	
End Sub

// Graphics and interaction
Sub SimulationType.UpdateScreen()
	
	//
	Cls
	
	//
	Locate  4, 2: Print DemoText
	Locate  8, 2: Print Using "(I)terations ###"; iterations
	Locate 10, 2: Print Using "(S)tiffness  #.##"; spring_stiffnes
	Locate 12, 2: Print Using "(D)amping    #.##"; spring_damping
	
	If ( warmstart = 0 ) Then 
		
		Locate 14, 2: Print "(W)armstart  OFF"
		
	Else
		
		Locate 14, 2: Print Using "(W)armstart  #.##"; spring_warmstart
		
	EndIf
	
	//  draw particles background
	If ( numparticles ) Then
		
		For P ParticleType Ptr = ParticleLo To ParticleHi
			
			If ( P->radius > 0.0 ) Then
				
				Circle(P->position.x, P->position.y), P->radius + 5.0, RGB(0, 0, 0) ,,, 1, f
				
			End If
			
		Next
	
	EndIf
	
	//  draw springs 
	If ( numsprings ) Then
		
		For S SpringType Ptr = SpringLo To SpringHi
			
			Line(S->particle_a->position.x, S->particle_a->position.y)-_
				 (S->particle_b->position.x, S->particle_b->position.y), RGB(0, 255, 0)
			
		Next
	
	EndIf
	
	//	draw particles foreground
	If ( numparticles ) Then
		
		For P ParticleType Ptr = ParticleLo To ParticleHi
			
			If ( P->radius > 0.0 ) Then
				
				Dim UInteger Col = IIf( P->inverse_mass = 0.0, RGB(160, 160, 160), RGB(255, 0, 0) )
				
				Circle(P->position.x, P->position.y), P->radius, Col,,, 1, f
				
			Else
				
				Dim UInteger Col = IIf( P->inverse_mass = 0.0, RGB(160, 160, 160), RGB(128, 255, 0) )
				
				Circle(P->position.x, P->position.y), 2.0, Col,,, 1, f
				
			End If
			
		Next
	
	EndIf
	
	// Draw boxes
	If ( numboxes) Then
		
		For B BoxType Ptr = BoxLo To BoxHi
			
			'Circle( B->position.x, B->position.y ), 2.0, RGB( 192, 192, 192 ),,, 1, f
			
			Dim vector2 a1 = B->position + B->angle_vector * B->radius.x + B->angle_vector.perpccw * B->radius.y
			Dim vector2 a2 = B->position + B->angle_vector * B->radius.x - B->angle_vector.perpccw * B->radius.y
			Dim vector2 a3 = B->position - B->angle_vector * B->radius.x - B->angle_vector.perpccw * B->radius.y
			Dim vector2 a4 = B->position - B->angle_vector * B->radius.x + B->angle_vector.perpccw * B->radius.y
	
			Line( a1.x, a1.y )-( a2.x, a2.y ), RGB( 160, 160, 160 )
			Line( a2.x, a2.y )-( a3.x, a3.y ), RGB( 160, 160, 160 )
			Line( a3.x, a3.y )-( a4.x, a4.y ), RGB( 160, 160, 160 )
			Line( a4.x, a4.y )-( a1.x, a1.y ), RGB( 160, 160, 160 )
			
		Next
	
	EndIf
	
	// Draw hinges
	If ( numhinges ) Then
		
		For J HingeType Ptr = HingeLo To HingeHi
			
			Dim vec2 pos_a = J->box_a->position + J->r_a
			Dim vec2 pos_b = J->box_b->position + J->r_b
			
			Circle( pos_a.x, pos_a.y ), 2.0, RGB( 255, 0, 255 ),,, 1, f
			Circle( pos_b.x, pos_b.y ), 2.0, RGB( 255, 0, 255 ),,, 1, f

			Line( pos_a.x, pos_a.y )-( pos_b.x, pos_b.y ), RGB( 255, 0, 255 )
			
		Next
	
	EndIf
	
	If ( Nearest <> 0 ) Then Circle(Nearest->position.x, Nearest->position.y), Nearest->radius + 8, RGB(255, 255, 255),,, 1
	If ( Picked <> 0 ) Then Circle(Picked->position.x, Picked->position.y), Picked->radius + 8, RGB(255, 255, 0),,, 1
	
	//
	ScreenCopy()
	
End Sub

Sub SimulationType.CreateScreen( ByVal Wid , ByVal Hgt  )
   
   ScreenRes Wid, Hgt, 16, 2', fb.GFX_ALPHA_PRIMITIVES
   
   ScreenSet( 0, 1 )
   
   WindowTitle "Mike's iterative spring demo. See source for controls."
   
   Color RGB( 255, 160, 160 ), RGB( 64, 64, 64 )
   
End Sub

Sub SimulationType.UpdateInput()
	
	Dim  mouse_x, mouse_y
	Dim vector2 DistanceVector
	Dim   Distance
	Dim   MinDIst
	
	//
	position_prev = position
	button_prev   = button
	
	//
	GetMouse mouse_x, mouse_y,, button
	
	position = vector2( Cast( , mouse_x) , Cast( , mouse_y ) )
	
	//
	MinDist  = pick_distance
	
	nearest = 0
	
	If ( picked = 0 ) Then
	
		For P ParticleType Ptr = ParticleLo To ParticleHi
			
			DistanceVector = P->Position - vector2( Cast( , mouse_x) , Cast( , mouse_y ) )
			Distance = DistanceVector.LengthSquared()
			
			If ( Distance < MinDist ) Then
				
				MinDist = Distance
				nearest = P
				
			EndIf
		
		Next
	
	End If
	
	If ( button = 1 And button_prev = 0 ) Then picked = nearest
	
	If ( button = 0 ) Then picked = 0
	
	
	//
	If ( picked <> 0 ) Then
	
		picked->position.x += ( position.x - position_prev.x )
		picked->position.y += ( position.y - position_prev.y )
		
		picked->velocity.x = 0'( position.x - position_prev.x ) * dt
		picked->velocity.y = 0'( position.y - position_prev.y ) * dt
		
		picked->impulse.x = 0
		picked->impulse.y = 0
		
	End If
	
	If ( ScreenEvent( @e ) ) Then
		
		Select Case e.type
		
		Case fb.EVENT_KEY_PRESS
			
			If ( e.scancode = fb.SC_F1 ) Then Demo1()
			If ( e.scancode = fb.SC_F2 ) Then Demo2()
			If ( e.scancode = fb.SC_F3 ) Then Demo3()
			If ( e.scancode = fb.SC_F4 ) Then Demo4()
			If ( e.scancode = fb.SC_F5 ) Then Demo5()
			If ( e.scancode = fb.SC_F6 ) Then Demo6()
			
			// Iterations
			If ( MultiKey( fb.SC_I ) And ( e.scancode = fb.SC_UP   ) ) Then iterations += 1
			If ( MultiKey( fb.SC_I ) And ( e.scancode = fb.SC_DOWN ) ) Then iterations -= 1
			
			If ( e.scancode = fb.SC_SPACE ) Then warmstart Xor= 1
			
			If ( e.scancode = fb.SC_ESCAPE ) Then End
			
		Case fb.EVENT_KEY_RELEASE
		
		Case fb.EVENT_KEY_REPEAT
			
			// 
			If ( MultiKey( fb.SC_S ) And ( e.scancode = fb.SC_UP   ) ) Then spring_stiffnes += 0.002
			If ( MultiKey( fb.SC_S ) And ( e.scancode = fb.SC_DOWN ) ) Then spring_stiffnes -= 0.002
			
			// 
			If ( MultiKey( fb.SC_D ) And ( e.scancode = fb.SC_UP   ) ) Then spring_damping += 0.002
			If ( MultiKey( fb.SC_D ) And ( e.scancode = fb.SC_DOWN ) ) Then spring_damping -= 0.002
			
			// 
			If ( MultiKey( fb.SC_W ) And ( e.scancode = fb.SC_UP   ) ) Then spring_warmstart += 0.002
			If ( MultiKey( fb.SC_W ) And ( e.scancode = fb.SC_DOWN ) ) Then spring_warmstart -= 0.002
			
		Case fb.EVENT_MOUSE_MOVE
		
		Case fb.EVENT_MOUSE_BUTTON_PRESS
			
			If (e.button = fb.BUTTON_LEFT) Then
			
			End If
			
			If (e.button = fb.BUTTON_RIGHT) Then
			
			End If
			
		Case fb.EVENT_MOUSE_BUTTON_RELEASE
			
			If (e.button = fb.BUTTON_LEFT) Then
			
			End If
			
			If (e.button = fb.BUTTON_RIGHT) Then
			
			End If
			
		Case fb.EVENT_MOUSE_WHEEL
		
		Case fb.EVENT_WINDOW_CLOSE
			
			End
			
		End Select
		
	End If
	
	If MultiKey( fb.SC_1 ) Then iterations = 1
	If MultiKey( fb.SC_2 ) Then iterations = 2
	If MultiKey( fb.SC_3 ) Then iterations = 3
	If MultiKey( fb.SC_4 ) Then iterations = 4
	If MultiKey( fb.SC_5 ) Then iterations = 5
	If MultiKey( fb.SC_6 ) Then iterations = 6
	If MultiKey( fb.SC_7 ) Then iterations = 7
	If MultiKey( fb.SC_8 ) Then iterations = 8
	If MultiKey( fb.SC_9 ) Then iterations = 9
	
	If iterations < 1 Then iterations = 1
	
	If spring_stiffnes < 0.0 Then spring_stiffnes = 0.0
	If spring_stiffnes > 1.0 Then spring_stiffnes = 1.0
	
	If spring_damping < 0.0 Then spring_damping = 0.0
	If spring_damping > 1.0 Then spring_damping = 1.0
	
	If spring_warmstart < 0.0 Then spring_warmstart = 0.0
	If spring_warmstart > 1.0 Then spring_warmstart = 1.0
	
End Sub


// Memory management
Sub SimulationType.ClearParticles()
	
	numParticles = 0
	
	ParticleLo = @Particle( 1 )
	ParticleHi = @Particle( 1 )
	
	For i  = 1 To max_particles
		
		With particle(i)
			
			.mass         = 0.0
			.inverse_mass = 0.0
			.radius       = 0.0
			.position     = vector2( 0.0, 0.0 )
			.velocity     = vector2( 0.0, 0.0 )
			.impulse      = vector2( 0.0, 0.0 )
			
		End With
	
	Next
	
End Sub

Sub SimulationType.ClearSprings()
	
	numSprings = 0
	
	SpringLo = @spring( 1 )
	SpringHi = @spring( 1 )
	
	For i  = 1 To max_springs
		
		With spring(i)
			
			.particle_a          = 0
			.particle_b          = 0
			.rest_distance       = 0.0
			.reduced_mass        = 0.0
			.rest_distance       = 0.0
			.rest_impulse        = 0.0
			.accumulated_impulse = vector2( 0.0, 0.0 )
			.unit                = vector2( 0.0, 0.0 )
			
		End With
	
	Next
	
End Sub

Sub SimulationType.ClearBoxes()
	
	numBoxes = 0
	
	BoxLo = @box( 1 )
	BoxHi = @box( 1 )
	
	For i  = 1 To max_boxes
		
		With box(i)
			
			.radius = vector2( 0.0, 0.0 )
	
			.position     = vector2( 0.0, 0.0 )
			.velocity     = vector2( 0.0, 0.0 )
			.impulse      = vector2( 0.0, 0.0 )
			.angle_vector = vector2( 0.0, 0.0 )
			
			.angle            = 0.0
			.angular_velocity = 0.0
			.angular_impulse  = 0.0
			
			.mass            = 0.0
			.inverse_mass    = 0.0
			.inertia         = 0.0
			.inverse_inertia = 0.0
			
		End With
	
	Next
	
End Sub

Sub SimulationType.ClearHinges()
	
	numHinges = 0
	
	HingeLo = @hinge( 1 )
	HingeHi = @hinge( 1 )
	
	For i  = 1 To max_hinges
		
		With hinge(i)
			
			.accumulated_impulse = vector2( 0.0, 0.0 )
			'.unit                = vector2( 0.0, 0.0 )
			
			.anchor_a = vector2( 0.0, 0.0 )
			.anchor_b = vector2( 0.0, 0.0 )
			
			.r_a = vector2( 0.0, 0.0 )
			.r_b = vector2( 0.0, 0.0 )
			
			.reduced_mass = 0.0
			.rest_impulse = vector2( 0.0, 0.0 )
			
			.box_a = 0
			.box_b = 0
			
		End With
	
	Next
	
End Sub

//
Function SimulationType.CreateParticle() ParticleType Ptr
	
	If ( numParticles < max_Particles - 1 ) Then
		
		numParticles += 1
		
		ParticleHi = @Particle( numParticles )
		
		Return ParticleHi
		
	End If
	
End Function

Function SimulationType.CreateSpring() SpringType Ptr
	
	If ( numSprings < max_Springs - 1 ) Then
		
		numSprings += 1
		
		SpringHi = @spring( numSprings )
		
		Return SpringHi 
		
	End If
	
End Function

Function SimulationType.CreateBox() BoxType Ptr
	
	If ( numBoxes < max_boxes - 1 ) Then
		
		numBoxes += 1
		
		BoxHi = @box( numBoxes )
		
		Return BoxHi 
		
	End If
	
End Function

Function SimulationType.CreateHinge() HingeType Ptr
	
	If ( numHinges < max_hinges - 1 ) Then
		
		numHinges += 1
		
		HingeHi = @hinge( numHinges )
		
		Return HingeHi 
		
	End If
	
End Function
	
