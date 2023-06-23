#include <BluetoothSerial.h>
#include <FastLED.h>
#include "ArduinoJson.h"

#define LED_PIN     4
#define NUM_LEDS    10
#define BRIGHTNESS  255
#define LED_TYPE    WS2811
#define COLOR_ORDER GRB
#define MAX_POWER_MILLIAMPS 500
CRGB leds[NUM_LEDS];

int hue_meditation = 155;

#define UPDATES_PER_SECOND 20 

//CRGBPalette16 myPalettes[6]=[bhw3_02_gp]
char data_received;
uint8_t MODE = 0;
uint8_t blink_done = 0;
uint32_t zerotime;
int value_eeg;
CRGBPalette16 currentPalette;
TBlendType    currentBlending;


/// NOISE PARAMETERS
// Params for width and height
const uint8_t kMatrixWidth  = 10;
const uint8_t kMatrixHeight = 1;
uint8_t       colorLoop = 1;
#define MAX_DIMENSION ((kMatrixWidth>kMatrixHeight) ? kMatrixWidth : kMatrixHeight)

static uint16_t x;
static uint16_t y;
static uint16_t z;

uint16_t speed = 8; 
uint16_t scale = 120; 
uint8_t noise[MAX_DIMENSION][MAX_DIMENSION];

// Param for different pixel layouts
const bool    kMatrixSerpentineLayout = true;


// Fill the x/y array of 8-bit noise values using the inoise8 function.
void fillnoise8() {
  // If we're runing at a low "speed", some 8-bit artifacts become visible
  // from frame-to-frame.  In order to reduce this, we can do some fast data-smoothing.
  // The amount of data smoothing we're doing depends on "speed".
  uint8_t dataSmoothing = 0;
  if( speed < 50) {
    dataSmoothing = 200 - (speed * 4);
  }
  
  for(int i = 0; i < MAX_DIMENSION; i++) {
    int ioffset = scale * i;
    for(int j = 0; j < MAX_DIMENSION; j++) {
      int joffset = scale * j;
      
      uint8_t data = inoise8(x + ioffset,y + joffset,z);

      // The range of the inoise8 function is roughly 16-238.
      // These two operations expand those values out to roughly 0..255
      // You can comment them out if you want the raw noise data.
      data = qsub8(data,16);
      data = qadd8(data,scale8(data,39));

      if( dataSmoothing ) {
        uint8_t olddata = noise[i][j];
        uint8_t newdata = scale8( olddata, dataSmoothing) + scale8( data, 256 - dataSmoothing);
        data = newdata;
      }
      
      noise[i][j] = data;
    }
  }
  
  z += speed;
  
  // apply slow drift to X and Y, just for visual variation.
  x += speed / 8;
  y -= speed / 16;
}

void mapNoiseToLEDsUsingPalette()
{
  static uint8_t ihue=0;
  
  for(int i = 0; i < kMatrixWidth; i++) {
    for(int j = 0; j < kMatrixHeight; j++) {
      // We use the value at the (i,j) coordinate in the noise
      // array for our brightness, and the flipped value from (j,i)
      // for our pixel's index into the color palette.

      uint8_t index = noise[j][i];
      uint8_t bri =   noise[i][j];

      // if this palette is a 'loop', add a slowly-changing base value
      if( colorLoop) { 
        index += ihue;
      }

      // brighten up, as the color palette itself often contains the 
      // light/dark dynamic range desired
      if( bri > 127 ) {
        bri = 255;
      } else {
        bri = dim8_raw( bri * 2);
      }

      CRGB color = ColorFromPalette( currentPalette, index, bri);
      leds[XY(i,j)] = color;
    }
  }
  
  ihue+=1;
}


//
// Mark's xy coordinate mapping code.  See the XYMatrix for more information on it.
//
uint16_t XY( uint8_t x, uint8_t y)
{
  uint16_t i;
  if( kMatrixSerpentineLayout == false) {
    i = (y * kMatrixWidth) + x;
  }
  if( kMatrixSerpentineLayout == true) {
    if( y & 0x01) {
      // Odd rows run backwards
      uint8_t reverseX = (kMatrixWidth - 1) - x;
      i = (y * kMatrixWidth) + reverseX;
    } else {
      // Even rows run forwards
      i = (y * kMatrixWidth) + x;
    }
  }
  return i;
}



/// PACIFICA LOOP


CRGBPalette16 pacifica_palette_1 = 
    { 
0x00ff96,
0x22ee8a,
0x2fde7f,
0x36cd74,
0x39bd69,
0x3bad5f,
0x3b9e56,
0x3a8e4d,
0x388044,
0x35713c,
0x316334,
0x2d552d,
0x284826,
0x233b20,
0x1d2e1a,
0x172214
 };
CRGBPalette16 pacifica_palette_2 = 
    { 0x0cff00,
0x15ff27,
0x1eff3a,
0x25ff48,
0x2cff55,
0x34ff60,
0x3bff6a,
0x41ff74,
0x48ff7d,
0x4fff86,
0x56ff8e,
0x5dff96,
0x64ff9d,
0x6bffa5,
0x73ffab,
0x7affb2
};
CRGBPalette16 pacifica_palette_3 = 
    { 0x253e30,
0x244a34,
0x215638,
0x1e623b,
0x196f3e,
0x137b40,
0x0a8841,
0x009542,
0x00a241,
0x00af40,
0x00bc3d,
0x00c939,
0x06d734,
0x18e42b,
0x27f11e,
0x36ff00};


void pacifica_loop()
{
  // Increment the four "color index start" counters, one for each wave layer.
  // Each is incremented at a different speed, and the speeds vary over time.
  static uint16_t sCIStart1, sCIStart2, sCIStart3, sCIStart4;
  static uint32_t sLastms = 0;
  uint32_t ms = GET_MILLIS();
  uint32_t deltams = ms - sLastms;
  sLastms = ms;
  uint16_t speedfactor1 = beatsin16(3, 179, 269);
  uint16_t speedfactor2 = beatsin16(4, 179, 269);
  uint32_t deltams1 = (deltams * speedfactor1) / 256;
  uint32_t deltams2 = (deltams * speedfactor2) / 256;
  uint32_t deltams21 = (deltams1 + deltams2) / 2;
  sCIStart1 += (deltams1 * beatsin88(1011,10,13));
  sCIStart2 -= (deltams21 * beatsin88(777,8,11));
  sCIStart3 -= (deltams1 * beatsin88(501,5,7));
  sCIStart4 -= (deltams2 * beatsin88(257,4,6));

  // Clear out the LED array to a dim background blue-green
  fill_solid( leds, NUM_LEDS, CRGB( 0, 10, 3));

  // Render each of four layers, with different scales and speeds, that vary over time
  pacifica_one_layer( pacifica_palette_1, sCIStart1, beatsin16( 3, 11 * 256, 14 * 256), beatsin8( 10, 70, 130), 0-beat16( 301) );
  pacifica_one_layer( pacifica_palette_2, sCIStart2, beatsin16( 4,  6 * 256,  9 * 256), beatsin8( 17, 40,  80), beat16( 401) );
  pacifica_one_layer( pacifica_palette_3, sCIStart3, 6 * 256, beatsin8( 9, 10,38), 0-beat16(503));
  pacifica_one_layer( pacifica_palette_3, sCIStart4, 5 * 256, beatsin8( 8, 10,28), beat16(601));

  // Add brighter 'whitecaps' where the waves lines up more
  pacifica_add_whitecaps();

  // Deepen the blues and greens a bit
  pacifica_deepen_colors();
}

// Add one layer of waves into the led array
void pacifica_one_layer( CRGBPalette16& p, uint16_t cistart, uint16_t wavescale, uint8_t bri, uint16_t ioff)
{
  uint16_t ci = cistart;
  uint16_t waveangle = ioff;
  uint16_t wavescale_half = (wavescale / 2) + 20;
  for( uint16_t i = 0; i < NUM_LEDS; i++) {
    waveangle += 250;
    uint16_t s16 = sin16( waveangle ) + 32768;
    uint16_t cs = scale16( s16 , wavescale_half ) + wavescale_half;
    ci += cs;
    uint16_t sindex16 = sin16( ci) + 32768;
    uint8_t sindex8 = scale16( sindex16, 240);
    CRGB c = ColorFromPalette( p, sindex8, bri, LINEARBLEND);
    leds[i] += c;
  }
}

// Add extra 'white' to areas where the four layers of light have lined up brightly
void pacifica_add_whitecaps()
{
  uint8_t basethreshold = beatsin8( 9, 55, 65);
  uint8_t wave = beat8( 7 );
  
  for( uint16_t i = 0; i < NUM_LEDS; i++) {
    uint8_t threshold = scale8( sin8( wave), 20) + basethreshold;
    wave += 7;
    uint8_t l = leds[i].getAverageLight();
    if( l > threshold) {
      uint8_t overage = l - threshold;
      uint8_t overage2 = qadd8( overage, overage);
      leds[i] += CRGB( overage, overage2, qadd8( overage2, overage2));
    }
  }
}

// Deepen the blues and greens
void pacifica_deepen_colors()
{
  for( uint16_t i = 0; i < NUM_LEDS; i++) {
    leds[i].blue = scale8( leds[i].blue,  145); 
    leds[i].green= scale8( leds[i].green, 255); 
    leds[i] |= CRGB( 1, 7, 5);
  }
}


void FillLEDsFromPaletteColors( uint8_t colorIndex)
{
    uint8_t brightness = 255;
    
    for( int i = 0; i < NUM_LEDS; ++i) {
        leds[i] = ColorFromPalette( currentPalette, colorIndex, brightness, currentBlending);
        colorIndex += 3;
    }
}


// There are several different palettes of colors demonstrated here.
//
// FastLED provides several 'preset' palettes: RainbowColors_p, RainbowStripeColors_p,
// OceanColors_p, CloudColors_p, LavaColors_p, ForestColors_p, and PartyColors_p.
//
// Additionally, you can manually define your own color palettes, or you can write
// code that creates color palettes on the fly.  All are shown here.


// Gradient palette "bhw3_02_gp", originally from
// http://soliton.vm.bytemark.co.uk/pub/cpt-city/bhw/bhw3/tn/bhw3_02.png.index.html
// converted for FastLED with gammas (2.6, 2.2, 2.5)
// Size: 24 bytes of program space.

DEFINE_GRADIENT_PALETTE( bhw3_02_gp ) {
    0, 121,  1,  1,
   63, 255, 57,  1,
  112, 255, 79, 25,
  145, 255, 79, 25,
  188, 244,146,  3,
  255, 115, 14,  1};

// Gradient palette "bhw3_62_gp", originally from
// http://soliton.vm.bytemark.co.uk/pub/cpt-city/bhw/bhw3/tn/bhw3_62.png.index.html
// converted for FastLED with gammas (2.6, 2.2, 2.5)
// Size: 20 bytes of program space.

DEFINE_GRADIENT_PALETTE( bhw3_62_gp ) {
    0, 255,255, 45,
   43, 208, 93,  1,
  137, 224,  1,242,
  181, 159,  1, 29,
  255,  63,  4, 68};


// Gradient palette "es_seadreams_13_gp", originally from
// http://soliton.vm.bytemark.co.uk/pub/cpt-city/es/sea_dreams/tn/es_seadreams_13.png.index.html
// converted for FastLED with gammas (2.6, 2.2, 2.5)
// Size: 32 bytes of program space.


// Gradient palette "Night_Purple_gp", originally from
// http://soliton.vm.bytemark.co.uk/pub/cpt-city/nd/atmospheric/tn/Night_Purple.png.index.html
// converted for FastLED with gammas (2.6, 2.2, 2.5)
// Size: 36 bytes of program space.

DEFINE_GRADIENT_PALETTE( Night_Purple_gp ) {
    0,  10,  2, 26,
   71,  55, 39, 62,
  115, 155,131,117,
  124, 201,187,178,
  127, 255,255,255,
  131, 201,187,178,
  145, 155,131,117,
  189,  55, 39, 62,
  255,  10,  2, 26};


DEFINE_GRADIENT_PALETTE( es_seadreams_13_gp ) {
    0, 153,168,203,
   63,  31, 45,233,
   76,  55, 72,235,
  127,   0,  0,255,
  178,  55, 72,235,
  191,  31, 45,233,
  242, 153,168,203,
  255, 153,168,203};

 
// Gradient palette "bhw1_04_gp", originally from
// http://soliton.vm.bytemark.co.uk/pub/cpt-city/bhw/bhw1/tn/bhw1_04.png.index.html
// converted for FastLED with gammas (2.6, 2.2, 2.5)
// Size: 20 bytes of program space.

DEFINE_GRADIENT_PALETTE( bhw1_04_gp ) {
    0, 229,227,  1,
   15, 227,101,  3,
  142,  40,  1, 80,
  198,  17,  1, 79,
  255,   0,  0, 45};

// Gradient palette "bhw1_purplepink_gp", originally from
// http://soliton.vm.bytemark.co.uk/pub/cpt-city/bhw/bhw1/tn/bhw1_purplepink.png.index.html
// converted for FastLED with gammas (2.6, 2.2, 2.5)
// Size: 36 bytes of program space.

DEFINE_GRADIENT_PALETTE( bhw1_purplepink_gp ) {
    0, 242,  5,122,
   58, 239,164,207,
  101, 242,  5,122,
  101, 242,  5,122,
  142, 125,  7,197,
  142, 125,  7,197,
  193, 201, 96,237,
  252,  59,  1,106,
  255,  59,  1,106};

// Gradient palette "bhw1_26_gp", originally from
// http://soliton.vm.bytemark.co.uk/pub/cpt-city/bhw/bhw1/tn/bhw1_26.png.index.html
// converted for FastLED with gammas (2.6, 2.2, 2.5)
// Size: 52 bytes of program space.

DEFINE_GRADIENT_PALETTE( bhw1_26_gp ) {
    0, 107,  1,205,
   35, 255,255,255,
   73, 107,  1,205,
  107,  10,149,210,
  130, 255,255,255,
  153,  10,149,210,
  170,  27,175,119,
  198,  53,203, 56,
  207, 132,229,135,
  219, 255,255,255,
  231, 132,229,135,
  252,  53,203, 56,
  255,  53,203, 56};



// Delta = Sleep / Dream 

// Gradient palette "bhw2_bomb_gp", originally from
// http://soliton.vm.bytemark.co.uk/pub/cpt-city/bhw/bhw2/tn/bhw2_bomb.png.index.html
// converted for FastLED with gammas (2.6, 2.2, 2.5)
// Size: 24 bytes of program space.

DEFINE_GRADIENT_PALETTE( bhw2_bomb_gp ) {
    0, 227,130,190,
   48, 115,131,228,
   79,  42, 55,255,
  145, 117,  4,106,
  214, 234,178,172,
  255, 234,178,172};


// Gradient palette "bhw4_040_gp", originally from
// http://soliton.vm.bytemark.co.uk/pub/cpt-city/bhw/bhw4/tn/bhw4_040.png.index.html
// converted for FastLED with gammas (2.6, 2.2, 2.5)
// Size: 32 bytes of program space.

DEFINE_GRADIENT_PALETTE( bhw4_040_gp ) {
    0,  26,  7, 69,
   73, 110, 36,240,
  109, 249, 69,245,
  142, 255,182,255,
  173, 120,124,245,
  204,  98, 59,207,
  249,  30,  9,103,
  255,  30,  9,103};


// Gradient palette "moon_gp", originally from
// http://soliton.vm.bytemark.co.uk/pub/cpt-city/pn/tn/moon.png.index.html
// converted for FastLED with gammas (2.6, 2.2, 2.5)
// Size: 188 bytes of program space.
// // Delta = Sleep / Dream 
DEFINE_GRADIENT_PALETTE( moon_gp ) {
    0,  53, 99,145,
    3,  54,100,147,
    9,  57,103,149,
   14,  59,105,151,
   20,  64,108,151,
   26,  66,111,153,
   31,  68,114,155,
   37,  72,115,156,
   43,  74,118,156,
   48,  78,121,158,
   54,  82,124,158,
   59,  84,127,160,
   65,  88,130,160,
   71,  91,133,162,
   76,  94,136,162,
   82,  97,138,164,
   88, 100,141,164,
   93, 104,144,166,
   99, 107,147,166,
  104, 112,149,168,
  110, 115,152,168,
  116, 120,156,170,
  121, 123,159,172,
  127, 128,162,174,
  133, 133,168,174,
  138, 139,171,176,
  144, 142,175,178,
  149, 146,178,180,
  155, 150,182,182,
  161, 153,186,184,
  166, 159,187,184,
  172, 163,193,186,
  177, 169,195,186,
  183, 173,199,188,
  189, 179,203,188,
  194, 186,207,190,
  200, 190,211,190,
  206, 197,217,192,
  211, 203,221,192,
  217, 210,225,194,
  222, 215,229,197,
  228, 222,233,197,
  234, 227,237,199,
  239, 232,239,201,
  245, 237,241,203,
  251, 242,246,205,
  255, 244,248,205};


// Gradient palette "bhw4_039_gp", originally from
// http://soliton.vm.bytemark.co.uk/pub/cpt-city/bhw/bhw4/tn/bhw4_039.png.index.html
// converted for FastLED with gammas (2.6, 2.2, 2.5)
// Size: 44 bytes of program space.

DEFINE_GRADIENT_PALETTE( bhw4_039_gp ) {
    0,   7,  4, 30,
   40,   1, 37, 91,
   47,   7, 37, 84,
   71,  25, 38, 78,
  107,  20, 56,119,
  137,  42, 95,144,
  175,   0, 52, 99,
  192,   2, 40, 88,
  221,  15, 30, 78,
  253,  13, 12, 54,
  255,  12,  2, 36};


// Gradient palette "bhw1_13_gp", originally from
// http://soliton.vm.bytemark.co.uk/pub/cpt-city/bhw/bhw1/tn/bhw1_13.png.index.html
// converted for FastLED with gammas (2.6, 2.2, 2.5)
// Size: 8 bytes of program space.

DEFINE_GRADIENT_PALETTE( bhw1_13_gp ) {
    0, 255,255, 45,
  255, 157, 57,197};



#if !defined(CONFIG_BT_ENABLED) || !defined(CONFIG_BLUEDROID_ENABLED)
#error Bluetooth is not enabled! Please run `make menuconfig` to and enable it
#endif


BluetoothSerial SerialBT;

void setup() {
   Serial.begin(115200);
   SerialBT.begin("Ninon's ESP32 BT"); //Bluetooth device name
   //Serial.println("The device started, now you can pair it with bluetooth!");
   delay( 3000 ); // power-up safety delay 3000
   FastLED.addLeds<LED_TYPE, LED_PIN, COLOR_ORDER>(leds, NUM_LEDS).setCorrection( TypicalLEDStrip );
   //FastLED.setBrightness(  BRIGHTNESS ); 
   //FastLED.setMaxPowerInVoltsAndMilliamps( 5, MAX_POWER_MILLIAMPS);
   //currentPalette = RainbowColors_p;
   //currentBlending = LINEARBLEND;
   FastLED.clear(true);  // clear all pixel data
}



void loop() {
   if (Serial.available()) {
      SerialBT.write(Serial.read());
   }
   if (SerialBT.available()) {
      //data_received = SerialBT.read();

      //DynamicJsonBuffer jb;
      //JsonObject& root = jb.parseObject(SerialBT);
      
      StaticJsonDocument<64> doc;

      DeserializationError error = deserializeJson(doc, SerialBT);
      
      if (error) {
        Serial.print("deserializeJson() failed: ");
        Serial.println(error.c_str());
        return;
      }
      
      int data_received = doc["mode"]; // 1

      if(data_received==1){
        MODE=1;     
      } else if (data_received==2){
 
        MODE=2;
        currentPalette = bhw3_02_gp;
        
      } else if (data_received==3){
        
        MODE=3;
      } else if (data_received==4){

        currentPalette = Night_Purple_gp;
        
        MODE=4;
      } else if (data_received==5){
        MODE=5;
        blink_done=0;
        zerotime = millis(); // zeroing the time for sinbeat
      } else if (data_received==6){
        MODE=6;
        currentPalette = CloudColors_p; //bhw1_13_gp; //bhw3_62_gp; //CloudColors_p; // LavaColors_p
        
      } else if (data_received ==7){
        value_eeg = doc["val"];
        //Serial.println(value_eeg);
        MODE=7;
      } else if (data_received ==8){
        MODE=8;
      } else if (data_received ==9){
        MODE=9;
        value_eeg = doc["val"];
      } else if (data_received==10){ // neutral
 
        MODE=2;
        currentPalette = moon_gp;
        
      } else if (data_received ==11){
        MODE=11;
        value_eeg = doc["val"];
      }
      
   }
   delay(20);

   static uint8_t startIndex = 0;
   startIndex = startIndex + 1; /* motion speed, fast = + 10 */

      if(MODE==1){

        // WATER WAVES ==> DRONE
        EVERY_N_MILLISECONDS( 20) {
          pacifica_loop();
          FastLED.show();
        }
      } else if(MODE==2){

          // PALETTE
          //currentPalette = bhw1_26_gp;   
          currentBlending = LINEARBLEND;
          FillLEDsFromPaletteColors( startIndex);
          FastLED.show();
          FastLED.delay(1000 / UPDATES_PER_SECOND);
    
      } else if(MODE==3){

        // FAST WAVE THINKING SEQ => CYMBAL ROLL
        uint16_t sinBeat = beatsin16(30, 0, NUM_LEDS - 1, 0, 0);

        leds[sinBeat] = CRGB::White;
        
        fadeToBlackBy(leds, NUM_LEDS, 10);
      
        FastLED.show();
      } else if(MODE==4){

        // SLOW BLINK BREATHING => MEDITATION PEAK
        uint8_t sinBeat = beatsin8(15, 50, 255, 0, 0);
      
        // Color each pixel from the palette using the index from colorIndex[]
        for (int i = 0; i < NUM_LEDS; i++) {
          leds[i] =  ColorFromPalette(currentPalette, startIndex, sinBeat);
          // CHSV( 100, 0, sinBeat);
        }
  
        FastLED.show();
      } else if(MODE==5){

          if(blink_done<51){ // CYMBALL KICK
  
          uint8_t sinBeat = beatsin8(60, 0, 255, zerotime, 192);

        
          // Color each pixel from the palette using the index from colorIndex[]
          for (int i = 0; i < NUM_LEDS; i++) {
            leds[i] = CHSV( 100, 0, sinBeat); 
          }
    
          FastLED.show();
  
          blink_done=blink_done+1;

          
        }     
      
      } else if(MODE==6){  // CLOCHETTES

        fillnoise8();
        mapNoiseToLEDsUsingPalette();
        FastLED.show();
      } 
         if (MODE==7){ // purple breathe DRONE
          
          // Color each pixel from the palette using the index from colorIndex[]
          for (int i = 0; i < NUM_LEDS; i++) {
            leds[i] = CHSV( hue_meditation,255, value_eeg); 
          }
    
          FastLED.show();
      } else if(MODE==8){

        // GAMELAN ROLL
        uint16_t sinBeat = beatsin16(30, 0, NUM_LEDS - 1, 0, 0);

        leds[sinBeat] = CHSV( 180,255, 255);  // val_meditation
        
        fadeToBlackBy(leds, NUM_LEDS, 10);
      
        FastLED.show();
      } else if (MODE==9){

          // RAINBOW PEAKS
        uint16_t sinBeat = beatsin16(30, 0, NUM_LEDS - 1, 0, 0);

        leds[sinBeat] = CHSV( value_eeg,255, 255); 
        
        fadeToBlackBy(leds, NUM_LEDS, 10);
      
        FastLED.show();
      } else if(MODE==11){

        // FAST WAVE THINKING SEQ => CYMBAL ROLL
        uint16_t sinBeat = beatsin16(value_eeg, 0, NUM_LEDS - 1, 0, 0);

        leds[sinBeat] = CRGB::White;
        
        fadeToBlackBy(leds, NUM_LEDS, 10);
      
        FastLED.show();
      } 
}
