module.exports = {
    rotationMatrixAroundY: function (angle) {
        var mtx = new THREE.Matrix3();
        mtx.set(Math.cos(angle), 0., Math.cos(Math.PI/2 + angle),			
                0.,              1., 0.,
                Math.sin(angle), 0., Math.sin(Math.PI/2 + angle));
        return mtx;
    },
    
    setSnailShellVertices: function (geometry, numTurns, numRingsPer2Pi, numPointsPerRing, 
                                   rad0, radDecayPer2Pi) {
        /*
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
        */
        // assign undefined params
        numTurns = (numTurns === undefined) ? 5 : numTurns;
        numRingsPer2Pi = (numRingsPer2Pi === undefined) ? 16 : numRingsPer2Pi;
        numPointsPerRing = (numPointsPerRing === undefined) ? 16 : numPointsPerRing;
        rad0 = (rad0 === undefined) ? 1. : rad0;
        radDecayPer2Pi = (radDecayPer2Pi === undefined) ? 0.3 : radDecayPer2Pi;
        
        var numRings = Math.round(numRingsPer2Pi*numTurns) + 1;      // total number of rings that the shell is made of
    
        // get 'per ring' radius decay and rise
        var f2pi = 1. - radDecayPer2Pi;              // current ring rad / ring rad at the previous layer
        var df = Math.pow(f2pi, 1/(numRingsPer2Pi)); // current ring rad / previous ring rad
        var risePer2Pi = 0.0;
        for (var i=0; i<numRingsPer2Pi; i++) {
            risePer2Pi += Math.pow(f2pi, i/(numRingsPer2Pi-1));
        }
        var dh = 2 * Math.sqrt(f2pi) / risePer2Pi;   // rise per ring (as fraction of current rad)
    
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
    
            // get ring vertices (anchor points of ring's surface)
            for (var ipoint = 0; ipoint < numPointsPerRing; ipoint++) {	
                // construct a circle in xOy-plane, rotate and translate it			
                var vertex = new THREE.Vector3();
                vertex.set(rad * Math.cos(2*Math.PI / numPointsPerRing * ipoint),
                           rad * Math.sin(2*Math.PI / numPointsPerRing * ipoint),
                           0.0);
                vertex.applyMatrix3( this.rotationMatrixAroundY(angle) );
                vertex.addVectors(vertex, center);
    
                geometry.vertices.push(vertex);
            }
        }
    },
    
    setSnailShellFaces: function (geometry, numTurns, numRingsPer2Pi, numPointsPerRing, 
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
        numTurns = (numTurns === undefined) ? 5 : numTurns;	
        numPointsPerRing = (numPointsPerRing === undefined) ? 16 : numPointsPerRing;
    
        var numRings = Math.round(numTurns * numRingsPer2Pi) + 1;
    
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
    },
    
    setTexture: function (geometry, numTurns, numRingsPer2Pi, numPointsPerRing, 
                        rad0, radDecayPer2Pi, 
                        texture, textureLongRepeats, textureTangRepeats) {
        // assign undefined params
        numTurns = (numTurns === undefined) ? 5 : numTurns;
        numRingsPer2Pi = (numRingsPer2Pi === undefined) ? 16 : numRingsPer2Pi;
        numPointsPerRing = (numPointsPerRing === undefined) ? 16 : numPointsPerRing;
        textureTangRepeats = (textureTangRepeats === undefined) ? 2 : textureTangRepeats;
        textureLongRepeats = (textureLongRepeats === undefined) ? 4.7 : textureLongRepeats;
    
        var numRings = Math.round(numTurns * numRingsPer2Pi) + 1;
    
        // load texture	
        texture.wrapS = THREE.MirroredRepeatWrapping;
        texture.wrapT = THREE.MirroredRepeatWrapping;
        texture.repeat.set(textureLongRepeats,textureTangRepeats); // repeat texture `arg0` in longitud dir and `arg1` times in tangential dir
        texture.offset.set(0.,textureTangOffset);                  // offset texture a bit in tangential dir // updated via controls
    
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
};