/**
 * Contrôleur Principal de l'Application Mobile (Cycle en V)
 * Gestion des 7 écrans, des flux de données ESP32 et des interactions utilisateur
 */

document.addEventListener("DOMContentLoaded", () => {
  // --- ÉTAT GLOBAL DE L'APPLICATION ---
  const state = {
    currentScreen: "screen-accueil",
    activeCampagne: null,
    selectedParcelleId: null,
    selectedCultures: ["Igname", "Maïs"],
    liveSensors: {
      humidity: 25.0,
      ph: 6.10,
      ec: 980,
      temp: 27.0,
      nitrogen: 18,
      phosphorus: 12,
      potassium: 65,
      battery: 95,
      liaison: "SIMULATEUR"
    },
    currentGPS: {
      latitude: 6.90355,
      longitude: -5.32389,
      accuracy: 5
    },
    settings: StorageService.getSettings()
  };

  // --- SÉLECTEURS DU DOM ---
  const screens = {
    accueil: document.getElementById("screen-accueil"),
    nouvelleCampagne: document.getElementById("screen-nouvelle-campagne"),
    mesureEnCours: document.getElementById("screen-mesure-en-cours"),
    resultats: document.getElementById("screen-resultats"),
    historique: document.getElementById("screen-historique"),
    detailParcelle: document.getElementById("screen-detail-parcelle"),
    wifiSecours: document.getElementById("screen-wifi-secours")
  };

  const navTabs = {
    accueil: document.getElementById("tab-accueil"),
    historique: document.getElementById("tab-historique"),
    connexion: document.getElementById("tab-connexion")
  };

  const headerTitle = document.getElementById("header-title");
  const backBtn = document.getElementById("header-back-btn");
  const statusPill = document.getElementById("header-status-pill");
  const statusPillText = document.getElementById("status-pill-text");

  // Métriques directes (Écran Mesure en cours)
  const valHumidity = document.getElementById("live-val-humidity");
  const valPH = document.getElementById("live-val-ph");
  const valEC = document.getElementById("live-val-ec");
  const valTemp = document.getElementById("live-val-temp");
  const ptsCounter = document.getElementById("measure-points-counter");
  const gpsDisplay = document.getElementById("live-gps-display");

  // --- NAVIGATION ENTRE ÉCRANS ---
  function navigateTo(screenId, title = "Mes parcelles", showBack = false) {
    Object.values(screens).forEach(s => s && s.classList.remove("active"));
    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add("active");
      state.currentScreen = screenId;
    }

    if (headerTitle) headerTitle.textContent = title;
    if (backBtn) backBtn.style.display = showBack ? "inline-flex" : "none";

    // Mise à jour de l'onglet actif dans la TabBar
    Object.values(navTabs).forEach(t => t && t.classList.remove("active"));
    if (screenId === "screen-accueil" && navTabs.accueil) navTabs.accueil.classList.add("active");
    if (screenId === "screen-historique" && navTabs.historique) navTabs.historique.classList.add("active");
    if (screenId === "screen-wifi-secours" && navTabs.connexion) navTabs.connexion.classList.add("active");

    // Rafraîchissement des vues spécifiques
    if (screenId === "screen-accueil") renderAccueil();
    if (screenId === "screen-historique") renderHistorique();
    if (screenId === "screen-wifi-secours") renderWifiSecours();
  }

  // --- GEOLOCALISATION DU SMARTPHONE ---
  function initGeolocation() {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          state.currentGPS.latitude = Math.round(pos.coords.latitude * 100000) / 100000;
          state.currentGPS.longitude = Math.round(pos.coords.longitude * 100000) / 100000;
          state.currentGPS.accuracy = Math.round(pos.coords.accuracy);
          if (gpsDisplay) {
            gpsDisplay.textContent = `GPS: ${state.currentGPS.latitude}, ${state.currentGPS.longitude} (±${state.currentGPS.accuracy}m)`;
          }
        },
        (err) => {
          console.warn("GPS non disponible ou refusé, utilisation des coordonnées par défaut Yamoussoukro :", err.message);
          if (gpsDisplay) {
            gpsDisplay.textContent = `GPS: 6.9035, -5.3238 (Yamoussoukro)`;
          }
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }

  // --- GESTION DU FLUX DE DONNÉES CAPTEURS ---
  function onNewSensorData(data) {
    state.liveSensors = data;

    if (valHumidity) valHumidity.textContent = `${data.humidity}%`;
    if (valPH) {
      valPH.textContent = data.ph;
      valPH.style.color = (data.ph < 5.5) ? "var(--danger-text)" : (data.ph <= 7.0 ? "var(--primary)" : "var(--accent)");
    }
    if (valEC) valEC.textContent = `${data.ec} µS`;
    if (valTemp) valTemp.textContent = `${data.temp} °C`;
  }

  // Abonnement au simulateur par défaut
  ESP32Simulator.start(onNewSensorData);

  // Abonnement aux services réels BLE et Wi-Fi
  BLEService.onData(onNewSensorData);
  WiFiService.onData(onNewSensorData);

  BLEService.onStatusChange(({ status, detail }) => {
    updateConnectionStatus("BLE", status === "connected");
  });

  WiFiService.onStatusChange(({ status }) => {
    updateConnectionStatus("WIFI", status === "connected");
  });

  function updateConnectionStatus(type, isConnected) {
    if (isConnected) {
      if (statusPillText) statusPillText.textContent = `${type} connecté`;
      if (statusPill) statusPill.style.background = "var(--primary-light)";
    } else if (state.settings.use_simulator) {
      if (statusPillText) statusPillText.textContent = "Simulateur ESP32";
      if (statusPill) statusPill.style.background = "var(--info-bg)";
    } else {
      if (statusPillText) statusPillText.textContent = "Déconnecté";
      if (statusPill) statusPill.style.background = "var(--danger-bg)";
    }
  }

  // --- RENDU ÉCRAN 1 : ACCUEIL ---
  function renderAccueil() {
    const container = document.getElementById("parcelles-list-container");
    if (!container) return;
    const parcelles = StorageService.getParcelles();
    const campagnes = StorageService.getCampagnes();

    container.innerHTML = "";
    if (parcelles.length === 0) {
      container.innerHTML = `<div class="card" style="text-align:center;color:var(--text-muted);padding:24px">Aucune parcelle enregistrée.<br>Commencez par en ajouter une !</div>`;
      return;
    }

    parcelles.forEach(p => {
      const nbCampagnes = campagnes.filter(c => c.parcelle_id === p.id).length;
      const card = document.createElement("div");
      card.className = "card interactive row-between";
      card.innerHTML = `
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--text-main)">${p.nom}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${p.localite || "Yamoussoukro"} · ${nbCampagnes} campagne${nbCampagnes > 1 ? "s" : ""}</div>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-dim)">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      `;
      card.addEventListener("click", () => {
        openDetailParcelle(p.id);
      });
      container.appendChild(card);
    });
  }

  // --- RENDU ÉCRAN 2 : NOUVELLE CAMPAGNE ---
  function prepareNouvelleCampagne(preselectedParcelleId = null) {
    const parcelles = StorageService.getParcelles();
    const select = document.getElementById("select-campagne-parcelle");
    if (select) {
      select.innerHTML = "";
      parcelles.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.nom;
        if (preselectedParcelleId && p.id === Number(preselectedParcelleId)) {
          opt.selected = true;
        }
        select.appendChild(opt);
      });
    }

    // Initialisation des chips de cultures
    const chipsContainer = document.getElementById("crops-chips-container");
    if (chipsContainer) {
      chipsContainer.innerHTML = "";
      const culturesDispos = AgronomyEngine.getCulturesDisponibles();
      culturesDispos.forEach(nom => {
        const chip = document.createElement("span");
        const isSelected = state.selectedCultures.includes(nom);
        chip.className = `chip ${isSelected ? "selected" : ""}`;
        chip.textContent = nom;
        chip.addEventListener("click", () => {
          if (state.selectedCultures.includes(nom)) {
            if (state.selectedCultures.length > 1) {
              state.selectedCultures = state.selectedCultures.filter(c => c !== nom);
              chip.classList.remove("selected");
            }
          } else {
            state.selectedCultures.push(nom);
            chip.classList.add("selected");
          }
        });
        chipsContainer.appendChild(chip);
      });
    }

    navigateTo("screen-nouvelle-campagne", "Démarrer campagne", true);
  }

  // Démarrer la campagne
  const btnStartCampagne = document.getElementById("btn-start-campagne");
  if (btnStartCampagne) {
    btnStartCampagne.addEventListener("click", () => {
      const select = document.getElementById("select-campagne-parcelle");
      const parcelleId = select ? select.value : 1;
      const parcelle = StorageService.getParcelleById(parcelleId);

      const nouvelleCampagne = StorageService.addCampagne(
        parcelleId,
        parcelle ? parcelle.nom : "Parcelle",
        state.selectedCultures
      );

      state.activeCampagne = nouvelleCampagne;
      initGeolocation();
      updateMesureEnCoursView();
      navigateTo("screen-mesure-en-cours", "Mesure en cours", true);
    });
  }

  // --- RENDU ÉCRAN 3 : MESURE EN COURS ---
  function updateMesureEnCoursView() {
    if (!state.activeCampagne) return;
    const points = StorageService.getMesuresByCampagne(state.activeCampagne.id);
    if (ptsCounter) {
      ptsCounter.textContent = `${points.length} point${points.length > 1 ? "s" : ""} enregistré${points.length > 1 ? "s" : ""}`;
    }
  }

  // Bouton Enregistrer le point
  const btnRecordPoint = document.getElementById("btn-record-point");
  if (btnRecordPoint) {
    btnRecordPoint.addEventListener("click", () => {
      if (!state.activeCampagne) return;

      const mesureData = {
        latitude: state.currentGPS.latitude,
        longitude: state.currentGPS.longitude,
        humidite_pct: state.liveSensors.humidity,
        ph: state.liveSensors.ph,
        ec_us_cm: state.liveSensors.ec,
        temperature_c: state.liveSensors.temp,
        azote_mgkg: state.liveSensors.nitrogen,
        phosphore_mgkg: state.liveSensors.phosphorus,
        potassium_mgkg: state.liveSensors.potassium,
        liaison: state.liveSensors.liaison || "BLE"
      };

      StorageService.addMesure(state.activeCampagne.id, mesureData);
      updateMesureEnCoursView();

      // Effet visuel de confirmation
      btnRecordPoint.textContent = "Point enregistré ! ✓";
      btnRecordPoint.style.background = "var(--primary-hover)";
      setTimeout(() => {
        btnRecordPoint.textContent = "Enregistrer le point";
        btnRecordPoint.style.background = "var(--primary)";
      }, 1000);
    });
  }

  // Bouton Clôturer et analyser
  const btnFinishCampagne = document.getElementById("btn-finish-campagne");
  if (btnFinishCampagne) {
    btnFinishCampagne.addEventListener("click", () => {
      if (!state.activeCampagne) return;
      const points = StorageService.getMesuresByCampagne(state.activeCampagne.id);
      if (points.length === 0) {
        alert("Veuillez enregistrer au moins un point de mesure sur la parcelle avant d'analyser.");
        return;
      }

      StorageService.cloturerCampagne(state.activeCampagne.id);
      renderResultats(state.activeCampagne.id);
    });
  }

  // --- RENDU ÉCRAN 4 : RÉSULTATS ---
  function renderResultats(campagneId) {
    const campagne = StorageService.getCampagneById(campagneId);
    if (!campagne) return;

    const points = StorageService.getMesuresByCampagne(campagne.id);
    const analyse = AgronomyEngine.analyserCampagne(points, campagne.cultures_candidates);

    const titleElem = document.getElementById("resultats-parcelle-title");
    if (titleElem) titleElem.textContent = `${campagne.nom_parcelle} (${points.length} points)`;

    const statsSummary = document.getElementById("resultats-stats-summary");
    if (statsSummary && analyse) {
      statsSummary.innerHTML = `
        Moyennes : Humidité <b>${analyse.stats.moy_humidite_pct}%</b> (±${analyse.stats.ecart_type_humidite}) · 
        pH <b>${analyse.stats.moy_ph}</b> · EC <b>${analyse.stats.moy_ec_us_cm} µS</b>
      `;
    }

    const cardsContainer = document.getElementById("resultats-crops-cards");
    if (cardsContainer && analyse) {
      cardsContainer.innerHTML = "";
      analyse.evaluations.forEach(ev => {
        const badgeClass = ev.classe === "Adapté" ? "badge-ok" : (ev.classe === "Possible avec corrections" ? "badge-mid" : "badge-bad");
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
          <div class="row-between" style="margin-bottom:6px">
            <span style="font-size:14px;font-weight:700">${ev.culture}</span>
            <span class="${badgeClass}">${ev.classe} (${ev.score_pct}%)</span>
          </div>
          <div style="font-size:11.5px;color:var(--text-muted);line-height:1.4">
            ${ev.recommandations.map(r => `• ${r}`).join("<br>")}
          </div>
        `;
        cardsContainer.appendChild(card);
      });
    }

    navigateTo("screen-resultats", "Résultats d'analyse", true);
  }

  // --- RENDU ÉCRAN 5 : HISTORIQUE ---
  function renderHistorique() {
    const container = document.getElementById("historique-list-container");
    if (!container) return;
    const campagnes = StorageService.getCampagnes();

    container.innerHTML = "";
    if (campagnes.length === 0) {
      container.innerHTML = `<div class="card" style="text-align:center;color:var(--text-muted);padding:24px">Aucune campagne dans l'historique.</div>`;
      return;
    }

    campagnes.forEach(c => {
      const points = StorageService.getMesuresByCampagne(c.id);
      const card = document.createElement("div");
      card.className = "card interactive row-between";
      card.innerHTML = `
        <div>
          <div style="font-size:13px;font-weight:600">${c.nom_parcelle}</div>
          <div style="font-size:11px;color:var(--text-muted)">${c.date_debut} · ${points.length} pt${points.length > 1 ? "s" : ""}</div>
          <div style="font-size:10.5px;color:var(--text-dim);margin-top:2px">${Array.isArray(c.cultures_candidates) ? c.cultures_candidates.join(", ") : c.cultures_candidates}</div>
        </div>
        <span class="${c.statut === 'analysee' ? 'badge-ok' : 'badge-mid'}">${c.statut === 'analysee' ? 'Analysée' : 'En cours'}</span>
      `;
      card.addEventListener("click", () => {
        renderResultats(c.id);
      });
      container.appendChild(card);
    });
  }

  // --- RENDU ÉCRAN 6 : DÉTAIL PARCELLE ---
  function openDetailParcelle(parcelleId) {
    state.selectedParcelleId = parcelleId;
    const parcelle = StorageService.getParcelleById(parcelleId);
    if (!parcelle) return;

    const titleElem = document.getElementById("detail-parcelle-name");
    if (titleElem) titleElem.textContent = parcelle.nom;

    const campagnes = StorageService.getCampagnesByParcelle(parcelleId);
    const lastCampagne = campagnes.length > 0 ? campagnes[0] : null;

    const lastCampInfo = document.getElementById("detail-last-campagne-info");
    if (lastCampInfo) {
      if (lastCampagne) {
        const pts = StorageService.getMesuresByCampagne(lastCampagne.id);
        lastCampInfo.textContent = `${lastCampagne.date_debut} · ${pts.length} point${pts.length > 1 ? "s" : ""}`;
      } else {
        lastCampInfo.textContent = "Aucune campagne réalisée";
      }
    }

    // Calcul des moyennes historiques globales
    const allMesures = [];
    campagnes.forEach(c => {
      const pts = StorageService.getMesuresByCampagne(c.id);
      allMesures.push(...pts);
    });

    const statsElem = document.getElementById("detail-averages-info");
    if (statsElem) {
      if (allMesures.length > 0) {
        const stats = AgronomyEngine.calculerStatistiques(allMesures);
        statsElem.textContent = `pH ${stats.moy_ph} · Humidité ${stats.moy_humidite_pct}% · EC ${stats.moy_ec_us_cm} µS`;
      } else {
        statsElem.textContent = "Pas de relevés disponibles";
      }
    }

    const culturesElem = document.getElementById("detail-crops-evaluated");
    if (culturesElem) {
      const cropsSet = new Set();
      campagnes.forEach(c => {
        if (Array.isArray(c.cultures_candidates)) {
          c.cultures_candidates.forEach(cr => cropsSet.add(cr));
        }
      });
      culturesElem.textContent = cropsSet.size > 0 ? Array.from(cropsSet).join(", ") : "Aucune";
    }

    navigateTo("screen-detail-parcelle", "Détail parcelle", true);
  }

  // Bouton Nouvelle campagne depuis détail parcelle
  const btnNewCampagneHere = document.getElementById("btn-new-campagne-here");
  if (btnNewCampagneHere) {
    btnNewCampagneHere.addEventListener("click", () => {
      prepareNouvelleCampagne(state.selectedParcelleId);
    });
  }

  // --- RENDU ÉCRAN 7 : WI-FI DE SECOURS & CONFIGURATION NŒUD ---
  function renderWifiSecours() {
    const swBLE = document.getElementById("toggle-ble");
    const swWifi = document.getElementById("toggle-wifi");
    const swSim = document.getElementById("toggle-sim");

    if (swBLE) swBLE.className = `toggle-switch ${state.settings.mode_liaison === 'BLE' ? 'active' : ''}`;
    if (swWifi) swWifi.className = `toggle-switch ${state.settings.mode_liaison === 'WIFI' ? 'active' : ''}`;
    if (swSim) swSim.className = `toggle-switch ${state.settings.use_simulator ? 'active' : ''}`;

    const profileSelect = document.getElementById("sim-profile-select");
    if (profileSelect) {
      profileSelect.value = ESP32Simulator.getCurrentProfile();
    }
  }

  // Toggles de connexion
  const toggleBLE = document.getElementById("toggle-ble");
  if (toggleBLE) {
    toggleBLE.addEventListener("click", async () => {
      state.settings.mode_liaison = "BLE";
      StorageService.saveSettings(state.settings);
      renderWifiSecours();

      if (BLEService.isSupported()) {
        try {
          await BLEService.connect();
        } catch (e) {
          console.warn(e);
        }
      } else {
        alert("Web Bluetooth n'est pas supporté par ce navigateur. Utilisez Chrome/Edge ou activez le Wi-Fi SoftAP / Simulateur.");
      }
    });
  }

  const toggleWifi = document.getElementById("toggle-wifi");
  if (toggleWifi) {
    toggleWifi.addEventListener("click", () => {
      state.settings.mode_liaison = "WIFI";
      StorageService.saveSettings(state.settings);
      renderWifiSecours();
      WiFiService.startPolling();
    });
  }

  const toggleSim = document.getElementById("toggle-sim");
  if (toggleSim) {
    toggleSim.addEventListener("click", () => {
      state.settings.use_simulator = !state.settings.use_simulator;
      StorageService.saveSettings(state.settings);
      renderWifiSecours();
      if (state.settings.use_simulator) {
        ESP32Simulator.start(onNewSensorData);
      } else {
        ESP32Simulator.stop(onNewSensorData);
      }
      updateConnectionStatus("SIMULATEUR", state.settings.use_simulator);
    });
  }

  const simProfileSelect = document.getElementById("sim-profile-select");
  if (simProfileSelect) {
    simProfileSelect.addEventListener("change", (e) => {
      ESP32Simulator.setProfile(e.target.value);
    });
  }

  // Bouton Ajouter une parcelle (modal/prompt simple)
  const btnAddParcelle = document.getElementById("btn-add-parcelle-modal");
  if (btnAddParcelle) {
    btnAddParcelle.addEventListener("click", () => {
      const nom = prompt("Nom de la nouvelle parcelle :", "Champ Ouest");
      if (nom && nom.trim()) {
        const localite = prompt("Localité / Région :", "Yamoussoukro, zone de Lacs");
        StorageService.addParcelle(nom, localite || "Yamoussoukro");
        renderAccueil();
      }
    });
  }

  // Bouton d'action "+ Nouvelle campagne" sur l'écran d'accueil
  const btnNouvelleCampagneAccueil = document.getElementById("btn-nouvelle-campagne-accueil");
  if (btnNouvelleCampagneAccueil) {
    btnNouvelleCampagneAccueil.addEventListener("click", () => {
      prepareNouvelleCampagne();
    });
  }

  // Flèche Retour du Header
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      if (state.currentScreen === "screen-nouvelle-campagne" || state.currentScreen === "screen-detail-parcelle") {
        navigateTo("screen-accueil", "Mes parcelles");
      } else if (state.currentScreen === "screen-mesure-en-cours") {
        if (confirm("Voulez-vous suspendre cette campagne et retourner à l'accueil ?")) {
          navigateTo("screen-accueil", "Mes parcelles");
        }
      } else if (state.currentScreen === "screen-resultats") {
        navigateTo("screen-historique", "Historique");
      } else {
        navigateTo("screen-accueil", "Mes parcelles");
      }
    });
  }

  // Tabs de navigation inférieure
  if (navTabs.accueil) {
    navTabs.accueil.addEventListener("click", () => navigateTo("screen-accueil", "Mes parcelles"));
  }
  if (navTabs.historique) {
    navTabs.historique.addEventListener("click", () => navigateTo("screen-historique", "Historique"));
  }
  if (navTabs.connexion) {
    navTabs.connexion.addEventListener("click", () => navigateTo("screen-wifi-secours", "Connexion au nœud"));
  }

  // Démarrage initial sur l'écran Accueil
  navigateTo("screen-accueil", "Mes parcelles");
  initGeolocation();
});
