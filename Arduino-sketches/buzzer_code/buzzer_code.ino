#define BUZZER 3
bool buzzerOn = false;

void setup() {
  pinMode(BUZZER, OUTPUT);
  noTone(BUZZER);
}

void loop() {
  // manually flip this during testing
  buzzerOn = false;   // change to false to stop

  if (buzzerOn) tone(BUZZER, 1000);
  else noTone(BUZZER);
}


