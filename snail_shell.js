// OrbitControls can only be used if bundled version of this file was made with `browserify`
var OrbitControls = require('three-orbit-controls')(THREE); // allows to control camera position

// general
var camera, scene, renderer;
var cameraControls, effectController;
var clock = new THREE.Clock();

// snail params
var numRings = 16*5 + 1;      // total number of rings that the shell is made of
var numRingsPer2Pi = 16;      // shell 'resolution' in longitudinal direction
var numPointsPerRing = 16;    // shell 'resolution' in tangential direction
var rad0 = 1.0;               // radius of the first shell ring
var radDecayPer2Pi = 0.3;     // ... each ring at level i is 0.3 times smaller than corresponding rings at level i-1
var textureName;              // current texture name
var textureLongRepeats = 4.7; // # texture repeats in longitudinal direction per level (2pi)
var textureTangRepeats = 2;   // # texture repeats in tangential direction
var texture;       // current texture; assigend in `init()`, updated in `render()`
var textures = []; // array of preloaded textures; assigned in `init()`


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

function rotationMatrixAroundY(angle) {
	var mtx = new THREE.Matrix3();
	mtx.set(Math.cos(angle), 0., Math.cos(Math.PI/2 + angle),			
			0.,              1., 0.,
			Math.sin(angle), 0., Math.sin(Math.PI/2 + angle));
	return mtx;
}

function setSnailShellVertices(geometry, numRings, numRingsPer2Pi, numPointsPerRing, 
	                           rad0, radDecayPer2Pi) {
	/*
	Snail shell is made up of rings that are arrenged in a decaying spiral:
	radii of the rings become progressively smaller.
	If arbitrary ring has a radius R the ring right above it has radius
	  (1 - radDecayPer2Pi) * R = f2pi * R
	Additionally, radius of each ring is a fraction of a radius of previous ring:
	  ring i: R
	  ring i+1: df * R
	Therefore, if arbitrary ring has radius R the ring right above it has radius
	  df^(numRingsPer2Pi-1) * R
	Therefore,
	  df = f2pi^(1/(numRingsPer2Pi-1))

	The center of each ring is slightely above the center of previous ring, 
	so that if arbitrary ring with radius R is at a height 0 
	the ring right above it (with radius f2pi * R) would be at a height 
	  R + f2pi*R = R*(1 + f2pi)
	We can say that each ring rises dh * df * R above the previous ring with radius R.
	Therefore, if arbitrary ring with radius R is at height 0
	the right right above it (with radius f2pi * R) would be at a height
	  R * dh * sum(f2pi^(i/(numRingsPer2Pi)) for i in range(numRingsPer2Pi))
	Therefore,
	  dh = (1 + f2pi) / sum(f2pi^(i/(numRingsPer2Pi)) for i in range(numRingsPer2Pi))
	Notice, that dh is not the actual rise, but the relative rise (relative wrt current radius),
	absolute rise would be dh * R
	*/
	// assign undefined params
	numRings = (numRings === undefined) ? 16*5+1 : numRings;
	numRingsPer2Pi = (numRingsPer2Pi === undefined) ? 16 : numRingsPer2Pi;
	numPointsPerRing = (numPointsPerRing === undefined) ? 16 : numPointsPerRing;
	rad0 = (rad0 === undefined) ? 1. : rad0;
	radDecayPer2Pi = (radDecayPer2Pi === undefined) ? 0.3 : radDecayPer2Pi;

	// get 'per ring' radius decay and rise
	var f2pi = 1. - radDecayPer2Pi;              // current ring rad / ring rad at the previous layer
	var df = Math.pow(f2pi, 1/(numRingsPer2Pi)); // current ring rad / previous ring rad
	var risePer2Pi = 0.0;
	for (var i=0; i<numRingsPer2Pi; i++) {
		risePer2Pi += Math.pow(f2pi, i/(numRingsPer2Pi-1));
	}
	var dh = (1 + f2pi) / risePer2Pi;            // rise per ring (as fraction of current rad)

	// get coordinates of the ring centers and ring vertices	
	var rad = rad0;  // initiate radius of the 'current' ring
	var height = 0.; // ring center's height
	var angle = 0.;  // angle between Ox and ring's center

	for (var iring = 0; iring < numRings; iring++) {
		// update ring center's location and radius
		rad *= df;
		height += dh * rad;
		angle = 2*Math.PI / numRingsPer2Pi * iring;
		
		var center = new THREE.Vector3( rad * Math.cos(angle),
									    height,
										rad * Math.sin(angle) );

		// get ring vertices (anker points of ring's surface)
		for (var ipoint = 0; ipoint < numPointsPerRing; ipoint++) {	
			// construct a circle in xOy-plane, rotate and translate it			
	        var vertex = new THREE.Vector3();
			vertex.set(rad * Math.cos(2*Math.PI / numPointsPerRing * ipoint),
					   rad * Math.sin(2*Math.PI / numPointsPerRing * ipoint),
					   0.0);
			vertex.applyMatrix3( rotationMatrixAroundY(angle) );
			vertex.addVectors(vertex, center);

			geometry.vertices.push(vertex);
		}
	}
}

function setSnailShellFaces(geometry, numRings, numRingsPer2Pi, numPointsPerRing, 
	                        rad0, radDecayPer2Pi) {
	/*
	e.g., for numPointsPerRing = 16:   
	    | / |
	   -1---17- ...
	    | / |
	   -0---16- ...
	    | / |
	   -15--31- ...
		| / | 
	Each face is a triangle defined by three vertices
	    face 0: (0, 16, 17)
	    face 1: (0, 17, 1)
		...
		face 30: (15, 31, 16)
		face 31: (15, 16, 0)
	*/

	// assign undefined params
	numRings = (numRings === undefined) ? 16*5+1 : numRings;	
	numPointsPerRing = (numPointsPerRing === undefined) ? 16 : numPointsPerRing;
	
	for (var iring = 0; iring < numRings; iring++) { 
		for (var ipoint = 0; ipoint < numPointsPerRing; ipoint++) {
			var ivertex = iring * numPointsPerRing + ipoint;
			// faces are between rings -> skip the last ring
			if (iring != (numRings-1)) {
				// vertice indexing is different for the last two faces
				//( we need to 'close' the ring)
				if (ipoint < numPointsPerRing-1) {
					var face1 = new THREE.Face3(ivertex, ivertex + numPointsPerRing, ivertex + numPointsPerRing + 1);				
					var face2 = new THREE.Face3(ivertex, ivertex + numPointsPerRing + 1, ivertex + 1);
				} else {
					var face1 = new THREE.Face3(ivertex, ivertex + numPointsPerRing, ivertex + 1);					
					var face2 = new THREE.Face3(ivertex, ivertex + 1, ivertex + 1 - numPointsPerRing);
				}
				geometry.faces.push( face1 );
                geometry.faces.push( face2 );
			}
		}
	}
}

function setTexture(geometry, numRings, numRingsPer2Pi, numPointsPerRing, 
	                rad0, radDecayPer2Pi, 
	                texture, textureLongRepeats, textureTangRepeats) {
	// assign undefined params
	numRings = (numRings === undefined) ? 16*5+1 : numRings;
	numRingsPer2Pi = (numRingsPer2Pi === undefined) ? 16 : numRingsPer2Pi;
	numPointsPerRing = (numPointsPerRing === undefined) ? 16 : numPointsPerRing;
	textureTangRepeats = (textureTangRepeats === undefined) ? 2 : textureTangRepeats;
	textureLongRepeats = (textureLongRepeats === undefined) ? 4.7 : textureLongRepeats;

	// load texture	
    texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.repeat.set(textureLongRepeats,textureTangRepeats); // repeat texture `arg0` in longitud dir and `arg1` times in tangential dir
	texture.offset.set(0.,0.25);                               // offset texture a bit in tangential dir

	// get texture fraction per face
	var vertFrac = 1. / numPointsPerRing;
	var horFrac = 1. / numRingsPer2Pi;

	// set texture UVs
	for (var iring = 0; iring < numRings; iring++) {
		for (var ipoint = 0; ipoint < numPointsPerRing; ipoint++) {
			geometry.faceVertexUvs[0].push([
				new THREE.Vector2( iring   *horFrac, ipoint   *vertFrac), 
				new THREE.Vector2((iring+1)*horFrac, ipoint   *vertFrac),
				new THREE.Vector2((iring+1)*horFrac,(ipoint+1)*vertFrac) 
			]);
			geometry.faceVertexUvs[0].push([
				new THREE.Vector2( iring   *horFrac, ipoint   *vertFrac), 
				new THREE.Vector2((iring+1)*horFrac,(ipoint+1)*vertFrac), 
				new THREE.Vector2( iring   *horFrac,(ipoint+1)*vertFrac) 
			]);
		}
	}	
}

function makeSnailShell(numRings, numRingsPer2Pi, numPointsPerRing, 
						rad0, radDecayPer2Pi, 
						texture, textureLongRepeats, textureTangRepeats) {	
	// assign undefined params
	numRings = (numRings === undefined) ? 16*5+1 : numRings;
	numRingsPer2Pi = (numRingsPer2Pi === undefined) ? 16 : numRingsPer2Pi;
	numPointsPerRing = (numPointsPerRing === undefined) ? 16 : numPointsPerRing;
	rad0 = (rad0 === undefined) ? 1. : rad0;
	radDecayPer2Pi = (radDecayPer2Pi === undefined) ? 0.3 : radDecayPer2Pi;
	
	// build snail shell geometry: calculate coordinates of vertices, assign faces and textures
	var geometry = new THREE.Geometry();
	setSnailShellVertices(geometry, numRings, numRingsPer2Pi, numPointsPerRing, rad0, radDecayPer2Pi);
	setSnailShellFaces(geometry, numRings, numRingsPer2Pi, numPointsPerRing, rad0, radDecayPer2Pi);
	setTexture(geometry, numRings, numRingsPer2Pi, numPointsPerRing, rad0, radDecayPer2Pi, texture, textureLongRepeats, textureTangRepeats);
	
	// calculate normals for proper lighting
	geometry.computeVertexNormals();
	geometry.computeFaceNormals();
	
	// assemble snail shell from geometry and material 
	var material = new THREE.MeshPhongMaterial({map: texture, side: THREE.DoubleSide});
	var snail = new THREE.Mesh(geometry, material);
	return snail;
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
	var snail = makeSnailShell( numRings, numRingsPer2Pi, numPointsPerRing, 
	                        	rad0, radDecayPer2Pi, 
		                        texture, textureLongRepeats, textureTangRepeats);
    snail.castShadow = true;
    snail.receiveShadow = true;
    scene.add(snail);
	
}

function init() {
    var canvasWidth = 846;
    var canvasHeight = 494;
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
	
	// update texture only if it was changed
	if (textureName !== effectController.texname ||
		textureTangRepeats !== effectController.textangrepeats ||
		textureLongRepeats !== effectController.texlongrepeats) {
		// update texture
		textureName = effectController.texname;		
		texture = textures[textureName];
        // update num of texture repeats
		textureTangRepeats = effectController.textangrepeats;
		textureLongRepeats = effectController.texlongrepeats;

		// reset the scene
		fillScene(); // lights and shell and added here
		addAxes(25);
	}	
	
	renderer.render(scene, camera);
}



function setupGui() {

	effectController = {
		texlongrepeats: 4.7,
		textangrepeats: 2,
		texname: "angelfish0"
	};

	var gui = new dat.GUI();
	gui.add( effectController, "texlongrepeats", 1, 20, 0.01).name("#long. repeats");
	gui.add( effectController, "textangrepeats", 1, 6, 1).name("#tang. repeats");
	gui.add( effectController, "texname", 
	  						["angelfish0", 
							 "angelfish1", 
							 "gierermeinhardt0",
							 "gierermeinhardt1", 
							 "grayscottcorals0", 
							 "grayscottcorals1", 
							 "grayscottspirals0",
							 "grayscottspirals1",
							 "predprey0",
							 "predprey1"
							]).name("texture name");
}

// ----------------------------------------------------------------------------------------
// run all
setupGui();  // adds control menu 
init();      // sets up camera, controls and renderer, as well as preloads all textures
fillScene(); // lights and shell are added here
addAxes(25); // adds xyz axes
addToDOM();  // adds rendered scene back to html
animate();   // updates frames when camera changes position or controls are toggled


