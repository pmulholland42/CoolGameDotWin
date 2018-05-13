'use strict';

// Page variables
var canvas; 			// <canvas> HTML tag
var c;					// Canvas rendering context
var container;			// <div> HTML tag

// Player physics variables:
var playerX; // Player position
var playerY;
var playerLastX; // Previous position of player
var playerLastY;
var playerXSpeed = 0;	
var playerYSpeed = 0;
var grounded = false;
// Used for collision detection:
var playerWidth;
var playerHeight;
var adjustX;
var adjustY;
var offsetX; // Half of player width
var offsetY;
var precisionFactor = 0.000001; // Used for correcting floating point errors

// Adjustable values:
var tickRate = 3; // Number of milliseconds between game loop calls
var gravity = 30; // Downward acceleration (blocks per second^2)
var maxFallSpeed = 12; // Terminal velocity (blocks per second)
var moveSpeed = 4; // Horizontal movement speed of player (blocks per second)
var jumpSpeed = 9; // Vertical speed in blocks per second.
var jumpHeight = 3; // Height in blocks. The player can jump higher than this though because gravity takes time to slow them.

var jumpTimer = 0; // Used to track how long the player is jumping
var maxJumpTime = jumpHeight/jumpSpeed; // How long the player can go up (seconds) before gravity starts working on them.
var jumping = false;
var canJump = true;
var airResistance = false; // Should the player stop moving horizontally in the air when the player is not moving? This gets toggled when jumping.

var directions = {
	down: 0,
	up: 1,
	left: 2,
	right: 3
}
var gravityDirection = directions.down;
var facing = directions.right;

var devMode = false; // Displays stats and shows grid

// Level data
var gridWidth = 32;
var gridHeight = 16;
var blockSize;
var grid;
var numBlockTypes = 2;
var blocks = {
	air: 0,
	stone: 1,
	door: 2
}
var winner = false;

// Projectile variables
var projSpeed = 15;		// Velocity of projectiles shot by player
var projCooldown = 10;	// Number of ticks till you can shoot again
var projHead = null;	// Head of the projectile linked list
var projLast = null;	// Last element of projectile linked list
var projCount = 0;		// Number of player projectiles
var projTimer = 0;		// Projectile cooldown timer

// Snek variables
var snekHead = null;
var snekLast = null;
var snekCount = 0;

// Sprites
var snekman_down_right;
var snekman_down_left;
var snekman_up_right;
var snekman_up_left;
var snekman_left_up;
var snekman_left_down;
var snekman_right_up;
var snekman_right_down;

// WebRTC
var signalingServer = "ws://18.233.98.225:8080";
var peerConnection; // WebRTC connection to the controller
var dataChannel; // Communicates with the controller
var remoteDescriptionSet = false;
var qrCodeDiv = document.getElementById("qrcode");
var qrCode;
var UUID;
var offer;

// Controller state
var analogX = 0;
var analogY = 0;
var swipeUp = false;
var swipeDown = false;
var swipeLeft = false;
var swipeRight = false;
var tap = false;
var doubleTap = false;
var pressing = false;
var touchingRight = false;
var touchingLeft = false;

// Input variables
var heldKeys = {};		// heldKey[x] is true when the key with that keyCode is being held down
var controls = {
	left: 65, // A
	right: 68, // D
	up: 87, // W
	down: 83, // S
	jump: 32, // Spacebar
	gravityUp: 38, // Up arrow
	gravityDown: 40, // Down arrow
	gravityLeft: 37, // Left arrow
	gravityRight: 39, // Right arrow
	devMode: 76 // L
}

// Physics timing
var now = Date.now();
var then = now;
var deltaT;
var frameCount = 0;
var framesPerSecond = 0;


if (window.innerWidth/gridWidth > window.innerHeight/gridHeight) blockSize = window.innerHeight/gridHeight;
else blockSize = window.innerWidth/gridWidth;

function createArray(length)
{
    var arr = new Array(length || 0);
    var i = length;

    if (arguments.length > 1)
	{
        var args = Array.prototype.slice.call(arguments, 1);
        while(i--) arr[length-1 - i] = createArray.apply(this, args);
    }

    return arr;
}

function init()
{
	// Initialize the canvas
	console.log("Initializing canvas...");
	setupCanvas();
	
	// Load in all the sprites
	snekman_down_right = document.createElement( 'img' );
	snekman_down_left = document.createElement( 'img' );
	snekman_up_right = document.createElement( 'img' );
	snekman_up_left = document.createElement( 'img' );
	snekman_left_up = document.createElement( 'img' );
	snekman_left_down = document.createElement( 'img' );
	snekman_right_up = document.createElement( 'img' ); 
	snekman_right_down = document.createElement( 'img' );
	snekman_down_right.src = "sprites/snekman_down_right.png";
	snekman_down_left.src = "sprites/snekman_down_left.png";
	snekman_up_right.src = "sprites/snekman_up_right.png";
	snekman_up_left.src = "sprites/snekman_up_left.png";
	snekman_left_up.src = "sprites/snekman_left_up.png";
	snekman_left_down.src = "sprites/snekman_left_down.png";
	snekman_right_up.src = "sprites/snekman_right_up.png";
	snekman_right_down.src = "sprites/snekman_right_down.png";
	
	playerX = 2;
	playerY = 12;
	
	// Start the game loop
	setInterval(game, tickRate);
	
	// Keep track of the frame rate
	setInterval(countFrames, 1000);
	
	// Connect to the controller
	initializeConnection();
}

function initializeConnection()
{
	var uuid = createUUID();
	console.log("UUID: " + uuid);
	var controllerURL = "coolgame.win/controller.html?id=" + uuid;
	console.log("Controller: " + controllerURL);
	qrCode = new QRCode(qrCodeDiv, controllerURL);
	
	// Connect to the signaling server
	console.log("Connecting to signaling server...");
	const serverConnection = new WebSocket(signalingServer);
	serverConnection.addEventListener('open', function (event)
	{
		console.log("Connection opened.");
		
		// Initialize WebRTC connection
		var configuration = {'iceServers': [{'urls': 'stun:stun.stunprotocol.org:3478'}, {'urls': 'stun:stun.l.google.com:19302'},]};
		peerConnection = new RTCPeerConnection(configuration);
		peerConnection.ondatachannel = gotDataChannel;
		peerConnection.onicecandidate = gotIceCandidate;	
		function gotIceCandidate(event)
		{
			if(event.candidate != null)
			{
				serverConnection.send(JSON.stringify({'ice': event.candidate, 'uuid': uuid}));
			}
		}
		serverConnection.onmessage = gotMessageFromServer;
		console.log("Waiting for offer from controller...");
	});
	
	function gotMessageFromServer(message)
	{
		var signal = JSON.parse(message.data);
		if(signal.uuid != uuid) return;
		if(signal.sdp && !remoteDescriptionSet)
		{
			peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function()
			{
				console.log("Successfully set remote description");
				remoteDescriptionSet = true;
				if(signal.sdp.type == 'offer')
				{
					// Here we get an offer from the controller via the server
					console.log("Received offer. Creating answer...");
					peerConnection.createAnswer().then(onAnswerSuccess, onError);
				}
			}, onError);
		}
		else if(signal.ice)
		{
			peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).then(onIceSuccess, onError);
		}
	}
	
	function onAnswerSuccess(description)
	{
		// Send the answer to the controller via the signaling server
		console.log("Answer created. Sending answer...");
		serverConnection.send(JSON.stringify({'sdp': description, 'uuid': uuid}));
		peerConnection.setLocalDescription(description).then(onLocalDescriptionSuccess, onError);
	}
	
	function onLocalDescriptionSuccess()
	{
		console.log("Successfully set local description.");
	}
	function onIceSuccess()
	{
		console.log("Successfully added ICE candidate.");
	}
	function onError(error)
	{
		console.error(error);
	}
	
	
	function gotDataChannel(event)
	{
		// Data channel has been opened by the controller
		console.log("Data channel has been opened by the controller.");
		qrCodeDiv.style.display = "none";
		dataChannel = event.channel;
		dataChannel.onmessage = onControllerInput;
		//setInterval(sayHello, 1000);
	}
	
	function sayHello()
	{
		dataChannel.send("Hello");
	}
}

function createUUID()
{
	function s4()
	{
		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
	return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function loadLevel()
{
	// Editor array 32*16
	grid = createArray(gridWidth, gridHeight);
    var oFrame = document.getElementById("level1");
    var strRawContents = oFrame.contentWindow.document.body.childNodes[0].innerHTML;
    while (strRawContents.indexOf("\r") >= 0)
        strRawContents = strRawContents.replace("\r", "");
    var arrLines = strRawContents.split("\n");
    for (var i = 0; i < arrLines.length; i++)
	{
        var curLine = arrLines[i];
        for (var j = 0; j < gridWidth; j++)
		{
			grid[j][i] = parseInt(curLine.charAt(j));
		}
    }
}

function setupCanvas()
{
	// Create a <canvas> HTML tag
    canvas = document.createElement('canvas');
	
	// Hide scroll bars
	document.body.style.overflow = 'hidden';
	
	// Get a CanvasRenderingContext2D on the canvas
	c = canvas.getContext('2d');
	
	// Create a <div> HTML tag called container
	container = document.createElement('div');
	container.className = "container";
	
	// Put the canvas in the container
	container.appendChild(canvas);
	// Put the container on the page
	document.body.appendChild(container);
}

// Called when a key is held down
document.onkeydown = function(event)
{
	// Set this key as being held
	heldKeys[event.keyCode] = true;
	
	switch (event.keyCode)
	{
		case controls.devMode:
			devMode = !devMode;
			break;
	}
}
// Called when a key is released
document.onkeyup = function(event)
{
	// Unset this key
	heldKeys[event.keyCode] = false;
	
	if (event.keyCode == controls.jump || event.keyCode == getJumpKey())
	{
		// You can only jump again once you release the jump key and press it again
		canJump = true;
		// Horizontal movement is stopped temporarily (unless the player holds left or right)
		airResistance = true;
		// Letting go of the jump key while going up ends the jump
		if (playerYSpeed <= 0)
		{
			playerYSpeed = 0;
			jumping = false;
			jumpTimer = 0;
		}
	}

}

// What to do when the controller sends a message
function onControllerInput(event)
{
	var message = JSON.parse(event.data);
	if (message.action)
	{
		console.log(message.action);
		if (message.action == "swipeUp")
		{
			swipeUp = true;
		}
		else if (message.action == "swipeDown")
		{
			swipeDown = true;
		}
		else if (message.action == "swipeLeft")
		{
			swipeLeft = true;
		}
		else if (message.action == "swipeRight")
		{
			swipeRight = true;
		}
		else if (message.action == "tap")
		{
			tap = true;
		}
		else if (message.action == "doubleTap")
		{
			doubleTap = true;
		}
		else if (message.action == "press")
		{
			pressing = true;
		}
		else if (message.action == "endTouchRight")
		{
			touchingRight = false;
			if (pressing)
			{
				canJump = true;
				pressing = false;
			}
		}
		else if (message.action == "endTouchLeft")
		{
			touchingLeft = false;
			analogX = 0;
			analogY = 0;
		}
	}
	else if (message.anlgX)
	{
		touchingLeft = true;
		analogX = message.anlgX;
		analogY = message.anlgY;
	}
}

// Change the direction of gravity
function changeGravity(newDirection)
{
	if (gravityDirection == newDirection) return;
	
	// If we change from horizontal to vertical gravity (or vice-versa), change the direction the player sprite is facing
	if ((newDirection == directions.up || newDirection == directions.down) && (gravityDirection == directions.left || gravityDirection == directions.left))
	{
		facing = directions.right;
	}
	else if ((newDirection == directions.left || newDirection == directions.right) && (gravityDirection == directions.up || gravityDirection == directions.down))
	{
		facing = directions.up;
	}
	
	gravityDirection = newDirection;
	airResistance = false;
}

// Calculate player physics
function game()
{
	// Calculate the time since the last physics update
	now = Date.now();
	deltaT = (now - then)/1000;
	
	// Determine how big the canvas should be
	if (window.innerWidth/gridWidth > window.innerHeight/gridHeight) 
	{
		// Screen is too wide, base the grid off screen height
		// Should see walls
		blockSize = window.innerHeight/gridHeight;
	}
	else
	{
		// Screen is not wide enough, base the grid off screen width
		// Should see floor
		blockSize = window.innerWidth/gridWidth;
	}
	
	canvas.width = blockSize * gridWidth;
	canvas.height = blockSize * gridHeight;
	
	if (gravityDirection == directions.down || gravityDirection == directions.up)
	{
		playerWidth = blockSize*0.49;
		playerHeight = blockSize*0.95;
	}
	else 
	{
		playerWidth = blockSize*0.95;
		playerHeight = blockSize*0.49;
	}		
		
	offsetX = playerWidth/(blockSize*2);
	offsetY = playerHeight/(blockSize*2);

	// Change gravity
	if (heldKeys[controls.gravityUp] || swipeUp)
	{
		swipeUp = false;
		changeGravity(directions.up);
	}
	else if (heldKeys[controls.gravityDown] || swipeDown)
	{
		swipeDown = false;
		changeGravity(directions.down);
	}
	else if (heldKeys[controls.gravityLeft] || swipeLeft)
	{
		swipeLeft = false;
		changeGravity(directions.left);
	}
	else if (heldKeys[controls.gravityRight] || swipeRight)
	{
		swipeRight = false;
		changeGravity(directions.right);
	}
	
	// Gravity
	if (!jumping && !grounded)
	{
		if (gravityDirection == directions.down)
		{
			playerYSpeed = Math.min(playerYSpeed + gravity * deltaT, maxFallSpeed);
		}
		else if (gravityDirection == directions.up)
		{
			playerYSpeed = Math.max(playerYSpeed - gravity * deltaT, -maxFallSpeed);
		}
		else if (gravityDirection == directions.left)
		{
			playerXSpeed = Math.max(playerXSpeed - gravity * deltaT, -maxFallSpeed);
		}
		else if (gravityDirection == directions.right)
		{
			playerXSpeed = Math.min(playerXSpeed + gravity * deltaT, maxFallSpeed);
		}
	}
	
	// Jump
	if ((heldKeys[controls.jump] || heldKeys[getJumpKey()] || pressing)&& jumpTimer > 0 && ((canJump && grounded) || jumping))
	{
		jumpTimer -= deltaT;
		jumping = true;
		canJump = false;
		if (gravityDirection == directions.down)
		{
			playerYSpeed = -jumpSpeed;
		}
		else if (gravityDirection == directions.up)
		{
			playerYSpeed = jumpSpeed;
		}
		else if (gravityDirection == directions.left)
		{
			playerXSpeed = jumpSpeed;
		}
		else if (gravityDirection == directions.right)
		{
			playerXSpeed = -jumpSpeed;
		}
	}
	else 
	{
		jumping = false;
	}
	
	// Movement on floor or ceiling
	if (gravityDirection == directions.up || gravityDirection == directions.down)
	{
		if (heldKeys[controls.left])
		{
			playerXSpeed = -moveSpeed;
			facing = directions.left;
		}
		else if (heldKeys[controls.right])
		{
			playerXSpeed = moveSpeed;
			facing = directions.right;
		}
		else if (analogX != 0)
		{
			playerXSpeed = moveSpeed * analogX;
			if (analogX < 0) facing = directions.left;
			else facing = directions.right;
		}
		else if ((grounded || airResistance) && !touchingLeft)
		{
			playerXSpeed = 0;
		}
	}
	// Movement on walls
	else
	{
		if (heldKeys[controls.up])
		{
			playerYSpeed = -moveSpeed;
			facing = directions.up;
		}
		else if (heldKeys[controls.down])
		{
			playerYSpeed = moveSpeed;
			facing = directions.down;
		}
		else if (analogY != 0)
		{
			playerYSpeed = moveSpeed * analogY * -1;
			if (analogY > 0) facing = directions.up;
			else facing = directions.down;
		}
		else if ((grounded || airResistance) && !touchingLeft)
		{
			playerYSpeed = 0;
		}
	}

	// Move the player based on their current velocity.
	playerLastX = playerX;
	playerLastY = playerY;
	playerX += playerXSpeed * deltaT;
	playerY += playerYSpeed * deltaT;
	
	// Assume the player is in the air unless they collide with the ground.
	grounded = false;
	
	// Detect collision for each corner of the player's collision box.
	for (var corner = 0; corner < 4; corner++)
	{
		// The offset and adjust values change depending on which corner of the player's hitbox is colliding.
		// The offset value tells you where the corner is in relation to the center of the player
		// The player coordinates are the center of the hitbox so the corners are left/right/up/down from that, depending on if the offset is negative
		// The adjust value is to account for the fact that the actual coordinate of a block is its top left corner
		// When we reset the player position, we want to put it next to the side it collided with, so we may have to add 1 to the block coordinate
		
		// Bottom right corner
		if (corner == 0)
		{
			offsetX = playerWidth/(blockSize*2);
			offsetY = playerHeight/(blockSize*2);
			adjustX = 0;
			adjustY = 0;
		}
		// Top right corner
		else if (corner == 1)
		{
			offsetX = playerWidth/(blockSize*2);
			offsetY = -playerHeight/(blockSize*2);
			adjustX = 0;
			adjustY = 1;
		} 
		// Top left corner
		else if (corner == 2)
		{
			offsetX = -playerWidth/(blockSize*2);
			offsetY = -playerHeight/(blockSize*2);
			adjustX = 1;
			adjustY = 1;
		}
		// Bottom left corner
		else if (corner == 3)
		{
			offsetX = -playerWidth/(blockSize*2);
			offsetY = playerHeight/(blockSize*2);
			adjustX = 1;
			adjustY = 0;
		}
		
		// Determine what block this corner is in
		var pBlockX = Math.floor(playerX + offsetX);
		var pBlockY = Math.floor(playerY + offsetY);
		
		// Make sure it's inbounds
		if (pBlockX >= 0 && pBlockX < gridWidth && pBlockY >= 0 && pBlockY < gridHeight)
		{	
			// Check if it is a solid block
			if (grid[pBlockX][pBlockY] == blocks.stone)
			{
				// If we are in a solid block, it's a collision
				// Check if we are colliding with the side or top/bottom of the block
				if (Math.floor(playerLastY + offsetY + precisionFactor) == pBlockY && playerLastY + offsetY != pBlockY)
				{
					// Colliding with the side
					playerX = pBlockX + adjustX - offsetX;
					playerXSpeed = 0;
					
					if (gravityDirection == directions.left)
					{
						if (corner == 2 || corner == 3)
						{
							// If one of the left corners is colliding then the player is on a surface
							grounded = true;
							jumpTimer = maxJumpTime;
						}
						else
						{
							// If one of the right corners is colliding then the player is hitting their head on a block
							jumping = false;
							jumpTimer = 0;
						}
					}
					else if (gravityDirection == directions.right)
					{
						if (corner == 0 || corner == 1)
						{
							// If one of the right corners is colliding then the player is on a surface
							grounded = true;
							jumpTimer = maxJumpTime;
						}
						else
						{
							// If one of the left corners is colliding then the player is hitting their head on a block
							jumping = false;
							jumpTimer = 0;
						}
					}
				} 
				else if (Math.floor(playerLastX + offsetX + precisionFactor) == pBlockX && playerLastX + offsetX != pBlockX)
				{
					// Colliding with the top or bottom
					playerY = pBlockY + adjustY - offsetY;
					playerYSpeed = 0;
					
					if (gravityDirection == directions.down)
					{
						if (corner == 0 || corner == 3)
						{
							// If one of the bottom corners is colliding then the player is on a surface
							grounded = true;
							jumpTimer = maxJumpTime;
						}
						else
						{
							// If one of the top corners is colliding then the player is hitting their head on a block
							jumping = false;
							jumpTimer = 0;
						}
					}
					else if (gravityDirection == directions.up)
					{
						if (corner == 1 || corner == 2)
						{
							// If one of the top corners is colliding then the player is on a surface
							grounded = true;
							jumpTimer = maxJumpTime;
						}
						else
						{
							// If one of the bottom corners is colliding then the player is hitting their head on a block
							jumping = false;
							jumpTimer = 0;
						}
					}
				}
			}
		}
		else
		{
			// Ceiling collision detection
			if (playerY + offsetY < 0)
			{
				playerY = -offsetY;
				playerYSpeed = 0;
				if (gravityDirection == directions.up)
				{
					grounded = true;
					jumpTimer = maxJumpTime;
				}
				else if (gravityDirection == directions.down)
				{
					jumping = false;
					jumpTimer = 0;
				}
			}
			// Ground collision detection
			else if (playerY + offsetY > gridHeight)
			{
				playerY = gridHeight - offsetY;
				playerYSpeed = 0;
				if (gravityDirection == directions.down)
				{
					grounded = true;
					jumpTimer = maxJumpTime;
				}
				else if (gravityDirection == directions.up)
				{
					jumping = false;
					jumpTimer = 0;
				}
			}	
			// Left wall collision detection
			if (playerX + offsetX < 0)
			{
				playerX = -offsetX;
				playerXSpeed = 0;
				if (gravityDirection == directions.left)
				{
					grounded = true;
					jumpTimer = maxJumpTime;
				}
				else if (gravityDirection == directions.right)
				{
					jumping = false;
					jumpTimer = 0;
				}
			}
			// Right wall collision detection
			else if (playerX + offsetX > gridWidth)
			{
				playerX = gridWidth - offsetX;
				playerXSpeed = 0; 
				if (gravityDirection == directions.right)
				{
					grounded = true;
					jumpTimer = maxJumpTime;
				}
				else if (gravityDirection == directions.down)
				{
					jumping = false;
					jumpTimer = 0;
				}
			}
		}
	}
	
	// Draw the blocks
	for (var x = 0; x < gridWidth; x++)
	{
		for (var y = 0; y < gridHeight; y++)
		{
			var block = grid[x][y];
			if (block != blocks.air)
			{
				// Change the color depending on the block type
				if (block == blocks.stone)
				{
					c.fillStyle = "rgba(0, 128, 0, 1)"; // Green
				}
				else if (block == blocks.door)
				{
					c.fillStyle = "rgba(80, 45, 30, 1)"; // Brown
				}
				// Draw the block
				c.fillRect(x * blockSize, y * blockSize, blockSize+1, blockSize+1);
			}
		}
	}
	
	// Draw grid lines
	if (devMode)
	{
		c.strokeStyle = "rgba(150, 150, 150, .3)";
		for (var x = 0; x <= gridWidth; x++)
		{
			c.beginPath();
			c.moveTo(x * blockSize, 0);
			c.lineTo(x * blockSize, canvas.height);
			c.stroke();
		}
		for (var y = 0; y < gridHeight; y++)
		{
			c.beginPath();
			c.moveTo(0, y * blockSize);
			c.lineTo(canvas.width, blockSize * y);
			c.stroke();
		}
	}
	
	// Draw the player
	var currentSprite;
	if (gravityDirection == directions.down)
	{
		if (facing == directions.right) currentSprite = snekman_down_right;
		else currentSprite = snekman_down_left;
	}	
	else if (gravityDirection == directions.up)
	{
		if (facing == directions.right) currentSprite = snekman_up_right;
		else currentSprite = snekman_up_left;
	}	
	else if (gravityDirection == directions.left)
	{
		if (facing == directions.down) currentSprite = snekman_left_down;
		else currentSprite = snekman_left_up;
	}	
	else if (gravityDirection == directions.right)
	{
		if (facing == directions.down) currentSprite = snekman_right_down;
		else currentSprite = snekman_right_up;
	}
	
	if (gravityDirection == directions.down || gravityDirection == directions.up)
		c.drawImage(currentSprite, playerX*blockSize-playerWidth*0.75, playerY*blockSize-playerHeight/2, playerWidth*1.5, playerHeight);
	else
		c.drawImage(currentSprite, playerX*blockSize-playerWidth/2, playerY*blockSize-playerHeight*0.75, playerWidth, playerHeight*1.5);

	// Display stats
	if (devMode)
	{
		// Red dot on player position
		c.fillStyle = "rgba(255, 80, 80, 1)";
		c.fillRect(playerX*blockSize-2, playerY*blockSize-2, 4, 4);
		
		// Debug stats:
		// X position and speed
		if (playerXSpeed > 0)
			c.fillStyle = "green";
		else if (playerXSpeed < 0)
			c.fillStyle = "red";
		else
			c.fillStyle = "white";
		c.fillText('X velocity: ' + playerXSpeed, 10, 40);
		c.fillText('X position: ' + playerX, 10, 60);
		
		// Y position and speed
		if (playerYSpeed < 0)
			c.fillStyle = "green";
		else if (playerYSpeed > 0)
			c.fillStyle = "red";
		else
			c.fillStyle = "white";
		c.fillText('Y velocity: ' + playerYSpeed, 10, 80);
		c.fillText('Y position: ' + playerY, 10, 100);
		
		// Grounded
		if (grounded)
			c.fillStyle = "green";
		else
			c.fillStyle = "red";
		c.fillText('Grounded: ' + grounded, 10, 130);
		
		// Jumping
		if (jumping)
			c.fillStyle = "green";
		else
			c.fillStyle = "red";
		c.fillText('Jumping: '+ jumping, 10, 150);
		
		// Can Jump
		if (canJump)
			c.fillStyle = "green";
		else
			c.fillStyle = "red";
		c.fillText('Can Jump: '+ canJump, 10, 170);
		
		// Air Resistance
		if (airResistance)
			c.fillStyle = "green";
		else
			c.fillStyle = "red";
		c.fillText('Air resistance: '+ airResistance, 10, 190);

		
		// Screen size
		c.fillStyle = "white";
		c.fillText('Canvas width: '+ canvas.width, 10, 230);
		c.fillText('Window width: ' + window.innerWidth, 10, 250);
		c.fillText('Canvas height: ' + canvas.height, 10, 270);
		c.fillText('Window height: ' + window.innerHeight, 10, 290);
		c.fillText('FPS: ' + framesPerSecond, 10, 300);  
		
		// Data channel connection status
		if (dataChannel)
		{
			if (dataChannel.readyState == "open") c.fillStyle = "green";
			else if (dataChannel.readyState == "connecting") c.fillStyle = "yellow";
			else if (dataChannel.readyState == "closing") c.fillStyle = "orange";
			else if (dataChannel.readyState == "closed") c.fillStyle = "red";
			c.fillText('Data channel: ' + dataChannel.readyState, 10, 320);
		}
		
		// Touching left side
		if (touchingLeft)
			c.fillStyle = "green";
		else
			c.fillStyle = "red";
		c.fillText('Touching left: '+ touchingLeft, 10, 340);
		
		// Touching right side
		if (touchingLeft)
			c.fillStyle = "green";
		else
			c.fillStyle = "red";
		c.fillText('Touching right: '+ touchingRight, 10, 360);
		
		// Pressing right side
		if (pressing)
			c.fillStyle = "green";
		else
			c.fillStyle = "red";
		c.fillText('Pressing: '+ pressing, 10, 380);
	}
	
	// Reset the physics timer
	then = now;
	frameCount++;
}

function countFrames()
{
	framesPerSecond = frameCount;
	frameCount = 0;
}

function getJumpKey()
{
	if (gravityDirection == directions.down)
	{
		return controls.up;
	}
	else if (gravityDirection == directions.up)
	{
		return controls.down;
	}
	else if (gravityDirection == directions.left)
	{
		return controls.right;
	}
	else 
	{
		return controls.left;
	}
}










