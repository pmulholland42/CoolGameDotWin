// Page variables
var canvas; 			// <canvas> HTML tag
var c;					// Canvas rendering context
var container;			// <div> HTML tag
var width = window.innerWidth;
var height = window.innerHeight;

// Player physics variables
var playerX = width/6-70;	// Player position starts in the middle of the screen
var playerY = height-70;
var previousX = playerX;// Player position from the last function call
var previousY = playerY;// We keep track of these in case the player moves too fast and flies through the floor
var playerXSpeed = 0;	// Velocity is measured in pixels per 20ms
var playerYSpeed = 0;
var grounded = false;	// True when player is on the ground
var walled = false;		// Like grounded but for the wall, ya know?
var jumps = 0;			// Number of jumps the player has made while in the air
var dropping = false;	// Prevents collisions with platforms when dropping down through them
var facing = 'right';	// Which way the player is facing
var gravDir = 'down';	// Gravity direction
var winner = false;

// Sprites
var snekman_down_right;
var snekman_down_left;
var snekman_up_right;
var snekman_up_left;
var snekman_left_up;
var snekman_left_down;
var snekman_right_up;
var snekman_right_down;
var snek;
var door;
var bg;

// Adjustable values:
var gravity = 0.7;		// Downward acceleration (pixels per 20ms^2)
var friction = 0.7;		// Coefficient of friction on ground
var wallBounce = 0.0;	// Wall bounciness coefficient
var floorBounce = 0;	// Floor bounciness coefficient
var maxSpeed = 10;		// Max horizontal speed for the player when on ground
var jumpSpeed = 21;		// Vertical speed to apply when jumping
var floorHeight = 0; 	// Pixels above bottom of window
var maxJumps = 2;		// Single, double, or triple jump, etc.
var projSpeed = 15;		// Velocity of projectiles shot by player
var projCooldown = 10;	// Number of ticks till you can shoot again

// Projectile linked list variables
var projHead = null;	// Head of the projectile linked list
var projLast = null;	// Last element of projectile linked list
var projCount = 0;		// Number of player projectiles
var projTimer = 0;		// Projectile cooldown timer

// Snek linked list variables
var snekHead = null;
var snekLast = null;
var snekCount = 0;

// Platform data
// TODO: make a level building system
var platform1Height = 220;
var platform2Height = 600;

// Input variables
var inputTimer = 0;
var receiving = false;
var heldKeys = {};		// heldKey[x] is true when the key with that keyCode is being held down

// Controller state
var xDig;
var yDig;
var xAnlg;
var yAnlg;
var log;

// FPS counter
var now;
var then = 0;
var frameCount = 0;
var fps = 0;

function init() {
	// Initial the canvas
	setupCanvas();

	// Load in all the sprites
	document.body.style.background = "url('bg.jpg')";
	snekman_down_right = document.createElement( 'img' );
	snekman_down_left = document.createElement( 'img' );
	snekman_up_right = document.createElement( 'img' );
	snekman_up_left = document.createElement( 'img' );
	snekman_left_up = document.createElement( 'img' );
	snekman_left_down = document.createElement( 'img' );
	snekman_right_up= document.createElement( 'img' ); 
	snekman_right_down = document.createElement( 'img' );
	snek = document.createElement('img');
	door = document.createElement('img');
	bg = document.createElement('img');
	snekman_down_right.src = "snekman_down_right.png";
	snekman_down_left.src = "snekman_down_left.png";
	snekman_up_right.src = "snekman_up_right.png";
	snekman_up_left.src = "snekman_up_left.png";
	snekman_left_up.src = "snekman_left_up.png";
	snekman_left_down.src = "snekman_left_down.png";
	snekman_right_up.src = "snekman_right_up.png";
	snekman_right_down.src = "snekman_right_down.png";
	snek.src = "snekkk.png";
	door.src = "door.png";
	bg.src = "bg.jpg";
	
	// Create sneks
	snekHead = {'health': 3, 'x': width/4, 'y': height - platform1Height, 'dir': "left", 'next': null, 'prev': null, 'time':0};
	var newSnek = {'health': 3, 'x':3*width/4, 'y': height - platform2Height, 'dir': "right", 'next': null, 'prev': snekHead, 'time':0};
	snekHead.next = newSnek;
	snekCount++;

	// Set up ScaleDrone for controller communication
	var drone = new ScaleDrone('yG0sVcaLcpbHQKJK');	// TODO: Base this key on a qr code?
	drone.on('open', function (error) {
		if (error) {
			return console.error(error);
		}
		
		var room = drone.subscribe('my_game');

		// What happens when the connection is made
		room.on('open', function (error) {
			if (error) {
				console.error(error);
			} else {
				console.log('Connected to room');
			}
		});

		// What happens when we receive data
		room.on('data', function (data) {
			inputTimer = 0;
			receiving = true;
			console.log(data);
			// Record controller state
			xDig = data.xdig;
			yDig = data.ydig;
			log = data.log;
		});
	});
	drone.on('error', function(error){
		console.log(error);
	});
	
	// These functions are called every 20 milliseconds:
	// Parse the input from the controller
	setInterval(parseController, 20);
	// Parse keyboard input
	setInterval(parseKeyboard, 20);
	// Calculate player physics
	setInterval(physics, 20);
	// Render the canvas
	setInterval(draw, 16); // 60 FPS!!!!!
	// Determine frames per second (once a second)
	setInterval(countFrames, 1000);
}//init


function setupCanvas() {
	// Create a <canvas> HTML tag
    canvas = document.createElement( 'canvas' );
	canvas.width = window.innerWidth;				
	canvas.height = window.innerHeight;
	
	// Get a CanvasRenderingContext2D on the canvas
	c = canvas.getContext( '2d' );
	
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

// Called when a key is held down
document.onkeydown = function(event) {
	// Set this key as being held
	heldKeys[event.keyCode] = true;
}
// Called when a key is released
document.onkeyup = function(event) {
	// Unset this key
	heldKeys[event.keyCode] = false;
}

// Interpret data sent from phone controller
function parseController() {
	// If it's been a while since the last update, assume the player let go
	inputTimer++;
	// TODO: make the threshold dynamic maybe?
	if (inputTimer > 7) {
		receiving = false;
		xDig = 0;
		yDig = 0;
		log = null;
	}
	
	if (xDig > 0) {
		if (gravDir == 'down' || gravDir == 'up') {
			moveRight();
		} else if (gravDir == 'left') {
			jump();
		}
	} else if (xDig < 0) {
		if (gravDir == 'down' || gravDir == 'up') {
			moveLeft();
		} else if (gravDir == 'right') {
			console.log("jump?");
			jump();
		}
	}
	
	if (yDig > 0) {
		if (gravDir == 'down') {
			jump();
		} else if (gravDir == 'right') {
			moveRight();
		} else if (gravDir == 'left') {
			moveLeft();
		}
	} else if (yDig < 0) {
		if (gravDir == 'down') {
			dropDown();
		} else if (gravDir == 'up') {
			jump();
		} else if (gravDir == 'right') {
			moveLeft();
		} else if (gravDir == 'left') {
			moveRight();
		}
	}
	
	if (log === "tapFunction") {
		shoot();
	} else if (log === "swipeUFunction") {
		gravDir = 'up';
	} else if (log === "swipeLFunction") {
		gravDir = 'left';
	} else if (log === "swipeDFunction") {
		gravDir = 'down';
	} else if (log === "swipeRFunction") {
		gravDir = 'right';
	} else if (log === "doubleTapFunction") {
		shoot();
		if (playerX > 5*width/6 && playerY == height-floorHeight) {
			winner = true;
		}
	}
}

// Interpret player input - called every 20ms
function parseKeyboard() {

	// Check the heldKeys array to see what the current input is
	if (heldKeys[65]) { // A
		if (gravDir == 'down' || gravDir == 'up') {
			moveLeft();
		} else if (gravDir == 'right') {
			jump();
		}
	}
	if (heldKeys[87]) { // W
		if (gravDir == 'down') {
			jump();
		} else if (gravDir == 'right') {
			moveRight();
		} else if (gravDir == 'left') {
			moveLeft();
		}
	}
	if (heldKeys[68]) {	// D
		if (gravDir == 'down' || gravDir == 'up') {
			moveRight();
		} else if (gravDir == 'left') {
			jump();
		}
	}
	if (heldKeys[83]) { // S
		if (gravDir == 'down') {
			dropDown();
		} else if (gravDir == 'up') {
			jump();
		} else if (gravDir == 'right') {
			moveLeft();
		} else if (gravDir == 'left') {
			moveRight();
		}
	}
	if (heldKeys[69]) { // E
		shoot();
	}
	if (heldKeys[73] || heldKeys[38]) { // I
		gravDir = 'up';
	}
	if (heldKeys[74] || heldKeys[37]) { // J
		gravDir = 'left';
	}
	if (heldKeys[75] || heldKeys[40]) { // K
		gravDir = 'down';
	}
	if (heldKeys[76] || heldKeys[39]) { // L
		gravDir = 'right';
	}
	if (heldKeys[81]) { // Q
		if (playerX > 5*width/6 && playerY == height-floorHeight) {
			winner = true;
		}
	}
}

// Player movement/action functions
function jump() {
	if (gravDir == 'down' && grounded) {
		playerYSpeed = -jumpSpeed;
		jumps++;
	} else if (gravDir == 'right' && playerX > 1490) { // TODO: fix this check
		playerXSpeed = -jumpSpeed;
		jumps++;
	} else if (gravDir == 'left' && playerX == 0) {
		playerXSpeed = jumpSpeed;
		jumps++;
	} else if (gravDir == 'up' && playerY == 0) {
		playerYSpeed = jumpSpeed;
	}
}
function moveLeft() {
	if (gravDir == 'up' || gravDir == 'down') {
		facing = 'left';
		if (playerXSpeed > -maxSpeed) {
			playerXSpeed -= 1;
		}
	} else if (gravDir == 'right') {
		facing = 'down';
		if (playerYSpeed < maxSpeed) {
			playerYSpeed += 1;
		}
	} else if (gravDir == 'left') {
		facing = 'up';
		if (playerYSpeed > -maxSpeed) {
			playerYSpeed -= 1;
		}
	}
}
function moveRight() {
	if (gravDir == 'up' || gravDir == 'down') {
		facing = 'right';
		if (playerXSpeed < maxSpeed) {
			playerXSpeed += 1;
		}
	} else if (gravDir == 'left') {
		facing = 'down';
		if (playerYSpeed < maxSpeed) {
			playerYSpeed += 1;
		}
	} else if (gravDir == 'right') {
		facing = 'up';
		if (playerYSpeed > -maxSpeed) {
			playerYSpeed -= 1;
		}
	}
}
function dropDown() {
	if (gravDir == 'down' && grounded && !dropping && playerY != height-floorHeight) {
		playerYSpeed = -5;
		dropping = true;
	}
	if (gravDir == 'right' || gravDir == 'left') {
		facing = 'down';
		if (playerYSpeed < maxSpeed) {
			playerYSpeed += 1;
		}
	}
	if (gravDir == 'up') {
		
	}
}
function shoot() {
	// This adds a projectile json to the linked list
	if (projTimer == 0) {
		
		// Linked lists man. You either do em or you dont
		var currProj;
		if (facing == 'left') {
			currProj = {'x': playerX+28, 'y': playerY-40, 'yV': 0, 'xV': -projSpeed, 'next': null, 'prev': null};
		} else if (facing == 'right') {
			currProj = {'x': playerX+28, 'y': playerY-40, 'yV': 0, 'xV': projSpeed, 'next': null, 'prev': null};
		} else if (facing == 'up') {
			currProj = {'x': playerX+28, 'y': playerY-40, 'yV': -projSpeed, 'xV': 0, 'next': null, 'prev': null};
		} else {
			currProj = {'x': playerX+28, 'y': playerY-40, 'yV': projSpeed, 'xV': 0, 'next': null, 'prev': null};
		}
		if (projCount == 0) {
			projHead = currProj;
		} else {
			projLast.next = currProj;
			currProj.prev = projLast;
		}
		projLast = currProj;
		
		projCount++;
		projTimer = projCooldown;
	}
}

// Calculate player physics - called every 20ms
function physics() {
	
	// Player physics
	// TODO: hitboxes and junk
	// Gravity
	if (gravDir == 'down') {
		playerYSpeed += gravity;
	} else if (gravDir == 'up') {
		playerYSpeed -= gravity;
	} else if (gravDir == 'left') {
		playerXSpeed -= gravity;
	} else if (gravDir == 'right') {
		playerXSpeed += gravity;
	}
	playerX += playerXSpeed;
	playerY += playerYSpeed;
	
	// If the player is on the ground
	if (grounded) {
		// Apply friction when not being moved by player
		if (!(receiving || heldKeys[65] || heldKeys[68])) {
			if (playerXSpeed > 0) {
				playerXSpeed -= friction;
			}
			else if (playerXSpeed < 0) {
				playerXSpeed += friction;
			}
		}
		// Stop movement when X velocity is too low
		// This prevents occilating back and forth from friction
		if (Math.abs(playerXSpeed) < 0.50) {
			playerXSpeed = 0;
		}
	}
	
	// Ground collision detection
	if (playerY >= (height-floorHeight)) {
		grounded = true;
		jumps = 0;
		// Bounce off the ground
		playerYSpeed *= -floorBounce;
		// Stop bouncing when Y velocity is too low
		if (Math.abs(playerYSpeed) < 0.50) playerYSpeed = 0;
		// Set player position to be on the floor
		playerY = height-floorHeight;
	} else {
		grounded = false;
	}
	
	// Right wall collision detection
	if (playerX >= (width-40)) {
		playerXSpeed *= -wallBounce;
		playerX = width-40;
	}
	// Left wall collision detection
	if (playerX <= 0) {
		playerXSpeed *= -wallBounce;
		playerX = 0;
	}
	// Ceiling collision detection
	if (playerY <= 0) {
		playerYSpeed *= -floorBounce;
		playerY = 0;
	}
	
	// Platform collision
	// It would be nice not to hard code this but...
	if ((playerX < width/3) && (playerX > width/6) && (previousY <= (height-platform1Height)) && playerY >= (height-platform1Height)) {
		// If player is dropping down fall through
		if (dropping) {
			dropping = false;
		// If they're not, and they're moving downward, collide with platform
		} else if (playerYSpeed >= 0) {
			playerYSpeed *= -floorBounce;
			playerY = height-platform1Height;
			grounded = true;
		}
	}
	walled = false;
	// Platform 1 left wall
	if ((playerY > height-platform1Height) && (previousX <= width/6) && playerX >= width/6) {
		playerXSpeed *= -wallBounce;
		playerX = width/6;
		if (gravDir == 'left') walled = true;
	}
	// Platform 1 right wall
	if ((playerY > height-platform1Height) && (previousX >= width/3) && playerX <= width/3) {
		playerXSpeed *= -wallBounce;
		playerX = width/3;
		if (gravDir == 'left') walled = true;
	}
	// Platform 2
	if ((playerX < 5*width/6) && (playerX > 2*width/3) && (previousY <= (height-platform2Height)) && playerY >= (height-platform2Height)) {
		// If player is dropping down fall through
		if (dropping) {
			dropping = false;
		// If they're not, and they're moving downward, collide with platform
		} else if (playerYSpeed >= 0) {
			playerYSpeed *= -floorBounce;
			playerY = height-platform2Height;
			grounded = true;
		}
	}
	// Platform 2 left wall
	if ((playerY > height-platform2Height) && (previousX <= 2*width/3) && playerX >= 2*width/3) {
		playerXSpeed *= -wallBounce;
		playerX = 2*width/3;
		if (gravDir == 'left') walled = true;
	}
	// Platform 2 right wall
	if ((playerY > height-platform2Height) && (previousX >= 5*width/6) && playerX <= 5*width/6) {
		playerXSpeed *= -wallBounce;
		playerX = 5*width/6;
		if (gravDir == 'right') walled = true;
	}
	
	// Keep track of last position (this is for collision detection)
	previousX = playerX;
	previousY = playerY;
	
	// Projectile physics
	// Iterate through the linked list of projectiles and move them
	if (projTimer != 0) projTimer--;
	var currProj = projHead;
	while (currProj != null) {
		currProj.y += currProj.yV;
		currProj.x += currProj.xV;
		if (Math.abs(currProj.y-(height-platform1Height)) < 60) { 
			if (Math.abs(snekHead.x - currProj.x) < 10 && snekHead.time == 0) {
				snekHead.health--;
				snekHead.time = 5;
			}
		} else if (Math.abs(currProj.y-(height-platform2Height)) < 60) {
			if (Math.abs(snekHead.next.x - currProj.x) < 10 && snekHead.next.time == 0) {
				snekHead.next.health--;
				snekHead.time = 5;
			}
		}
		if (currProj.x < 0 || currProj.x > width || currProj.y < -100 || currProj.y > height) {
			// Remove this from the linked list
			if (currProj != projHead) {
				currProj.prev.next = currProj.next;
			} else {
				projHead = currProj.next;
			}
			if (currProj != projLast) {
				currProj.next.prev = currProj.prev;
			} else {
				projLast = currProj.prev;
			}
			projCount--;
		}
		currProj = currProj.next;
	}
	
	// Snake physics
	var currSnek = snekHead;
	while (currSnek != null) {
		if (currSnek.time != 0) currSnek.time--;
		if (currSnek.dir == "left") {
			currSnek.x--;
			if ((currSnek.x < width/6 && currSnek == snekHead) || (currSnek.x < 2*width/3 && currSnek != snekHead)) {
				currSnek.dir = "right";
			}
		} else {
			currSnek.x++;
			if ((currSnek.x > width/3 && currSnek == snekHead) || (currSnek.x > 5*width/6 && currSnek != snekHead)) {
				currSnek.dir = "left";
			}
		}
		currSnek = currSnek.next;
	}
}

// Render the canvas - called every 20ms
function draw() {
	
	// Erase the current canvas
    c.clearRect(0, 0, width, height);
	c.drawImage(bg, 0, 0, width, height);
	c.lineWidth = "10";
	
	// Display stats
	c.font="15px Verdana";
	c.fillText(fps + ' FPS', 10, 20);
	/*
	c.fillText('X velocity: '+playerXSpeed, 10, 40);
	c.fillText('X position: '+Math.floor(playerX), 10, 60);
	c.fillText('Width: ' + width, 10, 80);
	c.fillText('Y velocity: '+(-playerYSpeed), 10, 100);
	c.fillText('Y position: '+Math.floor(height-playerY), 10, 120);
	c.fillText('Gravity: '+gravDir, 10, 160);
	c.fillText('Facing: '+facing, 10, 180);
	c.fillText('Projectiles: '+projCount, 10, 140);
	c.fillText('W: '+heldKeys[87], 10, 200);
	c.fillText('A: '+heldKeys[65], 10, 220);
	c.fillText('S: '+heldKeys[83], 10, 240);
	c.fillText('D: '+heldKeys[68], 10, 260);
	c.fillText('Timer: '+ inputTimer, 10, 280);
	*/
	
	frameCount++;
	
	if (winner) {
		c.font="60px Verdana";
		c.fillText("You win!", width/2-120, height/2-100);
		c.font="15px Verdana";
	}
	
	c.beginPath();
	c.strokeStyle = "rgba(0, 200, 0, 0.9)";
	c.fillStyle = "green";
	// Draw platform 1 (hardcoded)
	c.rect(width/6, height-platform1Height, width/6, platform1Height);
	// Draw platform 2 (hardcoded)
	c.rect(2*width/3, height-platform2Height, width/6, platform2Height);
	c.fill();
	
	c.stroke();
	c.fillStyle = "white";
	c.fillText('Use the joystick or WASD to move.', 20, height-floorHeight-120);
	c.fillText('Tap or press E to fire your weapon.', width/6+50, height-platform1Height-90);
	c.fillText('Double tap or press Q to open door.', 5*width/6+10, height-floorHeight-140);
	c.fillText('Swipe or use arrow keys to change the direction of gravity.', width/2-170, height/2);
	c.beginPath();
	// Draw the door
	c.drawImage(door, 5*width/6+80, height-floorHeight-120, 60, 120);
	
	c.strokeStyle = "rgba(128, 0, 0, 0.9)";
	/*
	c.rect(5*width/6+80, height-floorHeight-70, 40, 80);
	c.stroke();*/
	
	// Draw the player
	if (gravDir == 'down') {
		if (facing == 'right') {
			c.drawImage(snekman_down_right, playerX-44, playerY-57, 44, 57);
		} else {
			c.drawImage(snekman_down_left, playerX, playerY-57, 44, 57);
		}
	} else if (gravDir == 'up') {
		if (facing == 'right') {
			c.drawImage(snekman_up_right, playerX-44, playerY, 44, 57);
		} else {
			c.drawImage(snekman_up_left, playerX, playerY, 44, 57);
		}
	} else if (gravDir == 'left') {
		if (facing == 'down') {
			c.drawImage(snekman_left_down, playerX, playerY-44, 57, 44);
		} else {
			c.drawImage(snekman_left_up, playerX, playerY, 57, 44);
		}
	} else {
		if (facing == 'down') {
			c.drawImage(snekman_right_down, playerX-57, playerY-44, 57, 44);
		} else {
			c.drawImage(snekman_right_up, playerX-57, playerY, 57, 44);
		}
	}
	
	/*
	c.beginPath();
	c.lineWidth = "2";
	c.strokeStyle = "rgba(255, 0, 0, 0.7)";
	c.rect(playerX, playerY, 2, 2);
	c.stroke();*/
	
	// Draw the projectiles by iterating through the linked list
	if (projCount != 0) {
		var currProj;
		for (currProj = projHead; currProj != null; currProj = currProj.next) {
			c.beginPath();
			c.lineWidth = "5";
			c.strokeStyle = "rgba(255, 0, 0, 0.7)";
			c.rect(currProj.x, currProj.y, 5, 5);
			c.stroke();
		}
	}
	
	// Draw the snakes
	if (snekCount != 0) {
		var currSnek;
		for (currSnek = snekHead; currSnek != null; currSnek = currSnek.next) {
			if (currSnek.health > 0) {
				c.fillText("Snek", currSnek.x-9, currSnek.y-70);
				c.fillText("HP: "+currSnek.health, currSnek.x-10, currSnek.y-50);
				c.beginPath();
				c.lineWidth = "5";
				c.strokeStyle = "rgba(0, 200, 0, 0.7)";
				c.rect(currSnek.x, currSnek.y-((currSnek.health*10)+10), 5, (currSnek.health*10)+10);
				c.stroke();
			}
		}
	}
}

function countFrames() {
	now = Date.now();
	console.log(now - then);
	fps = Math.floor(frameCount/((now-then)/1000));
	then = now; // whoa, dude
	frameCount = 0;
}




