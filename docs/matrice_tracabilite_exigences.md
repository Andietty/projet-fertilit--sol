# Matrice de Traçabilité des Exigences (Cycle en V)

| Réf. Exigence | Description du Besoin (EB) | Spécification Fonctionnelle (SFG) | Spécification Technique (STD) | Composant Réalisé (Code) | Cas de Test Associé |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **EX-01** | Mesure multiparamétrique du sol (Humidité, pH, EC, Température, NPK) | Écran 3 : Mesure en cours avec 4 métriques en direct | Protocole BLE GATT `0xbeb5...` & API Wi-Fi `/api/data` | `firmware/ESP32_Noeud_Fertilite.ino`<br/>`mobile-app/js/ble_service.js` | `TU-01`<br/>`TF-01` |
| **EX-02** | Fonctionnement 100% hors-ligne (Offline-First) en zone rurale sans 4G | Mode local, enregistrement point par point au champ | Cache `LocalStorage` & Service Worker PWA | `mobile-app/js/storage_service.js`<br/>`mobile-app/service-worker.js` | `TI-01`<br/>`TF-01` |
| **EX-03** | Association géolocalisée et horodatée de chaque point de mesure | Enregistrement coordonnées GPS smartphone + heure | API `navigator.geolocation` | `mobile-app/js/app.js` | `TI-02`<br/>`TF-01` |
| **EX-04** | Évaluation agronomique multicritères pour les cultures ivoiriennes | Écran 4 : Résultats avec badges "Adapté", score et conseils | Moteur de scoring pondéré basé sur FAO EcoCrop / CNRA | `mobile-app/js/agronomy_engine.js`<br/>`server-api/fiches_cultures.json` | `TU-01`<br/>`TU-02` |
| **EX-05** | Double liaison sans fil résiliente (BLE principal + Wi-Fi de secours) | Écran 7 : Wi-Fi de secours et paramètres nœud | Serveur SoftAP ESP32 (`192.168.4.1`) & BLE GATT | `firmware/ESP32_Noeud_Fertilite.ino`<br/>`mobile-app/js/wifi_service.js` | `TI-03` |
| **EX-06** | Gestion du catalogue de parcelles et historique des campagnes | Écrans 1, 5 et 6 : Mes parcelles, Historique, Détail | Modèle relationnel BDD Excel (`parcelles`, `campagnes`) | `mobile-app/js/storage_service.js`<br/>`server-api/schema.sql` | `TF-02` |
| **EX-07** | Mode démonstration / simulation sans dépendance matérielle | Simulation des capteurs pour validation immédiate | Générateur de valeurs réalistes avec bruit statistique | `mobile-app/js/esp32_simulator.js` | `TU-03` |
