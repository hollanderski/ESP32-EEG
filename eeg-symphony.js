// Available virtual MIDI port created with loopMIDI
var ports = ['loopMIDI Port', 'Meditation MIDI', 'BetaBusy MIDI', 'AlphaRest MIDI'];

// PSD bands
const bands = {"delta":0, "theta":1, "lowAlpha":2, "highAlpha":3, "lowBeta":4, "highBeta":5, "lowGamma":6, "midGamma":7};
// Boundaries to track local maxima of each band
var min_channels = [10000000,10000000,10000000,10000000,10000000,10000000,10000000,10000000]
var max_channels = [0,0,0,0,0,0,0,0]

// codes for MIDI notes, note that octave number seems different in Ableton than standard
const midi_notes = {"D2":50, "G#1":44, "E1":40, "E2":52, "G#2":56};
const notes_cymbals = ["E2", "G#2"]


var easymidi = require('easymidi');

// Differents parts of the music piece 
const music_struct = [2*60, 4*60, 6*60, 8*60, 10*60, 12*60];

// MIDI Input used to track Ableton Clock 
const input = new easymidi.Input(ports[0]);

// 2 MIDI Outputs for different instruments 
var betabusy = new easymidi.Output(ports[2]);
var meditation = new easymidi.Output(ports[1]);


var NB_TICKS = 0;	// Ticks of Ableton's MIDI Clock
var CURRENT_TIME = 0;	// Current time in Ableton track

var state = true;
var THRESHOLD_MEDITATION=90;
var DEMO_MODE = false;	// either test data or real EEG data

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


	client_eeg.on('data',function(data){


    // check signal quality
    if(data.poorSignalLevel<50){

    	console.log("BAD SIGNAL: ", data.poorSignalLevel);

    } else {

    	arr= Object.values(data.eegPower)

    	// to get rid of exponential gap between EEG PSD values
    	result = arr.map(x => x!=0? Math.log(x) : 0);
    	newValues = compute_values(result) // scaling 0-127
    	data["psd_scaled"] = newValues;


    	eeg_symphony(CURRENT_TIME, data);

    }
      //socket.emit('data_eeg', {value: data});
    });

	// blinkStrength ranges from 1 to 255 
    client_eeg.on('blink_data',function(data){
    	eeg_symphony(CURRENT_TIME, data);
	});

    client_eeg.on('error',function(error){
      console.log(error);
      //socket.emit('error_eeg', {value: data});
    });

    client_eeg.on('close',function(){
      console.log('closing.');
    });


}



/* Main Symphony Structure */

function eeg_symphony(time, data){

	console.log(time, data);

	if(time < music_struct[0]){

		if(state){
			console.log("Introduction percussions");
			state=false;
		}

		introduction(data);


	} else if(time >= music_struct[0] && time < music_struct[1]){

		if(time == music_struct[0]){
			console.log("Entrée des drones");
		}

		drones(data);


	} else if(time > music_struct[1] && time < music_struct[2]){

		console.log("Attention");

	} else if(time > music_struct[2] && time < music_struct[3]){

		console.log("Transe en danse");

	} else if(time > music_struct[3] && time < music_struct[4]){

		console.log("Emotions");

	} else if(time > music_struct[4] && time < music_struct[5]){

		console.log("A cappella");

	} else if(time > music_struct[5] && time < music_struct[6]){

		console.log("Fin");

	}
}


/* Symphony Parts */ 

function introduction(data){

	/* 

	Introduction is defined by CC messages for : 

		* cymbals rolls controlled by beta waves
		* cymbals kicks with eye blinks

	short cymbal kicks are sent via CC through BetaBusy virtual MIDI port 


	*/

	if("blinkStrength" in data  &&  data["blinkStrength"] >= 200){ 
		console.log("BLINK")
		sendCymbalKick();
	}


	if(indexOfMax(data["psd_scaled"])==bands["highBeta"]){
		console.log("BETA ROLLS")
		sendCymbalRolls();
	}
	

}

function drones(data){

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
	

	console.log(val_lowalph,val_highalph,val_theta,val_lowgam)
	
	modulateDrone(val_lowgam,0);
	modulateDrone(val_lowalph,3);

    modulateDrone(val_highalph,2);
    modulateDrone(val_theta,1);


    // GAMELAN

    volume = data["eSense"]["meditation"]*1.27 	// scaling for CC message
    console.log("VOLUME ", )
    gamelanVolume(volume);

/*
    if(data["meditation"]>THRESHOLD_MEDITATION){
    	console.log("GAMELAN");
    	gamelanVolume(127);
    }
*/

}

function attention(){

	/* 

	Attention is defined by rhythmic loop

	*/
}

function emotion(){

	// "CC6 (Meditation Port)" was mapped to "Dry/Wet Reverb Level" of voice in Ableton

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



let modulateDrone = (val, chan) => {

    meditation.send('cc', {
    controller: 1,
    value: val,
    channel: chan
  });

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


function update_boundaries(channels){

  for(var i=0; i<channels.length; i++){
    if(min_channels[i]>channels[i])
      min_channels[i]=channels[i]
    if(max_channels[i]<channels[i])
      max_channels[i]=channels[i]
    if(GLOBALMAX<channels[i])
      GLOBALMAX = channels[i]
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
