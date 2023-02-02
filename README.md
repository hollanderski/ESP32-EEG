# ESP32-EEG : Music + light control with EEG (Neurosky)
V2 of [Strange Loops](https://camps.aptaracorp.com/ACM_PMS/PMS/ACM/TEI23/76/6383df6f-7aeb-11ed-a76e-16bb50361d1f/OUT/tei23-76.html) replacing Arduino with an ESP32-WROVER. 
Instead of Serial, all data is streamed via sockets :
* ~~TGAM -> Max4Live (NodeJS support)~~ 
* TGAM -> native NodeJS (loopMIDI + easymidi) -> Ableton Live

Update : instead of collecting EEG data from NodeJS embedded in Max4Live, which was not easy for routing the EEG data coming from 1 Max4Live instance accross Ableton tracks, I created one virtual MIDI instrument per EEG data feature and route the MIDI (note + CC) messages directly from NodeJS to Ableton. 
On Windows creating a Virtual MIDI device can be done with [LoopMIDI](http://www.tobias-erichsen.de/software/loopmidi.html). I use the node module [EasyMIDI](https://github.com/dinchak/node-easymidi) to send MIDI notes on different virtual MIDI instruments and automate CC in Kontakt. This method is supposed to help reducing CPU load in Ableton. For Mac users, it is way easier with the native IAD Driver. 

* NodeJS -> ESP32 -> LED strips -> optic fibers

For the moment streaming EEG data from PC is overkill but I will use this code for multi-client app in the future 

## Requirements
### ESP32
* ArduinoJson
* WebSocketsClient
* SocketIOclient
### PC
* ThinkGear Connector
