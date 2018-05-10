

var signalingServer = "ws://18.233.98.225:8080";
var peerConnection; // WebRTC connection to the game
var localDescriptionSet = false;
var remoteDescriptionSet = false;
var dataChannel;
initializeConnection();

// WebRTC
function initializeConnection()
{	
	var url = new URL(window.location.href);
	var uuid = url.searchParams.get("id");
	console.log(uuid);
	
	// Connect to the signaling server
	console.log("Connecting to signaling server...");
	const serverConnection = new WebSocket(signalingServer);

	serverConnection.addEventListener('open', function (event)
	{
		console.log("Connection opened.");
		
		// Initialize WebRTC connection
		var configuration = {'iceServers': [{'urls': 'stun:stun.stunprotocol.org:3478'}, {'urls': 'stun:stun.l.google.com:19302'},]};
		peerConnection = new RTCPeerConnection(configuration);
		peerConnection.onicecandidate = gotIceCandidate;
		dataChannel = peerConnection.createDataChannel("controller");
		dataChannel.onopen = sendData;
		dataChannel.onmessage = gotMessageFromGame;
		function gotIceCandidate(event)
		{
			if(event.candidate != null)
			{
				serverConnection.send(JSON.stringify({'ice': event.candidate, 'uuid': uuid}));
			}
		}

		// Create an offer to send to the game
		console.log("Creating offer...");
		offer = peerConnection.createOffer().then(onOfferSuccess, onError);
		
		function onOfferSuccess(description)
		{
			// Send the offer to the game via the signaling server
			console.log("Offer created. Sending offer...");
			serverConnection.send(JSON.stringify({'sdp': description, 'uuid': uuid}));
			peerConnection.setLocalDescription(description).then(onLocalDescriptionSuccess, onError);
		}
	});
		
	function gotMessageFromServer(message)
	{
		var signal = JSON.parse(message.data);
		if(signal.uuid != uuid) return;
		if(signal.sdp && signal.sdp.type == 'answer')
		{
			// Here we get an answer back from the game via the server
			console.log("Received answer from game.");
			peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(onRemoteDescriptionSuccess, onError);
		}
		else if(signal.ice && remoteDescriptionSet)
		{
			peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).then(onIceSuccess, onError);
		}
	}
	
	function onIceSuccess()
	{
		console.log("Successfully added ICE candidate.");
	}
	function onLocalDescriptionSuccess()
	{
		serverConnection.onmessage = gotMessageFromServer;
		console.log("Successfully set local description.");
	}
	function onRemoteDescriptionSuccess()
	{
		remoteDescriptionSet = true;
		console.log("Successfully set remote description.");
	}
	function onError(error)
	{
		console.error(error);
	}
	
	function sendData(event)
	{
		console.log("Saying hello to the game");
		//setInterval(sayHello, 1000);
	}
	
	function sayHello()
	{
		dataChannel.send(uuid);
	}
	
	function gotMessageFromGame(event)
	{
		console.log("Message from game:", event.data);
	}
}

function tapFunction()
{
	dataChannel.send(JSON.stringify({"action" : "tap"}));
}

function doubleTapFunction()
{
	dataChannel.send(JSON.stringify({"action" : "doubleTap"}));
}

function swipeRFunction()
{
	dataChannel.send(JSON.stringify({"action" : "swipeRight"}));
}

function swipeLFunction()
{
	dataChannel.send(JSON.stringify({"action" : "swipeLeft"}));
}

function swipeDFunction()
{
	dataChannel.send(JSON.stringify({"action" : "swipeDown"}));
}

function swipeUFunction()
{
	dataChannel.send(JSON.stringify({"action" : "swipeUp"}));
}

var timer = 0;
function touchStart()
{
  if (timer == 0){

	dataChannel.send(JSON.stringify({"anlg" : getAnDirection(), "dig" : getDigDirection}));
    timer = 5;
  } else {
    timer --;
  }



}

var tier2=0;
function touchMove()
{
	if (tier2 == 0)
	{
		dataChannel.send(JSON.stringify({"anlg" : getAnDirection(), "dig" : getDigDirection}));
		tier2 = 5;
    }
	else
	{
        tier2 --;
	}

}

function touchEnd()
{
	dataChannel.send(JSON.stringify({"touching" : false}));
}

var cont = new myjoystick(tapFunction, doubleTapFunction, swipeRFunction, swipeLFunction, swipeUFunction, swipeDFunction, touchStart, touchMove, touchEnd);



