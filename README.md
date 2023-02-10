# ESP32-EEG : Music + viz + light control with EEG (Neurosky)
This is the code for the performance Strange Loops happening at TEI conference 2023. Especially, it's the V2 of [Strange Loops](https://camps.aptaracorp.com/ACM_PMS/PMS/ACM/TEI23/76/6383df6f-7aeb-11ed-a76e-16bb50361d1f/OUT/tei23-76.html) replacing Arduino with an ESP32-WROVER. Code for music generation from brainwaves with Ableton Live + real-time datavizualisation with D3.js are provided.

## EEG data communication with Ableton Live

Instead of Serial, all data is streamed via sockets :
* ~~TGAM -> Max4Live (NodeJS support)~~ 
* TGAM -> native NodeJS (loopMIDI + easymidi) -> Ableton Live

Update : instead of collecting EEG data from NodeJS embedded in Max4Live, which was not easy for routing the EEG data coming from 1 Max4Live instance accross Ableton tracks, I created one virtual MIDI instrument per EEG data feature and route the MIDI (note + CC) messages directly from NodeJS to Ableton. 
On Windows creating a Virtual MIDI device can be done with [LoopMIDI](http://www.tobias-erichsen.de/software/loopmidi.html). I use the node module [EasyMIDI](https://github.com/dinchak/node-easymidi) to send MIDI notes on different virtual MIDI instruments and automate CC in Kontakt. This method is supposed to help reducing CPU load in Ableton. For MacOS users, creating virtual MIDI instruments is way easier with the virtual MIDI bus IAC Driver. 

* NodeJS -> ESP32 -> LED strips -> optic fibers

For the moment streaming EEG data from PC is overkill but I will use this code for multi-client app in the future 

## Datavizualisation with D3.js

According to Neurosky's Mindwave documentation, the EEG power spectra density (PSD) values vary exponentially, which means the lower-frequency bands (e.g. delta and theta) will be exponentially larger than the higher-frequency bands (alpha and beta). As a consequence, to be able to compare values between each other, the way to get rid of this exponential gap is to take the log of the EEG PSD values. To display the values in an histogram in the same fashion as Brainwave Vizualiser App, I take the log of EEG PSD, and I map the values to 0-100 taking into account the local minima / maxima of each band. I compared the resulting viz to the one of Brainwave Vizualiser and I obtain the same result and max PSD with a slight latency. 


## Requirements
### ESP32
* ArduinoJson
* WebSocketsClient
* SocketIOclient
### PC
* ThinkGear Connector
