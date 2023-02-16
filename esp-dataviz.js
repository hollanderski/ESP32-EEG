var min_channels = [10000000,10000000,10000000,10000000,10000000,10000000,10000000,10000000]
var max_channels = [0,0,0,0,0,0,0,0]
var couleurs = ["rouge", "orange", "jaune", "vert", "cyan", "bleu", "violet", "rose"] 
var bands = ["delta", "theta", "lowAlpha", "highAlpha", "lowBeta", "highBeta", "lowGamma", "midGamma"];
var ports = ['Meditation MIDI', 'BetaBusy MIDI', 'AlphaRest MIDI', 'loopMIDI Port'];



const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
var easymidi = require('easymidi');
var betabusy = new easymidi.Output(ports[1]);
var meditation = new easymidi.Output(ports[0]);
var thinkgear = require('node-thinkgear-sockets');
var GLOBALMAX = 0


app.get('/',function(req,res) {
  res.sendFile('eeg.html', { root: '.' , myvar : 95});
});


var options = {
  appName: 'openminded',
  appKey: '0fc2141b1b45c573cc2d3a763b8d71c5bde2391',
  enableRawOutput: false,
  format: 'Json' //'BinaryPacket'
};

var client_eeg = thinkgear.createClient(options);


function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min)
}



var mydata = [
{
    "delta": 12.365372900648605,
    "theta": 11.261060885383841,
    "lowAlpha": 8.605020901781758,
    "highAlpha": 8.200288260287554,
    "lowBeta": 8.383890344101816,
    "highBeta":8.240121298076472,
    "lowGamma":7.995643604287271,
    "highGamma":6.0867747269123065
  }

]


/*  test with fake data : 

  setInterval(function(){

    mydata = [
{
    "delta": randomIntFromInterval(12, 6),
    "theta": randomIntFromInterval(12, 6),
    "lowAlpha": randomIntFromInterval(12, 6),
    "highAlpha": randomIntFromInterval(12, 6),
    "lowBeta": randomIntFromInterval(12, 6),
    "highBeta": randomIntFromInterval(12, 6),
    "lowGamma": randomIntFromInterval(12, 6),
    "highGamma": randomIntFromInterval(12, 6),
  }

]

    io.emit('arduino', mydata);
    console.log("wesh")
  }, 3000)

*/

client_eeg.connect();

/*
io.on('connection', (socket) => {

  console.log('ESP32 connected');
  console.log(socket.id);
  console.log("JWT token test: ", socket.handshake.headers)

*/

  client_eeg.on('data',function(data){


    var arr= Object.values(data.eegPower)

    // to get rid of exponential gap between EEG PSD values
    var result = arr.map(x => x!=0? Math.log(x) : 0);


    // check signal quality
    if(data.poorSignalLevel<50){



      var newValues = compute_values(result) 

      var color = indexOfMax(newValues);
      console.log("COULEUR", couleurs[color], bands[color])


        var formatted = [
          {
          "delta": newValues[0],
          "theta": newValues[1],
          "lowAlpha": newValues[2],
          "highAlpha": newValues[3],
          "lowBeta": newValues[4],
          "highBeta": newValues[5],
          "lowGamma": newValues[6],
          "highGamma": newValues[7],
           }       
        ]

        io.emit('arduino', formatted);


        var val_alph = newValues[2].map(0,100,0,127); // 5 + 2 bien
        modulateDrone(val_alph,3);
        var val_alph2 = newValues[3].map(0,100,0,127); // 5 + 2 bien
        modulateDrone(val_alph2,2);
        var val_theta = newValues[1].map(0,100,0,127); 
        modulateDrone(val_theta,1);
        var val_lowgam = newValues[6].map(0,100,0,127); 
        modulateDrone(val_lowgam,0);

        console.log("DRONE ", val_alph, val_alph2, val_theta, val_lowgam)
    }



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


/*

  socket.on('event_name', (data) => {

    //console.log('Hi from ESP32: ');

  
  })
  
  socket.on('disconnect', () => {

    console.log('Disconnect');

  })

})

*/

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



let modulateDrone = (val, chan) => {

    meditation.send('cc', {
    controller: 1,
    value: val,
    channel: chan
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
    if(GLOBALMAX<channels[i])
      GLOBALMAX = channels[i]
  }

}

function compute_values(channels){

  var newValues = channels.slice();
  update_boundaries(channels);

  for(var i=0; i<channels.length; i++){

    newValues[i] = newValues[i].map(min_channels[i], max_channels[i], 0, 100)
    //newValues[i] = newValues[i].map(0, GLOBALMAX, 0, 100)

  }

  return newValues;
}



