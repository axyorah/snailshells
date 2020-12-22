var gui = new dat.GUI();
gui.domElement.style.marginTop = "10px";
gui.domElement.children[1].style.opacity = "0.9";

// init values for gui controller
effectController = {
    raddecay: 0.3,
    turns: 5,

    texlongrepeats: 4.7,
    textangrepeats: 2,
    textangoffset: 0.,
    texname: "angelfish0",

    f: 0.0140,
    k: 0.0450
};

function setupGui() {
    
    var h;    
    h = gui.addFolder("Geometry");
    h.add( effectController, "raddecay", 0.0, 1.0, 0.01).name("radius decay");
    h.add( effectController, "turns", 0.1, 10.0, 0.1).name("#turns");

    h = gui.addFolder("Texture");
    h.add( effectController, "texlongrepeats", 1, 30, 0.01).name("#long. repeats");
    h.add( effectController, "textangrepeats", 2, 12, 2).name("#tang. repeats");
    h.add( effectController, "textangoffset", 0., 2., 0.01).name("#tang. offset");
    h.add( effectController, "texname", 
                            ["angelfish0", 
                             "angelfish1", 
                             "gierermeinhardt0",
                             "gierermeinhardt1", 
                             "grayscottcorals0", 
                             "grayscottcorals1", 
                             "grayscottspirals0",
                             "grayscottspirals1",
                             "predprey0",
                             "predprey1",
                             "dynamic"
                            ]).name("texture name");

    h = gui.addFolder("Dynamic Texture Only");
    h.add( effectController, "f", 0.0100, 0.0650, 0.0001).name("f ('prey' growth)");
    h.add( effectController, "k", 0.0100, 0.0650, 0.0001).name("k ('pred' decay)");

}