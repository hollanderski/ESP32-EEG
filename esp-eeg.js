const app = require('express');
const http = require('http').createServer(app);
const io = require('socket.io')(http);

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
      console.log(data);
      socket.emit('data_eeg', {value: data});
    });

    client_eeg.on('error',function(error){
      console.log(error);
      socket.emit('error_eeg', {value: data});
    });

    client_eeg.on('close',function(){
      console.log('closing.');
    });




  socket.on('event_name', (data) => {

    console.log('Hi from ESP32: ');

  
  })
  
  socket.on('disconnect', () => {

    console.log('Disconnect');

  })

})

http.listen(3000, () => {

  console.log("server launched on port 3000");
})

