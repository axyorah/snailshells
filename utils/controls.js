const radDecayRng = document.querySelector("#raddecay");
const radDecayLbl = document.querySelector("#raddecay-lbl");
const turnsRng = document.querySelector("#turns");
const turnsLbl = document.querySelector("#turns-lbl");
const texLongRepeatsRng = document.querySelector("#texlongrepeats");
const texLongRepeatsLbl = document.querySelector("#texlongrepeats-lbl");
const texTangRepeatsRng = document.querySelector("#textangrepeats");
const texTangRepeatsLbl = document.querySelector("#textangrepeats-lbl");
const texTangOffsetRng = document.querySelector("#textangoffset");
const texTangOffsetLbl = document.querySelector("#textangoffset-lbl");
const texNameSelect = document.querySelector("#texname");
const fDynRng = document.querySelector("#f-dyn");
const fDynLbl = document.querySelector("#f-dyn-lbl");
const kDynRng = document.querySelector("#k-dyn");
const kDynLbl = document.querySelector("#k-dyn-lbl");
const dynResetBtn = document.querySelector("#dyn-reset");
const texUploadInpt = document.querySelector("#texupload");

function updateDynamicTexture() {
    let { tex, dyn } = snailParams;

    if (dyn.dynamic && dyn.timer > dyn.timerThreshold) {
        dyn.timer -= dyn.timerThreshold; // reset timer
                
        // update x array
        rungeKutta4Step(dxdtGrayScott, dyn.x, dyn.deltaT, dyn.p);
        
        // update texture
        updateDataTextureFromArray(tex.texture, dyn.x, dyn.p, 10., 0.6);
        
        // update params (before repopulating the scene)
        snailParams.tex = tex;
        snailParams.dyn = dyn;
        
        // reset the scene (only at set timer ticks)
        fillScene(); 
        addAxes();
    }
}

radDecayRng.addEventListener("input", () => {
    const val = parseFloat(radDecayRng.value);
    snailParams.geo.radDecayPer2Pi = val;

    radDecayLbl.innerText = `${radDecayLbl.innerText.split(":")[0]}: ${val}`;

    fillScene();
    addAxes();
})

turnsRng.addEventListener("input", () => {
    const val = parseFloat(turnsRng.value);
    snailParams.geo.numTurns = val;

    turnsLbl.innerText = `${turnsLbl.innerText.split(":")[0]}: ${val}`;

    fillScene();
    addAxes();
})

texLongRepeatsRng.addEventListener("input", () => {
    const val = parseFloat(texLongRepeatsRng.value);
    snailParams.tex.textureLongRepeats = val;

    texLongRepeatsLbl.innerText = `${texLongRepeatsLbl.innerText.split(":")[0]}: ${val}`;

    fillScene();
    addAxes();
})

texTangRepeatsRng.addEventListener("input", () => {
    const val = parseInt(texTangRepeatsRng.value);
    snailParams.tex.textureTangRepeats = val;

    texTangRepeatsLbl.innerText = `${texTangRepeatsLbl.innerText.split(":")[0]}: ${val}`;

    fillScene();
    addAxes();
})

texTangOffsetRng.addEventListener("input", () => {
    const val = parseFloat(texTangOffsetRng.value);
    snailParams.tex.textureTangOffset = val;

    texTangOffsetLbl.innerText = `${texTangOffsetLbl.innerText.split(":")[0]}: ${val}`;

    fillScene();
    addAxes();
})

texNameSelect.addEventListener("change", () => {
    const val = texNameSelect.value;
    snailParams.tex.textureName = val;
    snailParams.tex.texture = snailParams.tex.textures[val];
    snailParams.dyn.dynamic = false;

    fillScene();
    addAxes();
})

fDynRng.addEventListener("input", () => {
    const val = parseFloat(fDynRng.value);

    let { tex, dyn } = snailParams;
    dyn.p.f = val;

    fDynLbl.innerText = `${fDynLbl.innerText.split(":")[0]}: ${val}`;

    if (!dyn.dynamic) {
        dyn.dynamic = true;
        tex.texture = initTexture(dyn.p);
        dyn.x = initTextureArray(dyn.p);
    }

    snailParams.dyn = dyn;
    snailParams.tex = tex;
    // scene is added in renderer/updateDynamicTexture
    // as for dyn textures it needs to be updated for each frame,
    // not just on param change  
})

kDynRng.addEventListener("input", () => {
    const val = parseFloat(kDynRng.value);

    let { tex, dyn } = snailParams;
    dyn.p.k = val;

    kDynLbl.innerText = `${kDynLbl.innerText.split(":")[0]}: ${val}`;

    if (!dyn.dynamic) {
        dyn.dynamic = true;
        tex.texture = initTexture(dyn.p);
        dyn.x = initTextureArray(dyn.p);
    }

    snailParams.dyn = dyn;  
    snailParams.tex = tex;
    // scene is added in renderer/updateDynamicTexture
    // as for dyn textures it needs to be updated for each frame,
    // not just on param change
})

dynResetBtn.addEventListener("click", () => {    
    let { tex, dyn } = snailParams;

    const fVal = 0.014;
    const kVal = 0.045;

    dyn.p.f = fVal;
    fDynRng.value = fVal;
    fDynLbl.innerText = `${fDynLbl.innerText.split(":")[0]}: ${fVal}`;

    dyn.p.k = kVal;
    kDynRng.value = kVal;
    kDynLbl.innerText = `${kDynLbl.innerText.split(":")[0]}: ${kVal}`;

    dyn.dynamic = true;
    tex.texture = initTexture(dyn.p);
    dyn.x = initTextureArray(dyn.p);

    snailParams.tex = tex;
    snailParams.dyn = dyn;
})

function getNewTextureName(name) {
    const { tex } = snailParams;

    let testName = name;
    let idx = 0;
    while (tex.textures[testName] !== undefined) {
        idx += 1;
        testName = `${name} (${idx})`;
    }
    return testName;
}

function getNewTextureDisplayName(newTextureName) {
    let displayName;
    const len = newTextureName.length;
    if ( len <= 30) {
        displayName = newTextureName;
    } else {
        displayName = `${newTextureName.slice(0,13)}...${newTextureName.slice(len-14)}`;
    }
    return displayName;
}

texUploadInpt.addEventListener("change", () => {
    const { tex } = snailParams;

    // get uploaded file data
    const file = texUploadInpt.files[0];
    if ( file === undefined ) { return; }
    const url = URL.createObjectURL(file);

    // get texture name
    const newTextureName = getNewTextureName(file.name);
    const displayName = getNewTextureDisplayName(newTextureName);

    // update textures
    const newTexture = new THREE.TextureLoader().load(url);
    tex.textures[newTextureName] = newTexture;

    // update DOM
    let option = document.createElement("option");
    option.value = newTextureName;
    option.innerText = displayName;
    texNameSelect.appendChild(option);

    snailParams.tex = tex;
})

window.addEventListener('resize', () => {
    const canvasWidth = Math.round(containerParams.relWidth * window.innerWidth);
    const canvasHeight = Math.round(containerParams.relHeight * window.innerHeight);
    const canvasRatio = canvasWidth / canvasHeight;

    camera.aspect = canvasRatio; 
    camera.updateProjectionMatrix();
    renderer.setSize(canvasWidth, canvasHeight); 
});