/**
 * Service Bluetooth Low Energy (BLE)
 * Communication sans fil nominale avec le nœud ESP32
 * Conforme au profil GATT spécifié dans STD
 */

const BLEService = (function () {
  // UUIDs conformes aux spécifications
  const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
  const CHAR_DATA_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

  let bluetoothDevice = null;
  let gattServer = null;
  let dataCharacteristic = null;
  let isConnected = false;
  let onDataCallbacks = [];
  let onStatusCallbacks = [];

  function notifyStatus(status, detail) {
    onStatusCallbacks.forEach(cb => {
      try { cb({ status, detail, isConnected }); } catch (e) { console.error(e); }
    });
  }

  function handleDataNotification(event) {
    const value = event.target.value;
    const decoder = new TextDecoder("utf-8");
    const jsonStr = decoder.decode(value);
    try {
      const parsedData = JSON.parse(jsonStr);
      parsedData.liaison = "BLE";
      onDataCallbacks.forEach(cb => {
        try { cb(parsedData); } catch (e) { console.error(e); }
      });
    } catch (e) {
      console.warn("Trame BLE reçue non-JSON ou corrompue :", jsonStr);
    }
  }

  function handleDisconnect() {
    isConnected = false;
    bluetoothDevice = null;
    gattServer = null;
    dataCharacteristic = null;
    notifyStatus("disconnected", "Connexion Bluetooth interrompue");
  }

  return {
    isSupported: function () {
      return navigator && "bluetooth" in navigator;
    },

    connect: async function () {
      if (!this.isSupported()) {
        notifyStatus("unsupported", "Web Bluetooth non supporté sur ce navigateur");
        throw new Error("Web Bluetooth non supporté");
      }

      try {
        notifyStatus("connecting", "Recherche du nœud ESP32...");
        bluetoothDevice = await navigator.bluetooth.requestDevice({
          filters: [
            { namePrefix: "ESP32" },
            { namePrefix: "NOEUD" }
          ],
          optionalServices: [SERVICE_UUID]
        });

        bluetoothDevice.addEventListener("gattserverdisconnected", handleDisconnect);

        notifyStatus("connecting", "Connexion au serveur GATT...");
        gattServer = await bluetoothDevice.gatt.connect();

        notifyStatus("connecting", "Recherche du service Fertilité Sol...");
        const service = await gattServer.getPrimaryService(SERVICE_UUID);

        notifyStatus("connecting", "Abonnement aux mesures...");
        dataCharacteristic = await service.getCharacteristic(CHAR_DATA_UUID);
        await dataCharacteristic.startNotifications();
        dataCharacteristic.addEventListener("characteristicvaluechanged", handleDataNotification);

        isConnected = true;
        notifyStatus("connected", `Connecté à ${bluetoothDevice.name || "Nœud ESP32"}`);
        return true;
      } catch (err) {
        isConnected = false;
        notifyStatus("error", err.message || "Échec de connexion Bluetooth");
        throw err;
      }
    },

    disconnect: function () {
      if (bluetoothDevice && bluetoothDevice.gatt.connected) {
        bluetoothDevice.gatt.disconnect();
      }
      handleDisconnect();
    },

    onData: function (cb) {
      if (cb && !onDataCallbacks.includes(cb)) onDataCallbacks.push(cb);
    },

    onStatusChange: function (cb) {
      if (cb && !onStatusCallbacks.includes(cb)) onStatusCallbacks.push(cb);
    },

    isConnected: function () {
      return isConnected && bluetoothDevice && bluetoothDevice.gatt.connected;
    }
  };
})();
