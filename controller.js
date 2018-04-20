var canvas; 			// <canvas> HTML tag
var c;					// Canvas rendering context
var container;			// <div> HTML tag
var mouseX, mouseY;
var mouseDown = false;
var circX, circY; 		// Where the circle will be drawn for the analog stick
var baseX, baseY; 		// Where the base of the analog stick will be drawn
var touchable = 'createTouch' in document;
var touch;
var touching = false;
var width = window.innerWidth;
var height = window.innerHeight;
var halfX = (width/2);
var stickRadius = 80;	// The max distance of the stick from the base
var circleRadius = 65;	// The radius of the stick circles

// Initial the canvas
setupCanvas();

// Set up event listeners depending on platform
if(touchable) {
	canvas.addEventListener( 'touchstart', onTouchStart, false );
	canvas.addEventListener( 'touchmove', onTouchMove, false );
	canvas.addEventListener( 'touchend', onTouchEnd, false );
	window.onorientationchange = resetCanvas;

} else {
	canvas.addEventListener( 'mousemove', onMouseMove, false );
    canvas.addEventListener('mousedown', onMouseDown, false);
    canvas.addEventListener('mouseup', onMouseUp, false);
}// if...else
window.onresize = resetCanvas;

// Call the draw method every 20 milliseconds
setInterval(draw, 20);

function setupCanvas() {
	// Create a <canvas> HTML tag
    canvas = document.createElement( 'canvas' );
	canvas.width = window.innerWidth;				
	canvas.height = window.innerHeight;
	
	// Get a CanvasRenderingContext2D on the canvas
	c = canvas.getContext( '2d' );
	//c.strokeStyle = "#ffffff";
	//c.lineWidth = 2;
	
	// Create a <div> HTML tag called container
	container = document.createElement( 'div' );
	container.className = "container";
	
	// Put the canvas in the container
	container.appendChild(canvas);
	// Put the container on the page
	document.body.appendChild( container );
}//setupCanvas

function resetCanvas (e) {
 	// Resize the canvas - but remember - this clears the canvas too
  	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	
	// Scroll to the top left.
	window.scrollTo(0,0);
}

function init() {
	//PETER WUZ HERE
}//init

function draw() {
	// Erase the entire canvas
    c.clearRect(0, 0, canvas.width, canvas.height);
	c.lineWidth = "10";
	// If touching the left half of the window
    if ((touching && touch.clientX < halfX) || (mouseDown && baseX < halfX)) {
		// Get the digital coordinates
        var digDirection = getDigDirection();
        var digx = digDirection.xdig;
        var digy = digDirection.ydig;
		// Get the analogue coordinates
        var anlDirection = getDirection();
        var anlx = anlDirection.xdir;
        var anly = anlDirection.ydir;
		
		// Display the digital and analogue coords
        c.fillText('digx: '+digx, 10, 20);
        c.fillText('digy: '+digy, 10, 40);
        c.fillText('anlx: '+anlx, 10, 60);
        c.fillText('anly: '+anly, 10, 80);

		// Set the circle radius
		// TODO: make this always be 65 when it's only used on mobile
		if (touching) circleRadius = 65;
		else circleRadius = 50;
		
		// Draw the red circle (base)
        c.beginPath();
        c.strokeStyle = "rgba(255, 0, 0, 0.5)";
        c.arc(baseX, baseY, circleRadius, 0, Math.PI*2, true);
        c.stroke();

		// Draw the green circle (stick)
		c.beginPath();
		c.strokeStyle = "rgba(0, 255, 0, 0.5)";
		c.arc(circX, circY, circleRadius, 0, Math.PI*2, true);
		c.stroke();
		
		
		//playerYSpeed -= anly*2;
		//playerXSpeed += anlx;
    }//if
	
}//draw

function onTouchStart(e) {
	touch = e.touches[0];
    baseX = touch.clientX;
    baseY = touch.clientY;
    touching = true;
}//onTouchStart

function onTouchMove(e) {
	e.preventDefault();
    touch = e.touches[0];
    touchX = touch.clientX;
    touchY = touch.clientY;
	var dist = Math.sqrt(Math.pow(baseY-touchY, 2) + Math.pow(baseX-touchX, 2));
	if (touching) {
		// Inside the max radius
		if (dist < stickRadius || dist < -stickRadius) {
			circY=touchY;
			circX=touchX;
		// Outside the max radius
		} else {
			// SOHCAHTOA TIME BITCHES
			var angle = Math.atan((touchY-baseY)/(touchX-baseX));
			var opposite = stickRadius * Math.sin(angle);
			var adjacent = stickRadius * Math.cos(angle);

			if (touchX > baseX) {
				circX=baseX+adjacent;
				circY=baseY+opposite;
			} else {
				circX=baseX-adjacent;
				circY=baseY-opposite;
			}
			// Triangles, how do they work?
		}
	}
}//onTouchMove

function onTouchEnd(e) {
   	touching = false;
}//onTouchEnd

function onMouseMove(event) {
	mouseX = event.offsetX;
	mouseY = event.offsetY;

	var dist = Math.sqrt(Math.pow(baseY-mouseY, 2) + Math.pow(baseX-mouseX, 2));
	if (mouseDown) {
		if (dist < stickRadius || dist < -stickRadius) { // in the circle
			circY=mouseY;
			circX=mouseX;
		} else { // outside the circle
			// SOHCAHTOA TIME BITCHES
			var angle = Math.atan((mouseY-baseY)/(mouseX-baseX));
			var opposite = stickRadius * Math.sin(angle);
			var adjacent = stickRadius * Math.cos(angle);

			if (mouseX >= baseX) {
				circX=baseX+adjacent;
				circY=baseY+opposite;
			} else {
				circX=baseX-adjacent;
				circY=baseY-opposite;
			}
		}
	}
}//onMouseMove

function onMouseUp(e){
    mouseDown = false;
}//onMouseUp

function onMouseDown(e){
    circX = mouseX;
    circY = mouseY;
    baseX = mouseX;
    baseY = mouseY;
    mouseDown = true;
}//onMouseDown

// Returns an object with xdir and ydir that has the direction between
// -1 and 1 in each position
function getDirection(){
    var x = baseX-circX;
    var y = baseY-circY;

    var sin = (y/Math.sqrt((x*x)+(y*y)));
    var cos = -1*(x/Math.sqrt((x*x)+(y*y)));

    var xdir = (Math.abs(x)/stickRadius)*cos;
	if (isNaN(xdir)) xdir = 0;
    var ydir = (Math.abs(y)/stickRadius)*sin;
	if (isNaN(ydir)) ydir = 0;

    var analogDir = {'xdir': xdir, 'ydir': ydir};
    return analogDir;
}//getDirection

// Returns an object with xdir and ydir that has either -1, 1, or 0 for
// each value
function getDigDirection(){
    var x = baseX-circX;
    var y = baseY-circY;

    var sin = (y/Math.sqrt((x*x)+(y*y)));
    var cos = -1*(x/Math.sqrt((x*x)+(y*y)));

    var xdir = (Math.abs(x)/stickRadius)*cos;
    var ydir = (Math.abs(y)/stickRadius)*sin;

    var xdig = 0;
    var ydig = 0;

    if(xdir<0.5 && xdir>(-0.5)){
        xdig = 0;
    } else if(xdir<=0.5){
        xdig = -1;
    } else {
        xdig = 1;
    }//xdig if else

    if(ydir>=0.2){
        ydig = 1;
    } else if(ydir<=(-0.2)){
        ydig = -1;
    } else {
        ydig = 0;
    }//if else for ydig

    var digital = {'xdig': xdig, 'ydig': ydig};

    return digital;
}//getDigDirection