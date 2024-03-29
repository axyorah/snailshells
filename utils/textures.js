// texture helpers
function initTextureArray( p ) {
    const { dumm, pred, prey } = p;

    let x = new Array(p.height * p.width * 3);
    for (let i = 0; i < p.height * p.width; i++) {
        const stride = i * 3;

        x[stride + prey] = 1.; // prey is everywhere
        x[stride + pred] = 0.; // predators are not there yet
        x[stride + dumm] = 0.5; // dummy can be anything...

        // roll again for predator
        const roll = Math.random();
        if ( roll < 1/1000 ) {
            x[stride + pred] = 1.; // predator are assigned to some texels
        }
    }
    return x;
}

function initTexture( p ){
    const data = new Uint8Array( p.width * p.height * 3 );
    const texture = new THREE.DataTexture( data, p.width, p.height, THREE.RGBFormat );    
    texture.needsUpdate = true;
    return texture;
}

function setGrayScottReactionTerm(reaction, x, p) {
    const { dumm, pred, prey } = p;

    for (let i = 0; i < p.height * p.width; i++) {
        const stride = i * 3;

        const a = x[stride + prey];
        const b = x[stride + pred];

        reaction[stride + prey] = -a * b * b + p.f * (1 - a);    // prey
        reaction[stride + pred] =  a * b * b - (p.k + p.f) * b;  // predator
        reaction[stride + dumm] =  0.7*reaction[stride + prey];  // dummy channel
    }
}

function dxdtGrayScott(x, p) {
    let total     = new Array(p.height * p.width * 3);
    let diffusion = new Array(p.height * p.width * 3);
    let reaction  = new Array(p.height * p.width * 3);

    setDiffusionTerm(diffusion, x, p);
    setGrayScottReactionTerm(reaction, x, p);

    for (let i = 0; i < p.height*p.width*3; i++) {
        total[i] = diffusion[i] + reaction[i];
    }
    return total;
}

function createDataTextureFromArray(x, p, steepness, midpoint) {
    let data = new Uint8Array( x.length );
    
    for (let i = 0; i < x.length; i++) {
        data[i] = Math.floor( 255. / (1 + Math.exp(-steepness * (x[i] - midpoint))) );
    }
    return new THREE.DataTexture( data, p.width, p.height, THREE.RGBFormat );
}

function updateDataTextureFromArray(texture, x, p, steepness, midpoint) {
    for (let i = 0; i < x.length; i++) {
        texture.image.data[i] = Math.floor( 255. / (1 + Math.exp(-steepness * (x[i] - midpoint))) );                
    }
    texture.needsUpdate = true; // <-- sic!
    return texture;
}

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
        //addAxes();
    }
}