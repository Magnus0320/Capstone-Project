HardwareSerial coSerial(1);

void setup() {
  Serial.begin(115200);

  coSerial.begin(9600, SERIAL_8N1, 18, 17);

  Serial.println("CO Sensor Test Started");
}

void loop() {
  while (coSerial.available()) {
    Serial.write(coSerial.read());
  }
}

