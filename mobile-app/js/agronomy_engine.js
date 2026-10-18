/**
 * Moteur d'Analyse Agronomique et de Décision (Cycle en V - Spécifications STD)
 * Référentiel basé sur la FAO EcoCrop et les fiches techniques du CNRA / ANADER (Côte d'Ivoire).
 */

const AgronomyEngine = (function () {
  // Référentiel des fiches agronomiques (aligné sur BDD_Dispositif_Fertilite_Sol.xlsx)
  const CULTURES_REFERENCE = {
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
  };

  /**
   * Calcule les statistiques d'une série de points de mesure
   * @param {Array} mesures - Liste d'objets mesures { humidite_pct, ph, ec_us_cm, temperature_c }
   */
  function calculerStatistiques(mesures) {
    if (!mesures || mesures.length === 0) {
      return null;
    }
    const n = mesures.length;
    let sumH = 0, sumPH = 0, sumEC = 0, sumT = 0;

    mesures.forEach(m => {
      sumH += Number(m.humidite_pct) || 0;
      sumPH += Number(m.ph) || 0;
      sumEC += Number(m.ec_us_cm) || 0;
      sumT += Number(m.temperature_c) || 0;
    });

    const moyH = sumH / n;
    const moyPH = sumPH / n;
    const moyEC = sumEC / n;
    const moyT = sumT / n;

    // Calcul de l'écart-type sur l'humidité (indicateur d'hétérogénéité parcellaire)
    let varianceH = 0;
    mesures.forEach(m => {
      const diff = (Number(m.humidite_pct) || 0) - moyH;
      varianceH += diff * diff;
    });
    const ecartTypeH = n > 1 ? Math.sqrt(varianceH / (n - 1)) : 0;

    return {
      n_points: n,
      moy_humidite_pct: Math.round(moyH * 10) / 10,
      ecart_type_humidite: Math.round(ecartTypeH * 100) / 100,
      moy_ph: Math.round(moyPH * 100) / 100,
      moy_ec_us_cm: Math.round(moyEC),
      moy_temp_c: Math.round(moyT * 10) / 10
    };
  }

  /**
   * Évalue le score d'une culture candidate face aux paramètres moyens mesurés
   */
  function evaluerCulture(cultureNom, stats) {
    const ref = CULTURES_REFERENCE[cultureNom];
    if (!ref) {
      return {
        culture: cultureNom,
        score_global: 0,
        classe: "Inconnue",
        recommandations: ["Fiche culture non référencée."]
      };
    }

    const { moy_humidite_pct: H, moy_ph: PH, moy_ec_us_cm: EC } = stats;
    const recommandations = [];

    // 1. Score Humidité (poids 2)
    let scoreH = 1.0;
    if (H < ref.humidite_min_pct) {
      const deficit = ref.humidite_min_pct - H;
      scoreH = Math.max(0, 1.0 - (deficit / ref.humidite_min_pct));
      recommandations.push(`Irriguer (sol trop sec : ${H}% mesuré, min conseillé ${ref.humidite_min_pct}%)`);
    } else if (H > ref.humidite_max_pct) {
      const exces = H - ref.humidite_max_pct;
      scoreH = Math.max(0, 1.0 - (exces / 20.0));
      recommandations.push(`Drainer ou billonner (sol trop humide : ${H}% mesuré, max conseillé ${ref.humidite_max_pct}%)`);
    }

    // 2. Score pH (poids 2)
    let scorePH = 1.0;
    if (PH < ref.ph_opt_min) {
      const diff = ref.ph_opt_min - PH;
      if (diff <= 0.4) {
        scorePH = 0.5;
      } else {
        scorePH = 0.0;
      }
      recommandations.push(`Chauler (pH trop acide : ${PH} mesuré, min conseillé ${ref.ph_opt_min})`);
    } else if (PH > ref.ph_opt_max) {
      const diff = PH - ref.ph_opt_max;
      if (diff <= 0.4) {
        scorePH = 0.5;
      } else {
        scorePH = 0.0;
      }
      recommandations.push(`Corriger l'alcalinité (pH élevé : ${PH} mesuré, max conseillé ${ref.ph_opt_max})`);
    }

    // 3. Score EC (salinité, poids 1)
    let scoreEC = 1.0;
    if (EC > ref.ec_max_us_cm) {
      const exces = EC - ref.ec_max_us_cm;
      scoreEC = Math.max(0, 1.0 - (exces / ref.ec_max_us_cm));
      recommandations.push(`Lessivage du sol (salinité élevée : ${EC} µS/cm, max toléré ${ref.ec_max_us_cm})`);
    }

    // Calcul du score global pondéré : wH=2, wPH=2, wEC=1
    const wH = 2.0, wPH = 2.0, wEC = 1.0;
    const scoreGlobal = (scoreH * wH + scorePH * wPH + scoreEC * wEC) / (wH + wPH + wEC);
    const scoreArrondi = Math.round(scoreGlobal * 100) / 100;

    // Détermination de la classe d'adéquation
    let classe = "Adapté";
    if (scoreArrondi < 0.5) {
      classe = "Non adapté";
    } else if (scoreArrondi < 0.8) {
      classe = "Possible avec corrections";
    }

    if (recommandations.length === 0) {
      recommandations.push("Sol bien adapté, aucun apport correctif majeur nécessaire.");
    }

    return {
      culture: cultureNom,
      score_humidite: Math.round(scoreH * 100) / 100,
      score_ph: Math.round(scorePH * 100) / 100,
      score_ec: Math.round(scoreEC * 100) / 100,
      score_global: scoreArrondi,
      score_pct: Math.round(scoreArrondi * 100),
      classe: classe,
      recommandations: recommandations,
      points_cles: ref.points_cles,
      source: ref.source
    };
  }

  /**
   * Analyse complète pour une campagne de mesure
   */
  function analyserCampagne(mesures, culturesCandidates) {
    const stats = calculerStatistiques(mesures);
    if (!stats) return null;

    const evaluations = culturesCandidates.map(c => evaluerCulture(c, stats));
    // Tri par score global décroissant
    evaluations.sort((a, b) => b.score_global - a.score_global);

    return {
      stats: stats,
      evaluations: evaluations
    };
  }

  return {
    getCulturesDisponibles: () => Object.keys(CULTURES_REFERENCE),
    getCultureDetails: (nom) => CULTURES_REFERENCE[nom],
    calculerStatistiques: calculerStatistiques,
    evaluerCulture: evaluerCulture,
    analyserCampagne: analyserCampagne
  };
})();

// Exportation pour Node.js / tests automatisés et navigateur
if (typeof module !== "undefined" && module.exports) {
  module.exports = AgronomyEngine;
}
