var min_channels = [10000000,10000000,10000000,10000000,10000000,10000000,10000000,10000000]
var max_channels = [0,0,0,0,0,0,0,0]
var couleurs = ["rouge", "orange", "jaune", "vert", "cyan", "bleu", "violet", "rose"] 
var ports = ['Meditation MIDI', 'BetaBusy MIDI', 'AlphaRest MIDI', 'loopMIDI Port'];


const app = require('express');
const http = require('http').createServer(app);
const io = require('socket.io')(http);
var easymidi = require('easymidi');
var betabusy = new easymidi.Output(ports[1]);
var meditation = new easymidi.Output(ports[0]);
var thinkgear = require('node-thinkgear-sockets');


var options = {
  appName: 'openminded',
  appKey: '0fc2141b1b45c573cc2d3a763b8d71c5bde2391',
  enableRawOutput: false,
  format: 'Json' //'BinaryPacket'
};

var client_eeg = thinkgear.createClient(options);


client_eeg.connect();


io.on('connection', (socket) => {

  console.log('ESP32 connected');
  console.log(socket.id);
  console.log("JWT token test: ", socket.handshake.headers)


  client_eeg.on('data',function(data){

    var arr= Object.values(data.eegPower)
    var newValues = compute_values(arr)
    var color = indexOfMax(newValues);
    console.log("COULEUR", couleurs[color])
/*
    betabusy.send('cc', {
        controller: 1,
        value: 127,
        channel: 3
      });
*/

    if(couleurs[color]=="orange"){

      console.log("CYMBAL ROLL")

      sendCymbalRolls();


    }
    else if(couleurs[color]=="rouge"){

      modulateDrone(newValues[0])

    }


    //console.log(data);
      socket.emit('data_eeg', {value: data});
    });

  client_eeg.on('blink_data',function(data){
  console.log(data);
});

    client_eeg.on('error',function(error){
      console.log(error);
      socket.emit('error_eeg', {value: data});
    });

    client_eeg.on('close',function(){
      console.log('closing.');
    });




  socket.on('event_name', (data) => {

    //console.log('Hi from ESP32: ');

  
  })
  
  socket.on('disconnect', () => {

    console.log('Disconnect');

  })

})

http.listen(3000, () => {

  console.log("server launched on port 3000");
})


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



let modulateDrone = (val) => {

    meditation.send('cc', {
    controller: 1,
    value: val,
    channel: 3
  });

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


// should use log instead

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

    newValues[i] = newValues[i].map(min_channels[i], max_channels[i], 0, 100)

  }

  return newValues;
}


