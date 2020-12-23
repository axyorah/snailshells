function addAxes(scale) {
    scale = (scale === undefined) ? 25:scale;
    let axGeometry = new THREE.CylinderGeometry(scale*0.001,scale*0.001,scale*1,32);
    
    let xMat = new THREE.MeshPhongMaterial( {color: 0xFF0000} );
    let xAx = new THREE.Mesh(axGeometry, xMat);
    xAx.rotation.z = Math.PI / 2;
    
    let zMat = new THREE.MeshPhongMaterial( {color: 0x00FF00} );
    let zAx = new THREE.Mesh(axGeometry, zMat);
    zAx.rotation.x = Math.PI / 2;
    
    let yMat = new THREE.MeshPhongMaterial( {color: 0x0000FF} );
    let yAx = new THREE.Mesh(axGeometry, yMat);
    
    scene.add(xAx);
    scene.add(zAx);
    scene.add(yAx);
}

function fillScene() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x808080, 2000, 4000);

    // LIGHTS
    const ambientLight = new THREE.AmbientLight(0x222222);

    const light1 = new THREE.DirectionalLight(0xffffff, 1.0);
    light1.position.set(200, 400, 500);

    const light2 = new THREE.DirectionalLight(0xffffff, 1.0);
    light2.position.set(-500, 250, -200);

    scene.add(ambientLight);
    scene.add(light1);
    scene.add(light2);

    // SNAIL SHELL
    let snail = makeSnailShell(snailParams);
    snail.castShadow = true;
    snail.receiveShadow = true;
    scene.add(snail);

}

function setRenderer(w, h) {
    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(w, h);
    renderer.domElement.setAttribute("id", "renderer");
    renderer.setClearColorHex;
}

function setCamera(ratio) {
    camera = new THREE.PerspectiveCamera(40, ratio, 1, 10000);
    camera.position.set(8, 5, -3);
}

function setControls() {
    cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
    cameraControls.target.set(0, 2, 0);
}

function loadTextures() {
    let { texture, textures, textureName, textureNames } = snailParams.tex;
    let { p } = snailParams.dyn;
    
    // set static textures
    for (let name of textureNames) {
        textures[name] = new THREE.TextureLoader().load(`imgs/${name}.png`);
    }
    // initiate dynamic texture
    textures.dynamic = new THREE.DataTexture(
        new Uint8Array( p.width * p.height * 3 ), 
        p.width, p.height, THREE.RGBFormat);
    
    // set current texture
    texture = textures[textureName];

    // update params
    snailParams.tex.texture = texture;
    snailParams.tex.textures = textures;
}

function init() {

    const canvasWidth = Math.round(containerParams.relWidth * window.innerWidth);
    const canvasHeight = Math.round(containerParams.relHeight * window.innerHeight);
    const canvasRatio = canvasWidth / canvasHeight;

    setRenderer(canvasWidth, canvasHeight);
    setCamera(canvasRatio);
    setControls();
    loadTextures();
}

function addToDOM() {
    //const container = document.getElementById("container");
    const canvas = container.getElementsByTagName("canvas");
    if (canvas.length > 0) {
        container.removeChild(canvas[0]);
    }
    container.appendChild(renderer.domElement);
    container.appendChild(snailGui); // gui should be "on top" of canvas
}

function animate() {
    window.requestAnimationFrame(animate);
    render();
}

function updateGeometry() {
    let { geo } = snailParams;
    if (geo.radDecayPer2Pi !== effectController.raddecay ||
        geo.numTurns !== effectController.turns) {

        geo.radDecayPer2Pi = effectController.raddecay;
        geo.numTurns = effectController.turns;

        snailParams.geo = geo;
        fillScene(); // lights and shell and added here
        addAxes(25);
    }
}

function updateStaticTextures() {
    let { tex, dyn } = snailParams;
    if (tex.textureName !== effectController.texname ||
        tex.textureTangRepeats !== effectController.textangrepeats ||
        tex.textureTangOffset !== effectController.textangoffset ||
        tex.textureLongRepeats !== effectController.texlongrepeats) {
        
        if (effectController.texname !== "dynamic" && 
            tex.textureName !== effectController.texname) {
            dyn.dynamic = false;
            tex.textureName = effectController.texname;
            tex.texture = tex.textures[effectController.texname];
        }

        // update num of texture repeats, offset        
        tex.textureTangOffset = effectController.textangoffset;
        tex.textureTangRepeats = effectController.textangrepeats;
        tex.textureLongRepeats = effectController.texlongrepeats;

        // update params (before repopulating the scene)
        snailParams.tex = tex;
        snailParams.dyn = dyn;

        // reset the scene (only if something has changed)
        fillScene(); // lights and shell and added here
        addAxes(25);
    }
}

function updateDynamicTextures() {
    let { tex, dyn } = snailParams;
    
    if (tex.textureName !== effectController.texname) {
        
        if (effectController.texname === "dynamic" && dyn.dynamic === false) {
            dyn.dynamic = true;
            dyn.x = initTextureArray(dyn.x, dyn.p);
        }
        
        if (effectController.texname === "dynamic" && dyn.timer > dyn.timerThreshold) {
            dyn.timer -= dyn.timerThreshold; // reset timer
        
            // update Gray-Scott params
            dyn.p.f = effectController.f;
            dyn.p.k = effectController.k;
        
            // update array/texture
            rungeKutta4Step(dxdtGrayScott, dyn.x, dyn.deltaT, dyn.p);
            tex.texture = array2texture(dyn.x, dyn.p, 10., 0.6);
                
            // update params (before repopulating the scene)
            snailParams.tex = tex;
            snailParams.dyn = dyn;
        
            // reset the scene (only if something has changed)
            fillScene(); // lights and shell and added here
            addAxes(25);
        }
    }    
}

function render() {

    let delta = clock.getDelta();
    cameraControls.update(delta);
    snailParams.dyn.timer += delta;

    updateGeometry();
    updateStaticTextures();
    updateDynamicTextures();

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    const canvasWidth = Math.round(containerParams.relWidth * window.innerWidth);
    const canvasHeight = Math.round(containerParams.relHeight * window.innerHeight);
    const canvasRatio = canvasWidth / canvasHeight;

    camera.aspect = canvasRatio; 
    camera.updateProjectionMatrix();
    renderer.setSize(canvasWidth, canvasHeight); 
});

// run all
function main() {
    setupGui();  // adds control menu 
    init();      // sets up camera, controls and renderer, as well as preloads all textures
    fillScene(); // lights and shell are added here
    addAxes();   // add xyz to the scene
    addToDOM();  // adds rendered scene back to html
    animate();   // updates frames when camera changes position or controls are toggled    
}

main();