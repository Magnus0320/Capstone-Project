#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include "DFRobot_OxygenSensor.h"
#include <math.h>


const char* WIFI_SSID = "Srijan";
const char* WIFI_PASS = "12345678";

const char* BACKEND_URL = "http://172.20.10.2:4000/api/data";
const char* MINER_ID = "MINER-001";


#define SDA_PIN 4
#define SCL_PIN 5
#define OXYGEN_ADDRESS 0x73
#define COLLECT_NUMBER 10


#define CO_RX_PIN 16
#define CO_TX_PIN 15


const bool USE_GPS_SENSOR = false;
const bool MIC_ON = true;
const bool SPEAKER_ON = true;


const unsigned long O2_READ_INTERVAL_MS = 1000;
const unsigned long POST_INTERVAL_MS = 2000;

unsigned long lastO2ReadMs = 0;
unsigned long lastPostMs = 0;


DFRobot_OxygenSensor oxygen;
HardwareSerial coSerial(1);

// CO frame parser state
uint8_t coBuffer[9];
int coBufferIndex = 0;

// Last known values
float latestO2 = NAN;
float latestCO = NAN;
float latestLat = NAN;
float latestLng = NAN;
bool hasGpsFix = false;

uint8_t checksumZE07(const uint8_t* buf) {
  uint8_t sum = 0;
  for (int i = 1; i < 8; i++) {
    sum += buf[i];
  }
  return (uint8_t)(~sum + 1);
}

void scanWifi() {
int n = WiFi.scanNetworks();
Serial.print("Networks found: ");
Serial.println(n);
for (int i = 0; i < n; i++) {
Serial.print(i);
Serial.print(": ");
Serial.print(WiFi.SSID(i));
Serial.print(" RSSI=");
Serial.println(WiFi.RSSI(i));
}
}

const char* wifiStatusText(wl_status_t s) {
  switch (s) {
    case WL_IDLE_STATUS: return "IDLE";
    case WL_NO_SSID_AVAIL: return "NO_SSID";
    case WL_SCAN_COMPLETED: return "SCAN_DONE";
    case WL_CONNECTED: return "CONNECTED";
    case WL_CONNECT_FAILED: return "CONNECT_FAILED";
    case WL_CONNECTION_LOST: return "CONNECTION_LOST";
    case WL_DISCONNECTED: return "DISCONNECTED";
    default: return "UNKNOWN";
  }
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.persistent(false);
  WiFi.disconnect(true, true);
  delay(1000);

  scanWifi();

  Serial.print("Connecting to SSID: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 30000) {
    Serial.print(".");
    delay(500);
  }
  Serial.println();

  wl_status_t st = WiFi.status();
  Serial.print("Wi-Fi status: ");
  Serial.print((int)st);
  Serial.print(" (");
  Serial.print(wifiStatusText(st));
  Serial.println(")");

  if (st == WL_CONNECTED) {
    Serial.print("ESP32 IP: ");
    Serial.println(WiFi.localIP());
  }
}

void ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.println("Wi-Fi disconnected, reconnecting...");
  WiFi.disconnect();
  connectWiFi();
}

void readOxygen() {
  latestO2 = oxygen.getOxygenData(COLLECT_NUMBER);
  Serial.print("Oxygen: ");
  if (isfinite(latestO2)) {
    Serial.print(latestO2, 2);
    Serial.println(" %");
  } else {
    Serial.println("invalid");
  }
}

void readCOFromZE07() {
  while (coSerial.available()) {
    uint8_t b = (uint8_t)coSerial.read();

    if (coBufferIndex == 0 && b != 0xFF) {
      continue;
    }

    coBuffer[coBufferIndex++] = b;

    if (coBufferIndex == 9) {
      coBufferIndex = 0;

      bool validHeader =
        coBuffer[0] == 0xFF &&
        coBuffer[1] == 0x04 &&
        coBuffer[2] == 0x03 &&
        coBuffer[3] == 0x01;

      bool validChecksum = coBuffer[8] == checksumZE07(coBuffer);

      if (validHeader && validChecksum) {
        uint16_t raw = ((uint16_t)coBuffer[4] << 8) | coBuffer[5];
        latestCO = raw / 10.0f;

        Serial.print("CO: ");
        Serial.print(latestCO, 1);
        Serial.println(" ppm");
      }
    }
  }
}

void appendSensorField(String& sensors, bool& first, const char* key, float value, int decimals) {
  if (!isfinite(value)) return;
  if (!first) sensors += ",";
  sensors += "\"";
  sensors += key;
  sensors += "\":";
  sensors += String(value, decimals);
  first = false;
}

String buildPayload() {
  String payload = "{";
  payload += "\"minerId\":\"";
  payload += MINER_ID;
  payload += "\",";

  payload += "\"sensors\":{";
  payload += "\"oxygen\":";
  payload += isfinite(latestO2) ? String(latestO2, 2) : "null";
  payload += ",";
  payload += "\"co\":";
  payload += isfinite(latestCO) ? String(latestCO, 1) : "null";
  payload += "},";

  payload += "\"location\":{\"lat\":";
  if (USE_GPS_SENSOR && hasGpsFix && isfinite(latestLat)) {
    payload += String(latestLat, 6);
  } else {
    payload += "null";
  }
  payload += ",\"lng\":";
  if (USE_GPS_SENSOR && hasGpsFix && isfinite(latestLng)) {
    payload += String(latestLng, 6);
  } else {
    payload += "null";
  }
  payload += "},";

  payload += "\"audio\":{\"mic\":";
  payload += (MIC_ON ? "true" : "false");
  payload += ",\"speaker\":";
  payload += (SPEAKER_ON ? "true" : "false");
  payload += "}";

  payload += "}";
  return payload;
}

void postToBackend(const String& payload) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("POST skipped: Wi-Fi offline");
    return;
  }

  WiFiClient client;
  HTTPClient http;

  if (!http.begin(client, BACKEND_URL)) {
    Serial.println("HTTP begin failed");
    return;
  }

  http.addHeader("Content-Type", "application/json");
  http.setTimeout(6000);

  int code = http.POST(payload);

  if (code < 0) {
    Serial.print("POST failed, error: ");
    Serial.println(HTTPClient::errorToString(code));
  } else {
    Serial.print("POST status: ");
    Serial.println(code);
    Serial.print("Response: ");
    Serial.println(http.getString());
  }

  http.end();
}

// Freshness flags: set true only when that sensor got a new valid reading


void setup() {
  Serial.begin(115200);
  delay(300);

  Wire.begin(SDA_PIN, SCL_PIN);

  while (!oxygen.begin(OXYGEN_ADDRESS)) {
    Serial.println("Oxygen sensor not detected!");
    delay(1000);
  }
  Serial.println("Oxygen sensor ready");

  coSerial.begin(9600, SERIAL_8N1, CO_RX_PIN, CO_TX_PIN);
  Serial.println("CO sensor UART ready");

  connectWiFi();

  lastO2ReadMs = millis();
  lastPostMs = millis();
}

void loop() {
  ensureWiFi();

  // CO sensor streams continuously over UART
  readCOFromZE07();

  unsigned long now = millis();

  if (now - lastO2ReadMs >= O2_READ_INTERVAL_MS) {
    readOxygen();
    Serial.println("------------------------");
    lastO2ReadMs = now;
  }

  if (now - lastPostMs >= POST_INTERVAL_MS) {
    // Optional: force a fresh O2 sample exactly at POST time
    readOxygen();

    String payload = buildPayload();
    postToBackend(payload);

    lastPostMs = now;
  }

  delay(20);
}