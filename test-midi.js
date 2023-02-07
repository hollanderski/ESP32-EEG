let ports = ['Meditation MIDI', 'BetaBusy MIDI', 'AlphaRest MIDI', 'loopMIDI Port'];
var easymidi = require('easymidi');
var output = new easymidi.Output(ports[0]); 

//noteoff

// MIDI note 
output.send('noteon', {
  note: 64, 
  velocity: 127,
  channel: 3 // easymidi : chan_3 -> ableton : chan_4  
});


// CC message
output.send('cc', {
  controller: 1,
  value: 27,
  channel: 3
});




let sendCC = () => {

    output.send('cc', {
    controller: 1,
    value: 120,//127,
    channel: 3
  });


    setTimeout(() => {

        output.send('cc', {
        controller: 1,
        value: 0,
        channel: 3
      });

    }, 300);
}


setInterval(() => {
  sendCC()
}, 1000);