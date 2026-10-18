/**
 * Simulateur de Nœud Terrain ESP32
 * Permet de tester l'application mobile de manière réaliste
 * sans dépendre du matériel physique connecté.
 */

const ESP32Simulator = (function () {
  let isRunning = false;
  let intervalId = null;
  let currentProfile = "equilibre"; // "equilibre", "acide", "humide", "sec"
  let subscribers = [];

  const PROFILES = {
    equilibre: {
      nom: "Sol Équilibré (Idéal Igname/Maïs)",
      baseH: 26.5,
      basePH: 6.15,
      baseEC: 980,
      baseT: 27.2,
      baseN: 18,
      baseP: 14,
      baseK: 68
    },
    acide: {
      nom: "Sol Ferrallitique Acide (Chaulage requis)",
      baseH: 24.0,
      basePH: 5.12,
      baseEC: 850,
      baseT: 26.8,
      baseN: 12,
      baseP: 8,
      baseK: 55
    },
    humide: {
      nom: "Sol de Bas-Fond / Engorgé (Riz pluvial)",
      baseH: 41.5,
      basePH: 5.65,
      baseEC: 1420,
      baseT: 25.8,
      baseN: 22,
      baseP: 11,
      baseK: 95
    },
    sec: {
      nom: "Sol Sec / Déficit Hydrique (Irrigation requise)",
      baseH: 15.8,
      basePH: 6.40,
      baseEC: 720,
      baseT: 29.5,
      baseN: 14,
      baseP: 10,
      baseK: 60
    }
  };

  function genererMesure() {
    const prof = PROFILES[currentProfile] || PROFILES.equilibre;
    // Bruit statistique aléatoire naturel
    const bruitH = (Math.random() - 0.5) * 1.2;
    const bruitPH = (Math.random() - 0.5) * 0.12;
    const bruitEC = Math.floor((Math.random() - 0.5) * 40);
    const bruitT = (Math.random() - 0.5) * 0.4;

    const data = {
      humidity: Math.round((prof.baseH + bruitH) * 10) / 10,
      ph: Math.round((prof.basePH + bruitPH) * 100) / 100,
      ec: Math.max(100, prof.baseEC + bruitEC),
      temp: Math.round((prof.baseT + bruitT) * 10) / 10,
      nitrogen: Math.max(5, prof.baseN + Math.floor((Math.random() - 0.5) * 4)),
      phosphorus: Math.max(2, prof.baseP + Math.floor((Math.random() - 0.5) * 3)),
      potassium: Math.max(20, prof.baseK + Math.floor((Math.random() - 0.5) * 8)),
      battery: 95 - Math.floor(Math.random() * 3),
      timestamp: Math.floor(Date.now() / 1000),
      liaison: "SIMULATEUR"
    };

    subscribers.forEach(cb => {
      try { cb(data); } catch (e) { console.error("Erreur subscriber simulateur :", e); }
    });

    return data;
  }

  return {
    start: function (callback, intervalMs = 1500) {
      if (callback && !subscribers.includes(callback)) {
        subscribers.push(callback);
      }
      if (!isRunning) {
        isRunning = true;
        genererMesure(); // Première lecture immédiate
        intervalId = setInterval(genererMesure, intervalMs);
      }
    },
    stop: function (callback) {
      if (callback) {
        subscribers = subscribers.filter(cb => cb !== callback);
      }
      if (subscribers.length === 0 && isRunning) {
        clearInterval(intervalId);
        intervalId = null;
        isRunning = false;
      }
    },
    getProfiles: () => PROFILES,
    setProfile: (profileKey) => {
      if (PROFILES[profileKey]) {
        currentProfile = profileKey;
        if (isRunning) genererMesure();
      }
    },
    getCurrentProfile: () => currentProfile,
    getInstantData: genererMesure,
    isActive: () => isRunning
  };
})();
