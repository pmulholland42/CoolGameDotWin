

var signalingServer = "ws://18.233.98.225:8080";
var peerConnection; // WebRTC connection to the controller
initializeConnection();

// WebRTC
function initializeConnection()
{	
	// Connect to the signaling server
	console.log("Connecting to signaling server...");
	const serverConnection = new WebSocket(signalingServer);
	serverConnection.onmessage = gotMessageFromServer;
	serverConnection.addEventListener('open', function (event)
	{
		console.log("Connection opened.");
		
		// Initialize WebRTC connection
		var configuration = {'iceServers': [{'urls': 'stun:stun.services.mozilla.com'}, {'urls': 'stun:stun.l.google.com:19302'}]};
		peerConnection = new RTCPeerConnection(configuration);
		peerConnection.ondatachannel = gotDataChannel;
		peerConnection.onicecandidate = gotIceCandidate;	
		function gotIceCandidate(event)
		{
			if(event.candidate != null)
			{
				serverConnection.send(JSON.stringify({'ice': event.candidate}));
			}
		}	
		console.log("Waiting for offer from desktop...");
	});
	
	function gotMessageFromServer(message)
	{
		var signal = JSON.parse(message.data);
		if(signal.sdp)// && !peerConnection.remoteDescription)
		{
			peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function() {
				if(signal.sdp.type == 'offer')
				{
					// Here we get an offer from the desktop via the server
					console.log("Received offer. Creating answer...");
					peerConnection.createAnswer().then(answerSuccess, answerError);
				}
			});
		}
		else if(signal.ice)
		{
			peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice));
		}
	}
	
	function answerSuccess(description)
	{
		// Send the answer to the desktop via the signaling server
		console.log("Answer created. Sending answer...");
		serverConnection.send(JSON.stringify({'sdp': description}));
		peerConnection.setLocalDescription(description).then(localDescriptionSuccess, localDescriptionError);
	}
	function answerError(error)
	{
		console.log("Error creating answer:", error);
	}
	
	function localDescriptionSuccess()
	{
		console.log("Successfully set local description.");
		//serverConnection.onmessage = gotMessageFromServer;
		console.log("Local description:", peerConnection.localDescription);
		console.log("Remote description:", peerConnection.remoteDescription);
	}
	function localDescriptionError(error)
	{
		console.log("Error setting local description:", error);
	}
	
	function gotDataChannel(event)
	{
		// Data channel has been opened by the desktop
		console.log("Data channel has been opened by the desktop.");
		var dataChannel = event.channel;
		dataChannel.onmessage = gotMessageFromDesktop;
		dataChannel.send("Hello desktop!");
	}
	
	function gotMessageFromDesktop(event)
	{
		console.log("Message from desktop:", event.data);
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
