function getSkybox() {

    const loader = new THREE.CubeTextureLoader();
    loader.setPath( '../imgs/skybox/' );

    const textureCube = loader.load( [
	    'px.jpg', 'nx.jpg',
	    'py.jpg', 'ny.jpg',
	    'pz.jpg', 'nz.jpg'
    ] );

    return textureCube;
}