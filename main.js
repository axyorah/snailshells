function makeSnailShell(numTurns, numRingsPer2Pi, numPointsPerRing,
    rad0, radDecayPer2Pi,
    texture, textureLongRepeats, textureTangRepeats, textureTangOffset) {
    // assign undefined params
    numTurns = (numTurns === undefined) ? 5 : numTurns;
    numRingsPer2Pi = (numRingsPer2Pi === undefined) ? 16 : numRingsPer2Pi;
    numPointsPerRing = (numPointsPerRing === undefined) ? 16 : numPointsPerRing;
    rad0 = (rad0 === undefined) ? 1. : rad0;
    radDecayPer2Pi = (radDecayPer2Pi === undefined) ? 0.3 : radDecayPer2Pi;

    // build snail shell geometry: calculate coordinates of vertices, assign faces and textures
    var geometry = new THREE.Geometry();
    setSnailShellVertices(geometry, numTurns, numRingsPer2Pi, numPointsPerRing, rad0, radDecayPer2Pi);
    setSnailShellFaces(geometry, numTurns, numRingsPer2Pi, numPointsPerRing, rad0, radDecayPer2Pi);
    setTexture(geometry, numTurns, numRingsPer2Pi, numPointsPerRing, rad0, radDecayPer2Pi,
        texture, textureLongRepeats, textureTangRepeats, textureTangOffset);

    // calculate normals for proper lighting
    geometry.computeVertexNormals();
    geometry.computeFaceNormals();

    // assemble snail shell from geometry and material 
    var material = new THREE.MeshPhongMaterial({ map: texture, side: THREE.DoubleSide });
    var snail = new THREE.Mesh(geometry, material);
    return snail;
}

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
    scene.fog = new THREE.Fog(0x808080, 2000, 4000);

    // LIGHTS
    var ambientLight = new THREE.AmbientLight(0x222222);

    var light1 = new THREE.DirectionalLight(0xffffff, 1.0);
    light1.position.set(200, 400, 500);

    var light2 = new THREE.DirectionalLight(0xffffff, 1.0);
    light2.position.set(-500, 250, -200);

    scene.add(ambientLight);
    scene.add(light1);
    scene.add(light2);

    // SNAIL SHELL
    var snail = makeSnailShell(numTurns, numRingsPer2Pi, numPointsPerRing,
        rad0, radDecayPer2Pi,
        texture, textureLongRepeats, textureTangRepeats, textureTangOffset);
    snail.castShadow = true;
    snail.receiveShadow = true;
    scene.add(snail);

}

function init() {
    var canvasWidth = window.innerWidth;
    var canvasHeight = window.innerHeight;
    var canvasRatio = canvasWidth / canvasHeight;

    // RENDERER
    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(canvasWidth, canvasHeight);
    renderer.setClearColorHex;

    // CAMERA
    camera = new THREE.PerspectiveCamera(40, canvasRatio, 1, 10000);
    camera.position.set(8, 5, -3);

    // CONTROLS
    cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
    cameraControls.target.set(0, 2, 0);

    // TEXTURES
    textures.angelfish0 = new THREE.TextureLoader().load("imgs/angelfish0.png");
    textures.angelfish1 = new THREE.TextureLoader().load("imgs/angelfish1.png");
    textures.gierermeinhardt0 = new THREE.TextureLoader().load("imgs/gierermeinhardt0.png");
    textures.gierermeinhardt1 = new THREE.TextureLoader().load("imgs/gierermeinhardt1.png");
    textures.grayscottcorals0 = new THREE.TextureLoader().load("imgs/grayscott-corals0.png");
    textures.grayscottcorals1 = new THREE.TextureLoader().load("imgs/grayscott-corals1.png");
    textures.grayscottspirals0 = new THREE.TextureLoader().load("imgs/grayscott-spirals0.png");
    textures.grayscottspirals1 = new THREE.TextureLoader().load("imgs/grayscott-spirals1.png");
    textures.predprey0 = new THREE.TextureLoader().load("imgs/predprey0.png");
    textures.predprey1 = new THREE.TextureLoader().load("imgs/predprey1.png");
    textures.dynamic = new THREE.DataTexture(initTextureArray(x, p), p.width, p.height, THREE.RGBAFormat);

    textureName = "angelfish0";
    texture = textures[textureName]; // init

}

function addToDOM() {
    var container = document.getElementById('container');
    var canvas = container.getElementsByTagName('canvas');
    if (canvas.length > 0) {
        container.removeChild(canvas[0]);
    }
    container.appendChild(renderer.domElement);
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

    if (effectController.texname === "dynamic" && dynamic === false) {
        dynamic = true;
        x = initTextureArray(x, p);
    }

    if (effectController.texname === "dynamic" && timer > timerThreshold) {
        timer -= timerThreshold; // reset timer

        // update Gray-Scott params
        p.f = effectController.f;
        p.k = effectController.k;

        // update array/texture
        x = rungeKutta4Step(dxdtGrayScott, x, deltaT, p);
        texture = array2texture(x, p, 10., 0.6);

        // reset the scene
        fillScene(); // lights and shell and added here
        addAxes(25);
    }

    renderer.render(scene, camera);
}

// run all
function main() {
    setupGui();  // adds control menu 
    init();      // sets up camera, controls and renderer, as well as preloads all textures
    fillScene(); // lights and shell are added here
    addToDOM();  // adds rendered scene back to html
    animate();   // updates frames when camera changes position or controls are toggled    
}

main();