-- =====================================================================
-- Schéma Relationnel de la Base de Données (PostgreSQL / SQLite)
-- Système d'automatisation de mesures de fertilité des sols (INP-HB)
-- Conforme au fichier de référence BDD_Dispositif_Fertilite_Sol.xlsx
-- =====================================================================

-- 1. Table des Parcelles
CREATE TABLE IF NOT EXISTS parcelles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom VARCHAR(100) NOT NULL,
    utilisateur_id INTEGER NOT NULL,
    localite VARCHAR(150) DEFAULT 'Yamoussoukro',
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Table des Campagnes de mesure
CREATE TABLE IF NOT EXISTS campagnes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parcelle_id INTEGER NOT NULL,
    nom_parcelle VARCHAR(100) NOT NULL,
    date_debut TIMESTAMP NOT NULL,
    date_fin TIMESTAMP,
    cultures_candidates TEXT NOT NULL, -- Liste au format JSON ou texte séparé
    statut VARCHAR(30) DEFAULT 'en_cours', -- en_cours / terminee / analysee
    FOREIGN KEY (parcelle_id) REFERENCES parcelles(id) ON DELETE CASCADE
);

-- 3. Table des Points de mesure (relevés BLE/Wi-Fi de l'ESP32)
CREATE TABLE IF NOT EXISTS mesures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campagne_id INTEGER NOT NULL,
    horodatage TIMESTAMP NOT NULL,
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL,
    humidite_pct DECIMAL(5, 2) NOT NULL,
    ph DECIMAL(4, 2) NOT NULL,
    ec_us_cm DECIMAL(7, 2) NOT NULL,
    azote_mgkg DECIMAL(6, 2) DEFAULT 0,
    phosphore_mgkg DECIMAL(6, 2) DEFAULT 0,
    potassium_mgkg DECIMAL(6, 2) DEFAULT 0,
    temperature_c DECIMAL(4, 2) NOT NULL,
    liaison VARCHAR(20) DEFAULT 'BLE', -- BLE ou WIFI
    FOREIGN KEY (campagne_id) REFERENCES campagnes(id) ON DELETE CASCADE
);

-- 4. Table des Fiches Agronomiques de Référence
CREATE TABLE IF NOT EXISTS cultures_reference (
    culture VARCHAR(80) PRIMARY KEY,
    ph_min DECIMAL(4, 2) NOT NULL,
    ph_max DECIMAL(4, 2) NOT NULL,
    humidite_min_pct DECIMAL(5, 2) NOT NULL,
    humidite_max_pct DECIMAL(5, 2) NOT NULL,
    ec_max_us_cm DECIMAL(7, 2) NOT NULL,
    temp_min_c DECIMAL(4, 2) NOT NULL,
    temp_max_c DECIMAL(4, 2) NOT NULL,
    source VARCHAR(200) DEFAULT 'CNRA / FAO EcoCrop'
);

-- 5. Table des Analyses et Recommandations
CREATE TABLE IF NOT EXISTS analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campagne_id INTEGER NOT NULL,
    nom_parcelle VARCHAR(100) NOT NULL,
    culture_candidate VARCHAR(80) NOT NULL,
    n_points INTEGER NOT NULL,
    moy_humidite_pct DECIMAL(5, 2) NOT NULL,
    ecart_type_humidite DECIMAL(5, 2) NOT NULL,
    moy_ph DECIMAL(4, 2) NOT NULL,
    moy_ec_us_cm DECIMAL(7, 2) NOT NULL,
    moy_temp_c DECIMAL(4, 2) NOT NULL,
    score_humidite DECIMAL(3, 2) NOT NULL,
    score_ph DECIMAL(3, 2) NOT NULL,
    score_ec DECIMAL(3, 2) NOT NULL,
    score_global DECIMAL(3, 2) NOT NULL,
    classe VARCHAR(50) NOT NULL, -- Adapté / Possible avec corrections / Non adapté
    recommandations TEXT NOT NULL,
    date_analyse TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campagne_id) REFERENCES campagnes(id) ON DELETE CASCADE,
    FOREIGN KEY (culture_candidate) REFERENCES cultures_reference(culture)
);

-- Index pour optimiser les requêtes sur les relevés
CREATE INDEX IF NOT EXISTS idx_mesures_campagne ON mesures(campagne_id);
CREATE INDEX IF NOT EXISTS idx_campagnes_parcelle ON campagnes(parcelle_id);
