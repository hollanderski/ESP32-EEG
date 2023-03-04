// Available virtual MIDI port created with loopMIDI
var ports = ['loopMIDI Port', 'Meditation MIDI', 'BetaBusy MIDI', 'Attention MIDI', 'Gamelan Sampler', 'Tingsha MIDI'];

// PSD bands
const bands = {"delta":0, "theta":1, "lowAlpha":2, "highAlpha":3, "lowBeta":4, "highBeta":5, "lowGamma":6, "midGamma":7};
const couleurs = ["rouge", "orange", "jaune", "vert", "cyan", "bleu", "violet", "rose"] 
const hue = [0,32,64,96,128,160,192,224];
// Boundaries to track local maxima of each band
var min_channels = [10000000,10000000,10000000,10000000,10000000,10000000,10000000,10000000]
var max_channels = [0,0,0,0,0,0,0,0]

// codes for MIDI notes, note that octave number seems different in Ableton than standard
const midi_notes = {"D2":50, "G#1":44, "E1":40, "E2":52, "G#2":56, "C4":72, "C3":60};
const notes_cymbals = ["E2", "G#2"]
const mallet_cc = { "low": 5, "high":6 }
const drone_cc = { "alpha": 3, "gamma":2 }
//const tingsha_notes = ["C3", "C#3", "D3", "C4"];


var easymidi = require('easymidi');
var btSerial = new (require("bluetooth-serial-port").BluetoothSerialPort)();

// all the custom LED mode that can be triggered via bluetooth message sent to ESP32
const LED_modes = {"blink":5,"roll":3, "betaclochette":6, "theta":1, "gamma":2, "meditationpeak":4, "drone":7, "gamelan":8, "rainbow":9, "delta":10, "bpm":11};

// Differents parts of the music piece 
const music_struct = {"introduction" : 0, "drones" : 2*60, "transe":4*60, "attention" : 5*60+20, "emotion" : 8*60, "cappella": 10*60, "final" : 12*60};

// MIDI Input used to track Ableton Clock 
const input = new easymidi.Input(ports[0]);

// 5 MIDI Outputs for different instruments 
var betabusy = new easymidi.Output(ports[2]);
var meditation = new easymidi.Output(ports[1]);
var attention = new easymidi.Output(ports[3]);
var gamelan_sampler = new easymidi.Output(ports[4]);
var tingsha = new easymidi.Output(ports[5]);


var NB_TICKS = 0;	// Ticks of Ableton's MIDI Clock
var CURRENT_TIME = 0;	// Current time in Ableton track

var state = true;
var THRESHOLD_MEDITATION = 60;
var THRESHOLD_ATTENTION = 60;
var THRESHOLD_BLINK = 65;
var THRESHOLD_POORSIGNAL = 51; //81; //60;
var DEMO_MODE = false;	// either test data or real EEG data
var is_sample_over = true;
var is_blinking = false;

if(!DEMO_MODE){


	var thinkgear = require('node-thinkgear-sockets');
	var options = {
	  appName: 'openminded',
	  appKey: '0fc2141b1b45c573cc2d3a763b8d71c5bde2391',
	  enableRawOutput: false,
	  format: 'Json' //'BinaryPacket'
	};

	var client_eeg = thinkgear.createClient(options);


	client_eeg.connect();


	// Bluetooth connection with ESP32 :
	btSerial.on("found", function (address, name) {

    if(name=="Ninon's ESP32 BT"){

        console.log("Ninon est dans la place")
        btSerial.findSerialPortChannel(
            address,
            function (channel) {
                btSerial.connect(
                    address,
                    channel,
                    function () {
                        console.log("connected");

                        sendMsgBT(btSerial, 5);
                        // DO STUFF WITH EEG
                        process_eeg(btSerial);
                    },
                    function () {
                        console.log("cannot connect");
                    });
                btSerial.close();
              },
            function () {
                console.log("found nothing");
            });
      }
   });

	btSerial.inquire();


		function process_eeg(btSerial){

			
			client_eeg.on('data',function(data){

			console.log("data")


	    // check signal quality
	    if(data.poorSignalLevel>THRESHOLD_POORSIGNAL){

	    	console.log("BAD SIGNAL: ", data.poorSignalLevel);

	    } else {

	    
		    	arr= Object.values(data.eegPower)

		    	// to get rid of exponential gap between EEG PSD values
		    	result = arr.map(x => x!=0? Math.log(x) : 0);

		    	newValues = compute_values(result) // scaling 0-127

		    	psd = {"psd_scaled" : newValues};
		    	psd["eSense"]=data["eSense"]

		    	//data["psd_scaled"] = newValues;

		    	eeg_symphony(CURRENT_TIME, psd, btSerial);

	    }
	      //socket.emit('data_eeg', {value: data});
	    });


	    


		// blinkStrength ranges from 1 to 255 
	    client_eeg.on('blink_data',function(data){
	    	blink_bell(data, btSerial);
	    	//eeg_symphony(CURRENT_TIME, data, btSerial);
		});

		
		

	    client_eeg.on('error',function(error){
	      console.log(error);
	      //socket.emit('error_eeg', {value: data});
	    });

	    client_eeg.on('close',function(){
	      console.log('closing.');
	    });

  }

}


function blink_bell(data, btSerial){

	if("blinkStrength" in data  &&  data["blinkStrength"] >= THRESHOLD_BLINK){ 
		

		console.log("BLINK", data["blinkStrength"] )
		playTingsha()
		sendMsgBT(btSerial, LED_modes["blink"]);
		is_blinking=true;
		setTimeout(() => {

	        is_blinking=false;

	    }, 100);

	}

}


/* Main Symphony Structure */

function eeg_symphony(time, data, btSerial){

	console.log("SYMPHONY TIME = ", time, data);

	if(time < music_struct["drones"]){

		if(state){
			console.log("Introduction percussions");
			state=false;
		}

		introduction(data, btSerial);


	} else if(time >= music_struct["drones"] && time < music_struct["transe"]){ // drone

		if(time == music_struct["drones"]){
			console.log("Entrée des drones");
		}

		drones(data, btSerial);


	} 

	if(time > music_struct["transe"] && time < music_struct["attention"]){ // attention

		if(time == music_struct["transe"]){
			console.log("TRANSE");
		}

		transe(data, btSerial);

	} 

	if(time > music_struct["attention"] && time < music_struct["emotion"]){ // attention

		if(time == music_struct["attention"]){
			console.log("Attention Tic Tac");
		}

		console.log("Attention Tic Tac");
		attention_please(data, btSerial);

	} 

	if(time >  music_struct["emotion"] && time < music_struct["final"]){

		console.log("Emotions");
		emotion(data, btSerial);

	} 

	/* else if(time > music_struct["emotion"] && time < music_struct["cappella"]){

		console.log("Transe en danse");

	} else if(time > music_struct[3] && time < music_struct[4]){

		console.log("Emotions");

	} else if(time > music_struct[4] && time < music_struct[5]){

		console.log("A cappella");

	} else if(time > music_struct[5] && time < music_struct[6]){

		console.log("Fin");

	}

	*/
}


/* Symphony Parts */ 

function introduction(data, btSerial){

	/* 

	Introduction is defined by CC messages for : 

		* cymbals rolls controlled by beta waves
		* cymbals kicks with eye blinks

	short cymbal kicks are sent via CC through BetaBusy virtual MIDI port 


	*/
/*
	if("blinkStrength" in data  &&  data["blinkStrength"] >= THRESHOLD_BLINK){ 
		

		console.log("Cymball Roll")
		sendCymbalRolls();
		sendMsgBT(btSerial, LED_modes["blink"]);
		is_blinking=true;
		setTimeout(() => {

	        is_blinking=false;

	    }, 100);

		//sendMsgBT(btSerial, LED_modes["roll"]);
		// c erased by next
	}

*/


	if("psd_scaled" in data){

			if(indexOfMax(data["psd_scaled"])==bands["highBeta"]){

				console.log("Cymbal")
				//sendCymbalKick();
				sendCymbalRolls();
				sendMsgBT(btSerial, LED_modes["blink"]); // autre
				is_blinking=true;
				setTimeout(() => {

			        is_blinking=false;

			    }, 100);
				
			}

			modulateMallet(data["psd_scaled"][bands["lowBeta"]], "low");
			modulateMallet(data["psd_scaled"][bands["highBeta"]], "high");
			if(!is_blinking)
				sendMsgBT(btSerial, LED_modes["betaclochette"]);

	}
	
	

}

function drones(data, btSerial){

	/* 

	Meditation is defined by :

		* several drones controlled by alpha, delta, theta and gamma waves
		* gamelan sample volume controlled by meditation level - "CC5 (Meditation Port)" was mapped to "Gamelan Sample Volume" in Ableton

	continous values of CC are sent to Meditation MIDI port, modulating distorsion and 
	spatial effects of drones. 

	*/


	// DRONES

	val_lowalph = data["psd_scaled"][bands["lowAlpha"]]
	val_lowgam = data["psd_scaled"][bands["lowGamma"]]

	val_highalph = data["psd_scaled"][bands["highAlpha"]]
	val_theta = data["psd_scaled"][bands["theta"]]
	

	//console.log(val_lowalph,val_highalph) 
	modulateDrone(val_lowalph,"alpha");
	sendMsgBT(btSerial, LED_modes["drone"],val_lowalph.map(0,127,0,255));
	// mapper en 255 /!\

    //modulateDrone(val_highalph,2);
    //modulateDrone(val_theta,1);


    // GAMELAN

    //volume = data["eSense"]["meditation"]*1.27 	// scaling for CC message
    //console.log("VOLUME ", )
    //gamelanVolume(volume);
/*
    console.log(data["eSense"])
    if(data["eSense"]["meditation"]>THRESHOLD_MEDITATION){

    	console.log("GAMELAN");
    	sendMsgBT(btSerial, LED_modes["gamelan"]);
    	if(is_sample_over){
    		is_sample_over=false;
    		playGamelanSample();
    	}
    }


 */

/*
    if(data["meditation"]>THRESHOLD_MEDITATION){
    	console.log("GAMELAN");
    	gamelanVolume(127);
    }
*/

}

function transe(data, btSerial){

	/* 

	Transe is defined by :

		* gamelan samples controlled by meditation level - "CC5 (Meditation Port)" was mapped to "Gamelan Sample Volume" in Ableton

	*/


    // GAMELAN

    //volume = data["eSense"]["meditation"]*1.27 	// scaling for CC message
    //console.log("VOLUME ", )
    //gamelanVolume(volume);

    console.log(data["eSense"])
    if(data["eSense"]["meditation"]>THRESHOLD_MEDITATION){

    	console.log("GAMELAN");
    	sendMsgBT(btSerial, LED_modes["gamelan"]);
    	if(is_sample_over){
    		is_sample_over=false;
    		playGamelanSample();
    	}
    }

/*
    if(data["meditation"]>THRESHOLD_MEDITATION){
    	console.log("GAMELAN");
    	gamelanVolume(127);
    }
*/

}

function attention_please(data, btSerial){

	/* 

	Attention is defined by rhythmic loop whose texture is controlled 
	by attention level + delta wave (or theta?)

	CC availables on Attention MIDI port : CC3 (saturation/tape + pitch), CC5 (beat metallique), CC6 (non linear wave), CC8 (high pitch dreamy drone), CC9 (Free Dive Chromos)

	*/

	console.log("ATTENTION PLEASE!!")

	val_delta = data["psd_scaled"][bands["delta"]]
	modulateAttention(val_delta,6);
	val_att_scaled = data["eSense"]["attention"] *1.27;
	modulateAttention(val_att_scaled,9); // attention ne module paas assez amplement  ou 1

	sendMsgBT(btSerial, LED_modes["bpm"],val_att_scaled);

	console.log(val_delta, val_att_scaled);

    if(data["eSense"]["attention"]>THRESHOLD_ATTENTION){
    	console.log("THRESHOLD_ATTENTION")
    	sendMsgBT(btSerial, LED_modes["roll"]); //? 
    }

  
 
}

function emotion(data, btSerial){

	// "CC6 (Meditation Port)" was mapped to "Dry/Wet Reverb Level" of voice in Ableton

	//val_midgamma = data["psd_scaled"][bands["delta"]]

	// beta / alpha ratio (supposed to represent dominance)

	val_midgamma = ( data["psd_scaled"][bands["highBeta"]] + data["psd_scaled"][bands["lowBeta"]] / 2 ) / ( data["psd_scaled"][bands["highAlpha"]] + data["psd_scaled"][bands["lowAlpha"]] / 2 ) * 100

	var color = indexOfMax(data["psd_scaled"]);
    //console.log("COULEUR", couleurs[color], bands[color], hue[color])
    //sendMsgBT(btSerial, LED_modes["rainbow"],hue[color]);

    if(color==bands["delta"]){ // white
    	sendMsgBT(btSerial, LED_modes["delta"]);
    	console.log("DELTA")

    } else if(color==bands["theta"]){  // green - cyan
    	sendMsgBT(btSerial, LED_modes["theta"]);
    	console.log("THETA")

    } else if(color == bands["lowAlpha"] || color== bands["highAlpha"]){ // blue
    	console.log("ALPHA")
    	sendMsgBT(btSerial, LED_modes["drone"],255);
    } else if(color == bands["lowBeta"] || color== bands["highBeta"]){ // yellow - pink
    	console.log("BETA")
    	sendMsgBT(btSerial, LED_modes["betaclochette"]);
    } else if(color == bands["lowGamma"] || color== bands["midGamma"]){ // orange -red 
    	console.log("GAMMA")
    	sendMsgBT(btSerial, LED_modes["gamma"]);
    }

	console.log("emotion ", val_midgamma) 
	modulateDrone(val_midgamma,"gamma");
	//sendMsgBT(btSerial, LED_modes["drone"],val_midgamma.map(0,127,0,255));

}


let sendCymbalRolls = () => {

    betabusy.send('cc', {
    controller: 1,
    value: 127,
    channel: 3
  });
 

    setTimeout(() => {

        betabusy.send('cc', {
        controller: 1,
        value: 0,
        channel: 3
      });

    }, 300);
}


let sendCymbalKick = () => {

	note_idx = randomIntFromInterval(0,1)
	note = notes_cymbals[note_idx]


    betabusy.send('noteon', {
	    note: midi_notes[note],
	  	velocity: 127,
	  	channel: 3
  });
 

    setTimeout(() => {

        betabusy.send('noteoff', {
	        note: midi_notes[note],
	  		velocity: 127,
	  		channel: 3
      });

    }, 300);
}



let modulateDrone = (val, band) => {

    meditation.send('cc', {
    controller: drone_cc[band],
    value: val,
    channel: 3
  });

}

let modulateMallet = (val, band) => {

    betabusy.send('cc', {
    controller: mallet_cc[band],
    value: val,
    channel: 3
  });

}



let modulateAttention = (val, cc) => {

    attention.send('cc', {
    controller: cc,
    value: val,
    channel: 1
  });

}


let playGamelanSample = () => {

	// C3 ou C4


    gamelan_sampler.send('noteon', {
	    note: midi_notes["C4"],
	  	velocity: randomIntFromInterval(126,127), // ici indiquer different sample (mappés par vélocité)
	  	channel: 3
  });
 

    setTimeout(() => {

    	is_sample_over = true;

        gamelan_sampler.send('noteoff', {
	        note: midi_notes["C4"],
	  		velocity: 127, 
	  		channel: 3
      });

    }, 10000);
}


let playTingsha = () => {


    tingsha.send('noteon', {
	    note: midi_notes["C4"],
	  	velocity: 127, // ici indiquer different sample (mappés par vélocité)
	  	channel: 3
  });
 

    setTimeout(() => {

        tingsha.send('noteoff', {
	        note: midi_notes["C4"],
	  		velocity: 127, 
	  		channel: 3
      });

    }, 3000);
}


let gamelanVolume = (volume) => {


    meditation.send('cc', {
    controller: 5,
    value: volume,
    channel: 3
  });


  /*  setTimeout(() => {

        meditation.send('cc', {
        controller: 5,
        value: 0,
        channel: 3
      });

    }, 10000);
    */
}



/* Utils */


// Send a message to ESP32 via Bluetooth
function sendMsgBT(btSerial, mode, val=null){

	data_sent = {"mode": mode};

	if(val!=null){
		data_sent["val"]=val;
	}

	// var buf = Buffer.from(JSON.stringify(obj));
	var buf = Buffer.from(JSON.stringify(data_sent));

	btSerial.write(buf, function(err, count) {
  if (err) {
  	console.log('Error received: ' + err);
  }});
}


function get_time() {
	NB_TICKS++;
	CURRENT_TIME = (NB_TICKS / 48) //* 2
	return CURRENT_TIME;
}

function genDemoData(){

	return {

		"psd_scaled" : [randomIntFromInterval(0,127), randomIntFromInterval(0,127), randomIntFromInterval(0,127), randomIntFromInterval(0,127), randomIntFromInterval(0,127), randomIntFromInterval(0,127), randomIntFromInterval(0,127), randomIntFromInterval(0,127)],
		"blinkStrength" : randomIntFromInterval(0,255),
		"eSense": {
			"attention": randomIntFromInterval(0,100),
			"meditation": randomIntFromInterval(0,100)
		}

	}
}


function track_symphony(){
	curr_time = get_time();

	// demo mode
	if(DEMO_MODE)
		eeg_data = genDemoData();

	eeg_symphony(curr_time, eeg_data);
}

function update_position(msg){


	NB_TICKS=(msg.value / 8) * 48;
	console.log('position', msg.value, NB_TICKS, msg.value / 8);

}


function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min)
}

function indexOfMax(arr) {
    if (arr.length === 0) {
        return -1;
    }

    var max = arr[0];
    var maxIndex = 0;

    for (var i = 1; i < arr.length; i++) {
        if (arr[i] > max) {
            maxIndex = i;
            max = arr[i];
        }
    }

    return maxIndex;
}


Number.prototype.map = function (in_min, in_max, out_min, out_max) {
  return (this - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

function update_boundaries(channels){

  for(var i=0; i<channels.length; i++){
    if(min_channels[i]>channels[i])
      min_channels[i]=channels[i]
    if(max_channels[i]<channels[i])
      max_channels[i]=channels[i]
  }

}

function compute_values(channels){

  var newValues = channels.slice();
  update_boundaries(channels);

  for(var i=0; i<channels.length; i++){

    newValues[i] = newValues[i].map(min_channels[i], max_channels[i], 0, 127)

  }

  return newValues;
}




input.on('position', msg => update_position(msg));

if(DEMO_MODE)
	input.on('clock', () => track_symphony());
else
	input.on('clock', () => get_time());
