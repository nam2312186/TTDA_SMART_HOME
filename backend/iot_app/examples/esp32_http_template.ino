#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "device_config_http.h"

static unsigned long lastSent = 0;
static unsigned long lastWiFiRetry = 0;

const unsigned long WIFI_RETRY_MS = 5000;
const int HTTP_TIMEOUT_MS = 8000;
const int HTTP_MAX_RETRIES = 3;

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting WiFi");
  unsigned long started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < 20000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi connect timeout, will retry in loop");
  }
}

bool sendSensorData(float value, const char* unit) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Skip send: WiFi disconnected");
    return false;
  }

  HTTPClient http;
  StaticJsonDocument<128> doc;
  doc["value"] = value;
  doc["unit"] = unit;
  doc["metric"] = METRIC_NAME;

  String body;
  serializeJson(doc, body);

  for (int attempt = 1; attempt <= HTTP_MAX_RETRIES; ++attempt) {
    http.begin(SERVER_URL);
    http.setTimeout(HTTP_TIMEOUT_MS);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", String("Token ") + IOT_TOKEN);

    int code = http.POST(body);
    String response = http.getString();
    Serial.printf("Attempt %d/%d | HTTP %d | payload=%s\n", attempt, HTTP_MAX_RETRIES, code, body.c_str());
    if (response.length() > 0) {
      Serial.printf("Response: %s\n", response.c_str());
    }
    http.end();

    if (code == 201 || code == 200) {
      return true;
    }

    delay(500);
  }

  return false;
}

float readSensorValue() {
  // TODO-SENSOR: thay bang doc sensor that cua ban (DHT11, BH1750, ...)
  // Demo only: gia lap value thay doi
  return 24.0 + (millis() % 7000) / 1000.0;
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  connectWiFi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    unsigned long now = millis();
    if (now - lastWiFiRetry >= WIFI_RETRY_MS) {
      lastWiFiRetry = now;
      connectWiFi();
    }
  }

  unsigned long now = millis();
  if (now - lastSent >= SEND_INTERVAL_MS) {
    lastSent = millis();
    float value = readSensorValue();
    bool ok = sendSensorData(value, "C");
    if (!ok) {
      Serial.println("Send failed after retries");
    }
  }

  delay(100);
}
