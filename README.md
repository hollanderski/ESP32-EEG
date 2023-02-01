# ESP32-EEG
Music + light control with EEG (Neurosky)
V2 of Strange loop replacing Arduino with an ESP32-WROVER. Instead of Serial, all data is streamed via sockets :
TGAM -> ESP32 -> LED strips -> optic fibers
TGAM -> PC -> Max4Live
