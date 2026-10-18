/**
 * Service de Stockage Hors-Ligne (Offline-First)
 * Implémente la persistance locale des parcelles, campagnes, mesures et analyses
 * Conforme au schéma relationnel de BDD_Dispositif_Fertilite_Sol.xlsx
 */

const StorageService = (function () {
  const STORAGE_KEYS = {
    PARCELLES: "agro_parcelles_v1",
    CAMPAGNES: "agro_campagnes_v1",
    MESURES: "agro_mesures_v1",
    ANALYSES: "agro_analyses_v1",
    SETTINGS: "agro_settings_v1"
  };

  // Données initiales de référence issues directement du fichier BDD Excel
  const DONNEES_INITIALES = {
    parcelles: [
      { id: 1, nom: "Champ Nord", utilisateur_id: 101, localite: "Yamoussoukro, zone de Lacs", date_creation: "2026-06-10" },
      { id: 2, nom: "Champ Sud (bas-fond)", utilisateur_id: 101, localite: "Yamoussoukro, zone de Lacs", date_creation: "2026-06-15" }
    ],
    campagnes: [
      {
        id: 1,
        parcelle_id: 1,
        nom_parcelle: "Champ Nord",
        date_debut: "2026-10-01 07:30",
        date_fin: "2026-10-01 09:10",
        cultures_candidates: ["Igname", "Maïs", "Tomate"],
        statut: "analysee"
      },
      {
        id: 2,
        parcelle_id: 2,
        nom_parcelle: "Champ Sud (bas-fond)",
        date_debut: "2026-10-03 06:50",
        date_fin: "2026-10-03 08:20",
        cultures_candidates: ["Riz pluvial", "Banane plantain", "Maïs"],
        statut: "analysee"
      }
    ],
    mesures: [
      // Campagne 1 (Champ Nord)
      { id: 1, campagne_id: 1, horodatage: "2026-10-01 07:30", latitude: 6.90355, longitude: -5.32389, humidite_pct: 22.5, ph: 5.75, ec_us_cm: 1105, azote_mgkg: 20, phosphore_mgkg: 14, potassium_mgkg: 62, temperature_c: 26.9, liaison: "BLE" },
      { id: 2, campagne_id: 1, horodatage: "2026-10-01 07:50", latitude: 6.90111, longitude: -5.32312, humidite_pct: 24.5, ph: 5.53, ec_us_cm: 809, azote_mgkg: 20, phosphore_mgkg: 12, potassium_mgkg: 66, temperature_c: 27.3, liaison: "BLE" },
      { id: 3, campagne_id: 1, horodatage: "2026-10-01 08:10", latitude: 6.90423, longitude: -5.32397, humidite_pct: 27.3, ph: 6.27, ec_us_cm: 887, azote_mgkg: 15, phosphore_mgkg: 15, potassium_mgkg: 68, temperature_c: 26.2, liaison: "BLE" },
      { id: 4, campagne_id: 1, horodatage: "2026-10-01 08:30", latitude: 6.90138, longitude: -5.32061, humidite_pct: 25.4, ph: 6.39, ec_us_cm: 1101, azote_mgkg: 19, phosphore_mgkg: 15, potassium_mgkg: 69, temperature_c: 27.2, liaison: "BLE" },
      { id: 5, campagne_id: 1, horodatage: "2026-10-01 08:50", latitude: 6.90431, longitude: -5.32152, humidite_pct: 27.8, ph: 6.14, ec_us_cm: 1088, azote_mgkg: 14, phosphore_mgkg: 10, potassium_mgkg: 67, temperature_c: 26.2, liaison: "BLE" },
      { id: 6, campagne_id: 1, horodatage: "2026-10-01 09:10", latitude: 6.90193, longitude: -5.32359, humidite_pct: 22.5, ph: 6.20, ec_us_cm: 901, azote_mgkg: 17, phosphore_mgkg: 10, potassium_mgkg: 67, temperature_c: 28.1, liaison: "BLE" },
      // Campagne 2 (Champ Sud)
      { id: 7, campagne_id: 2, horodatage: "2026-10-03 06:50", latitude: 6.91259, longitude: -5.33056, humidite_pct: 36.5, ph: 5.88, ec_us_cm: 1340, azote_mgkg: 19, phosphore_mgkg: 13, potassium_mgkg: 101, temperature_c: 26.2, liaison: "WIFI" },
      { id: 8, campagne_id: 2, horodatage: "2026-10-03 07:10", latitude: 6.91273, longitude: -5.32962, humidite_pct: 42.0, ph: 5.48, ec_us_cm: 1268, azote_mgkg: 19, phosphore_mgkg: 9, potassium_mgkg: 90, temperature_c: 26.9, liaison: "BLE" },
      { id: 9, campagne_id: 2, horodatage: "2026-10-03 07:30", latitude: 6.91350, longitude: -5.33174, humidite_pct: 40.9, ph: 5.62, ec_us_cm: 1753, azote_mgkg: 20, phosphore_mgkg: 9, potassium_mgkg: 91, temperature_c: 26.2, liaison: "BLE" },
      { id: 10, campagne_id: 2, horodatage: "2026-10-03 07:50", latitude: 6.91105, longitude: -5.33066, humidite_pct: 43.1, ph: 5.62, ec_us_cm: 1371, azote_mgkg: 25, phosphore_mgkg: 10, potassium_mgkg: 87, temperature_c: 25.3, liaison: "BLE" },
      { id: 11, campagne_id: 2, horodatage: "2026-10-03 08:10", latitude: 6.91043, longitude: -5.33049, humidite_pct: 42.1, ph: 5.64, ec_us_cm: 1285, azote_mgkg: 19, phosphore_mgkg: 13, potassium_mgkg: 98, temperature_c: 26.9, liaison: "BLE" }
    ],
    settings: {
      mode_liaison: "BLE", // "BLE" ou "WIFI"
      use_simulator: true,  // actif par défaut pour tester sans carte physique
      esp32_ip: "192.168.4.1",
      sync_serveur_url: "http://localhost:5000/api"
    }
  };

  function initStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.PARCELLES)) {
      localStorage.setItem(STORAGE_KEYS.PARCELLES, JSON.stringify(DONNEES_INITIALES.parcelles));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CAMPAGNES)) {
      localStorage.setItem(STORAGE_KEYS.CAMPAGNES, JSON.stringify(DONNEES_INITIALES.campagnes));
    }
    if (!localStorage.getItem(STORAGE_KEYS.MESURES)) {
      localStorage.setItem(STORAGE_KEYS.MESURES, JSON.stringify(DONNEES_INITIALES.mesures));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DONNEES_INITIALES.settings));
    }
  }

  // Initialisation immédiate
  try {
    initStorage();
  } catch (e) {
    console.warn("Storage local non accessible :", e);
  }

  function get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function set(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.error("Erreur écriture storage:", e);
    }
  }

  return {
    // --- PARCELLES ---
    getParcelles: () => get(STORAGE_KEYS.PARCELLES),
    getParcelleById: (id) => get(STORAGE_KEYS.PARCELLES).find(p => p.id === Number(id)),
    addParcelle: (nom, localite = "Yamoussoukro") => {
      const parcelles = get(STORAGE_KEYS.PARCELLES);
      const newId = parcelles.length > 0 ? Math.max(...parcelles.map(p => p.id)) + 1 : 1;
      const nouvelle = {
        id: newId,
        nom: nom.trim(),
        utilisateur_id: 101,
        localite: localite,
        date_creation: new Date().toISOString().split("T")[0]
      };
      parcelles.push(nouvelle);
      set(STORAGE_KEYS.PARCELLES, parcelles);
      return nouvelle;
    },

    // --- CAMPAGNES ---
    getCampagnes: () => get(STORAGE_KEYS.CAMPAGNES),
    getCampagnesByParcelle: (parcelleId) => get(STORAGE_KEYS.CAMPAGNES).filter(c => c.parcelle_id === Number(parcelleId)),
    getCampagneById: (id) => get(STORAGE_KEYS.CAMPAGNES).find(c => c.id === Number(id)),
    addCampagne: (parcelleId, nomParcelle, culturesCandidates) => {
      const campagnes = get(STORAGE_KEYS.CAMPAGNES);
      const newId = campagnes.length > 0 ? Math.max(...campagnes.map(c => c.id)) + 1 : 1;
      const dateNow = new Date().toISOString().replace("T", " ").substring(0, 16);
      const nouvelle = {
        id: newId,
        parcelle_id: Number(parcelleId),
        nom_parcelle: nomParcelle,
        date_debut: dateNow,
        date_fin: null,
        cultures_candidates: culturesCandidates,
        statut: "en_cours"
      };
      campagnes.unshift(nouvelle);
      set(STORAGE_KEYS.CAMPAGNES, campagnes);
      return nouvelle;
    },
    cloturerCampagne: (campagneId) => {
      const campagnes = get(STORAGE_KEYS.CAMPAGNES);
      const c = campagnes.find(item => item.id === Number(campagneId));
      if (c) {
        c.date_fin = new Date().toISOString().replace("T", " ").substring(0, 16);
        c.statut = "analysee";
        set(STORAGE_KEYS.CAMPAGNES, campagnes);
      }
      return c;
    },

    // --- MESURES ---
    getMesures: () => get(STORAGE_KEYS.MESURES),
    getMesuresByCampagne: (campagneId) => get(STORAGE_KEYS.MESURES).filter(m => m.campagne_id === Number(campagneId)),
    addMesure: (campagneId, mesureData) => {
      const mesures = get(STORAGE_KEYS.MESURES);
      const newId = mesures.length > 0 ? Math.max(...mesures.map(m => m.id)) + 1 : 1;
      const dateNow = new Date().toISOString().replace("T", " ").substring(0, 16);
      const nouvelle = {
        id: newId,
        campagne_id: Number(campagneId),
        horodatage: dateNow,
        latitude: mesureData.latitude || 6.9035,
        longitude: mesureData.longitude || -5.3238,
        humidite_pct: Number(mesureData.humidite_pct) || 0,
        ph: Number(mesureData.ph) || 7.0,
        ec_us_cm: Number(mesureData.ec_us_cm) || 0,
        azote_mgkg: mesureData.azote_mgkg || 15,
        phosphore_mgkg: mesureData.phosphore_mgkg || 12,
        potassium_mgkg: mesureData.potassium_mgkg || 65,
        temperature_c: Number(mesureData.temperature_c) || 26.0,
        liaison: mesureData.liaison || "BLE"
      };
      mesures.push(nouvelle);
      set(STORAGE_KEYS.MESURES, mesures);
      return nouvelle;
    },

    // --- PARAMETRES ---
    getSettings: () => {
      try {
        const s = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        return s ? JSON.parse(s) : DONNEES_INITIALES.settings;
      } catch (e) {
        return DONNEES_INITIALES.settings;
      }
    },
    saveSettings: (settingsObj) => {
      set(STORAGE_KEYS.SETTINGS, settingsObj);
    },

    // Réinitialisation d'usine / données par défaut
    reinitialiserDonnees: () => {
      localStorage.clear();
      initStorage();
    }
  };
})();
