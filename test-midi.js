var easymidi = require('easymidi');
var output = new easymidi.Output('loopMIDI Port');

//noteoff

// MIDI note 
output.send('noteon', {
  note: 64, 
  velocity: 127,
  channel: 3
});


// CC message
output.send('cc', {
  controller: 11,
  value: 127,
  channel: 3
});