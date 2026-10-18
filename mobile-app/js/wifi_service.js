/**
 * Service Wi-Fi SoftAP (Mode de secours)
 * Interroge l'API HTTP locale exposée par l'ESP32 sur 192.168.4.1
 */

const WiFiService = (function () {
  let isPolling = false;
  let pollInterval = null;
  let targetIp = "192.168.4.1";
  let onDataCallbacks = [];
  let onStatusCallbacks = [];

  function notifyStatus(status, detail) {
    onStatusCallbacks.forEach(cb => {
      try { cb({ status, detail, isPolling }); } catch (e) { console.error(e); }
    });
  }

  async function fetchSensorData() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const response = await fetch(`http://${targetIp}/api/data`, {
        signal: controller.signal,
        headers: { "Accept": "application/json" }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      data.liaison = "WIFI";
      notifyStatus("connected", `Connecté au point d'accès Wi-Fi (${targetIp})`);
      onDataCallbacks.forEach(cb => {
        try { cb(data); } catch (e) { console.error(e); }
      });
    } catch (err) {
      notifyStatus("warning", `Nœud Wi-Fi non joignable sur ${targetIp} : ${err.message}`);
    }
  }

  return {
    setIp: (ip) => { targetIp = ip.trim(); },
    getIp: () => targetIp,

    startPolling: function (intervalMs = 2000) {
      if (isPolling) return;
      isPolling = true;
      notifyStatus("connecting", `Tentative de liaison Wi-Fi SoftAP sur ${targetIp}...`);
      fetchSensorData();
      pollInterval = setInterval(fetchSensorData, intervalMs);
    },

    stopPolling: function () {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      isPolling = false;
      notifyStatus("disconnected", "Liaison Wi-Fi arrêtée");
    },

    onData: function (cb) {
      if (cb && !onDataCallbacks.includes(cb)) onDataCallbacks.push(cb);
    },

    onStatusChange: function (cb) {
      if (cb && !onStatusCallbacks.includes(cb)) onStatusCallbacks.push(cb);
    },

    isPollingActive: () => isPolling
  };
})();
