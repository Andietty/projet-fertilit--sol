# Firmware Nœud Terrain ESP32 - Mesure de Fertilité du Sol

Ce sous-dossier contient le code source embarqué destiné à la carte microcontrôleur **ESP32 DevKit** du nœud terrain de mesure.

---

## 1. Prérequis Logiciels

Pour compiler et téléverser ce firmware sur l'ESP32 :
1. **Arduino IDE** (version 2.x ou supérieure) ou **VS Code avec l'extension PlatformIO**.
2. Installer le support des cartes ESP32 dans le gestionnaire de cartes Arduino :
   - URL : `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
3. Installer les bibliothèques suivantes via le Library Manager d'Arduino :
   - `OneWire` (par Paul Stoffregen)
   - `DallasTemperature` (par Miles Burton)
   - `ESP32 BLE Arduino` (inclus de base dans le core ESP32)

---

## 2. Câblage des Capteurs sur l'ESP32

| Composant | Rôle | Broche ESP32 (GPIO) | Remarque |
| :--- | :--- | :--- | :--- |
| **Sonde Humidité Capacitive v1.2** | Teneur en eau du sol | `GPIO 34` (Analogique) | Alimentation en 3.3V stable |
| **Sonde pH Analogique** | Acidité / Alcalinité | `GPIO 35` (Analogique) | Carte de conditionnement analogique |
| **Sonde Conductivité (EC)** | Salinité et ions | `GPIO 32` (Analogique) | Signal analogique conditionné |
| **Sonde DS18B20 étanche** | Température du sol | `GPIO 4` (OneWire) | Résistance de pull-up de 4.7 kΩ entre Data et VCC |
| **Pont diviseur Batterie** | Niveau de charge Li-ion | `GPIO 36` (VP) | Deux résistances de 100 kΩ pour diviser par 2 |
| **LED Témoin** | Statut d'appairage | `GPIO 2` | Allumée en fixe lors d'une connexion BLE |

---

## 3. Communication Sans Fil Embarquée

1. **Bluetooth Low Energy (Mode Principal)** :
   - Nom diffusé : `NOEUD-SOL-01`
   - Service UUID : `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
   - Characteristic UUID : `beb5483e-36e1-4688-b7f5-ea07361b26a8` (Notifications JSON toutes les 1.5s)
2. **Wi-Fi SoftAP (Mode de Secours)** :
   - SSID diffusé : `NOEUD-SOL-01`
   - Mot de passe : `agro12345`
   - Adresse IP fixe : `192.168.4.1`
   - Endpoint HTTP : `GET http://192.168.4.1/api/data`
