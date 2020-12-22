// texture helpers
function initTextureArray(x, p) {
    const { dumm, pred, prey } = p;

    x = new Array(p.height * p.width * 3);
    for (let i = 0; i < p.height * p.width; i++) {
        let stride = i * 3;

        x[stride + prey] = 1.; // prey is everywhere
        x[stride + pred] = 0.; // predators are not there yet
        x[stride + dumm] = 0.5; // dummy can be anything...

        // roll again for predator
        let roll = Math.random();
        if ( roll < 1/1000 ) {
            x[stride + pred] = 1.; // predator are assigned to some texels
        }
    }
    return x;
}

function setGrayScottReactionTerm(reaction, x, p) {
    const { dumm, pred, prey } = p;

    for (let i = 0; i < p.height * p.width; i++) {
        let stride = i * 3;

        let a = x[stride + prey];
        let b = x[stride + pred];

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

function array2texture(x, p, steepness, midpoint) {

    let data = new Uint8Array( p.height * p.width * 3 );
    for (let i = 0; i < p.width * p.height * 3; i++) {
        data[i] = Math.floor( 255. / (1 + Math.exp(-steepness * (x[i] - midpoint))) );
    }

    return new THREE.DataTexture( data, p.width, p.height, THREE.RGBFormat );
}