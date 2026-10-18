# 1. Expression des Besoins (EB)

## 1. Contexte et Problématique en Côte d'Ivoire

En Côte d'Ivoire, l'agriculture constitue l'un des piliers majeurs de l'économie nationale et de la sécurité alimentaire. Cependant, les producteurs se heurtent à plusieurs défis structurants :
1. **L'acidité fréquente et la dégradation des sols** : Une grande partie des terres arables (notamment les sols ferrallitiques du Sud et du Centre de transition) présente un pH acide ($pH < 5.5$), ce qui bloque l'assimilation des nutriments clés (phosphore, calcium, magnésium) et favorise la toxicité aluminique.
2. **Le choix empirique des cultures** : Le choix des cultures et le calendrier de semis reposent traditionnellement sur les habitudes ancestrales plutôt que sur une analyse scientifique des paramètres du sol et du climat.
3. **Le gaspillage ou le déficit en intrants et en eau** : Les apports en eau et en fertilisants sont souvent inadaptés, entraînant soit des gaspillages coûteux et polluants, soit des stress hydriques et nutritionnels pénalisant fortement les rendements.
4. **La variabilité pédoclimatique** : Du sud forestier à deux saisons des pluies, au centre de transition (Yamoussoukro), jusqu'au nord de savane soumis à l'harmattan, les exigences des cultures doivent impérativement être confrontées à la réalité physique du terrain.

---

## 2. Objectifs du Système

### 2.1 Objectif Général
Concevoir et réaliser un dispositif électronique autonome capable de mesurer les paramètres physico-chimiques essentiels de fertilité d'un sol, de transmettre ces mesures à un smartphone (via Bluetooth Low Energy ou Wi-Fi), puis de déterminer grâce à un moteur agronomique si le sol est adapté à une ou plusieurs cultures candidates choisies par l'utilisateur, en recommandant les apports ou corrections nécessaires.

### 2.2 Objectifs Spécifiques
- **O-01 (Mesure)** : Mesurer au moins l'humidité volumique du sol (% VWC), le pH, la conductivité électrique (EC en µS/cm), la température du sol (°C) et les paramètres ambiants (température et humidité de l'air). En option : les teneurs N-P-K (Azote, Phosphore, Potassium).
- **O-02 (Communication Locale)** : Assurer un transfert fluide et fiable sans fil entre le nœud terrain (ESP32) et le smartphone via **BLE** (mode nominal) avec repli en **Wi-Fi SoftAP** (mode secours/configuration).
- **O-03 (Application Mobile & Traitement Terrain)** : Fournir une application mobile simple, réactive, fonctionnant **100% hors-ligne (Offline-First)** au champ, permettant de cartographier la parcelle, d'associer la position GPS du téléphone et d'enregistrer des campagnes de mesure multi-points.
- **O-04 (Moteur Décisionnel Agronomique)** : Évaluer l'adéquation sol/culture sur une base scientifique validée (FAO EcoCrop, CNRA, ANADER), attribuer un score de compatibilité (0 à 100%) et formuler des recommandations claires (chaulage, drainage, irrigation, fertilisation).
- **O-05 (Autonomie & Robustesse)** : Garantir l'autonomie énergétique du nœud terrain par alimentation solaire photovoltaïque et batterie Li-ion 18650, sous boîtier étanche IP65.

---

## 3. Profil des Utilisateurs Cibles

| Utilisateur | Besoins Principaux | Contraintes |
| :--- | :--- | :--- |
| **Planteur / Agriculteur** | Diagnostic rapide, lecture simple avec codes couleurs et pictogrammes, conseils concrets en français accessible. | Faible familiarité technique, zones rurales sans couverture réseau cellulaire (pas de 4G/GSM garanti). |
| **Conseiller agricole (ANADER)** | Outil mobile d'aide à la décision, historisation des parcelles, traçabilité des points de mesure avec GPS. | Besoin de relever rapidement plusieurs points sur une parcelle hétérogène. |
| **Agronome / Enseignant (INP-HB)** | Validation scientifique des seuils, export des données de campagne, précision des capteurs vs analyses de référence en laboratoire. | Nécessité de calibrage et d'auditabilité des formules de calcul. |

---

## 4. Contraintes de Terrain en Milieu Ivoirien

1. **Réseau intermittent ou absent** : L'application smartphone **ne doit pas dépendre d'une connexion Internet active au moment de la mesure**. Toutes les données doivent être enregistrées localement dans une base de données embarquée et synchronisées ultérieurement.
2. **Conditions climatiques sévères** : Chaleur élevée ($> 35^\circ\text{C}$), humidité saturante lors des saisons des pluies, poussière fine lors de l'harmattan.
3. **Sécurité et simplicité** : Le nœud de mesure doit être mobile ou discret, facile à planter dans le sol et commandable d'un simple clic sur le smartphone.
