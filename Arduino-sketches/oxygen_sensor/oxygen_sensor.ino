#include <Wire.h>
#include "DFRobot_OxygenSensor.h"

#define SDA_PIN 4
#define SCL_PIN 5
#define COLLECT_NUMBER 10

DFRobot_OxygenSensor oxygen;

void setup()
{
  Serial.begin(115200);
  Wire.begin(SDA_PIN, SCL_PIN);

  while(!oxygen.begin(0x73))
  {
    Serial.println("Sensor not detected!");
    delay(1000);
  }

  Serial.println("Calibrating in fresh air...");
  delay(5000);

  oxygen.calibrate(20.9);  // calibrate to atmospheric oxygen

  Serial.println("Calibration complete!");
}

void loop()
{
  float value = oxygen.getOxygenData(COLLECT_NUMBER);

  Serial.print("Oxygen: ");
  Serial.print(value);
  Serial.println(" %");

  delay(1000);
}