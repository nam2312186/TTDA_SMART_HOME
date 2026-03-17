#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "device_config_http.h"

// Stable profile: Temperature/Humidity sensor
// Gui 2 mau moi chu ky: temperature + humidity.

static unsigned long lastSent = 0;
static unsigned long lastWiFiRetry = 0;

const unsigned long WIFI_RETRY_MS = 5000;
const int HTTP_TIMEOUT_MS = 8000;
const int HTTP_MAX_RETRIES = 3;

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < 20000) {
    delay(500);
    Serial.print('.');
  }
}

bool pushToBackend(float value, const char* unit, const char* metric) {
  if (WiFi.status() != WL_CONNECTED) return false;

  StaticJsonDocument<128> doc;
  doc["value"] = value;
  doc["unit"] = unit;
  doc["metric"] = metric;

  String body;
  serializeJson(doc, body);

  HTTPClient http;
  for (int i = 1; i <= HTTP_MAX_RETRIES; ++i) {
    http.begin(SERVER_URL);
    http.setTimeout(HTTP_TIMEOUT_MS);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", String("Token ") + IOT_TOKEN);

    int code = http.POST(body);
    String response = http.getString();
    http.end();

    Serial.printf("[%s] attempt=%d code=%d value=%.2f%s\n", metric, i, code, value, unit);
    if (code == 200 || code == 201) return true;
    delay(500);
  }

  return false;
}

float readTemperatureC() {
  // TODO-TEMP: thay bang doc sensor that
  return 25.0 + (millis() % 5000) / 1000.0;
}

float readHumidityPct() {
  // TODO-HUMIDITY: thay bang doc sensor that
  return 60.0 + (millis() % 3000) / 1000.0;
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  connectWiFi();
  Serial.println("Temp/Humidity profile started");
}

void loop() {
  unsigned long now = millis();

  if (WiFi.status() != WL_CONNECTED && now - lastWiFiRetry >= WIFI_RETRY_MS) {
    lastWiFiRetry = now;
    connectWiFi();
  }

  if (now - lastSent >= SEND_INTERVAL_MS) {
    lastSent = now;

    float temp = readTemperatureC();
    float humidity = readHumidityPct();

    bool okTemp = pushToBackend(temp, "C", "temperature");
    bool okHum = pushToBackend(humidity, "%", "humidity");

    if (!okTemp || !okHum) {
      Serial.println("[TEMP/HUMIDITY] push failed");
    }
  }

  delay(100);
}
