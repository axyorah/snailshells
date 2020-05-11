(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
module.exports = function( THREE ) {
	/**
	 * @author qiao / https://github.com/qiao
	 * @author mrdoob / http://mrdoob.com
	 * @author alteredq / http://alteredqualia.com/
	 * @author WestLangley / http://github.com/WestLangley
	 * @author erich666 / http://erichaines.com
	 */

// This set of controls performs orbiting, dollying (zooming), and panning.
// Unlike TrackballControls, it maintains the "up" direction object.up (+Y by default).
//
//    Orbit - left mouse / touch: one finger move
//    Zoom - middle mouse, or mousewheel / touch: two finger spread or squish
//    Pan - right mouse, or arrow keys / touch: three finter swipe

	function OrbitControls( object, domElement ) {

		this.object = object;

		this.domElement = ( domElement !== undefined ) ? domElement : document;

		// Set to false to disable this control
		this.enabled = true;

		// "target" sets the location of focus, where the object orbits around
		this.target = new THREE.Vector3();

		// How far you can dolly in and out ( PerspectiveCamera only )
		this.minDistance = 0;
		this.maxDistance = Infinity;

		// How far you can zoom in and out ( OrthographicCamera only )
		this.minZoom = 0;
		this.maxZoom = Infinity;

		// How far you can orbit vertically, upper and lower limits.
		// Range is 0 to Math.PI radians.
		this.minPolarAngle = 0; // radians
		this.maxPolarAngle = Math.PI; // radians

		// How far you can orbit horizontally, upper and lower limits.
		// If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
		this.minAzimuthAngle = - Infinity; // radians
		this.maxAzimuthAngle = Infinity; // radians

		// Set to true to enable damping (inertia)
		// If damping is enabled, you must call controls.update() in your animation loop
		this.enableDamping = false;
		this.dampingFactor = 0.25;

		// This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
		// Set to false to disable zooming
		this.enableZoom = true;
		this.zoomSpeed = 1.0;

		// Set to false to disable rotating
		this.enableRotate = true;
		this.rotateSpeed = 1.0;

		// Set to false to disable panning
		this.enablePan = true;
		this.keyPanSpeed = 7.0;	// pixels moved per arrow key push

		// Set to true to automatically rotate around the target
		// If auto-rotate is enabled, you must call controls.update() in your animation loop
		this.autoRotate = false;
		this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

		// Set to false to disable use of the keys
		this.enableKeys = true;

		// The four arrow keys
		this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

		// Mouse buttons
		this.mouseButtons = { ORBIT: THREE.MOUSE.LEFT, ZOOM: THREE.MOUSE.MIDDLE, PAN: THREE.MOUSE.RIGHT };

		// for reset
		this.target0 = this.target.clone();
		this.position0 = this.object.position.clone();
		this.zoom0 = this.object.zoom;

		//
		// public methods
		//

		this.getPolarAngle = function () {

			return spherical.phi;

		};

		this.getAzimuthalAngle = function () {

			return spherical.theta;

		};

		this.reset = function () {

			scope.target.copy( scope.target0 );
			scope.object.position.copy( scope.position0 );
			scope.object.zoom = scope.zoom0;

			scope.object.updateProjectionMatrix();
			scope.dispatchEvent( changeEvent );

			scope.update();

			state = STATE.NONE;

		};

		// this method is exposed, but perhaps it would be better if we can make it private...
		this.update = function() {

			var offset = new THREE.Vector3();

			// so camera.up is the orbit axis
			var quat = new THREE.Quaternion().setFromUnitVectors( object.up, new THREE.Vector3( 0, 1, 0 ) );
			var quatInverse = quat.clone().inverse();

			var lastPosition = new THREE.Vector3();
			var lastQuaternion = new THREE.Quaternion();

			return function update () {

				var position = scope.object.position;

				offset.copy( position ).sub( scope.target );

				// rotate offset to "y-axis-is-up" space
				offset.applyQuaternion( quat );

				// angle from z-axis around y-axis
				spherical.setFromVector3( offset );

				if ( scope.autoRotate && state === STATE.NONE ) {

					rotateLeft( getAutoRotationAngle() );

				}

				spherical.theta += sphericalDelta.theta;
				spherical.phi += sphericalDelta.phi;

				// restrict theta to be between desired limits
				spherical.theta = Math.max( scope.minAzimuthAngle, Math.min( scope.maxAzimuthAngle, spherical.theta ) );

				// restrict phi to be between desired limits
				spherical.phi = Math.max( scope.minPolarAngle, Math.min( scope.maxPolarAngle, spherical.phi ) );

				spherical.makeSafe();


				spherical.radius *= scale;

				// restrict radius to be between desired limits
				spherical.radius = Math.max( scope.minDistance, Math.min( scope.maxDistance, spherical.radius ) );

				// move target to panned location
				scope.target.add( panOffset );

				offset.setFromSpherical( spherical );

				// rotate offset back to "camera-up-vector-is-up" space
				offset.applyQuaternion( quatInverse );

				position.copy( scope.target ).add( offset );

				scope.object.lookAt( scope.target );

				if ( scope.enableDamping === true ) {

					sphericalDelta.theta *= ( 1 - scope.dampingFactor );
					sphericalDelta.phi *= ( 1 - scope.dampingFactor );

				} else {

					sphericalDelta.set( 0, 0, 0 );

				}

				scale = 1;
				panOffset.set( 0, 0, 0 );

				// update condition is:
				// min(camera displacement, camera rotation in radians)^2 > EPS
				// using small-angle approximation cos(x/2) = 1 - x^2 / 8

				if ( zoomChanged ||
					lastPosition.distanceToSquared( scope.object.position ) > EPS ||
					8 * ( 1 - lastQuaternion.dot( scope.object.quaternion ) ) > EPS ) {

					scope.dispatchEvent( changeEvent );

					lastPosition.copy( scope.object.position );
					lastQuaternion.copy( scope.object.quaternion );
					zoomChanged = false;

					return true;

				}

				return false;

			};

		}();

		this.dispose = function() {

			scope.domElement.removeEventListener( 'contextmenu', onContextMenu, false );
			scope.domElement.removeEventListener( 'mousedown', onMouseDown, false );
			scope.domElement.removeEventListener( 'wheel', onMouseWheel, false );

			scope.domElement.removeEventListener( 'touchstart', onTouchStart, false );
			scope.domElement.removeEventListener( 'touchend', onTouchEnd, false );
			scope.domElement.removeEventListener( 'touchmove', onTouchMove, false );

			document.removeEventListener( 'mousemove', onMouseMove, false );
			document.removeEventListener( 'mouseup', onMouseUp, false );

			window.removeEventListener( 'keydown', onKeyDown, false );

			//scope.dispatchEvent( { type: 'dispose' } ); // should this be added here?

		};

		//
		// internals
		//

		var scope = this;

		var changeEvent = { type: 'change' };
		var startEvent = { type: 'start' };
		var endEvent = { type: 'end' };

		var STATE = { NONE : - 1, ROTATE : 0, DOLLY : 1, PAN : 2, TOUCH_ROTATE : 3, TOUCH_DOLLY : 4, TOUCH_PAN : 5 };

		var state = STATE.NONE;

		var EPS = 0.000001;

		// current position in spherical coordinates
		var spherical = new THREE.Spherical();
		var sphericalDelta = new THREE.Spherical();

		var scale = 1;
		var panOffset = new THREE.Vector3();
		var zoomChanged = false;

		var rotateStart = new THREE.Vector2();
		var rotateEnd = new THREE.Vector2();
		var rotateDelta = new THREE.Vector2();

		var panStart = new THREE.Vector2();
		var panEnd = new THREE.Vector2();
		var panDelta = new THREE.Vector2();

		var dollyStart = new THREE.Vector2();
		var dollyEnd = new THREE.Vector2();
		var dollyDelta = new THREE.Vector2();

		function getAutoRotationAngle() {

			return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

		}

		function getZoomScale() {

			return Math.pow( 0.95, scope.zoomSpeed );

		}

		function rotateLeft( angle ) {

			sphericalDelta.theta -= angle;

		}

		function rotateUp( angle ) {

			sphericalDelta.phi -= angle;

		}

		var panLeft = function() {

			var v = new THREE.Vector3();

			return function panLeft( distance, objectMatrix ) {

				v.setFromMatrixColumn( objectMatrix, 0 ); // get X column of objectMatrix
				v.multiplyScalar( - distance );

				panOffset.add( v );

			};

		}();

		var panUp = function() {

			var v = new THREE.Vector3();

			return function panUp( distance, objectMatrix ) {

				v.setFromMatrixColumn( objectMatrix, 1 ); // get Y column of objectMatrix
				v.multiplyScalar( distance );

				panOffset.add( v );

			};

		}();

		// deltaX and deltaY are in pixels; right and down are positive
		var pan = function() {

			var offset = new THREE.Vector3();

			return function pan ( deltaX, deltaY ) {

				var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

				if ( scope.object instanceof THREE.PerspectiveCamera ) {

					// perspective
					var position = scope.object.position;
					offset.copy( position ).sub( scope.target );
					var targetDistance = offset.length();

					// half of the fov is center to top of screen
					targetDistance *= Math.tan( ( scope.object.fov / 2 ) * Math.PI / 180.0 );

					// we actually don't use screenWidth, since perspective camera is fixed to screen height
					panLeft( 2 * deltaX * targetDistance / element.clientHeight, scope.object.matrix );
					panUp( 2 * deltaY * targetDistance / element.clientHeight, scope.object.matrix );

				} else if ( scope.object instanceof THREE.OrthographicCamera ) {

					// orthographic
					panLeft( deltaX * ( scope.object.right - scope.object.left ) / scope.object.zoom / element.clientWidth, scope.object.matrix );
					panUp( deltaY * ( scope.object.top - scope.object.bottom ) / scope.object.zoom / element.clientHeight, scope.object.matrix );

				} else {

					// camera neither orthographic nor perspective
					console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.' );
					scope.enablePan = false;

				}

			};

		}();

		function dollyIn( dollyScale ) {

			if ( scope.object instanceof THREE.PerspectiveCamera ) {

				scale /= dollyScale;

			} else if ( scope.object instanceof THREE.OrthographicCamera ) {

				scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom * dollyScale ) );
				scope.object.updateProjectionMatrix();
				zoomChanged = true;

			} else {

				console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );
				scope.enableZoom = false;

			}

		}

		function dollyOut( dollyScale ) {

			if ( scope.object instanceof THREE.PerspectiveCamera ) {

				scale *= dollyScale;

			} else if ( scope.object instanceof THREE.OrthographicCamera ) {

				scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom / dollyScale ) );
				scope.object.updateProjectionMatrix();
				zoomChanged = true;

			} else {

				console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );
				scope.enableZoom = false;

			}

		}

		//
		// event callbacks - update the object state
		//

		function handleMouseDownRotate( event ) {

			//console.log( 'handleMouseDownRotate' );

			rotateStart.set( event.clientX, event.clientY );

		}

		function handleMouseDownDolly( event ) {

			//console.log( 'handleMouseDownDolly' );

			dollyStart.set( event.clientX, event.clientY );

		}

		function handleMouseDownPan( event ) {

			//console.log( 'handleMouseDownPan' );

			panStart.set( event.clientX, event.clientY );

		}

		function handleMouseMoveRotate( event ) {

			//console.log( 'handleMouseMoveRotate' );

			rotateEnd.set( event.clientX, event.clientY );
			rotateDelta.subVectors( rotateEnd, rotateStart );

			var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

			// rotating across whole screen goes 360 degrees around
			rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );

			// rotating up and down along whole screen attempts to go 360, but limited to 180
			rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

			rotateStart.copy( rotateEnd );

			scope.update();

		}

		function handleMouseMoveDolly( event ) {

			//console.log( 'handleMouseMoveDolly' );

			dollyEnd.set( event.clientX, event.clientY );

			dollyDelta.subVectors( dollyEnd, dollyStart );

			if ( dollyDelta.y > 0 ) {

				dollyIn( getZoomScale() );

			} else if ( dollyDelta.y < 0 ) {

				dollyOut( getZoomScale() );

			}

			dollyStart.copy( dollyEnd );

			scope.update();

		}

		function handleMouseMovePan( event ) {

			//console.log( 'handleMouseMovePan' );

			panEnd.set( event.clientX, event.clientY );

			panDelta.subVectors( panEnd, panStart );

			pan( panDelta.x, panDelta.y );

			panStart.copy( panEnd );

			scope.update();

		}

		function handleMouseUp( event ) {

			//console.log( 'handleMouseUp' );

		}

		function handleMouseWheel( event ) {

			//console.log( 'handleMouseWheel' );

			if ( event.deltaY < 0 ) {

				dollyOut( getZoomScale() );

			} else if ( event.deltaY > 0 ) {

				dollyIn( getZoomScale() );

			}

			scope.update();

		}

		function handleKeyDown( event ) {

			//console.log( 'handleKeyDown' );

			switch ( event.keyCode ) {

				case scope.keys.UP:
					pan( 0, scope.keyPanSpeed );
					scope.update();
					break;

				case scope.keys.BOTTOM:
					pan( 0, - scope.keyPanSpeed );
					scope.update();
					break;

				case scope.keys.LEFT:
					pan( scope.keyPanSpeed, 0 );
					scope.update();
					break;

				case scope.keys.RIGHT:
					pan( - scope.keyPanSpeed, 0 );
					scope.update();
					break;

			}

		}

		function handleTouchStartRotate( event ) {

			//console.log( 'handleTouchStartRotate' );

			rotateStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

		}

		function handleTouchStartDolly( event ) {

			//console.log( 'handleTouchStartDolly' );

			var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
			var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;

			var distance = Math.sqrt( dx * dx + dy * dy );

			dollyStart.set( 0, distance );

		}

		function handleTouchStartPan( event ) {

			//console.log( 'handleTouchStartPan' );

			panStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

		}

		function handleTouchMoveRotate( event ) {

			//console.log( 'handleTouchMoveRotate' );

			rotateEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
			rotateDelta.subVectors( rotateEnd, rotateStart );

			var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

			// rotating across whole screen goes 360 degrees around
			rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );

			// rotating up and down along whole screen attempts to go 360, but limited to 180
			rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

			rotateStart.copy( rotateEnd );

			scope.update();

		}

		function handleTouchMoveDolly( event ) {

			//console.log( 'handleTouchMoveDolly' );

			var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
			var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;

			var distance = Math.sqrt( dx * dx + dy * dy );

			dollyEnd.set( 0, distance );

			dollyDelta.subVectors( dollyEnd, dollyStart );

			if ( dollyDelta.y > 0 ) {

				dollyOut( getZoomScale() );

			} else if ( dollyDelta.y < 0 ) {

				dollyIn( getZoomScale() );

			}

			dollyStart.copy( dollyEnd );

			scope.update();

		}

		function handleTouchMovePan( event ) {

			//console.log( 'handleTouchMovePan' );

			panEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

			panDelta.subVectors( panEnd, panStart );

			pan( panDelta.x, panDelta.y );

			panStart.copy( panEnd );

			scope.update();

		}

		function handleTouchEnd( event ) {

			//console.log( 'handleTouchEnd' );

		}

		//
		// event handlers - FSM: listen for events and reset state
		//

		function onMouseDown( event ) {

			if ( scope.enabled === false ) return;

			event.preventDefault();

			if ( event.button === scope.mouseButtons.ORBIT ) {

				if ( scope.enableRotate === false ) return;

				handleMouseDownRotate( event );

				state = STATE.ROTATE;

			} else if ( event.button === scope.mouseButtons.ZOOM ) {

				if ( scope.enableZoom === false ) return;

				handleMouseDownDolly( event );

				state = STATE.DOLLY;

			} else if ( event.button === scope.mouseButtons.PAN ) {

				if ( scope.enablePan === false ) return;

				handleMouseDownPan( event );

				state = STATE.PAN;

			}

			if ( state !== STATE.NONE ) {

				document.addEventListener( 'mousemove', onMouseMove, false );
				document.addEventListener( 'mouseup', onMouseUp, false );

				scope.dispatchEvent( startEvent );

			}

		}

		function onMouseMove( event ) {

			if ( scope.enabled === false ) return;

			event.preventDefault();

			if ( state === STATE.ROTATE ) {

				if ( scope.enableRotate === false ) return;

				handleMouseMoveRotate( event );

			} else if ( state === STATE.DOLLY ) {

				if ( scope.enableZoom === false ) return;

				handleMouseMoveDolly( event );

			} else if ( state === STATE.PAN ) {

				if ( scope.enablePan === false ) return;

				handleMouseMovePan( event );

			}

		}

		function onMouseUp( event ) {

			if ( scope.enabled === false ) return;

			handleMouseUp( event );

			document.removeEventListener( 'mousemove', onMouseMove, false );
			document.removeEventListener( 'mouseup', onMouseUp, false );

			scope.dispatchEvent( endEvent );

			state = STATE.NONE;

		}

		function onMouseWheel( event ) {

			if ( scope.enabled === false || scope.enableZoom === false || ( state !== STATE.NONE && state !== STATE.ROTATE ) ) return;

			event.preventDefault();
			event.stopPropagation();

			handleMouseWheel( event );

			scope.dispatchEvent( startEvent ); // not sure why these are here...
			scope.dispatchEvent( endEvent );

		}

		function onKeyDown( event ) {

			if ( scope.enabled === false || scope.enableKeys === false || scope.enablePan === false ) return;

			handleKeyDown( event );

		}

		function onTouchStart( event ) {

			if ( scope.enabled === false ) return;

			switch ( event.touches.length ) {

				case 1:	// one-fingered touch: rotate

					if ( scope.enableRotate === false ) return;

					handleTouchStartRotate( event );

					state = STATE.TOUCH_ROTATE;

					break;

				case 2:	// two-fingered touch: dolly

					if ( scope.enableZoom === false ) return;

					handleTouchStartDolly( event );

					state = STATE.TOUCH_DOLLY;

					break;

				case 3: // three-fingered touch: pan

					if ( scope.enablePan === false ) return;

					handleTouchStartPan( event );

					state = STATE.TOUCH_PAN;

					break;

				default:

					state = STATE.NONE;

			}

			if ( state !== STATE.NONE ) {

				scope.dispatchEvent( startEvent );

			}

		}

		function onTouchMove( event ) {

			if ( scope.enabled === false ) return;

			event.preventDefault();
			event.stopPropagation();

			switch ( event.touches.length ) {

				case 1: // one-fingered touch: rotate

					if ( scope.enableRotate === false ) return;
					if ( state !== STATE.TOUCH_ROTATE ) return; // is this needed?...

					handleTouchMoveRotate( event );

					break;

				case 2: // two-fingered touch: dolly

					if ( scope.enableZoom === false ) return;
					if ( state !== STATE.TOUCH_DOLLY ) return; // is this needed?...

					handleTouchMoveDolly( event );

					break;

				case 3: // three-fingered touch: pan

					if ( scope.enablePan === false ) return;
					if ( state !== STATE.TOUCH_PAN ) return; // is this needed?...

					handleTouchMovePan( event );

					break;

				default:

					state = STATE.NONE;

			}

		}

		function onTouchEnd( event ) {

			if ( scope.enabled === false ) return;

			handleTouchEnd( event );

			scope.dispatchEvent( endEvent );

			state = STATE.NONE;

		}

		function onContextMenu( event ) {

			event.preventDefault();

		}

		//

		scope.domElement.addEventListener( 'contextmenu', onContextMenu, false );

		scope.domElement.addEventListener( 'mousedown', onMouseDown, false );
		scope.domElement.addEventListener( 'wheel', onMouseWheel, false );

		scope.domElement.addEventListener( 'touchstart', onTouchStart, false );
		scope.domElement.addEventListener( 'touchend', onTouchEnd, false );
		scope.domElement.addEventListener( 'touchmove', onTouchMove, false );

		window.addEventListener( 'keydown', onKeyDown, false );

		// force an update at start

		this.update();

	};

	OrbitControls.prototype = Object.create( THREE.EventDispatcher.prototype );
	OrbitControls.prototype.constructor = OrbitControls;

	Object.defineProperties( OrbitControls.prototype, {

		center: {

			get: function () {

				console.warn( 'THREE.OrbitControls: .center has been renamed to .target' );
				return this.target;

			}

		},

		// backward compatibility

		noZoom: {

			get: function () {

				console.warn( 'THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.' );
				return ! this.enableZoom;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.' );
				this.enableZoom = ! value;

			}

		},

		noRotate: {

			get: function () {

				console.warn( 'THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.' );
				return ! this.enableRotate;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.' );
				this.enableRotate = ! value;

			}

		},

		noPan: {

			get: function () {

				console.warn( 'THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.' );
				return ! this.enablePan;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.' );
				this.enablePan = ! value;

			}

		},

		noKeys: {

			get: function () {

				console.warn( 'THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.' );
				return ! this.enableKeys;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.' );
				this.enableKeys = ! value;

			}

		},

		staticMoving : {

			get: function () {

				console.warn( 'THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.' );
				return ! this.enableDamping;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.' );
				this.enableDamping = ! value;

			}

		},

		dynamicDampingFactor : {

			get: function () {

				console.warn( 'THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.' );
				return this.dampingFactor;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.' );
				this.dampingFactor = value;

			}

		}

	} );

	return OrbitControls;
};

},{}],2:[function(require,module,exports){
// OrbitControls can only be used if bundled version of this file was made with `browserify`
var OrbitControls = require('three-orbit-controls')(THREE); // allows to control camera position

// general
var camera, scene, renderer;
var cameraControls, effectController;
var clock = new THREE.Clock();

// snail geometry
var numTurns = 5.;            // number of spiral turns of the shell
var numRingsPer2Pi = 16;      // shell 'resolution' in longitudinal direction
var numPointsPerRing = 16;    // shell 'resolution' in tangential direction
var rad0 = 1.0;               // radius of the first shell ring
var radDecayPer2Pi = 0.3;     // ... each ring at level i is 0.3 times smaller than corresponding rings at level i-1

// snail texture
var textureName;              // current texture name
var textureLongRepeats = 4.7; // # texture repeats in longitudinal direction per level (2pi)
var textureTangRepeats = 2;   // # texture repeats in tangential direction
var textureTangOffset = 0.;   // texture offset in tangential direction
var texture;       // current texture; assigend in `init()`, updated in `render()`
var textures = []; // array of preloaded textures; assigned in `init()`

// dynamic pattern
var prey = 2; // color channels
var pred = 1;
var dumm = 0;

var dynamic = "no";
var p = [];
p.f = 0.0140;
p.k = 0.0450;
p.D = new Array(3);
p.D[prey] = 1.0;
p.D[pred] = 0.5;
p.D[dumm] = 2.0;
p.delta = 2.5;
p.height = 128;
p.width = 128;
var timer = 0.0;
var x;

// ----------------------------------------------------------------------------------------

function initTextureArray(x, p) {
    x = new Array(p.height * p.width * 3);
    for (var i = 0; i < p.height * p.width; i++) {
        var stride = i * 3;

        x[stride + prey] = 1.; // prey is everywhere
        x[stride + pred] = 0.; // predators are not there yet
        x[stride + dumm] = 0.5; // dummy can be anything...

        // roll again for predator
        var roll = Math.random();
        if ( roll < 1/1000 ) {
            x[stride + pred] = 1.; // predator are assigned to some texels
        }
    }
    return x;
}

function eulerForwardStep(dxdt, x, deltaT, p) {
    var k1 = dxdt(x, p);
    for (var i = 0; i < p.height*p.width*3; i++) {
        x[i] += k1[i] * deltaT;
    }
    return x;
}

function rungeKutta2Step(dxdt, x, deltaT, p) {
    var k1 = dxdt(x,   p);

    var xk1 = new Array(p.width * p.height * 3);
    for (var i = 0; i < p.height*p.width*3; i++) {
        xk1[i] = x[i] + 0.5 * k1[i] * deltaT;
    }
    var k2 = dxdt(xk1, p);

    for (var i = 0; i < p.height*p.width*3; i++) {
        x[i] += k2[i] * deltaT;
    }
    
    return x;
}

function rungeKutta4Step(dxdt, x, deltaT, p) {
    var k1 = dxdt(x, p);

    var xk1 = new Array(p.width * p.height * 3);
    for (var i = 0; i < p.width * p.height * 3; i++) {
        xk1[i] = x[i] + 0.5 * deltaT * k1[i];
    }

    var k2 = dxdt(xk1, p);

    var xk2 = new Array(p.width * p.height * 3);
    for (var i = 0; i < p.width * p.height * 3; i++) {
        xk2[i] = x[i] + 0.5 * deltaT * k2[i];
    }

    var k3 = dxdt(xk2, p);

    var xk3 = new Array(p.width * p.height * 3);
    for (var i = 0; i < p.width * p.height * 3; i++) {
        xk3[i] = x[i] + deltaT * k3[i];
    }

    var k4 = dxdt(xk3, p);

    for (var i = 0; i < p.width * p.height * 3; i++) {
        x[i] += 1./6. * (k1[i] + 2.*k2[i] + 2.*k3[i] + k4[i]);
    }

    return x;
}

function setDiffusionTerm(diffusion, x, p) {
    // diffusion:
    // convolve each channel with the kernel while ignoring the edges (no flux over the edges)
    // kernel = [[0.05, 0.20, 0.05],
    //           [0.20,-1.00, 0.20],
    //           [0.05, 0.20, 0.05]] 
    for (var j = 0; j < p.width * p.height; j++) {
        var stride = j * 3;           

        for (var i = 0; i < 3; i++) {
            diffusion[stride + i] = 0.0;
            if (stride >= p.width*3) {
                diffusion[stride + i] += p.D[i]/p.delta/p.delta * 0.2 * x[stride + i - p.width*3]; // from top
                diffusion[stride + i] -= p.D[i]/p.delta/p.delta * 0.2 * x[stride + i]; // to top                
            } 
            if (stride < (x.length - p.width*3)) {
                diffusion[stride + i] += p.D[i]/p.delta/p.delta * 0.2 * x[stride + i + p.width*3]; // from bottom
                diffusion[stride + i] -= p.D[i]/p.delta/p.delta * 0.2 * x[stride + i]; // to bottom
            } 
            if ((stride % p.width*3) != 0) {
                diffusion[stride + i] += p.D[i]/p.delta/p.delta * 0.2 * x[stride + i - 3]; // from left
                diffusion[stride + i] -= p.D[i]/p.delta/p.delta * 0.2 * x[stride + i]; // to left
            } 
            if (((stride + 3) % p.width*3) != 0) {
                diffusion[stride + i] += p.D[i]/p.delta/p.delta * 0.2 * x[stride + i + 3]; // from right
                diffusion[stride + i] -= p.D[i]/p.delta/p.delta * 0.2 * x[stride + i]; // to right
            } 

            if ((stride >= p.width*3) && ((stride % p.width*3) != 0)) {
                diffusion[stride + i] += p.D[i]/p.delta/p.delta * 0.05 * x[stride + i - p.width*3 - 3]; // from top-left
                diffusion[stride + i] -= p.D[i]/p.delta/p.delta * 0.05 * x[stride + i]; // to top-left
            } 
            if ((stride >= p.width*3) && (((stride + 3) % p.width*3) != 0)) {
                diffusion[stride + i] += p.D[i]/p.delta/p.delta * 0.05 * x[stride + i - p.width*3 + 3]; // from top-right
                diffusion[stride + i] -= p.D[i]/p.delta/p.delta * 0.05 * x[stride + i]; // to top-right
            } 
            if ((stride < (x.length - p.width*3)) && ((stride % p.width*3) != 0)) {
                diffusion[stride + i] += p.D[i]/p.delta/p.delta * 0.05 * x[stride + i + p.width*3 - 3]; // from bottom-left
                diffusion[stride + i] -= p.D[i]/p.delta/p.delta * 0.05 * x[stride + i]; // to bottom-left
            } 
            if ((stride < (x.length - p.width*3)) && (((stride + 3) % p.width*3) != 0)) {
                diffusion[stride + i] += p.D[i]/p.delta/p.delta * 0.05 * x[stride + i + p.width*3 + 3]; // from bottom-right
                diffusion[stride + i] -= p.D[i]/p.delta/p.delta * 0.05 * x[stride + i]; // to bottom-right
            } 
        }                  
    }      
}

function setGrayScottReactionTerm(reaction, x, p) {
    for (var i = 0; i < p.height * p.width; i++) {
        var stride = i * 3;

        var a = x[stride + prey];
        var b = x[stride + pred];

        reaction[stride + prey] = -a * b * b + p.f * (1 - a);    // prey
        reaction[stride + pred] =  a * b * b - (p.k + p.f) * b;  // predator
        reaction[stride + dumm] =  0.7*reaction[stride + prey];  // dummy channel
    }
}

function dxdtGrayScott(x, p) {
    var total     = new Array(p.height * p.width * 3);
    var diffusion = new Array(p.height * p.width * 3);
    var reaction  = new Array(p.height * p.width * 3);

    setDiffusionTerm(diffusion, x, p);
    setGrayScottReactionTerm(reaction, x, p);

    for (var i = 0; i < p.height*p.width*3; i++) {
        total[i] = diffusion[i] + reaction[i];
    }
    return total;
}

function array2texture(x, p, steepness, midpoint) {

    var data = new Uint8Array( p.height * p.width * 3 );
    for (var i = 0; i < p.width * p.height * 3; i++) {
        data[i] = Math.floor( 255. / (1 + Math.exp(-steepness * (x[i] - midpoint))) );
    }

    return new THREE.DataTexture( data, p.width, p.height, THREE.RGBFormat );
}



// ----------------------------------------------------------------------------------------

function rotationMatrixAroundY(angle) {
    var mtx = new THREE.Matrix3();
    mtx.set(Math.cos(angle), 0., Math.cos(Math.PI/2 + angle),			
            0.,              1., 0.,
            Math.sin(angle), 0., Math.sin(Math.PI/2 + angle));
    return mtx;
}

function setSnailShellVertices(geometry, numTurns, numRingsPer2Pi, numPointsPerRing, 
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
            vertex.applyMatrix3( rotationMatrixAroundY(angle) );
            vertex.addVectors(vertex, center);

            geometry.vertices.push(vertex);
        }
    }
}

function setSnailShellFaces(geometry, numTurns, numRingsPer2Pi, numPointsPerRing, 
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
}

function setTexture(geometry, numTurns, numRingsPer2Pi, numPointsPerRing, 
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

function makeSnailShell(numTurns, numRingsPer2Pi, numPointsPerRing, 
                        rad0, radDecayPer2Pi, 
                        texture, textureLongRepeats, textureTangRepeats) {	
    // assign undefined params
    numTurns = (numTurns === undefined) ? 5 : numTurns;
    numRingsPer2Pi = (numRingsPer2Pi === undefined) ? 16 : numRingsPer2Pi;
    numPointsPerRing = (numPointsPerRing === undefined) ? 16 : numPointsPerRing;
    rad0 = (rad0 === undefined) ? 1. : rad0;
    radDecayPer2Pi = (radDecayPer2Pi === undefined) ? 0.3 : radDecayPer2Pi;
	
    // build snail shell geometry: calculate coordinates of vertices, assign faces and textures
    var geometry = new THREE.Geometry();
    setSnailShellVertices(geometry, numTurns, numRingsPer2Pi, numPointsPerRing, rad0, radDecayPer2Pi);
    setSnailShellFaces(geometry, numTurns, numRingsPer2Pi, numPointsPerRing, rad0, radDecayPer2Pi);
    setTexture(geometry, numTurns, numRingsPer2Pi, numPointsPerRing, rad0, radDecayPer2Pi, texture, textureLongRepeats, textureTangRepeats);
	
    // calculate normals for proper lighting
    geometry.computeVertexNormals();
    geometry.computeFaceNormals();
	
    // assemble snail shell from geometry and material 
    var material = new THREE.MeshPhongMaterial({map: texture, side: THREE.DoubleSide});
    var snail = new THREE.Mesh(geometry, material);
    return snail;
}

// ----------------------------------------------------------------------------------------
function addAxes(scale) {
    scale = (scale === undefined) ? 100:scale;
    var axGeometry = new THREE.CylinderGeometry(scale*0.001,scale*0.001,scale*1,32);
    var xMat = new THREE.MeshPhongMaterial( {color: 0xFF0000} );
    var xAx = new THREE.Mesh(axGeometry, xMat);
    xAx.rotation.z = Math.PI / 2;
    scene.add(xAx);
    var zMat = new THREE.MeshPhongMaterial( {color: 0x00FF00} );
    var zAx = new THREE.Mesh(axGeometry, zMat);
    zAx.rotation.x = Math.PI / 2;
    scene.add(zAx);
    var yMat = new THREE.MeshPhongMaterial( {color: 0x0000FF} );
    var yAx = new THREE.Mesh(axGeometry, yMat);
    scene.add(yAx);
}

function fillScene() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog( 0x808080, 2000, 4000 );

    // LIGHTS
    var ambientLight = new THREE.AmbientLight( 0x222222 );

    var light1 = new THREE.DirectionalLight( 0xffffff, 1.0 );
    light1.position.set( 200, 400, 500 );
	
    var light2 = new THREE.DirectionalLight( 0xffffff, 1.0 );
    light2.position.set( -500, 250, -200 );

    scene.add(ambientLight);
    scene.add(light1);
    scene.add(light2);	

    // SNAIL SHELL
    var snail = makeSnailShell( numTurns, numRingsPer2Pi, numPointsPerRing, 
                                rad0, radDecayPer2Pi, 
                                texture, textureLongRepeats, textureTangRepeats);
    snail.castShadow = true;
    snail.receiveShadow = true;
    scene.add(snail);
	
}

function init() {
    var canvasWidth = window.innerWidth;
    var canvasHeight = window.innerHeight;
    var canvasRatio = canvasWidth / canvasHeight;

    // RENDERER
    renderer = new THREE.WebGLRenderer( { antialias: false } );
    renderer.setSize(canvasWidth, canvasHeight);
    renderer.setClearColorHex;

    // CAMERA
    camera = new THREE.PerspectiveCamera( 40, canvasRatio, 1, 10000 );
    camera.position.set( 8, 5, -3 );
	
    // CONTROLS
    cameraControls = new OrbitControls(camera, renderer.domElement);
    cameraControls.target.set(0,2,0);

    // TEXTURES
    textures.angelfish0        = new THREE.TextureLoader().load("imgs/angelfish0.png");
    textures.angelfish1        = new THREE.TextureLoader().load("imgs/angelfish1.png");
    textures.gierermeinhardt0  = new THREE.TextureLoader().load("imgs/gierermeinhardt0.png");
    textures.gierermeinhardt1  = new THREE.TextureLoader().load("imgs/gierermeinhardt1.png");
    textures.grayscottcorals0  = new THREE.TextureLoader().load("imgs/grayscott-corals0.png");
    textures.grayscottcorals1  = new THREE.TextureLoader().load("imgs/grayscott-corals1.png");
    textures.grayscottspirals0 = new THREE.TextureLoader().load("imgs/grayscott-spirals0.png");
    textures.grayscottspirals1 = new THREE.TextureLoader().load("imgs/grayscott-spirals1.png");
    textures.predprey0         = new THREE.TextureLoader().load("imgs/predprey0.png");
    textures.predprey1         = new THREE.TextureLoader().load("imgs/predprey1.png");
    textures.dynamic           = new THREE.DataTexture( initTextureArray(x, p), p.width, p.height, THREE.RGBAFormat );

    textureName = "angelfish0";
    texture = textures[textureName]; // init

}

function addToDOM() {
    var container = document.getElementById('container');
    var canvas = container.getElementsByTagName('canvas');
    if (canvas.length>0) {
        container.removeChild(canvas[0]);
    }
    container.appendChild( renderer.domElement );
}

function animate() {
    window.requestAnimationFrame(animate);
    render();
}

function render() {
    var delta = clock.getDelta();
    cameraControls.update(delta);
    timer += clock.getDelta();
	
    // update controls only if toggled
    if (radDecayPer2Pi !== effectController.raddecay ||
        numTurns !== effectController.turns ||
        textureName !== effectController.texname ||
        textureTangRepeats !== effectController.textangrepeats ||
        textureTangOffset !== effectController.textangoffset ||
        textureLongRepeats !== effectController.texlongrepeats) {
        // update geometry
        radDecayPer2Pi = effectController.raddecay;
        numTurns = effectController.turns;
		
        // update static texture        
        textureName = effectController.texname;	
        if (effectController.texname !== "dynamic") {            	
            texture = textures[textureName];
        } 

        // update num of texture repeats, offset        
        textureTangOffset = effectController.textangoffset;
        textureTangRepeats = effectController.textangrepeats;
        textureLongRepeats = effectController.texlongrepeats;

        // reset the scene
        fillScene(); // lights and shell and added here
        addAxes(25);
    }	

    if (effectController.texname === "dynamic" &&  dynamic === "no") {        
        dynamic = "yes";          
        x = initTextureArray(x, p);
    }
    
    if (effectController.texname === "dynamic" && timer > 1/60/30) {
        timer = 0.0; // reset timer
        
        // update array/texture
        x = rungeKutta4Step(dxdtGrayScott, x, 2.0, p); 
        texture = array2texture(x, p, 10., 0.6);

        // reset the scene
        fillScene(); // lights and shell and added here
        addAxes(25);
    }

    renderer.render(scene, camera);
}



function setupGui() {

    effectController = {
        raddecay: 0.3,
        turns: 5,

        texlongrepeats: 4.7,
        textangrepeats: 2,
        textangoffset: 0.,
        texname: "angelfish0"
    };

    var gui = new dat.GUI();
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
}

// ----------------------------------------------------------------------------------------
// run all
setupGui();  // adds control menu 
init();      // sets up camera, controls and renderer, as well as preloads all textures
fillScene(); // lights and shell are added here
addAxes(25); // adds xyz axes
addToDOM();  // adds rendered scene back to html
animate();   // updates frames when camera changes position or controls are toggled

},{"three-orbit-controls":1}]},{},[2]);
