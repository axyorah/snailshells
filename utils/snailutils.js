
function rotationMatrixAroundY(angle) {
    let mtx = new THREE.Matrix3();
    mtx.set(Math.cos(angle), 0., Math.cos(Math.PI / 2 + angle),
        0., 1., 0.,
        Math.sin(angle), 0., Math.sin(Math.PI / 2 + angle));
    return mtx;
}

function setSnailShellVertices(geometry, snailParams) {
    /*
    Calculates vertex coordinates of the snail shell in xyz 
    and uses calculated vertices to update geometry object.

    Assumptions made to set up the snail shell geometry:
    Snail shell is made up of rings that are arranged in a decaying spiral:
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
 
    The center of each ring is slightely above the center of the previous ring, 
    so that if arbitrary ring with radius R is at a height 0 
    the ring right above it (with radius f2pi * R) would be at a height 
      sqrt( R^2*(1 + f2pi)^2 - R^2*(1 - f2pi)^2  ) = 2R sqrt(f2pi)
    We can say that each ring rises dh * df * R above the previous ring with radius R.
    Therefore, if arbitrary ring with radius R is at height 0
    the ring right above it (with radius f2pi * R) would be at a height
      R * dh * sum(f2pi^(i/(numRingsPer2Pi)) for i in range(numRingsPer2Pi))
    Therefore,
      dh =  2R sqrt(f2pi) / sum(f2pi^(i/(numRingsPer2Pi)) for i in range(numRingsPer2Pi))
    Notice, that dh is not the actual rise, but the relative rise (relative wrt current radius),
    absolute rise would be dh * R

    INPUTS:
        geometry: THREE.BufferGeometry(): 'empty' initiated geometry object that will be updated
        snailParams: object with field `geo`, which itself has the following fields:
            numTurns: float: number of turns of the shell spiral;
            numRingsPer2Pi: int: number of rings per one spiral turn 
                (shell resolution in longitudinal direction for one spiral turn);
            numPointsPerRing: int: number of vertices in a single ring
                (shell resolution in tangential direction);
            rad0: float: radius of the first ring;
            radDecayPer2Pi: float: relative radius reduction per spiral turn 
                (0 < radDecayPer2Pi < 1)
    OUTPUT:
        doesn't output anything, updates geometry with vertices
    */
    const { 
        numTurns, numRingsPer2Pi, numPointsPerRing, rad0, radDecayPer2Pi 
    } = snailParams.geo;
   
    let numRings = Math.round(numRingsPer2Pi * numTurns) + 1;      // total number of rings that the shell is made of

    // get 'per ring' radius decay and rise
    let f2pi = 1. - radDecayPer2Pi;              // current ring rad / ring rad at the previous layer
    let df = Math.pow(f2pi, 1 / (numRingsPer2Pi)); // current ring rad / previous ring rad
    let risePer2Pi = 0.0;
    for (let i = 0; i < numRingsPer2Pi; i++) {
        risePer2Pi += Math.pow(f2pi, i / (numRingsPer2Pi - 1));
    }
    let dh = 2 * Math.sqrt(f2pi) / risePer2Pi;   // rise per ring (as fraction of current rad)

    // get coordinates of the ring centers and ring vertices	
    let rad = rad0;  // initiate radius of the 'current' ring
    let height = 0.; // ring center's height
    let angle = 0.;  // angle between Ox and ring's center

    let xcenter = [];
    let ycenter = [];
    let zcenter = [];
    let xvertex = [];
    let yvertex = [];
    let zvertex = [];
    for (let iring = 0; iring < numRings; iring++) {
        // update ring center's location and radius
        rad *= df;
        height += dh * rad;
        angle = 2 * Math.PI / numRingsPer2Pi * iring;

        let center = new THREE.Vector3(rad * Math.cos(angle),
            height,
            rad * Math.sin(angle));

        xcenter.push(center.x);
        ycenter.push(center.y);
        zcenter.push(center.z);
        // get ring vertices (anchor points of ring's surface)
        for (let ipoint = 0; ipoint < numPointsPerRing; ipoint++) {
            // construct a circle in xOy-plane, rotate and translate it			
            let vertex = new THREE.Vector3();
            vertex.set(rad * Math.cos(2 * Math.PI / numPointsPerRing * ipoint),
                rad * Math.sin(2 * Math.PI / numPointsPerRing * ipoint),
                0.0);
            vertex.applyMatrix3(this.rotationMatrixAroundY(angle));
            vertex.addVectors(vertex, center);

            xvertex.push(vertex.x);
            yvertex.push(vertex.y);
            zvertex.push(vertex.z);
        }
    }

    // instead of setting up 'position' attribute here, 
    // we'll first store coordinates of vertices and ring centers;
    // the 'position' attribute will be assigned using these vertex data
    // during the geometry face calculation along with normals
    let attr = [xvertex, yvertex, zvertex, xcenter, ycenter, zcenter];
    let attrName = ['xvertex', 'yvertex', 'zvertex', 'xcenter', 'ycenter', 'zcenter'];
    for (let i=0; i < 6; i++) {
        geometry.setAttribute(attrName[i], new THREE.Float32BufferAttribute( attr[i], 1 ));
    }
}

function setSnailShellFaces(geometry, snailParams) {
    /*
    Assigns face triangles using info on vertices;
    updates geometry object

    Assumptions used to assign faces:
    e.g., for numPointsPerRing = 16 (numbers represent vertex indices):   
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

    INPUTS:
        geometry: THREE.BufferGeometry(): initiated geometry object that has vertices assigned;
            will be further updated
        snailParams: object with field `geo`, which itself has the following fields:
            numTurns: float: number of turns of the shell spiral;
            numRingsPer2Pi: int: number of rings per one spiral turn 
                (shell resolution in longitudinal direction for one spiral turn);
            numPointsPerRing: int: number of vertices in a single ring
                (shell resolution in tangential direction);
    OUTPUT:
        doesn't output anything, updates geometry with faces
    */

    const { numTurns, numRingsPer2Pi, numPointsPerRing } = snailParams.geo;
   
    let numRings = Math.round(numTurns * numRingsPer2Pi) + 1;

    // get precalculated vertices and ring centers
    const { xcenter: cx, ycenter: cy, zcenter: cz, xvertex: vx, yvertex: vy, zvertex: vz } = geometry.attributes;

    // store calculated positions and normals in array
    let positions = [];
    let normals = [];

    let ivertex, face1, face2;
    for (let iring = 0; iring < numRings; iring++) {
        for (let ipoint = 0; ipoint < numPointsPerRing; ipoint++) {
            ivertex = iring * numPointsPerRing + ipoint;
            // faces are between rings -> skip the last ring
            if (iring != (numRings - 1)) {
                // vertice indexing is different for the last two faces
                //( we need to 'close' the ring)
                if (ipoint < numPointsPerRing - 1) {
                    face1 = new THREE.Face3(
                        ivertex, ivertex + numPointsPerRing, ivertex + numPointsPerRing + 1);
                    face2 = new THREE.Face3(
                        ivertex, ivertex + numPointsPerRing + 1, ivertex + 1);
                } else {
                    face1 = new THREE.Face3(
                        ivertex, ivertex + numPointsPerRing, ivertex + 1);
                    face2 = new THREE.Face3(
                        ivertex, ivertex + 1, ivertex + 1 - numPointsPerRing);
                }
                
                // recall:
                //        c--b:::c
                // face2  | /  / | face1
                //        a:::a--b 
                // 'a' of f ace1 and 'a','c' of face2 belong to iring; 
                // 'b','c' of face1 and 'b' of face2 belong to iring+1
                for ( let face of [face1, face2]) {
                    for (let ax of ['a', 'b', 'c']) {
                        const ring = (ax === 'b' || (face === face1 && ax === 'c')) ? iring + 1 : iring;

                        positions.push(...[
                            vx.array[face[ax]], 
                            vy.array[face[ax]], 
                            vz.array[face[ax]]
                        ]);
                        normals.push(...[
                            vx.array[face[ax]] - cx.array[ring], 
                            vy.array[face[ax]] - cy.array[ring], 
                            vz.array[face[ax]] - cz.array[ring]
                        ]);
                    }
                }                          
            }
        }
    }
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute( normals, 3 ));
    geometry.setAttribute('position', new THREE.Float32BufferAttribute( positions, 3 ));
}

function setSnailShellTexture(geometry, snailParams) {
    /*
    Assignes mirror repeated texture to snail shell
    INPUTS:
        geometry: THREE.BufferGeometry(): geometry object woth vertices and faces assigned;
            will be further updated
        snailParams: object with fields `geo` and `tex`;
            field `geo` should have the following fields:
                numTurns: float: number of turns of the shell spiral;
                numRingsPer2Pi: int: number of rings per one spiral turn 
                    (shell resolution in longitudinal direction for one spiral turn);
                numPointsPerRing: int: number of vertices in a single ring
                    (shell resolution in tangential direction);
            field `tex` should have the following subfields:
                texture: THREE texture object: pattern to be used as repeating texture:
                    either image loaded with THREE.TextureLoader
                    or data array made into a texture with THREE.DataTexture
                textureLongRepeats: float: number of texture repeats per spiral turn 
                    in longitudinal direction  
                    (repeated textures will be mirrored to smoothen the transitions)
                textureTangRepeats: int: number of texture repeats in tangential direction
                    should be a multiple of 2 (because of the mirror repeats)
                textureTangOffset: float: relative texture offset in tangential direction
    OUTPUT:
        doesn't output anything, updates geometry with texture
    */
    const { numTurns, numRingsPer2Pi, numPointsPerRing } = snailParams.geo;
    const { texture, textureLongRepeats, textureTangRepeats, textureTangOffset } = snailParams.tex;
    
    var numRings = Math.round(numTurns * numRingsPer2Pi) + 1;

    // load texture	
    texture.wrapS = THREE.MirroredRepeatWrapping;
    texture.wrapT = THREE.MirroredRepeatWrapping;
    texture.repeat.set(textureLongRepeats, textureTangRepeats); // repeat texture `arg0` in longitud dir and `arg1` times in tangential dir
    texture.offset.set(0., textureTangOffset);                  // offset texture a bit in tangential dir // updated via controls

    // get texture fraction per face
    var vertFrac = 1. / numPointsPerRing;
    var horFrac = 1. / numRingsPer2Pi;

    // store uvs into array
    let uvs = [];

    // set texture UVs    
    for (let iring = 0; iring < numRings; iring++) {
        for (let ipoint = 0; ipoint < numPointsPerRing; ipoint++) {
            // recall:
            //        c--b  c
            // face2  | / / | face1
            //        a  a--b 
            // 'a' of face1 and 'a','c' of face2 belong to iring; 
            // 'b','c' of face1 and 'b' of face2 belong to iring+1
            uvs.push(...[
                iring * horFrac, ipoint * vertFrac,
                (iring + 1) * horFrac, ipoint * vertFrac,
                (iring + 1) * horFrac, (ipoint + 1) * vertFrac
            ]);
            uvs.push(...[
                iring * horFrac, ipoint * vertFrac,
                (iring + 1) * horFrac, (ipoint + 1) * vertFrac,
                iring * horFrac, (ipoint + 1) * vertFrac
            ]);
        }
    }
    geometry.setAttribute( 'uv', new THREE.Float32BufferAttribute( uvs, 2 ) );
}

function makeSnailShell(snailParams) {
    const { texture } = snailParams.tex;
    
    // build snail shell geometry: 
    // calculate coordinates of vertices, assign faces and textures
    let geometry = new THREE.BufferGeometry();
    
    setSnailShellVertices(geometry, snailParams);
    setSnailShellFaces(geometry, snailParams);
    setSnailShellTexture(geometry, snailParams);

    // adjust normals for proper lighting
    geometry.normalizeNormals();

    // assemble snail shell from geometry and material 
    let material = new THREE.MeshPhongMaterial({ 
        map: texture, side: THREE.DoubleSide 
    });
    let snail = new THREE.Mesh(geometry, material);
    return snail;
}