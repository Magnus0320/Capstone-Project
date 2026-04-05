#include <Wire.h>
#include <SensirionI2cScd4x.h>

SensirionI2cScd4x scd4x;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Wire.begin(6, 7);

  scd4x.begin(Wire, 0x62);

  Serial.println("Stopping previous measurement...");
  scd4x.stopPeriodicMeasurement();
  delay(500);

  Serial.println("Starting measurement...");
  scd4x.startPeriodicMeasurement();

  Serial.println("Waiting for first reading...");
}

void loop() {
  uint16_t co2;
  float temperature;
  float humidity;

  delay(5000);  // VERY IMPORTANT

  int error = scd4x.readMeasurement(co2, temperature, humidity);

  if (error) {
    Serial.print("Read error: ");
    Serial.println(error);
  } else {
    Serial.print("CO2: ");
    Serial.print(co2);
    Serial.println(" ppm");

    Serial.print("Temp: ");
    Serial.print(temperature);
    Serial.println(" °C");

    Serial.print("Humidity: ");
    Serial.print(humidity);
    Serial.println(" %");

    Serial.println("----------------------");
  }
}