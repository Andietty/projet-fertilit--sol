/**
 * Service de Stockage Hors-Ligne (Offline-First) & Partage Données Admin
 * Implémente la persistance locale des parcelles, campagnes, mesures, analyses, utilisateurs et cultures
 * Conforme au schéma relationnel de BDD_Dispositif_Fertilite_Sol.xlsx
 */

const StorageService = (function () {
  const STORAGE_KEYS = {
    PARCELLES: "agro_parcelles_v1",
    CAMPAGNES: "agro_campagnes_v1",
    MESURES: "agro_mesures_v1",
    ANALYSES: "agro_analyses_v1",
    USERS: "agro_users_v1",
    CULTURES: "agro_cultures_v1",
    SETTINGS: "agro_settings_v1"
  };

  // Données initiales de référence issues de BDD_Dispositif_Fertilite_Sol.xlsx et extensions
  const DONNEES_INITIALES = {
    users: [
      { id: 101, nom: "Kouamé N'Dri", role: "Planteur", localite: "Yamoussoukro, zone de Lacs", telephone: "+225 07 01 23 45 67", date_inscription: "2026-05-12" },
      { id: 102, nom: "Aya Konan", role: "Planteur", localite: "Toumodi", telephone: "+225 05 12 34 56 78", date_inscription: "2026-06-01" },
      { id: 103, nom: "Bakary Traoré", role: "Planteur", localite: "Bouaké", telephone: "+225 01 98 76 54 32", date_inscription: "2026-07-15" },
      { id: 104, nom: "Affi Brou", role: "Planteur", localite: "Tiébissou", telephone: "+225 07 44 55 66 77", date_inscription: "2026-08-20" },
      { id: 105, nom: "Dr. Yao Kouadio", role: "Conseiller ANADER", localite: "Yamoussoukro", telephone: "+225 05 99 88 77 66", date_inscription: "2026-04-10" }
    ],
    parcelles: [
      { id: 1, nom: "Champ Nord", utilisateur_id: 101, localite: "Yamoussoukro, zone de Lacs", superficie_ha: 2.5, date_creation: "2026-06-10" },
      { id: 2, nom: "Champ Sud (bas-fond)", utilisateur_id: 101, localite: "Yamoussoukro, zone de Lacs", superficie_ha: 1.8, date_creation: "2026-06-15" },
      { id: 3, nom: "Parcelle Colline", utilisateur_id: 102, localite: "Toumodi", superficie_ha: 3.2, date_creation: "2026-07-02" },
      { id: 4, nom: "Périmètre Maraîcher", utilisateur_id: 103, localite: "Bouaké", superficie_ha: 1.0, date_creation: "2026-08-11" }
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
      },
      {
        id: 3,
        parcelle_id: 3,
        nom_parcelle: "Parcelle Colline",
        date_debut: "2026-10-10 08:00",
        date_fin: "2026-10-10 09:30",
        cultures_candidates: ["Manioc", "Maïs"],
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
      { id: 11, campagne_id: 2, horodatage: "2026-10-03 08:10", latitude: 6.91043, longitude: -5.33049, humidite_pct: 42.1, ph: 5.64, ec_us_cm: 1285, azote_mgkg: 19, phosphore_mgkg: 13, potassium_mgkg: 98, temperature_c: 26.9, liaison: "BLE" },
      // Campagne 3 (Parcelle Colline)
      { id: 12, campagne_id: 3, horodatage: "2026-10-10 08:00", latitude: 6.55410, longitude: -5.01820, humidite_pct: 21.0, ph: 5.15, ec_us_cm: 750, azote_mgkg: 14, phosphore_mgkg: 8, potassium_mgkg: 52, temperature_c: 27.5, liaison: "BLE" },
      { id: 13, campagne_id: 3, horodatage: "2026-10-10 08:30", latitude: 6.55480, longitude: -5.01910, humidite_pct: 22.5, ph: 5.20, ec_us_cm: 810, azote_mgkg: 15, phosphore_mgkg: 10, potassium_mgkg: 58, temperature_c: 28.0, liaison: "BLE" }
    ],
    cultures: {
      "Manioc": {
        nom: "Manioc",
        ph_min: 5.0,
        ph_max: 7.0,
        ph_opt_min: 5.5,
        ph_opt_max: 7.0,
        humidite_min_pct: 20,
        humidite_max_pct: 35,
        ec_max_us_cm: 2000,
        temp_min_c: 25,
        temp_max_c: 29,
        points_cles: "Tolère les sols pauvres et une sécheresse modérée. Sensible à l'engorgement prolongé.",
        source: "CNRA / FAO EcoCrop"
      },
      "Igname": {
        nom: "Igname",
        ph_min: 5.5,
        ph_max: 6.5,
        ph_opt_min: 5.5,
        ph_opt_max: 6.5,
        humidite_min_pct: 25,
        humidite_max_pct: 40,
        ec_max_us_cm: 1500,
        temp_min_c: 25,
        temp_max_c: 30,
        points_cles: "Exige un sol meuble, profond, bien drainé. Sensible à l'excès d'eau et au pH trop acide.",
        source: "CNRA / FAO EcoCrop"
      },
      "Riz pluvial": {
        nom: "Riz pluvial",
        ph_min: 5.0,
        ph_max: 6.5,
        ph_opt_min: 5.5,
        ph_opt_max: 6.5,
        humidite_min_pct: 30,
        humidite_max_pct: 45,
        ec_max_us_cm: 3000,
        temp_min_c: 25,
        temp_max_c: 30,
        points_cles: "Bonne tolérance à l'humidité du sol. Idéal pour les bas-fonds et zones de transition.",
        source: "CNRA / FAO EcoCrop"
      },
      "Maïs": {
        nom: "Maïs",
        ph_min: 5.8,
        ph_max: 7.0,
        ph_opt_min: 5.8,
        ph_opt_max: 7.0,
        humidite_min_pct: 20,
        humidite_max_pct: 30,
        ec_max_us_cm: 1700,
        temp_min_c: 20,
        temp_max_c: 30,
        points_cles: "Très sensible au manque d'eau à la floraison et à l'acidité marquée (pH < 5.5).",
        source: "CNRA / FAO EcoCrop"
      },
      "Banane plantain": {
        nom: "Banane plantain",
        ph_min: 5.5,
        ph_max: 7.0,
        ph_opt_min: 5.5,
        ph_opt_max: 7.0,
        humidite_min_pct: 30,
        humidite_max_pct: 45,
        ec_max_us_cm: 1500,
        temp_min_c: 25,
        temp_max_c: 30,
        points_cles: "Exige une alimentation en eau régulière et un sol riche en matière organique et potassium.",
        source: "CNRA / FAO EcoCrop"
      },
      "Tomate": {
        nom: "Tomate",
        ph_min: 6.0,
        ph_max: 6.8,
        ph_opt_min: 6.0,
        ph_opt_max: 6.8,
        humidite_min_pct: 20,
        humidite_max_pct: 30,
        ec_max_us_cm: 2500,
        temp_min_c: 18,
        temp_max_c: 27,
        points_cles: "Exige un pH proche de la neutralité. Sensible aux pourritures en sol gorgé d'eau.",
        source: "FAO EcoCrop"
      }
    },
    settings: {
      mode_liaison: "BLE", // "BLE" ou "WIFI"
      use_simulator: true,
      esp32_ip: "192.168.4.1",
      sync_serveur_url: "http://localhost:5000/api"
    }
  };

  function initStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DONNEES_INITIALES.users));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PARCELLES)) {
      localStorage.setItem(STORAGE_KEYS.PARCELLES, JSON.stringify(DONNEES_INITIALES.parcelles));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CAMPAGNES)) {
      localStorage.setItem(STORAGE_KEYS.CAMPAGNES, JSON.stringify(DONNEES_INITIALES.campagnes));
    }
    if (!localStorage.getItem(STORAGE_KEYS.MESURES)) {
      localStorage.setItem(STORAGE_KEYS.MESURES, JSON.stringify(DONNEES_INITIALES.mesures));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CULTURES)) {
      localStorage.setItem(STORAGE_KEYS.CULTURES, JSON.stringify(DONNEES_INITIALES.cultures));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DONNEES_INITIALES.settings));
    }
  }

  try {
    initStorage();
  } catch (e) {
    console.warn("Storage local non accessible :", e);
  }

  function get(key, defaultValue = []) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      return defaultValue;
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
    // --- UTILISATEURS / PLANTEURS ---
    getUsers: () => get(STORAGE_KEYS.USERS, DONNEES_INITIALES.users),
    getUserById: (id) => get(STORAGE_KEYS.USERS, DONNEES_INITIALES.users).find(u => u.id === Number(id)),
    addUser: (nom, role = "Planteur", localite = "Yamoussoukro", telephone = "") => {
      const users = get(STORAGE_KEYS.USERS, DONNEES_INITIALES.users);
      const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 101;
      const newUser = {
        id: newId,
        nom: nom.trim(),
        role: role,
        localite: localite.trim(),
        telephone: telephone.trim() || "+225 07 00 00 00 00",
        date_inscription: new Date().toISOString().split("T")[0]
      };
      users.push(newUser);
      set(STORAGE_KEYS.USERS, users);
      return newUser;
    },
    deleteUser: (id) => {
      let users = get(STORAGE_KEYS.USERS, DONNEES_INITIALES.users);
      users = users.filter(u => u.id !== Number(id));
      set(STORAGE_KEYS.USERS, users);
      return true;
    },

    // --- CULTURES DE RÉFÉRENCE (CATALOGUE AGRONOMIQUE) ---
    getCulturesReference: () => get(STORAGE_KEYS.CULTURES, DONNEES_INITIALES.cultures),
    addOrUpdateCulture: (cultureObj) => {
      const cultures = get(STORAGE_KEYS.CULTURES, DONNEES_INITIALES.cultures);
      const nom = cultureObj.nom.trim();
      cultures[nom] = {
        nom: nom,
        ph_min: Number(cultureObj.ph_min) || 5.0,
        ph_max: Number(cultureObj.ph_max) || 7.0,
        ph_opt_min: Number(cultureObj.ph_opt_min || cultureObj.ph_min) || 5.5,
        ph_opt_max: Number(cultureObj.ph_opt_max || cultureObj.ph_max) || 7.0,
        humidite_min_pct: Number(cultureObj.humidite_min_pct) || 20,
        humidite_max_pct: Number(cultureObj.humidite_max_pct) || 35,
        ec_max_us_cm: Number(cultureObj.ec_max_us_cm) || 2000,
        temp_min_c: Number(cultureObj.temp_min_c) || 20,
        temp_max_c: Number(cultureObj.temp_max_c) || 30,
        points_cles: cultureObj.points_cles || "Seuils agronomiques configurés via l'administration.",
        source: cultureObj.source || "Manuel / CNRA"
      };
      set(STORAGE_KEYS.CULTURES, cultures);
      return cultures[nom];
    },
    deleteCulture: (nom) => {
      const cultures = get(STORAGE_KEYS.CULTURES, DONNEES_INITIALES.cultures);
      if (cultures[nom]) {
        delete cultures[nom];
        set(STORAGE_KEYS.CULTURES, cultures);
        return true;
      }
      return false;
    },

    // --- PARCELLES ---
    getParcelles: () => get(STORAGE_KEYS.PARCELLES, DONNEES_INITIALES.parcelles),
    getParcelleById: (id) => get(STORAGE_KEYS.PARCELLES, DONNEES_INITIALES.parcelles).find(p => p.id === Number(id)),
    addParcelle: (nom, localite = "Yamoussoukro", userId = 101, superficie = 1.0) => {
      const parcelles = get(STORAGE_KEYS.PARCELLES, DONNEES_INITIALES.parcelles);
      const newId = parcelles.length > 0 ? Math.max(...parcelles.map(p => p.id)) + 1 : 1;
      const nouvelle = {
        id: newId,
        nom: nom.trim(),
        utilisateur_id: Number(userId),
        localite: localite,
        superficie_ha: Number(superficie) || 1.0,
        date_creation: new Date().toISOString().split("T")[0]
      };
      parcelles.push(nouvelle);
      set(STORAGE_KEYS.PARCELLES, parcelles);
      return nouvelle;
    },
    deleteParcelle: (id) => {
      let parcelles = get(STORAGE_KEYS.PARCELLES, DONNEES_INITIALES.parcelles);
      parcelles = parcelles.filter(p => p.id !== Number(id));
      set(STORAGE_KEYS.PARCELLES, parcelles);
      return true;
    },

    // --- CAMPAGNES ---
    getCampagnes: () => get(STORAGE_KEYS.CAMPAGNES, DONNEES_INITIALES.campagnes),
    getCampagnesByParcelle: (parcelleId) => get(STORAGE_KEYS.CAMPAGNES, DONNEES_INITIALES.campagnes).filter(c => c.parcelle_id === Number(parcelleId)),
    getCampagneById: (id) => get(STORAGE_KEYS.CAMPAGNES, DONNEES_INITIALES.campagnes).find(c => c.id === Number(id)),
    addCampagne: (parcelleId, nomParcelle, culturesCandidates) => {
      const campagnes = get(STORAGE_KEYS.CAMPAGNES, DONNEES_INITIALES.campagnes);
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
      const campagnes = get(STORAGE_KEYS.CAMPAGNES, DONNEES_INITIALES.campagnes);
      const c = campagnes.find(item => item.id === Number(campagneId));
      if (c) {
        c.date_fin = new Date().toISOString().replace("T", " ").substring(0, 16);
        c.statut = "analysee";
        set(STORAGE_KEYS.CAMPAGNES, campagnes);
      }
      return c;
    },

    // --- MESURES ---
    getMesures: () => get(STORAGE_KEYS.MESURES, DONNEES_INITIALES.mesures),
    getMesuresByCampagne: (campagneId) => get(STORAGE_KEYS.MESURES, DONNEES_INITIALES.mesures).filter(m => m.campagne_id === Number(campagneId)),
    addMesure: (campagneId, mesureData) => {
      const mesures = get(STORAGE_KEYS.MESURES, DONNEES_INITIALES.mesures);
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

    // --- EXPORT & IMPORT DE DONNÉES DE TOUTE LA BASE ---
    exportAllDataJSON: () => {
      return JSON.stringify({
        users: get(STORAGE_KEYS.USERS, DONNEES_INITIALES.users),
        parcelles: get(STORAGE_KEYS.PARCELLES, DONNEES_INITIALES.parcelles),
        campagnes: get(STORAGE_KEYS.CAMPAGNES, DONNEES_INITIALES.campagnes),
        mesures: get(STORAGE_KEYS.MESURES, DONNEES_INITIALES.mesures),
        cultures: get(STORAGE_KEYS.CULTURES, DONNEES_INITIALES.cultures),
        export_date: new Date().toISOString()
      }, null, 2);
    },
    importAllDataJSON: (jsonString) => {
      try {
        const data = JSON.parse(jsonString);
        if (data.users) set(STORAGE_KEYS.USERS, data.users);
        if (data.parcelles) set(STORAGE_KEYS.PARCELLES, data.parcelles);
        if (data.campagnes) set(STORAGE_KEYS.CAMPAGNES, data.campagnes);
        if (data.mesures) set(STORAGE_KEYS.MESURES, data.mesures);
        if (data.cultures) set(STORAGE_KEYS.CULTURES, data.cultures);
        return true;
      } catch (e) {
        console.error("Import invalide :", e);
        return false;
      }
    },

    // --- PARAMÈTRES ---
    getSettings: () => get(STORAGE_KEYS.SETTINGS, DONNEES_INITIALES.settings),
    saveSettings: (settingsObj) => set(STORAGE_KEYS.SETTINGS, settingsObj),

    // Réinitialisation d'usine
    reinitialiserDonnees: () => {
      localStorage.clear();
      initStorage();
    }
  };
})();
