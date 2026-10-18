#!/usr/bin/env python3
"""
Tests Unitaires et d'Intégration du Moteur Agronomique (Cycle en V)
Valide la conformité mathématique et agronomique face aux données de référence
(Feuille Analyses de BDD_Dispositif_Fertilite_Sol.xlsx et fiches FAO/CNRA).
"""

import math
import unittest

# Référentiel des cultures cibles
CULTURES_REF = {
    "Igname": {"ph_min": 5.5, "ph_max": 6.5, "h_min": 25, "h_max": 40, "ec_max": 1500},
    "Maïs": {"ph_min": 5.8, "ph_max": 7.0, "h_min": 20, "h_max": 30, "ec_max": 1700},
    "Tomate": {"ph_min": 6.0, "ph_max": 6.8, "h_min": 20, "h_max": 30, "ec_max": 2500},
    "Riz pluvial": {"ph_min": 5.0, "ph_max": 6.5, "h_min": 30, "h_max": 45, "ec_max": 3000},
}

def calculer_statistiques(mesures):
    n = len(mesures)
    if n == 0:
        return None
    moy_h = sum(m["humidite"] for m in mesures) / n
    moy_ph = sum(m["ph"] for m in mesures) / n
    moy_ec = sum(m["ec"] for m in mesures) / n
    moy_t = sum(m["temp"] for m in mesures) / n

    var_h = sum((m["humidite"] - moy_h) ** 2 for m in mesures) / (n - 1) if n > 1 else 0.0
    ecart_type_h = math.sqrt(var_h)

    return {
        "n": n,
        "moy_h": round(moy_h, 2),
        "ecart_type_h": round(ecart_type_h, 2),
        "moy_ph": round(moy_ph, 2),
        "moy_ec": round(moy_ec, 1),
        "moy_t": round(moy_t, 2)
    }

def evaluer_culture(nom, stats):
    ref = CULTURES_REF[nom]
    h, ph, ec = stats["moy_h"], stats["moy_ph"], stats["moy_ec"]
    recommandations = []

    # Score Humidité
    if ref["h_min"] <= h <= ref["h_max"]:
        s_h = 1.0
    elif h < ref["h_min"]:
        s_h = max(0.0, 1.0 - (ref["h_min"] - h) / ref["h_min"])
        recommandations.append("Irriguer (sol trop sec)")
    else:
        s_h = max(0.0, 1.0 - (h - ref["h_max"]) / 20.0)
        recommandations.append("Drainer (sol trop humide)")

    # Score pH
    if ref["ph_min"] <= ph <= ref["ph_max"]:
        s_ph = 1.0
    elif ph < ref["ph_min"]:
        diff = ref["ph_min"] - ph
        s_ph = 0.5 if diff <= 0.4 else 0.0
        recommandations.append("Chauler (sol trop acide)")
    else:
        diff = ph - ref["ph_max"]
        s_ph = 0.5 if diff <= 0.4 else 0.0
        recommandations.append("Corriger alcalinité")

    # Score EC
    if ec <= ref["ec_max"]:
        s_ec = 1.0
    else:
        s_ec = max(0.0, 1.0 - (ec - ref["ec_max"]) / ref["ec_max"])
        recommandations.append("Lessivage (salinité élevée)")

    # Score Global pondéré
    score = (s_h * 2.0 + s_ph * 2.0 + s_ec * 1.0) / 5.0
    score = round(score, 2)

    if score >= 0.80:
        classe = "Adapté"
    elif score >= 0.50:
        classe = "Possible avec corrections"
    else:
        classe = "Non adapté"

    return {"score": score, "classe": classe, "recommandations": recommandations}


class TestAgronomyScoring(unittest.TestCase):
    def test_champ_nord_conforme_bdd_excel(self):
        """Vérifie que les 6 mesures de Champ Nord reproduisent l'analyse de la BDD Excel"""
        mesures_champ_nord = [
            {"humidite": 22.5, "ph": 5.75, "ec": 1105, "temp": 26.9},
            {"humidite": 24.5, "ph": 5.53, "ec": 809, "temp": 27.3},
            {"humidite": 27.3, "ph": 6.27, "ec": 887, "temp": 26.2},
            {"humidite": 25.4, "ph": 6.39, "ec": 1101, "temp": 27.2},
            {"humidite": 27.8, "ph": 6.14, "ec": 1088, "temp": 26.2},
            {"humidite": 22.5, "ph": 6.20, "ec": 901, "temp": 28.1},
        ]
        stats = calculer_statistiques(mesures_champ_nord)
        self.assertEqual(stats["n"], 6)
        self.assertAlmostEqual(stats["moy_h"], 25.0, delta=0.1)
        self.assertAlmostEqual(stats["moy_ph"], 6.05, delta=0.05)
        self.assertAlmostEqual(stats["moy_ec"], 981.8, delta=1.0)

        # Igname sur Champ Nord : doit être 'Adapté'
        res_igname = evaluer_culture("Igname", stats)
        self.assertEqual(res_igname["classe"], "Adapté")
        self.assertGreaterEqual(res_igname["score"], 0.8)

        # Maïs sur Champ Nord : doit être 'Adapté'
        res_mais = evaluer_culture("Maïs", stats)
        self.assertEqual(res_mais["classe"], "Adapté")
        self.assertGreaterEqual(res_mais["score"], 0.8)

    def test_champ_sud_bas_fond_conforme_bdd_excel(self):
        """Vérifie que pour Champ Sud (sol très humide de bas-fond), le maïs nécessite un drainage"""
        mesures_bas_fond = [
            {"humidite": 36.5, "ph": 5.88, "ec": 1340, "temp": 26.2},
            {"humidite": 42.0, "ph": 5.48, "ec": 1268, "temp": 26.9},
            {"humidite": 40.9, "ph": 5.62, "ec": 1753, "temp": 26.2},
            {"humidite": 43.1, "ph": 5.62, "ec": 1371, "temp": 25.3},
            {"humidite": 42.1, "ph": 5.64, "ec": 1285, "temp": 26.9},
        ]
        stats = calculer_statistiques(mesures_bas_fond)
        self.assertAlmostEqual(stats["moy_h"], 40.9, delta=0.2)

        # Riz pluvial en bas-fond : doit être 'Adapté' (adore l'humidité)
        res_riz = evaluer_culture("Riz pluvial", stats)
        self.assertEqual(res_riz["classe"], "Adapté")

        # Maïs en bas-fond : doit recommander le drainage
        res_mais = evaluer_culture("Maïs", stats)
        self.assertIn("Possible avec corrections", res_mais["classe"])
        self.assertTrue(any("Drainer" in r for r in res_mais["recommandations"]))

    def test_acidite_severe_chaulage(self):
        """Vérifie la détection d'acidité sévère et le conseil de chaulage"""
        mesures_acides = [
            {"humidite": 25.0, "ph": 4.80, "ec": 800, "temp": 26.0},
            {"humidite": 26.0, "ph": 4.90, "ec": 850, "temp": 26.5},
        ]
        stats = calculer_statistiques(mesures_acides)
        res_igname = evaluer_culture("Igname", stats)
        self.assertTrue(any("Chauler" in r for r in res_igname["recommandations"]))

if __name__ == "__main__":
    unittest.main()
