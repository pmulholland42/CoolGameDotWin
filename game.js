'use strict';

// Page variables
var canvas; 			// <canvas> HTML tag
var ctx;				// Canvas rendering context
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
var adjustX; // Corrects for block coordinates
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
var canJump = true; // This is false when the player is holding the jump key, and prevents jumping again until they release and press again
var airResistance = false; // This lets us toggle between floaty physics when shifting gravity and tighter control when jumping

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
var sneks = [];
var maxSnekHP = 3; // Hit points that sneks start with
var snekSpeed = 1.25; // How fast the sneks move (blocks per second)
var snekHeight = 0.65; // Height of a snek in blocks

// Sprites
var snekman_down_right = new Image();
var snekman_down_left = new Image();
var snekman_up_right = new Image();
var snekman_up_left = new Image();
var snekman_left_up = new Image();
var snekman_left_down = new Image();
var snekman_right_up = new Image();
var snekman_right_down = new Image();
var snek_left = new Image();
var snek_right = new Image();
var door = new Image();

// WebRTC
var signalingServer = "ws://18.233.98.225:8080";
var peerConnection; // WebRTC connection to the controller
var dataChannel; // Communicates with the controller
var remoteDescriptionSet = false;
var qrCodeDiv;
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
    canvas = document.getElementById("gamecanvas");
	ctx = canvas.getContext('2d');
	
	// Load in all the sprites
	snekman_down_right.src = "sprites/snekman_down_right.png";
	snekman_down_left.src = "sprites/snekman_down_left.png";
	snekman_up_right.src = "sprites/snekman_up_right.png";
	snekman_up_left.src = "sprites/snekman_up_left.png";
	snekman_left_up.src = "sprites/snekman_left_up.png";
	snekman_left_down.src = "sprites/snekman_left_down.png";
	snekman_right_up.src = "sprites/snekman_right_up.png";
	snekman_right_down.src = "sprites/snekman_right_down.png";
	snek_left.src = "sprites/snek_left.png";
	snek_right.src = "sprites/snek_left.png";
	door.src = "sprites/door.png";
	
	// Set initial player position
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
	// Generate the controller ID and display the link as a QR code
	var id = createID();
	console.log("Controller ID: " + id);
	var controllerURL = "coolgame.win/controller.html?id=" + id;
	console.log("Controller URL: " + controllerURL);
	qrCodeDiv = document.getElementById("qrcode");
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
				serverConnection.send(JSON.stringify({'ice': event.candidate, 'id': id}));
			}
		}
		serverConnection.onmessage = gotMessageFromServer;
		console.log("Waiting for offer from controller...");
	});
	
	function gotMessageFromServer(message)
	{
		var signal = JSON.parse(message.data);
		if(signal.id != id) return;
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
		serverConnection.send(JSON.stringify({'sdp': description, 'id': id}));
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
		document.getElementById("menu").style.display = "none";
		dataChannel = event.channel;
		dataChannel.onmessage = onControllerInput;
	}
	
	function sayHello()
	{
		dataChannel.send("Hello");
	}
}

function createID()
{
	return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
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
    for (var y = 0; y < arrLines.length; y++)
	{
        var curLine = arrLines[y];
        for (var x = 0; x < gridWidth; x++)
		{
			var block = curLine.charAt(x);
			if (!isNaN(parseInt(block)))
			{
				grid[x][y] = parseInt(block);
			}
			else
			{
				var snek = new Object();
				snek.x = x;
				snek.y = y + (1 - snekHeight);
				snek.hp = maxSnekHP;
				snek.direction = 1;
				sneks.push(snek);
			}
		}
    }
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

	// Change gravity direction
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
	
	// Determine the player's hitbox size
	if (gravityDirection == directions.down || gravityDirection == directions.up)
	{
		playerWidth = blockSize*0.72;
		playerHeight = blockSize*1.4;
	}
	else 
	{
		playerWidth = blockSize*1.4;
		playerHeight = blockSize*0.72;
	}				
	offsetX = playerWidth/(blockSize*2);
	offsetY = playerHeight/(blockSize*2);
	
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
	
	// Jumping
	// First check if the player is giving the input to jump
	// Then make sure they are either able to jump or already jumping
	// Then check the jump timer in case they are already jumping and hit the max jump height
	if ((heldKeys[controls.jump] || heldKeys[getJumpKey()] || pressing) && ((canJump && grounded) || jumping) && jumpTimer > 0)
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
	
	// Move the sneks
	for (var snekNum = 0, length = sneks.length; snekNum < length; snekNum++)
	{
		var currSnek = sneks[snekNum];
		if (grid[Math.floor(currSnek.x)][Math.ceil(currSnek.y)] != blocks.stone)
		{
			// Reverse movement direction when a legde is encountered
			currSnek.direction *= -1;
			// Jump the snek back a bit to prevent him from getting stuck in the air
			currSnek.x += currSnek.direction/15;
		}
		currSnek.x += snekSpeed * deltaT * currSnek.direction;

		// Check for collision with player
		if ((Math.abs(currSnek.x - playerX) < playerWidth/(blockSize*2)) && (Math.abs(currSnek.y - playerY) < playerHeight/(blockSize*2))) {
			console.log("hit!");
		}
	}
	
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
			if (playerY + offsetY <= 0)
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
			else if (playerY + offsetY >= gridHeight)
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
			if (playerX + offsetX <= 0)
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
			else if (playerX + offsetX >= gridWidth)
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
					ctx.fillStyle = "rgba(0, 128, 0, 1)"; // Green
					ctx.fillRect(x * blockSize, y * blockSize, blockSize+1, blockSize+1);
				}
				else if (block == blocks.door)
				{
					ctx.imageSmoothingEnabled = false;
					ctx.drawImage(door, x * blockSize, y * blockSize, blockSize+1, blockSize*2);
				}
				
			}
		}
	}
	
	// Draw grid lines
	if (devMode)
	{
		ctx.strokeStyle = "rgba(150, 150, 150, .3)";
		for (var x = 0; x <= gridWidth; x++)
		{
			ctx.beginPath();
			ctx.moveTo(x * blockSize, 0);
			ctx.lineTo(x * blockSize, canvas.height);
			ctx.stroke();
		}
		for (var y = 0; y < gridHeight; y++)
		{
			ctx.beginPath();
			ctx.moveTo(0, y * blockSize);
			ctx.lineTo(canvas.width, blockSize * y);
			ctx.stroke();
		}
	}
	
	// Draw the player
	ctx.imageSmoothingEnabled = false;
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
		ctx.drawImage(currentSprite, playerX*blockSize-playerWidth*0.75, playerY*blockSize-playerHeight/2, playerWidth*1.5, playerHeight);
	else
		ctx.drawImage(currentSprite, playerX*blockSize-playerWidth/2, playerY*blockSize-playerHeight*0.75, playerWidth, playerHeight*1.5);
	
	// Draw the sneks
	ctx.fillStyle = "rgba(25, 200, 25, 1)";
	ctx.font = "bold " + Math.ceil(blockSize/4) + "px courier";
	for (var snekNum = 0, length = sneks.length; snekNum < length; snekNum++)
	{
		var currSnek = sneks[snekNum];
		ctx.fillRect(currSnek.x * blockSize, currSnek.y * blockSize, (snekHeight * blockSize)/4, snekHeight * blockSize);
		ctx.fillText("Snek | " + currSnek.hp + "HP", (currSnek.x * blockSize) - 25, (currSnek.y * blockSize) - 15);
		if (devMode) {
			ctx.fillStyle = "red";
			ctx.fillRect(currSnek.x * blockSize, currSnek.y * blockSize, 5, 5);
			ctx.fillStyle = "rgba(25, 200, 25, 1)";
		}
	}

	// Display stats
	if (devMode)
	{
		// Red dot on player position
		ctx.fillStyle = "rgba(255, 80, 80, 1)";
		ctx.fillRect(playerX*blockSize-2, playerY*blockSize-2, 4, 4);
		
		// Debug stats:
		// X position and speed
		if (playerXSpeed > 0)
			ctx.fillStyle = "green";
		else if (playerXSpeed < 0)
			ctx.fillStyle = "red";
		else
			ctx.fillStyle = "white";
		ctx.fillText('X velocity: ' + playerXSpeed, 10, 40);
		ctx.fillText('X position: ' + playerX, 10, 60);
		
		// Y position and speed
		if (playerYSpeed < 0)
			ctx.fillStyle = "green";
		else if (playerYSpeed > 0)
			ctx.fillStyle = "red";
		else
			ctx.fillStyle = "white";
		ctx.fillText('Y velocity: ' + playerYSpeed, 10, 80);
		ctx.fillText('Y position: ' + playerY, 10, 100);
		
		// Grounded
		if (grounded)
			ctx.fillStyle = "green";
		else
			ctx.fillStyle = "red";
		ctx.fillText('Grounded: ' + grounded, 10, 130);
		
		// Jumping
		if (jumping)
			ctx.fillStyle = "green";
		else
			ctx.fillStyle = "red";
		ctx.fillText('Jumping: '+ jumping, 10, 150);
		
		// Can Jump
		if (canJump)
			ctx.fillStyle = "green";
		else
			ctx.fillStyle = "red";
		ctx.fillText('Can Jump: '+ canJump, 10, 170);
		
		// Air Resistance
		if (airResistance)
			ctx.fillStyle = "green";
		else
			ctx.fillStyle = "red";
		ctx.fillText('Air resistance: '+ airResistance, 10, 190);

		
		// Screen size
		ctx.fillStyle = "white";
		ctx.fillText('Canvas width: '+ canvas.width, 10, 230);
		ctx.fillText('Window width: ' + window.innerWidth, 10, 250);
		ctx.fillText('Canvas height: ' + canvas.height, 10, 270);
		ctx.fillText('Window height: ' + window.innerHeight, 10, 290);
		ctx.fillText('FPS: ' + framesPerSecond, 10, 300);  
		
		// Data channel connection status
		if (dataChannel)
		{
			if (dataChannel.readyState == "open") ctx.fillStyle = "green";
			else if (dataChannel.readyState == "connecting") ctx.fillStyle = "yellow";
			else if (dataChannel.readyState == "closing") ctx.fillStyle = "orange";
			else if (dataChannel.readyState == "closed") ctx.fillStyle = "red";
			ctx.fillText('Data channel: ' + dataChannel.readyState, 10, 320);
		}
		
		// Touching left side
		if (touchingLeft)
			ctx.fillStyle = "green";
		else
			ctx.fillStyle = "red";
		ctx.fillText('Touching left: '+ touchingLeft, 10, 340);
		
		// Touching right side
		if (touchingLeft)
			ctx.fillStyle = "green";
		else
			ctx.fillStyle = "red";
		ctx.fillText('Touching right: '+ touchingRight, 10, 360);
		
		// Pressing right side
		if (pressing)
			ctx.fillStyle = "green";
		else
			ctx.fillStyle = "red";
		ctx.fillText('Pressing: '+ pressing, 10, 380);
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

function hideMenu()
{
	document.getElementById("menu").style.display = "none";
	return false;
}

function toggleCredits()
{
	if (credits.style.display == "none")
	{
		// Show credits
		document.getElementById("credits").style.display = "";
		document.getElementById("toggleCredits").innerHTML = "Hide credits";
		document.getElementById("menu").style.width = "40%";
	}
	else
	{
		// Hide credits
		document.getElementById("credits").style.display = "none";
		document.getElementById("toggleCredits").innerHTML = "View credits";
		document.getElementById("menu").style.width = "15%";
	}
	return false;
}






