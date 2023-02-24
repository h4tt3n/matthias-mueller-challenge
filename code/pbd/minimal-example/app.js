//*******************************************************************************
//
//  
//******************************************************************************* 

// Global constants
const DT          = 1.0 / 100.0;     // Physics engine timestep per update
const SUB_STEPS   = 10;              // Physics engine substeps per update
const FPS         = 60;              // Screen Framerate
const GRAVITY     = -10.0;           // Gravity, in m/s^2
const DENSITY     = 2000.0;          // Ball density

//
const INV_DT      = 1.0 / DT;        // Physics engine inverse timestep
const DT_SUB      = DT / SUB_STEPS;  // Physics engine substep timestep
const INV_DT_SUB  = 1.0 / DT_SUB;    // Physics engine substep inverse timestep