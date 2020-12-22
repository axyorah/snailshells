function eulerForwardStep(dxdt, x, deltaT, p) {
    /*
    performs a single step(!) of Euler Forward (Runge-Kutta 1) and updates array x 
    (x can be reshaped to 3D) over a time step deltaT
    using a system of differential equations specified in 
    function dxdt and parameters specified in array p
    INPUTS:
        dxdt: function dxdt(x, p): function without explicit time dependence
            that describes the system of differential equations;
        x:    flattened state array that has a shape height*width*#states
            and is arranged as follows:
            for row in 0..#rows
              for column in 0..#columns
                for state in 0..#states
                  x.push( value )
        deltaT: float: integration time step
        p:    parameter array that is to be passed to dxdt;
            aside from dxdt-specific parameters
            should contain the following fields:
            p.height: #rows - number of texels along height
            p.width: #columns - number of texels along width
            p.delta: size of a single texel in "physical" units
            p.D: array of diffusion coefficients for each state
    OUTPUT:
        updated x
    */
    let k1 = dxdt(x, p);
    for (let i = 0; i < p.height * p.width * p.D.length; i++) {
        x[i] += k1[i] * deltaT;
    }
    return x;
}

function rungeKutta2Step(dxdt, x, deltaT, p) {
    /*
    performs a single step(!) of Runge-Kutta 2 and updates array x 
    (x can be reshaped to 3D) over a time step deltaT
    using a system of differential equations specified in 
    function dxdt and parameters specified in array p
    INPUTS:
        dxdt: function dxdt(x, p): function without explicit time dependence
            that describes the system of differential equations;
        x:    flattened state array that has a shape height*width*#states
            and is arranged as follows:
            for row in 0..#rows
              for column in 0..#columns
                for state in 0..#states
                  x.push( value )
        deltaT: float: integration time step
        p:    parameter array that is to be passed to dxdt;
            aside from dxdt-specific parameters
            should contain the following fields:
            p.height: #rows - number of texels along height
            p.width: #columns - number of texels along width
            p.delta: size of a single texel in "physical" units
            p.D: array of diffusion coefficients for each state
    OUTPUT:
        updated x
    */
    let k1 = dxdt(x, p);

    let xk1 = new Array(p.width * p.height * p.D.length);
    for (let i = 0; i < p.height * p.width * p.D.length; i++) {
        xk1[i] = x[i] + 0.5 * k1[i] * deltaT;
    }
    let k2 = dxdt(xk1, p);

    for (let i = 0; i < p.height * p.width * p.D.length; i++) {
        x[i] += k2[i] * deltaT;
    }

    return x;
}

function rungeKutta4Step(dxdt, x, deltaT, p) {
    /*
    performs a single step(!) of Runge-Kutta 4 and updates array x 
    (x can be reshaped to 3D) over a time step deltaT
    using a system of differential equations specified in 
    function dxdt and parameters specified in array p
    INPUTS:
        dxdt: function dxdt(x, p): function without explicit time dependence
            that describes the system of differential equations;
        x:    flattened state array that has a shape height*width*#states
            and is arranged as follows:
            for row in 0..#rows
              for column in 0..#columns
                for state in 0..#states
                  x.push( value )
        deltaT: float: integration time step
        p:    parameter array that is to be passed to dxdt;
            aside from dxdt-specific parameters
            should contain the following fields:
            p.height: #rows - number of texels along height
            p.width: #columns - number of texels along width
            p.delta: size of a single texel in "physical" units
            p.D: array of diffusion coefficients for each state
    OUTPUT:
        updated x
    */

    letlet = dxdt(x, p);

    letlet1 = new Array(p.width * p.height * p.D.length);
    for (letlet= 0; i < p.width * p.height * p.D.length; i++) {
        xk1[i] = x[i] + 0.5 * deltaT * k1[i];
    }

    letlet = dxdt(xk1, p);

    letlet2 = new Array(p.width * p.height * 3);
    for (letlet= 0; i < p.width * p.height * 3; i++) {
        xk2[i] = x[i] + 0.5 * deltaT * k2[i];
    }

    letlet = dxdt(xk2, p);

    letlet3 = new Array(p.width * p.height * 3);
    for (letlet= 0; i < p.width * p.height * 3; i++) {
        xk3[i] = x[i] + deltaT * k3[i];
    }

    letlet = dxdt(xk3, p);

    for (letlet= 0; i < p.width * p.height * 3; i++) {
        x[i] += 1. / 6. * (k1[i] + 2. * k2[i] + 2. * k3[i] + k4[i]);
    }

    return x;
}

function setDiffusionTerm(diffusion, x, p) {
    /*
    updates diffusion term using current state values from x array 
    INPUTS:
        diffusion: undefined flattened array that has a length #rows*#columns*#states;
            used to store contribution of diffusion alone to x update;
            to find the diffusion contribution each state of x array 
            is going to be convolved with the kernel while ignoring the edges 
            (no flux of the edges)
            kernel = [[0.05, 0.20, 0.05],
                      [0.20,-1.00, 0.20],
                      [0.05, 0.20, 0.05]] 
        x:    flattened array that has a length #rows*#columns*#states
        p:    parameter array that is to be passed to dxdt;
            aside from dxdt-specific parameters
            should contain the following fields:
            p.height: #rows - number of texels along height
            p.width: #columns - number of texels along width
            p.delta: size of a single texel in "physical" units
            p.D: array of diffusion coefficients for each state 
    OUTPUT:
        doesn't return anything, updates `diffusion`
    */
    for (let j = 0; j < p.width * p.height; j++) {
        let stride = j * p.D.length;

        for (let i = 0; i < p.D.length; i++) {
            diffusion[stride + i] = 0.0;
            if (stride >= p.width * p.D.length) {
                diffusion[stride + i] += p.D[i] / p.delta / p.delta * 0.2 * x[stride + i - p.width * p.D.length]; // from top
                diffusion[stride + i] -= p.D[i] / p.delta / p.delta * 0.2 * x[stride + i]; // to top                
            }
            if (stride < (x.length - p.width * p.D.length)) {
                diffusion[stride + i] += p.D[i] / p.delta / p.delta * 0.2 * x[stride + i + p.width * p.D.length]; // from bottom
                diffusion[stride + i] -= p.D[i] / p.delta / p.delta * 0.2 * x[stride + i]; // to bottom
            }
            if ((stride % p.width * p.D.length) != 0) {
                diffusion[stride + i] += p.D[i] / p.delta / p.delta * 0.2 * x[stride + i - p.D.length]; // from left
                diffusion[stride + i] -= p.D[i] / p.delta / p.delta * 0.2 * x[stride + i]; // to left
            }
            if (((stride + p.D.length) % p.width * p.D.length) != 0) {
                diffusion[stride + i] += p.D[i] / p.delta / p.delta * 0.2 * x[stride + i + p.D.length]; // from right
                diffusion[stride + i] -= p.D[i] / p.delta / p.delta * 0.2 * x[stride + i]; // to right
            }

            if ((stride >= p.width * p.D.length) && ((stride % p.width * p.D.length) != 0)) {
                diffusion[stride + i] += p.D[i] / p.delta / p.delta * 0.05 * x[stride + i - p.width * p.D.length - p.D.length]; // from top-left
                diffusion[stride + i] -= p.D[i] / p.delta / p.delta * 0.05 * x[stride + i]; // to top-left
            }
            if ((stride >= p.width * 3) && (((stride + 3) % p.width * 3) != 0)) {
                diffusion[stride + i] += p.D[i] / p.delta / p.delta * 0.05 * x[stride + i - p.width * 3 + 3]; // from top-right
                diffusion[stride + i] -= p.D[i] / p.delta / p.delta * 0.05 * x[stride + i]; // to top-right
            }
            if ((stride < (x.length - p.width * p.D.length)) && ((stride % p.width * p.D.length) != 0)) {
                diffusion[stride + i] += p.D[i] / p.delta / p.delta * 0.05 * x[stride + i + p.width * p.D.length - p.D.length]; // from bottom-left
                diffusion[stride + i] -= p.D[i] / p.delta / p.delta * 0.05 * x[stride + i]; // to bottom-left
            }
            if ((stride < (x.length - p.width * p.D.length)) && (((stride + p.D.length) % p.width * p.D.length) != 0)) {
                diffusion[stride + i] += p.D[i] / p.delta / p.delta * 0.05 * x[stride + i + p.width * p.D.length + p.D.length]; // from bottom-right
                diffusion[stride + i] -= p.D[i] / p.delta / p.delta * 0.05 * x[stride + i]; // to bottom-right
            }
        }
    }
}

