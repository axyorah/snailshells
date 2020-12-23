// general
let camera, scene, renderer, cameraControls;
const clock = new THREE.Clock();
const container = document.querySelector("#container");

let containerParams = {
    relWidth: 1.,
    relHeight: 1.,
}

// snail
let snailParams = {
    geo:{
        numTurns: 5.,            // number of spiral turns of the shell
        numRingsPer2Pi: 16,      // shell 'resolution' in longitudinal direction
        numPointsPerRing: 16,    // shell 'resolution' in tangential direction
        rad0: 1.0,               // radius of the first shell ring
        radDecayPer2Pi: 0.3      // ... each ring at level i is 0.3 times smaller than corresponding rings at level i-1
    },

    tex: {
        texture: null,           // current texture; assigend in `init()`, updated in `render()`
        textureName: "angelfish-1",// current texture name
        textures: {},            // preloaded textures; assigned in `init()`
        textureNames: [
            "angelfish-1", "angelfish-2", 
            "gierer-meinhardt-1", "gierer-meinhardt-2",
            "gray-scott-corals-1", "gray-scott-corals-2", 
            "gray-scott-spirals-1", "gray-scott-spirals-2",
            "pred-prey-1", "pred-prey-2"
        ],                       // names of textures available in `./imgs`
        textureLongRepeats: 4.7, // # texture repeats in longitudinal direction per level (2pi)
        textureTangRepeats: 2,   // # texture repeats in tangential direction
        textureTangOffset: 0.    // texture offset in tangential direction        
    },

    dyn: {
        deltaT: 2.0, // time step (increasing it can destabilize solution, depending on p.delta)
        dynamic: false,
        p: {
            f: 0.0140, // growth rate of "prey"
            k: 0.0450, // decay rate of "predator"
            dumm: 0,   // index of dummy color channel
            pred: 1,   // index of predator color channel
            prey: 2,   // index of prey color channel
            D: [2.0, 0.5, 2], // diffusion coeff array: [dummy, pred, prey]
            delta: 2.5, // spatial step (texel size in "physical" units)
            height: 128, // texture height in texels
            width: 128, // texture width in texels
        },        
        timer: 0.0, // time for dynamic texture update
        timerThreshold: 1/60./30., // update texture ~30 times per sec
        x: null
    }
}