// required modules can only be used if bundled version of this file was made with `browserify`
var OrbitControls = require('three-orbit-controls')(THREE); // allows to control camera position
var PdeUtils = require('../utils/pdeutils.js'); // custom functions for solving PDEs
var SnailUtils = require('../utils/snailutils.js'); // custom functions for setting up snail shell geometry/textures
