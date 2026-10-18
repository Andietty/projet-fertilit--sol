#!/usr/bin/env python3
"""
Serveur API REST de Synchronisation - Fertilité du Sol
Fournit les endpoints REST pour synchroniser les données de l'application mobile
avec la base de données centrale SQLite conforme au schéma relationnel.
"""

import http.server
import json
import os
import sqlite3
import sys

PORT = 5000
DB_FILE = os.path.join(os.path.dirname(__file__), "fertilite_sol.db")
SCHEMA_FILE = os.path.join(os.path.dirname(__file__), "schema.sql")

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    with open(SCHEMA_FILE, "r", encoding="utf-8") as f:
        cursor.executescript(f.read())
    conn.commit()
    conn.close()
    print(f"[DB] Base de donnees initialisee sur {DB_FILE}")

class AgroApiHandler(http.server.BaseHTTPRequestHandler):
    def _set_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(200)

    def do_GET(self):
        if self.path == "/api/parcelles":
            conn = sqlite3.connect(DB_FILE)
            conn.row_factory = sqlite3.Row
            rows = conn.cursor().execute("SELECT * FROM parcelles").fetchall()
            parcelles = [dict(r) for r in rows]
            conn.close()
            self._set_headers(200)
            self.wfile.write(json.dumps(parcelles, ensure_ascii=False).encode("utf-8"))

        elif self.path == "/api/campagnes":
            conn = sqlite3.connect(DB_FILE)
            conn.row_factory = sqlite3.Row
            rows = conn.cursor().execute("SELECT * FROM campagnes ORDER BY id DESC").fetchall()
            campagnes = [dict(r) for r in rows]
            conn.close()
            self._set_headers(200)
            self.wfile.write(json.dumps(campagnes, ensure_ascii=False).encode("utf-8"))

        elif self.path.startswith("/api/status"):
            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "ok", "service": "AgroSol Server API"}, ensure_ascii=False).encode("utf-8"))

        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint inconnu"}).encode("utf-8"))

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length).decode("utf-8")

        if self.path == "/api/sync":
            try:
                payload = json.loads(post_data)
                conn = sqlite3.connect(DB_FILE)
                cursor = conn.cursor()

                # Synchronisation parcelles
                for p in payload.get("parcelles", []):
                    cursor.execute(
                        "INSERT OR IGNORE INTO parcelles (id, nom, utilisateur_id, localite) VALUES (?, ?, ?, ?)",
                        (p.get("id"), p.get("nom"), p.get("utilisateur_id", 101), p.get("localite", "Yamoussoukro"))
                    )

                # Synchronisation campagnes
                for c in payload.get("campagnes", []):
                    cultures = json.dumps(c.get("cultures_candidates", []), ensure_ascii=False) if isinstance(c.get("cultures_candidates"), list) else str(c.get("cultures_candidates"))
                    cursor.execute(
                        "INSERT OR REPLACE INTO campagnes (id, parcelle_id, nom_parcelle, date_debut, date_fin, cultures_candidates, statut) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        (c.get("id"), c.get("parcelle_id"), c.get("nom_parcelle"), c.get("date_debut"), c.get("date_fin"), cultures, c.get("statut", "en_cours"))
                    )

                # Synchronisation mesures
                for m in payload.get("mesures", []):
                    cursor.execute(
                        """INSERT OR IGNORE INTO mesures 
                           (id, campagne_id, horodatage, latitude, longitude, humidite_pct, ph, ec_us_cm, azote_mgkg, phosphore_mgkg, potassium_mgkg, temperature_c, liaison)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (m.get("id"), m.get("campagne_id"), m.get("horodatage"), m.get("latitude"), m.get("longitude"),
                         m.get("humidite_pct"), m.get("ph"), m.get("ec_us_cm"), m.get("azote_mgkg", 0),
                         m.get("phosphore_mgkg", 0), m.get("potassium_mgkg", 0), m.get("temperature_c"), m.get("liaison", "BLE"))
                    )

                conn.commit()
                conn.close()

                self._set_headers(200)
                self.wfile.write(json.dumps({"success": True, "message": "Synchronisation terminee avec succes"}).encode("utf-8"))
            except Exception as e:
                self._set_headers(500)
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint non trouve"}).encode("utf-8"))

def run():
    init_db()
    server_address = ("", PORT)
    httpd = http.server.HTTPServer(server_address, AgroApiHandler)
    print(f"[API] Serveur demarre sur http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("[API] Arret du serveur.")

if __name__ == "__main__":
    run()
