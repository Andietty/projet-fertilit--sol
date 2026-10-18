/**
 * Firmware Nœud Terrain - Fertilité du Sol
 * INP-HB - Équipe UP Projet (STIC & STGI)
 * Encadrant : M. DIOMANDE SAHI ROLAND
 * 
 * Fonctionnalités :
 * 1. Lecture régulière des capteurs de sol (Humidité, pH, EC, Température, Batterie)
 * 2. Serveur Bluetooth Low Energy (BLE GATT) avec notifications temps réel
 * 3. Point d'accès Wi-Fi SoftAP autonome ("NOEUD-SOL-01") avec API HTTP REST (/api/data)
 */

#include <WiFi.h>
#include <WebServer.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include "config.h"

// --- VARIABLES GLOBALES ---
WebServer server(80);
BLEServer* pServer = NULL;
BLECharacteristic* pDataCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;

// Bus OneWire pour la température étanche DS18B20
OneWire oneWire(PIN_ONEWIRE_TEMP);
DallasTemperature dallasSensors(&oneWire);

// Données capteurs instantanées
struct SensorData {
  float humidity;
  float ph;
  int ec;
  float temp;
  int nitrogen;
  int phosphorus;
  int potassium;
  int battery;
} currentData;

unsigned long lastReadTime = 0;

// --- CALLBACKS BLE ---
class MyServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    digitalWrite(PIN_STATUS_LED, HIGH);
    Serial.println("[BLE] Smartphone connecté !");
  }

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    digitalWrite(PIN_STATUS_LED, LOW);
    Serial.println("[BLE] Smartphone déconnecté.");
  }
};

// --- LECTURE PHYSIQUE DES CAPTEURS ---
void readSensors() {
  // 1. Température du sol (°C) via DS18B20
  dallasSensors.requestTemperatures();
  float t = dallasSensors.getTempCByIndex(0);
  if (t > -50.0 && t < 85.0) {
    currentData.temp = t;
  } else {
    currentData.temp = 26.5; // Valeur repli
  }

  // 2. Humidité du sol (% VWC) via sonde capacitive
  int rawMoisture = analogRead(PIN_SOIL_MOISTURE);
  // Étalonnage type : Air = ~3200, Eau = ~1400 (selon étalonnage terrain)
  float h = map(rawMoisture, 3200, 1400, 0, 100);
  currentData.humidity = constrain(h, 0.0, 100.0);

  // 3. pH du sol via électrode et carte de conditionnement
  int rawPH = analogRead(PIN_SOIL_PH);
  float voltagePH = (rawPH / 4095.0) * 3.3;
  // Formule d'étalonnage type : pH = 7.0 + ((V_neutre - V_mesure) * pente)
  float calculatedPH = 7.0 - (voltagePH - 1.65) * 3.5;
  currentData.ph = constrain(calculatedPH, 3.5, 9.5);

  // 4. Conductivité électrique (EC en µS/cm)
  int rawEC = analogRead(PIN_SOIL_EC);
  float voltageEC = (rawEC / 4095.0) * 3.3;
  currentData.ec = (int)(voltageEC * 1000.0);

  // 5. NPK (valeurs indicatives / Modbus RS485 en option)
  currentData.nitrogen = 18;
  currentData.phosphorus = 12;
  currentData.potassium = 65;

  // 6. Niveau de batterie (%)
  int rawBatt = analogRead(PIN_BATTERY_ADC);
  float vBatt = (rawBatt / 4095.0) * 3.3 * 2.0; // Pont diviseur par 2
  int pctBatt = (int)((vBatt - 3.2) / (4.2 - 3.2) * 100.0);
  currentData.battery = constrain(pctBatt, 0, 100);
}

// Construction du payload JSON
String buildJsonPayload() {
  String json = "{";
  json += "\"humidity\":" + String(currentData.humidity, 1) + ",";
  json += "\"ph\":" + String(currentData.ph, 2) + ",";
  json += "\"ec\":" + String(currentData.ec) + ",";
  json += "\"temp\":" + String(currentData.temp, 1) + ",";
  json += "\"nitrogen\":" + String(currentData.nitrogen) + ",";
  json += "\"phosphorus\":" + String(currentData.phosphorus) + ",";
  json += "\"potassium\":" + String(currentData.potassium) + ",";
  json += "\"battery\":" + String(currentData.battery) + ",";
  json += "\"timestamp\":" + String(millis() / 1000);
  json += "}";
  return json;
}

// --- HANDLERS HTTP WEB SERVER (WIFI SOFTAP) ---
void handleGetApiData() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", buildJsonPayload());
}

void handleGetStatus() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  String statusJson = "{\"device\":\"" + String(DEVICE_NAME) + "\",\"version\":\"" + String(FIRMWARE_VERSION) + "\",\"uptime\":" + String(millis() / 1000) + "}";
  server.send(200, "application/json", statusJson);
}

// --- SETUP ---
void setup() {
  Serial.begin(115200);
  pinMode(PIN_STATUS_LED, OUTPUT);
  digitalWrite(PIN_STATUS_LED, LOW);

  Serial.println("=========================================");
  Serial.println("   DISPOSITIF FERTILITÉ SOL (ESP32)     ");
  Serial.println("=========================================");

  // Initialisation OneWire
  dallasSensors.begin();

  // 1. Initialisation Wi-Fi SoftAP (Mode de secours)
  WiFi.softAP(SOFTAP_SSID, SOFTAP_PASSWORD, SOFTAP_CHANNEL);
  IPAddress IP = WiFi.softAPIP();
  Serial.print("[WiFi] Point d'accès actif. SSID: ");
  Serial.print(SOFTAP_SSID);
  Serial.print(" - IP: ");
  Serial.println(IP);

  server.on("/api/data", HTTP_GET, handleGetApiData);
  server.on("/api/status", HTTP_GET, handleGetStatus);
  server.begin();

  // 2. Initialisation Bluetooth Low Energy (Mode principal)
  BLEDevice::init(DEVICE_NAME);
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(BLE_SERVICE_UUID);
  pDataCharacteristic = pService->createCharacteristic(
    BLE_CHAR_DATA_UUID,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pDataCharacteristic->addDescriptor(new BLE2902());

  pService->start();
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(BLE_SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("[BLE] Serveur GATT actif et prêt pour appairage.");
}

// --- LOOP ---
void loop() {
  // Gestion des requêtes Wi-Fi SoftAP
  server.handleClient();

  // Lecture des capteurs et émission BLE à intervalle régulier
  if (millis() - lastReadTime >= SENSOR_READ_INTERVAL_MS) {
    lastReadTime = millis();
    readSensors();

    String payload = buildJsonPayload();

    // Envoi via BLE si un smartphone est connecté
    if (deviceConnected) {
      pDataCharacteristic->setValue(payload.c_str());
      pDataCharacteristic->notify();
    }
  }

  // Gestion des reconnexions BLE
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    pServer->startAdvertising();
    oldDeviceConnected = deviceConnected;
  }
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }
}
