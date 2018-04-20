// PUBNUB
	var pubnub = PUBNUB.init({
		subscribe_key: 'sub-c-9609aa90-f010-11e6-9032-0619f8945a4f',
		publish_key: 'pub-c-62822c7d-339b-4abc-9e87-fb6671883787'
	});
	pubnub.subscribe({
    channel: "con", // Subscribe to our random channel.
    message: function(m) {
		//console.log(m);
        // Handle the message.
        var key = Object.keys(m);
		//console.log(m);
		console.log(m);

        if(key == "log") {
			console.log(m.log);
			
        }
    }
	});