/**
 * Configuration matérielle et logicielle du Nœud de Mesure ESP32
 * Projet : Fertilité du Sol - INP-HB (STIC / STGI)
 */

#ifndef CONFIG_H
#define CONFIG_H

// --- IDENTIFIANTS DU PÉRIPHÉRIQUE ---
#define DEVICE_NAME         "NOEUD-SOL-01"
#define FIRMWARE_VERSION    "1.0.0"

// --- ATTRIBUTION DES BROCHES (PINS) ---
#define PIN_SOIL_MOISTURE   34  // Entrée analogique sonde capacitive
#define PIN_SOIL_PH         35  // Entrée analogique électrode pH
#define PIN_SOIL_EC         32  // Entrée analogique sonde conductivité
#define PIN_ONEWIRE_TEMP    4   // Bus OneWire pour sonde étanche DS18B20
#define PIN_I2C_SDA         21  // SDA pour ADS1115 / BME280 / SHT31
#define PIN_I2C_SCL         22  // SCL pour ADS1115 / BME280 / SHT31
#define PIN_BATTERY_ADC     36  // Pont diviseur de tension batterie Li-ion
#define PIN_STATUS_LED      2   // LED témoin d'activité

// Broches RS485 (pour sonde NPK Modbus en option)
#define PIN_RS485_RX        16
#define PIN_RS485_TX        17
#define PIN_RS485_DE_RE     5

// --- PARAMÈTRES WI-FI SOFTAP (SECOURS) ---
#define SOFTAP_SSID         "NOEUD-SOL-01"
#define SOFTAP_PASSWORD     "agro12345"
#define SOFTAP_CHANNEL      6

// --- UUIDs BLUETOOTH LOW ENERGY (GATT) ---
// Conformes aux Spécifications Techniques Détaillées (STD)
#define BLE_SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define BLE_CHAR_DATA_UUID      "beb5483e-36e1-4688-b7f5-ea07361b26a8"

// --- FRÉQUENCE D'ACQUISITION ---
#define SENSOR_READ_INTERVAL_MS 1500

#endif // CONFIG_H
