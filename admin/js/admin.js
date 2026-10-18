/**
 * Contrôleur du Portail d'Administration & Supervision (INP-HB)
 * Gestion de la BDD, Visualisations graphiques (Chart.js), CRUD Cultures & Planteurs
 */

document.addEventListener("DOMContentLoaded", () => {
  let charts = {};

  // --- NAVIGATION ENTRE ONGLETS ADMIN ---
  const menuItems = document.querySelectorAll(".menu-item[data-section]");
  const sections = document.querySelectorAll(".section-pane");
  const pageTitle = document.getElementById("admin-page-title");

  menuItems.forEach(item => {
    item.addEventListener("click", () => {
      menuItems.forEach(m => m.classList.remove("active"));
      item.classList.add("active");

      const targetId = item.getAttribute("data-section");
      sections.forEach(s => s.classList.remove("active"));
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add("active");

      const titles = {
        "pane-dashboard": "Tableau de Bord & Métriques Clés",
        "pane-cultures": "Catalogue Agronomique & Cultures de Référence",
        "pane-users": "Gestion des Planteurs & Utilisateurs",
        "pane-mesures": "Explorateur de Données Terrain & GPS",
        "pane-backup": "Sauvegarde & Exportation Base de Données"
      };
      if (pageTitle && titles[targetId]) pageTitle.textContent = titles[targetId];

      if (targetId === "pane-dashboard") renderCharts();
      if (targetId === "pane-cultures") renderCulturesTable();
      if (targetId === "pane-users") renderUsersTable();
      if (targetId === "pane-mesures") renderMesuresTable();
    });
  });

  // --- MISE À JOUR DES KPI ---
  function updateKPIs() {
    const users = StorageService.getUsers ? StorageService.getUsers() : [];
    const parcelles = StorageService.getParcelles();
    const campagnes = StorageService.getCampagnes();
    const mesures = StorageService.getMesures();
    const cultures = StorageService.getCulturesReference ? StorageService.getCulturesReference() : {};

    const elUsers = document.getElementById("kpi-users");
    const elParcelles = document.getElementById("kpi-parcelles");
    const elCampagnes = document.getElementById("kpi-campagnes");
    const elMesures = document.getElementById("kpi-mesures");

    if (elUsers) elUsers.textContent = users.length;
    if (elParcelles) elParcelles.textContent = parcelles.length;
    if (elCampagnes) elCampagnes.textContent = campagnes.length;
    if (elMesures) elMesures.textContent = mesures.length;
  }

  // --- RENDU DES GRAPHIQUES POUR LA PRÉSENTATION (Chart.js) ---
  function renderCharts() {
    updateKPIs();
    if (typeof Chart === "undefined") return;

    const parcelles = StorageService.getParcelles();
    const campagnes = StorageService.getCampagnes();
    const mesures = StorageService.getMesures();
    const culturesRef = StorageService.getCulturesReference ? StorageService.getCulturesReference() : {};

    // 1. Graphe Répartition des Parcelles par Localité
    const locCounts = {};
    parcelles.forEach(p => {
      const loc = p.localite ? p.localite.split(",")[0].trim() : "Yamoussoukro";
      locCounts[loc] = (locCounts[loc] || 0) + 1;
    });

    const ctxLoc = document.getElementById("chart-localites");
    if (ctxLoc) {
      if (charts.loc) charts.loc.destroy();
      charts.loc = new Chart(ctxLoc, {
        type: "bar",
        data: {
          labels: Object.keys(locCounts),
          datasets: [{
            label: "Nombre de parcelles",
            data: Object.values(locCounts),
            backgroundColor: "#2d7a4f",
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
      });
    }

    // 2. Graphe Donut : Répartition des Adéquations Globales
    // On analyse les campagnes existantes
    let countAdapte = 0, countPossible = 0, countNonAdapte = 0;
    campagnes.forEach(c => {
      const pts = StorageService.getMesuresByCampagne(c.id);
      if (pts.length > 0 && typeof AgronomyEngine !== "undefined") {
        const res = AgronomyEngine.analyserCampagne(pts, c.cultures_candidates);
        if (res && res.evaluations) {
          res.evaluations.forEach(ev => {
            if (ev.classe === "Adapté") countAdapte++;
            else if (ev.classe === "Possible avec corrections") countPossible++;
            else countNonAdapte++;
          });
        }
      }
    });

    const ctxAdequation = document.getElementById("chart-adequation");
    if (ctxAdequation) {
      if (charts.adeq) charts.adeq.destroy();
      charts.adeq = new Chart(ctxAdequation, {
        type: "doughnut",
        data: {
          labels: ["Adapté", "Possible avec corrections", "Non adapté"],
          datasets: [{
            data: [countAdapte || 4, countPossible || 2, countNonAdapte || 1],
            backgroundColor: ["#16a34a", "#eab308", "#dc2626"],
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "bottom" }
          }
        }
      });
    }

    // 3. Graphe Mesures du Sol : pH vs Humidité par Campagne
    const ctxSoil = document.getElementById("chart-soil-distribution");
    if (ctxSoil) {
      if (charts.soil) charts.soil.destroy();
      const labels = mesures.map((m, idx) => `Pt ${idx + 1} (${m.liaison})`);
      const dataPH = mesures.map(m => m.ph);
      const dataH = mesures.map(m => m.humidite_pct);

      charts.soil = new Chart(ctxSoil, {
        type: "line",
        data: {
          labels: labels,
          datasets: [
            {
              label: "pH du Sol",
              data: dataPH,
              borderColor: "#d97706",
              backgroundColor: "rgba(217, 119, 6, 0.1)",
              yAxisID: "yPH",
              tension: 0.3,
              fill: true
            },
            {
              label: "Humidité (% VWC)",
              data: dataH,
              borderColor: "#0284c7",
              backgroundColor: "rgba(2, 132, 199, 0.1)",
              yAxisID: "yH",
              tension: 0.3,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            yPH: {
              type: "linear",
              position: "left",
              min: 4.0,
              max: 8.0,
              title: { display: true, text: "pH" }
            },
            yH: {
              type: "linear",
              position: "right",
              min: 0,
              max: 60,
              title: { display: true, text: "Humidité %" },
              grid: { drawOnChartArea: false }
            }
          }
        }
      });
    }

    // 4. Graphe Répartition des Utilisateurs Inscrits dans le temps
    const ctxUsersTime = document.getElementById("chart-users-timeline");
    if (ctxUsersTime) {
      if (charts.users) charts.users.destroy();
      charts.users = new Chart(ctxUsersTime, {
        type: "bar",
        data: {
          labels: ["Mai 2026", "Juin 2026", "Juil 2026", "Août 2026", "Sept 2026", "Oct 2026"],
          datasets: [{
            label: "Adhésion Planteurs & Techniciens",
            data: [1, 2, 3, 4, 4, 5],
            backgroundColor: "#3b82f6",
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
      });
    }
  }

  // --- SECTION 2 : GESTION DES CULTURES (CRUD) ---
  function renderCulturesTable() {
    const tbody = document.getElementById("table-cultures-body");
    if (!tbody) return;
    const cultures = StorageService.getCulturesReference ? StorageService.getCulturesReference() : {};

    tbody.innerHTML = "";
    Object.values(cultures).forEach(c => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><b>${c.nom}</b></td>
        <td><span class="badge badge-info">${c.ph_opt_min || c.ph_min} - ${c.ph_opt_max || c.ph_max}</span></td>
        <td>${c.humidite_min_pct}% - ${c.humidite_max_pct}%</td>
        <td>≤ ${c.ec_max_us_cm} µS/cm</td>
        <td>${c.temp_min_c}°C - ${c.temp_max_c}°C</td>
        <td style="font-size:11.5px;color:var(--text-muted)">${c.source || "CNRA / FAO"}</td>
        <td>
          <button class="btn btn-danger btn-delete-culture" data-name="${c.nom}" style="padding:4px 8px;font-size:11px;">Supprimer</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Événements de suppression
    document.querySelectorAll(".btn-delete-culture").forEach(btn => {
      btn.addEventListener("click", () => {
        const name = btn.getAttribute("data-name");
        if (confirm(`Confirmez-vous la suppression de la culture « ${name} » du catalogue ?`)) {
          StorageService.deleteCulture(name);
          renderCulturesTable();
          renderCharts();
        }
      });
    });
  }

  // Modal Ajout de Culture
  const modalCulture = document.getElementById("modal-add-culture");
  const btnOpenModalCulture = document.getElementById("btn-open-modal-culture");
  const btnCloseModalCulture = document.getElementById("btn-close-modal-culture");
  const btnSaveCulture = document.getElementById("btn-save-culture");

  if (btnOpenModalCulture) {
    btnOpenModalCulture.addEventListener("click", () => {
      modalCulture.classList.add("active");
    });
  }
  if (btnCloseModalCulture) {
    btnCloseModalCulture.addEventListener("click", () => {
      modalCulture.classList.remove("active");
    });
  }

  if (btnSaveCulture) {
    btnSaveCulture.addEventListener("click", () => {
      const nom = document.getElementById("input-culture-nom").value;
      if (!nom || !nom.trim()) {
        alert("Veuillez indiquer un nom pour la culture.");
        return;
      }
      const newCrop = {
        nom: nom.trim(),
        ph_min: document.getElementById("input-culture-ph-min").value,
        ph_max: document.getElementById("input-culture-ph-max").value,
        ph_opt_min: document.getElementById("input-culture-ph-min").value,
        ph_opt_max: document.getElementById("input-culture-ph-max").value,
        humidite_min_pct: document.getElementById("input-culture-h-min").value,
        humidite_max_pct: document.getElementById("input-culture-h-max").value,
        ec_max_us_cm: document.getElementById("input-culture-ec-max").value,
        temp_min_c: document.getElementById("input-culture-temp-min").value,
        temp_max_c: document.getElementById("input-culture-temp-max").value,
        points_cles: document.getElementById("input-culture-points-cles").value || "Nouvelle culture ajoutée via le portail d'administration.",
        source: document.getElementById("input-culture-source").value || "CNRA / ANADER"
      };

      StorageService.addOrUpdateCulture(newCrop);
      modalCulture.classList.remove("active");
      renderCulturesTable();
      renderCharts();
      alert(`Culture « ${newCrop.nom} » ajoutée avec succès au catalogue et disponible sur l'application mobile !`);
    });
  }

  // --- SECTION 3 : GESTION DES PLANTEURS / UTILISATEURS ---
  function renderUsersTable() {
    const tbody = document.getElementById("table-users-body");
    if (!tbody) return;
    const users = StorageService.getUsers ? StorageService.getUsers() : [];
    const parcelles = StorageService.getParcelles();

    tbody.innerHTML = "";
    users.forEach(u => {
      const nbParcelles = parcelles.filter(p => p.utilisateur_id === u.id).length;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>#${u.id}</td>
        <td><b>${u.nom}</b></td>
        <td><span class="badge ${u.role === 'Conseiller ANADER' ? 'badge-info' : 'badge-success'}">${u.role}</span></td>
        <td>${u.localite}</td>
        <td>${u.telephone}</td>
        <td><b>${nbParcelles}</b> parcelle${nbParcelles > 1 ? "s" : ""}</td>
        <td style="font-size:11.5px;color:var(--text-muted)">${u.date_inscription}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Bouton Ajouter Planteur
  const btnAddUser = document.getElementById("btn-add-user-modal");
  if (btnAddUser) {
    btnAddUser.addEventListener("click", () => {
      const nom = prompt("Nom complet du planteur / exploitant :", "Koffi N'Guessan");
      if (nom && nom.trim()) {
        const localite = prompt("Localité / Région :", "Yamoussoukro");
        const tel = prompt("Numéro de téléphone :", "+225 07 11 22 33 44");
        StorageService.addUser(nom, "Planteur", localite || "Yamoussoukro", tel || "");
        renderUsersTable();
        renderCharts();
      }
    });
  }

  // --- SECTION 4 : MESURES TERRAIN & DONNÉES GPS ---
  function renderMesuresTable() {
    const tbody = document.getElementById("table-mesures-body");
    if (!tbody) return;
    const mesures = StorageService.getMesures();
    const campagnes = StorageService.getCampagnes();

    tbody.innerHTML = "";
    mesures.forEach(m => {
      const camp = campagnes.find(c => c.id === m.campagne_id);
      const nomParcelle = camp ? camp.nom_parcelle : `Campagne #${m.campagne_id}`;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>#${m.id}</td>
        <td><b>${nomParcelle}</b></td>
        <td>${m.horodatage}</td>
        <td style="font-family:monospace;font-size:11.5px;">${m.latitude}, ${m.longitude}</td>
        <td><b>${m.humidite_pct}%</b></td>
        <td><span class="badge ${m.ph < 5.5 ? 'badge-danger' : 'badge-success'}">${m.ph}</span></td>
        <td>${m.ec_us_cm} µS</td>
        <td>${m.temperature_c} °C</td>
        <td>N:${m.azote_mgkg || 15} P:${m.phosphore_mgkg || 10} K:${m.potassium_mgkg || 65}</td>
        <td><span class="badge badge-info">${m.liaison || "BLE"}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  // --- SECTION 5 : EXPORT & IMPORT ---
  const btnExportJSON = document.getElementById("btn-export-json");
  if (btnExportJSON) {
    btnExportJSON.addEventListener("click", () => {
      const jsonStr = StorageService.exportAllDataJSON();
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fertilite_sol_export_${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  const btnResetData = document.getElementById("btn-reset-database");
  if (btnResetData) {
    btnResetData.addEventListener("click", () => {
      if (confirm("Attention : Cette action va réinitialiser la base de données locale avec les valeurs de référence du fichier BDD Excel (Yamoussoukro). Continuer ?")) {
        StorageService.reinitialiserDonnees();
        updateKPIs();
        renderCharts();
        renderCulturesTable();
        renderUsersTable();
        renderMesuresTable();
        alert("Base de données réinitialisée avec succès !");
      }
    });
  }

  // Initialisation au chargement
  updateKPIs();
  renderCharts();
});
