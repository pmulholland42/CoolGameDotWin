

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
		setInterval(sayHello, 1000);
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

	
	
	
	
	
	
	
	
	
	
	
	
/*

//init pubnub
var calls = 0;

var drone = new ScaleDrone('yG0sVcaLcpbHQKJK');

drone.on('open', function (error) {
  if (error) {
    return console.error(error);
  }
  var room = drone.subscribe('my_game');
  room.on('open', function (error) {
    if (error) {
      console.error(error);
    } else {
      console.log('Connected to room');
    }
  });
});

function tapFunction(){
    //alert("Doing something for a tap");

    drone.publish({
    room: "my_game",
    message: { "log" : "tapFunction"
    }

    });
}//tapFunction

function doubleTapFunction(){

  drone.publish({
  room: "my_game",
  message: { "log" : "doubleTapFunction"
  }

  });
}//doubleTapFunction

function swipeRFunction(){
  drone.publish({
  room: "my_game",
  message: { "log" : "swipeRFunction"
  }

  });
}//swipeRFunction

function swipeLFunction(){
  drone.publish({
  room: "my_game",
  message: { "log" : "swipeLFunction"
  }

  });
}//swipeLFunction

function swipeDFunction(){
  drone.publish({
  room: "my_game",
  message: { "log" : "swipeDFunction"
  }

  });
}//swipeDFunction

function swipeUFunction(){
  drone.publish({
  room: "my_game",
  message: { "log" : "swipeUFunction"
  }

  });
}//swipeUFunction
var timer = 0;
function touchStart(){
  if (timer == 0){
    console.log("here");
    var sendDig = getAnDirection();
    drone.publish({
        room: "my_game",
        message: sendDig
    });
    timer = 5;
  } else {
    timer --;
  }



}//touchStart
var tier2=0;
function touchMove(){
if (tier2 == 0){
        var sendAnal = getAnDirection();
        drone.publish({
        room: "my_game",
        message: sendAnal

      });
      tier2 = 5;
    } else {
        tier2 --;
      }

}//touchMove

//touchEnd
function touchEnd() {
	drone.publish({
		room: "my_game",
		message: {
			"touching" : false
		}
	})
}



var cont = new myjoystick(tapFunction, doubleTapFunction, swipeRFunction, swipeLFunction, swipeUFunction, swipeDFunction,
        touchStart, touchMove, touchEnd);*/
