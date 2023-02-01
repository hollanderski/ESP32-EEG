# ESP32-EEG : Music + light control with EEG (Neurosky)
V2 of [Strange Loops](https://camps.aptaracorp.com/ACM_PMS/PMS/ACM/TEI23/76/6383df6f-7aeb-11ed-a76e-16bb50361d1f/OUT/tei23-76.html) replacing Arduino with an ESP32-WROVER. 
Instead of Serial, all data is streamed via sockets :
* TGAM -> ESP32 -> LED strips -> optic fibers
* TGAM -> PC -> Max4Live

For the moment streaming EEG data from PC is overkill but I will use this code for multi-client app in the future 

## Requirements
### ESP32
* ArduinoJson
* WebSocketsClient
* SocketIOclient
### PC
* ThinkGear Connector
