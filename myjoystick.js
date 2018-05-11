

var canvasL, canvasR;
var c, r;
var containerL;
var mouseX, mouseY;
var mouseDown = false;
var circX, circY; //where the circle will be drawn for the analog stick
var baseX, baseY; //where the base of the analog stick will be drawn
var touchable = 'createTouch' in document;
var joystickTouch;
var leftTouching = false;
var rightTouching = false;
var halfX = (window.innerWidth/2);
var rad = 40;
var updateTime = Date.now();

//Right canvas stuff
var rightTouch;
var rightStartX;
var rightStartY;
var rigthEndX;
var rightEndY;
var rightTouching;
var rightEvent;
var rightTap;
var rightHammer;
var rightColor = "rgba(255, 0, 0, 1)";

var tap = false;
var doubleTap = false;
var swipe = false;

function myjoystick(tapFunction, doubleTapFunction, swipeRFunction, swipeLFunction, swipeUFunction, swipeDFunction, startTouch, moveTouch, endTouchR, endTouchL, press, pressUp)
{
	this.getAnDirection = getAnDirection;
    this.getDigDirection = getDigDirection;
      setupCanvasL();
      setupCanvasR();
      rightHammer = new Hammer(canvasR);

	      rightHammer.add(new Hammer.Press({
        event: 'press',
        pointer: 2,
        threshold: 20,
        time: 68,
    }));

      setInterval(drawL, 1000/35); //calls draw function 1000/35 times per second continuously
      setInterval(drawR, 1000/35);
      if(touchable) {     //checks if the screen is a touch screem
          // Joystick canvas
          canvasL.addEventListener( 'touchstart', function(e){
              joystickTouch = e.targetTouches[0];
              baseX = joystickTouch.clientX;
              baseY = joystickTouch.clientY;
              circX = baseX;
              circY = baseY;
              leftTouching = true;
              startTouch();
          }, false );
          canvasL.addEventListener( 'touchmove', function(e){
              e.preventDefault();

              touch = e.targetTouches[0];
              touchX = touch.clientX;
              touchY = touch.clientY;
              var dist = Math.sqrt(Math.pow(baseY-touchY, 2) + Math.pow(baseX-touchX, 2));
              if (leftTouching) {
                if (dist < rad || dist < -rad) { // in the circle
                  circY=touchY;
                  circX=touchX;
                } else { // outside the circle
                  // SOHCAHTOA TIME BITCHES
                  var angle = Math.atan((touchY-baseY)/(touchX-baseX));
                  var opposite = rad * Math.sin(angle);
                  var adjacent = rad * Math.cos(angle);

                  if (touchX > baseX) {
                    circX=baseX+adjacent;
                    circY=baseY+opposite;
                  } else {
                    circX=baseX-adjacent;
                    circY=baseY-opposite;
                  }
                }
              }

                  moveTouch();
          }, false );
          canvasL.addEventListener( 'touchend', function(e){
              leftTouching = false;
              endTouchL();
          }, false );
		  canvasR.addEventListener( 'touchend', function(e){
              rightTouching = false;
              endTouchR();
          }, false );

          rightHammer.on('tap', tapFunction);
          rightHammer.on('doubletap', doubleTapFunction);

          rightHammer.get('swipe').set({direction: Hammer.DIRECTION_ALL});
          rightHammer.on('swiperight', swipeRFunction);
          rightHammer.on('swipeleft', swipeLFunction);
          rightHammer.on('swipeup', swipeUFunction);
          rightHammer.on('swipedown', swipeDFunction);
          rightHammer.on('press', press);
          rightHammer.on('pressUp', pressUp);

          window.onorientationchange = resetCanvas;
          window.onresize = resetCanvas;
      } else {        //if it's a mouse. Used for debug
        canvasL.addEventListener( 'mousemove', onMouseMove, false );
        canvasL.addEventListener( 'mousedown', onMouseDown, false );
        canvasL.addEventListener( 'mouseup', onMouseUp, false );
        window.onresize = resetCanvas;
      }// if...else
}//myjoystick

function setupCanvasL(){
  canvasL = document.createElement( 'canvas' );
  c = canvasL.getContext( '2d' );
  containerL = document.createElement( 'div' );
  containerL.className = "containerL";

  canvasL.width = window.innerWidth;
  canvasL.height = window.innerHeight*2;
  document.body.appendChild( containerL );
  containerL.appendChild(canvasL);

  c.strokeStyle = "#ffffff";
  c.lineWidth = 2;
}//setupCanvas by writing all the html on page load     //Canvas setup for joystick

function setupCanvasR(){
  canvasR = document.createElement( 'canvas' );
  r = canvasR.getContext( '2d' );
  containerR = document.createElement( 'div' );
  containerR.className = "containerR";

  canvasR.width = window.innerWidth;
  canvasR.height = window.innerHeight*2;
  document.body.appendChild( containerR );
  containerR.appendChild(canvasR);

  r.strokeStyle = "#ffffff";
  r.lineWidth = 2;
}//setupCanvas by writing all the html on page load     //Canvas for buttons

function resetCanvas (e) {
  // resize the canvas - but remember - this clears the canvas too.
  canvasL.width = window.innerWidth;
  canvasL.height = window.innerHeight*2;
  //make sure we scroll to the top left.
  window.scrollTo(0,0);
}

function init(){

}//init

function drawR(){
    r.beginPath();
    r.strokeStyle = rightColor;//red base
    r.lineWidth = "10";
    r.arc(300, 300, 65, 0, Math.PI*2, true);
    //r.stroke();
}       //This will be the button side

function drawL(){
  c.clearRect(0, 0, canvasL.width, canvasL.height*2);
  if(leftTouching && touch.clientX<halfX){
        drawJoystick();
  } else{

    if(mouseDown && baseX<halfX){
         drawJoystick();
    }//if
  }//if else
}//draw

function drawJoystick(){
    var digDirection = getDigDirection();
    var digx = digDirection.digX;
    var digy = digDirection.digY;

    var anlDirection = getAnDirection();
    var anlx = anlDirection.anlgX;
    var anly = anlDirection.anlgY;

    c.beginPath();
    c.strokeStyle = "rgba(255, 0, 0, 0.5)";//red base
    c.lineWidth = "10";
    c.arc(baseX*2, baseY*2, 65, 0, Math.PI*2, true);
    c.stroke();

    c.beginPath();
    c.strokeStyle = "rgba(0, 255, 0, 0.5)";//green stick
    c.lineWidth = "10";
    c.arc(circX*2, circY*2, 65, 0, Math.PI*2, true);
    c.stroke();


    c.fillStyle = "rgba(255, 255, 0, 1)";// gold on black
    c.fillText('digx: '+digx, 10, 20);

    c.fillStyle = "rgba(255, 255, 0, 1)";// gold on black
    c.fillText('digy: '+digy, 10, 40);

    c.fillStyle = "rgba(255, 255, 0, 1)";// gold on black
    c.fillText('anlx: '+anlx, 10, 60);

    c.fillStyle = "rgba(255, 255, 0, 1)";// gold on black
    c.fillText('anly: '+anly, 10, 80);
}//drawJoystick

function onTouchStartRight(e){
    rightTouch = e.targetTouches[0];
    rightStartX = rightTouch.clientX;
    rightStartY = rightTouch.clientY;
    rightEndX = rightStartX;
    rightEndY = rightStartY;
    rightEvent = e;
    rightTouching = true;
}//onTouchStartRight

function onTouchEndRight(e){
    rightTouching = false;
}//onTouchEndRight

function onTouchStartLeft(e) {
  joystickTouch = e.targetTouches[0];
  baseX = joystickTouch.clientX;
  baseY = joystickTouch.clientY;
  circX = baseX;
  circY = baseY;
  leftTouching = true;
}//onTouchStart

function onTouchMoveLeft(e) {
  e.preventDefault();
  touch = e.touches[0];
  touchX = touch.clientX;
  touchY = touch.clientY;
  var dist = Math.sqrt(Math.pow(baseY-touchY, 2) + Math.pow(baseX-touchX, 2));
  if (leftTouching) {
    if (dist < rad || dist < -rad) { // in the circle
      circY=touchY;
      circX=touchX;
    } else { // outside the circle
      // SOHCAHTOA TIME BITCHES
      var angle = Math.atan((touchY-baseY)/(touchX-baseX));
      var opposite = rad * Math.sin(angle);
      var adjacent = rad * Math.cos(angle);

      if (touchX > baseX) {
        circX=baseX+adjacent;
        circY=baseY+opposite;
      } else {
        circX=baseX-adjacent;
        circY=baseY-opposite;
      }
    }
  }
}//onTouchMove

function onTouchEndLeft(e) {
  leftTouching = false;
}//onTouchEnd

function onMouseMove(event) {
  mouseX = event.offsetX;
  mouseY = event.offsetY;

  var dist = Math.sqrt(Math.pow(baseY-mouseY, 2) + Math.pow(baseX-mouseX, 2));
  if (mouseDown) {
    if (dist < rad || dist < -rad) { // in the circle
      circY=mouseY;
      circX=mouseX;
    } else { // outside the circle
      // SOHCAHTOA TIME BITCHES
      var angle = Math.atan((mouseY-baseY)/(mouseX-baseX));
      var opposite = rad * Math.sin(angle);
      var adjacent = rad * Math.cos(angle);

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

// Returns json object with 'single' and 'double' only one will be true
function getTapType(){

}//getTap

// Returns an object with xdir and ydir that has the direction between
// -1 and 1 in each position
function getAnDirection(){
      var x = baseX-circX;
      var y = baseY-circY;

      var sin = (y/Math.sqrt((x*x)+(y*y)));
      var cos = -1*(x/Math.sqrt((x*x)+(y*y)));

      var xdir = (Math.abs(x)/rad)*cos;
      var ydir = (Math.abs(y)/rad)*sin;

      if(isNaN(xdir)||!(leftTouching||mouseDown)){
          xdir = 0;
      }//if checking if NaN

      if(isNaN(ydir)||!(leftTouching||mouseDown)){
          ydir = 0;
      }//if checking if NaN

      var analogDir = {'anlgX': xdir, 'anlgY': ydir, 'touching': true};
      return analogDir;
}//getDirection

// Returns an object with xdir and ydir that has either -1, 1, or 0 for
// each value
function getDigDirection(){
  var x = baseX-circX;
  var y = baseY-circY;

  var sin = (y/Math.sqrt((x*x)+(y*y)));
  var cos = -1*(x/Math.sqrt((x*x)+(y*y)));

  var xdir = (Math.abs(x)/rad)*cos;
  var ydir = (Math.abs(y)/rad)*sin;

  var xdig = 0;
  var ydig = 0;

  if((xdir<0.5 && xdir>(-0.5)) || isNaN(xdir)||!(leftTouching||mouseDown)){
    xdig = 0;
} else if(xdir<=0.5&&(leftTouching||mouseDown)){
    xdig = -1;
  } else {
    xdig = 1;
  }//xdig if else

  if(ydir>=0.2&&(leftTouching||mouseDown)){
    ydig = 1;
} else if(ydir<=(-0.2)&&(leftTouching||mouseDown)){
    ydig = -1;
  } else {
    ydig = 0;
  }//if else for ydig

  var digital = {'digX': xdig, 'digY': ydig, 'touching': true};

  return digital;
}//getDigDirection
