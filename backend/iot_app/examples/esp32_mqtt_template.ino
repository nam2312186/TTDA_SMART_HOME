#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "device_config_mqtt.h"

WiFiClient espClient;
PubSubClient mqtt(espClient);

static unsigned long lastSent = 0;
static unsigned long lastWiFiRetry = 0;

const unsigned long WIFI_RETRY_MS = 5000;
const unsigned long MQTT_RETRY_MS = 3000;
static unsigned long lastMQTTRetry = 0;

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
  } else {
    Serial.println("\nWiFi connect timeout, will retry in loop");
  }
}

void reconnectMQTT() {
  if (mqtt.connected() || WiFi.status() != WL_CONNECTED) {
    return;
  }

  unsigned long now = millis();
  if (now - lastMQTTRetry < MQTT_RETRY_MS) {
    return;
  }
  lastMQTTRetry = now;

  Serial.print("Connecting MQTT...");
  bool ok;
  if (String(MQTT_USERNAME).length() > 0) {
    ok = mqtt.connect("ESP32-SmartHome", MQTT_USERNAME, MQTT_PASSWORD);
  } else {
    ok = mqtt.connect("ESP32-SmartHome");
  }

  if (ok) {
    Serial.println("connected");
  } else {
    Serial.printf("failed, rc=%d\n", mqtt.state());
  }
}

float readSensorValue() {
  // TODO-SENSOR: thay bang doc sensor that cua ban
  return 23.0 + (millis() % 9000) / 1000.0;
}

void publishSensor(float value, const char* unit) {
  char topic[96];
  snprintf(topic, sizeof(topic), "smarthome/device/%d/sensor/%s", DEVICE_ID, METRIC_NAME);

  StaticJsonDocument<96> doc;
  doc["value"] = value;
  doc["unit"] = unit;

  char payload[96];
  serializeJson(doc, payload);

  bool ok = mqtt.publish(topic, payload);
  Serial.printf("Publish %s | topic=%s | payload=%s\n", ok ? "OK" : "FAIL", topic, payload);
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  connectWiFi();
  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    unsigned long now = millis();
    if (now - lastWiFiRetry >= WIFI_RETRY_MS) {
      lastWiFiRetry = now;
      connectWiFi();
    }
  }

  reconnectMQTT();
  mqtt.loop();

  if (mqtt.connected() && millis() - lastSent >= SEND_INTERVAL_MS) {
    lastSent = millis();
    float value = readSensorValue();
    publishSensor(value, "C");
  }

  delay(100);
}
