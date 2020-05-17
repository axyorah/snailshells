// required modules can only be used if bundled version of this file was made with `browserify`
var OrbitControls = require('three-orbit-controls')(THREE); // allows to control camera position
var PdeUtils = require('./modules/pdeutils.js'); // custom functions for solving PDEs
var SnailUtils = require('./modules/snailutils.js'); // custom functions for setting up snail shell geometry/textures

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

// ----------------------------------------------------------------------------------------

function initTextureArray(x, p) {
    x = new Array(p.height * p.width * 3);
    for (var i = 0; i < p.height * p.width; i++) {
        var stride = i * 3;

        x[stride + prey] = 1.; // prey is everywhere
        x[stride + pred] = 0.; // predators are not there yet
        x[stride + dumm] = 0.5; // dummy can be anything...

        // roll again for predator
        var roll = Math.random();
        if ( roll < 1/1000 ) {
            x[stride + pred] = 1.; // predator are assigned to some texels
        }
    }
    return x;
}

function setGrayScottReactionTerm(reaction, x, p) {
    for (var i = 0; i < p.height * p.width; i++) {
        var stride = i * 3;

        var a = x[stride + prey];
        var b = x[stride + pred];

        reaction[stride + prey] = -a * b * b + p.f * (1 - a);    // prey
        reaction[stride + pred] =  a * b * b - (p.k + p.f) * b;  // predator
        reaction[stride + dumm] =  0.7*reaction[stride + prey];  // dummy channel
    }
}

function dxdtGrayScott(x, p) {
    var total     = new Array(p.height * p.width * 3);
    var diffusion = new Array(p.height * p.width * 3);
    var reaction  = new Array(p.height * p.width * 3);

    PdeUtils.setDiffusionTerm(diffusion, x, p);
    setGrayScottReactionTerm(reaction, x, p);

    for (var i = 0; i < p.height*p.width*3; i++) {
        total[i] = diffusion[i] + reaction[i];
    }
    return total;
}

function array2texture(x, p, steepness, midpoint) {

    var data = new Uint8Array( p.height * p.width * 3 );
    for (var i = 0; i < p.width * p.height * 3; i++) {
        data[i] = Math.floor( 255. / (1 + Math.exp(-steepness * (x[i] - midpoint))) );
    }

    return new THREE.DataTexture( data, p.width, p.height, THREE.RGBFormat );
}

// ----------------------------------------------------------------------------------------

function makeSnailShell(numTurns, numRingsPer2Pi, numPointsPerRing, 
                        rad0, radDecayPer2Pi, 
                        texture, textureLongRepeats, textureTangRepeats) {	
    // assign undefined params
    numTurns = (numTurns === undefined) ? 5 : numTurns;
    numRingsPer2Pi = (numRingsPer2Pi === undefined) ? 16 : numRingsPer2Pi;
    numPointsPerRing = (numPointsPerRing === undefined) ? 16 : numPointsPerRing;
    rad0 = (rad0 === undefined) ? 1. : rad0;
    radDecayPer2Pi = (radDecayPer2Pi === undefined) ? 0.3 : radDecayPer2Pi;
	
    // build snail shell geometry: calculate coordinates of vertices, assign faces and textures
    var geometry = new THREE.Geometry();
    SnailUtils.setSnailShellVertices(geometry, numTurns, numRingsPer2Pi, numPointsPerRing, rad0, radDecayPer2Pi);
    SnailUtils.setSnailShellFaces(geometry, numTurns, numRingsPer2Pi, numPointsPerRing, rad0, radDecayPer2Pi);
    SnailUtils.setTexture(geometry, numTurns, numRingsPer2Pi, numPointsPerRing, rad0, radDecayPer2Pi, texture, textureLongRepeats, textureTangRepeats);
	
    // calculate normals for proper lighting
    geometry.computeVertexNormals();
    geometry.computeFaceNormals();
	
    // assemble snail shell from geometry and material 
    var material = new THREE.MeshPhongMaterial({map: texture, side: THREE.DoubleSide});
    var snail = new THREE.Mesh(geometry, material);
    return snail;
}

// ----------------------------------------------------------------------------------------
function addAxes(scale) {
    scale = (scale === undefined) ? 100:scale;
    var axGeometry = new THREE.CylinderGeometry(scale*0.001,scale*0.001,scale*1,32);
    var xMat = new THREE.MeshPhongMaterial( {color: 0xFF0000} );
    var xAx = new THREE.Mesh(axGeometry, xMat);
    xAx.rotation.z = Math.PI / 2;
    scene.add(xAx);
    var zMat = new THREE.MeshPhongMaterial( {color: 0x00FF00} );
    var zAx = new THREE.Mesh(axGeometry, zMat);
    zAx.rotation.x = Math.PI / 2;
    scene.add(zAx);
    var yMat = new THREE.MeshPhongMaterial( {color: 0x0000FF} );
    var yAx = new THREE.Mesh(axGeometry, yMat);
    scene.add(yAx);
}

function fillScene() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog( 0x808080, 2000, 4000 );

    // LIGHTS
    var ambientLight = new THREE.AmbientLight( 0x222222 );

    var light1 = new THREE.DirectionalLight( 0xffffff, 1.0 );
    light1.position.set( 200, 400, 500 );
	
    var light2 = new THREE.DirectionalLight( 0xffffff, 1.0 );
    light2.position.set( -500, 250, -200 );

    scene.add(ambientLight);
    scene.add(light1);
    scene.add(light2);	

    // SNAIL SHELL
    var snail = makeSnailShell( numTurns, numRingsPer2Pi, numPointsPerRing, 
                                rad0, radDecayPer2Pi, 
                                texture, textureLongRepeats, textureTangRepeats);
    snail.castShadow = true;
    snail.receiveShadow = true;
    scene.add(snail);
	
}

function init() {
    var canvasWidth = window.innerWidth;
    var canvasHeight = window.innerHeight;
    var canvasRatio = canvasWidth / canvasHeight;

    // RENDERER
    renderer = new THREE.WebGLRenderer( { antialias: false } );
    renderer.setSize(canvasWidth, canvasHeight);
    renderer.setClearColorHex;

    // CAMERA
    camera = new THREE.PerspectiveCamera( 40, canvasRatio, 1, 10000 );
    camera.position.set( 8, 5, -3 );
	
    // CONTROLS
    cameraControls = new OrbitControls(camera, renderer.domElement);
    cameraControls.target.set(0,2,0);

    // TEXTURES
    textures.angelfish0        = new THREE.TextureLoader().load("imgs/angelfish0.png");
    textures.angelfish1        = new THREE.TextureLoader().load("imgs/angelfish1.png");
    textures.gierermeinhardt0  = new THREE.TextureLoader().load("imgs/gierermeinhardt0.png");
    textures.gierermeinhardt1  = new THREE.TextureLoader().load("imgs/gierermeinhardt1.png");
    textures.grayscottcorals0  = new THREE.TextureLoader().load("imgs/grayscott-corals0.png");
    textures.grayscottcorals1  = new THREE.TextureLoader().load("imgs/grayscott-corals1.png");
    textures.grayscottspirals0 = new THREE.TextureLoader().load("imgs/grayscott-spirals0.png");
    textures.grayscottspirals1 = new THREE.TextureLoader().load("imgs/grayscott-spirals1.png");
    textures.predprey0         = new THREE.TextureLoader().load("imgs/predprey0.png");
    textures.predprey1         = new THREE.TextureLoader().load("imgs/predprey1.png");
    textures.dynamic           = new THREE.DataTexture( initTextureArray(x, p), p.width, p.height, THREE.RGBAFormat );

    textureName = "angelfish0";
    texture = textures[textureName]; // init

}

function addToDOM() {
    var container = document.getElementById('container');
    var canvas = container.getElementsByTagName('canvas');
    if (canvas.length>0) {
        container.removeChild(canvas[0]);
    }
    container.appendChild( renderer.domElement );
}

function animate() {
    window.requestAnimationFrame(animate);
    render();
}

function render() {
    var delta = clock.getDelta();
    cameraControls.update(delta);
    timer += clock.getDelta();
	
    // update controls only if toggled
    if (radDecayPer2Pi !== effectController.raddecay ||
        numTurns !== effectController.turns ||
        textureName !== effectController.texname ||
        textureTangRepeats !== effectController.textangrepeats ||
        textureTangOffset !== effectController.textangoffset ||
        textureLongRepeats !== effectController.texlongrepeats) {
        // update geometry
        radDecayPer2Pi = effectController.raddecay;
        numTurns = effectController.turns;
		
        // update static texture        
        textureName = effectController.texname;	
        if (effectController.texname !== "dynamic") {  
            dynamic = false;          	
            texture = textures[textureName];
        } 

        // update num of texture repeats, offset        
        textureTangOffset = effectController.textangoffset;
        textureTangRepeats = effectController.textangrepeats;
        textureLongRepeats = effectController.texlongrepeats;

        // reset the scene
        fillScene(); // lights and shell and added here
        addAxes(25);
    }	

    if (effectController.texname === "dynamic" &&  dynamic === false) {        
        dynamic = true;          
        x = initTextureArray(x, p);
    }
    
    if (effectController.texname === "dynamic" && timer > timerThreshold) {
        timer -= timerThreshold; // reset timer

        // update Gray-Scott params
        p.f = effectController.f;
        p.k = effectController.k;
        
        // update array/texture
        x = PdeUtils.rungeKutta4Step(dxdtGrayScott, x, deltaT, p); 
        texture = array2texture(x, p, 10., 0.6);

        // reset the scene
        fillScene(); // lights and shell and added here
        addAxes(25);
    }

    renderer.render(scene, camera);
}



function setupGui() {

    effectController = {
        raddecay: 0.3,
        turns: 5,

        texlongrepeats: 4.7,
        textangrepeats: 2,
        textangoffset: 0.,
        texname: "angelfish0",

        f: 0.0140,
        k: 0.0450
    };

    var gui = new dat.GUI();
    h = gui.addFolder("Geometry");
    h.add( effectController, "raddecay", 0.0, 1.0, 0.01).name("radius decay");
    h.add( effectController, "turns", 0.1, 10.0, 0.1).name("#turns");

    h = gui.addFolder("Texture");
    h.add( effectController, "texlongrepeats", 1, 30, 0.01).name("#long. repeats");
    h.add( effectController, "textangrepeats", 2, 12, 2).name("#tang. repeats");
    h.add( effectController, "textangoffset", 0., 2., 0.01).name("#tang. offset");
    h.add( effectController, "texname", 
                            ["angelfish0", 
                             "angelfish1", 
                             "gierermeinhardt0",
                             "gierermeinhardt1", 
                             "grayscottcorals0", 
                             "grayscottcorals1", 
                             "grayscottspirals0",
                             "grayscottspirals1",
                             "predprey0",
                             "predprey1",
                             "dynamic"
                            ]).name("texture name");

    h = gui.addFolder("Dynamic Texture Only");
    h.add( effectController, "f", 0.0100, 0.0650, 0.0001).name("f ('prey' growth)");
    h.add( effectController, "k", 0.0100, 0.0650, 0.0001).name("k ('pred' decay)");

}

// ----------------------------------------------------------------------------------------
// run all
setupGui();  // adds control menu 
init();      // sets up camera, controls and renderer, as well as preloads all textures
fillScene(); // lights and shell are added here
addAxes(25); // adds xyz axes
addToDOM();  // adds rendered scene back to html
animate();   // updates frames when camera changes position or controls are toggled
