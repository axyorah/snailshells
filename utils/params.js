// general
var camera, scene, renderer;
var cameraControls, effectController;
var clock = new THREE.Clock();

// snail geometry
var numTurns = 5.;            // number of spiral turns of the shell
var numRingsPer2Pi = 16;      // shell 'resolution' in longitudinal direction
var numPointsPerRing = 16;    // shell 'resolution' in tangential direction
var rad0 = 1.0;               // radius of the first shell ring
var radDecayPer2Pi = 0.3;     // ... each ring at level i is 0.3 times smaller than corresponding rings at level i-1

// snail texture
var textureName;              // current texture name
var textureLongRepeats = 4.7; // # texture repeats in longitudinal direction per level (2pi)
var textureTangRepeats = 2;   // # texture repeats in tangential direction
var textureTangOffset = 0.;   // texture offset in tangential direction
var texture;       // current texture; assigend in `init()`, updated in `render()`
var textures = []; // array of preloaded textures; assigned in `init()`

// dynamic pattern
var deltaT = 2.0; // time step (increasing it can destabilize solution, depending on p.delta)
var prey = 2; // color channels
var pred = 1;
var dumm = 0;

var dynamic = false;
var p = [];
p.f = 0.0140; // growth rate of "prey"
p.k = 0.0450; // decay rate of "predator"
p.D = new Array(3); // diffusion coeff array
p.D[prey] = 1.0;
p.D[pred] = 0.5;
p.D[dumm] = 2.0;
p.delta = 2.5; // spatial step (texel size in "physical" units)
p.height = 128; // texture height in texels
p.width = 128; // texture width in texels
var timer = 0.0; // time for dynamic texture update
var timerThreshold = 1/60./30.; // update texture ~30 times per sec
var x;