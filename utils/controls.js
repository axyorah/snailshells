const radDecayRng = document.querySelector("#raddecay");
const turnsRng = document.querySelector("#turns");
const texLongRepeatsRng = document.querySelector("#texlongrepeats");
const texTangRepeatsRng = document.querySelector("#textangrepeats");
const texTangOffsetRng = document.querySelector("#textangoffset");
const texNameSelect = document.querySelector("#texname");
const fDynRng = document.querySelector("#f-dyn");
const kDynRng = document.querySelector("#k-dyn");

function updateDynamicTexture() {
    let { tex, dyn } = snailParams;

    if (dyn.dynamic && dyn.timer > dyn.timerThreshold) {
        dyn.timer -= dyn.timerThreshold; // reset timer
                
        // update array/texture
        rungeKutta4Step(dxdtGrayScott, dyn.x, dyn.deltaT, dyn.p);
        tex.texture = array2texture(dyn.x, dyn.p, 10., 0.6);
                
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

    fillScene();
    addAxes();
})

turnsRng.addEventListener("input", () => {
    const val = parseFloat(turnsRng.value);
    snailParams.geo.numTurns = val;

    fillScene();
    addAxes();
})

texLongRepeatsRng.addEventListener("input", () => {
    const val = parseFloat(texLongRepeatsRng.value);
    snailParams.tex.textureLongRepeats = val;

    fillScene();
    addAxes();
})

texTangRepeatsRng.addEventListener("input", () => {
    const val = parseInt(texTangRepeatsRng.value);
    snailParams.tex.textureTangRepeats = val;

    fillScene();
    addAxes();
})

texTangOffsetRng.addEventListener("input", () => {
    const val = parseFloat(texTangOffsetRng.value);
    snailParams.tex.textureTangOffset = val;

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

    let { dyn } = snailParams;
    dyn.p.f = val;

    if (!dyn.dynamic) {
        dyn.dynamic = true;
        dyn.x = initTextureArray(dyn.x, dyn.p);
    }

    snailParams.dyn = dyn;  
    // scene is added in renderer/updateDynamicTexture
    // as for dyn textures it needs to be updated for each frame,
    // not just on param change  
})

kDynRng.addEventListener("input", () => {
    const val = parseFloat(kDynRng.value);

    let { tex, dyn } = snailParams;
    dyn.p.k = val;

    if (!dyn.dynamic) {
        dyn.dynamic = true;
        dyn.x = initTextureArray(dyn.x, dyn.p);
    }

    snailParams.dyn = dyn;
    // scene is added in renderer/updateDynamicTexture
    // as for dyn textures it needs to be updated for each frame,
    // not just on param change
})

window.addEventListener('resize', () => {
    const canvasWidth = Math.round(containerParams.relWidth * window.innerWidth);
    const canvasHeight = Math.round(containerParams.relHeight * window.innerHeight);
    const canvasRatio = canvasWidth / canvasHeight;

    camera.aspect = canvasRatio; 
    camera.updateProjectionMatrix();
    renderer.setSize(canvasWidth, canvasHeight); 
});