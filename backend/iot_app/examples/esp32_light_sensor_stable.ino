#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "device_config_http.h"

// Stable profile: Light sensor -> metric=light
// Neu dung BH1750/LDR, thay ham readLightLux() bang doc sensor that.

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

    Serial.printf("[LIGHT] attempt=%d code=%d value=%.2f%s\n", i, code, value, unit);
    if (code == 200 || code == 201) return true;
    delay(500);
  }

  return false;
}

float readLightLux() {
  // TODO-LIGHT-SENSOR: doi sang doc cam bien that
  return 200.0 + (millis() % 20000) / 100.0;
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  connectWiFi();
  Serial.println("Light profile started");
}

void loop() {
  unsigned long now = millis();

  if (WiFi.status() != WL_CONNECTED && now - lastWiFiRetry >= WIFI_RETRY_MS) {
    lastWiFiRetry = now;
    connectWiFi();
  }

  if (now - lastSent >= SEND_INTERVAL_MS) {
    lastSent = now;
    float lux = readLightLux();
    bool ok = pushToBackend(lux, "lux", "light");
    if (!ok) Serial.println("[LIGHT] push failed");
  }

  delay(100);
}
