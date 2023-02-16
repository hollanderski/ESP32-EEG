var ports = ['loopMIDI Port', 'Meditation MIDI', 'BetaBusy MIDI', 'AlphaRest MIDI'];
const bands = {"delta":0, "theta":1, "lowAlpha":2, "highAlpha":3, "lowBeta":4, "highBeta":5, "lowGamma":6, "midGamma":7};
const midi_notes = {"D2":50, "G#1":44, "E1":40, "E2":52, "G#2":56};
const notes_cymbals = ["E2", "G#2"]
// In Ableton, octave number is different

var easymidi = require('easymidi');
const music_struct = [2*60, 4*60, 6*60, 8*60, 10*60, 12*60];
const input = new easymidi.Input(ports[0]); 
var betabusy = new easymidi.Output(ports[2]);
var meditation = new easymidi.Output(ports[1]);


var NB_TICKS = 0;
var CURRENT_TIME = 0;
var state = true;

/* Main Symphony Structure */

function eeg_symphony(time, data){

	if(time < music_struct[0]){

		if(state)
			console.log("Introduction percussions");

		state=false;

		introduction(data);


	} else if(time > music_struct[0] && time < music_struct[1]){

		console.log("Entrée des drones");

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

	if(data["blink"]==1){
		console.log("BLINK")
		sendCymbalKick();
		sendCymbalRolls();
	}


	

	/*

	setInterval(() => {
	  console.log("cymbal")
	  sendCymbalRolls()
	}, 1000);

	*/

	


}

function drones(){

	/* 

	Meditation is defined by :

		* several drones controlled by alpha, delta, theta and gamma waves
		* gamelan sample volume controlled by meditation level

	continous values of CC are sent to Meditation MIDI port, modulating distorsion and 
	spatial effects of drones. 

	*/

}

function attention(){

	/* 

	Attention is defined by rhythmic loop

	*/
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



let modulateDrone = (val) => {

    meditation.send('cc', {
    controller: 1,
    value: val,
    channel: 3
  });

}



/* Utils */

function get_time() {
	NB_TICKS++;
	CURRENT_TIME = (NB_TICKS / 48) //* 2
	return CURRENT_TIME;
}

function track_symphony(){
	curr_time = get_time();
	eeg_data = {

		"psd" : [randomIntFromInterval(0,127), randomIntFromInterval(0,127), randomIntFromInterval(0,127), randomIntFromInterval(0,127), randomIntFromInterval(0,127), randomIntFromInterval(0,127), randomIntFromInterval(0,127), randomIntFromInterval(0,127)],
		"blink" : randomIntFromInterval(0,100)

	}

	eeg_symphony(curr_time, eeg_data);
}


function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min)
}


input.on('position', msg => console.log('position', msg.value));

input.on('clock', () => track_symphony());
