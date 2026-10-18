# 4. Plan de Tests et de Validation (V&V)

## 1. Philosophie de Test dans le Cycle en V

Dans le Cycle en V, la phase montante valide systématiquement chaque exigence définie dans la phase descendante.

```
[EB] Expression des Besoins   <==============>  [V&V] Recette Terrain & Validation Agronomique
[SFG] Spécifications Fonct.   <==============>  [TF]  Tests Fonctionnels Système (7 Écrans)
[STD] Spécifications Tech.    <==============>  [TI]  Tests d'Intégration (BLE/Wi-Fi/Stockage)
[Code] Réalisation Logicielle <==============>  [TU]  Tests Unitaires (Moteur de Scoring)
```

---

## 2. Niveaux de Tests Définis

### 2.1 Tests Unitaires (TU)
- **Cible** : Le moteur agronomique (`agronomy_engine.js` et script Python miroir `tests/test_agronomy_scoring.py`).
- **Objectifs** :
  - Vérifier que pour des valeurs optimales de sol, le score est égal à 1.0 (100%) et la classe est `Adapté`.
  - Vérifier la dégradation du score lorsque le sol est trop acide ou trop humide.
  - Vérifier la génération correcte des textes de recommandation (ex. chaulage pour pH bas, drainage pour humidité haute).
  - Vérifier la robustesse aux valeurs limites ($pH \le 0$, humidité $> 100\%$, division par zéro si un seul point).

### 2.2 Tests d'Intégration (TI)
- **Cible** : Les couches de communication et de persistance (`ble_service.js`, `wifi_service.js`, `storage_service.js`).
- **Objectifs** :
  - Valider le parsing des payloads JSON reçus via BLE GATT ou HTTP SoftAP.
  - Valider le stockage hors-ligne dans le navigateur ou smartphone : persistance après rechargement de page ou extinction du téléphone.
  - Valider le basculement transparent entre BLE, Wi-Fi SoftAP et simulateur de test.

### 2.3 Tests Fonctionnels (TF)
- **Cible** : Les 7 écrans de l'application mobile.
- **Scénario TF-01 (Parcours Nominal Complet)** :
  1. Ouvrir l'application sur l'écran d'accueil (`Accueil`).
  2. Cliquer sur `+ Nouvelle campagne`.
  3. Sélectionner `Champ Nord` et cocher `Igname`, `Maïs`, `Tomate`.
  4. Lancer la campagne -> Arrivée sur l'écran `Mesure en cours`.
  5. Effectuer 3 à 6 relevés de points (lecture capteurs ESP32 en direct + coordonnées GPS).
  6. Cliquer sur `Clôturer et analyser la campagne` -> Arrivée sur l'écran `Résultats`.
  7. Constater le classement des cultures candidates et les conseils d'apport.
  8. Revenir à l'accueil et consulter l'écran `Historique` et `Détail parcelle` pour vérifier l'enregistrement.

### 2.4 Recette Terrain et Validation Agronomique (V&V)
- **Cible** : Confrontation du système complet (nœud physique ESP32 + capteurs dans la terre + application smartphone) avec la réalité pédologique d'une parcelle à Yamoussoukro.
- **Critères de Succès** :
  - Taux de réception des trames de mesure supérieur à 95% à une distance de 10 mètres.
  - Écart de mesure du pH inférieur à $\pm 0.3$ unité par rapport à un pH-mètre de référence de laboratoire.
  - Absence totale de perte de données lors de la relève au champ sans réseau Internet.
  - Validation des recommandations agronomiques par un encadrant ou agronome CNRA / ANADER.
