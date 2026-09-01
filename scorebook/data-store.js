(() => {
  "use strict";
  const DB_NAME = "baseball-scorebook";
  const DB_VERSION = 1;
  const stores = ["teams", "players", "settings"];

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        stores.forEach(name => {
          if (!request.result.objectStoreNames.contains(name)) {
            request.result.createObjectStore(name, { keyPath: "id" });
          }
        });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function transaction(storeName, mode, work) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      let result;
      try { result = work(store); } catch (error) { reject(error); return; }
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    }).finally(() => db.close());
  }

  const requestValue = request => new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  window.ScorebookStore = {
    async list(storeName) {
      const db = await openDb();
      try { return await requestValue(db.transaction(storeName).objectStore(storeName).getAll()); }
      finally { db.close(); }
    },
    put(storeName, value) { return transaction(storeName, "readwrite", store => store.put(value)); },
    remove(storeName, id) { return transaction(storeName, "readwrite", store => store.delete(id)); },
    async exportAll() {
      return { version: 1, exportedAt: new Date().toISOString(), teams: await this.list("teams"), players: await this.list("players") };
    },
    async importAll(payload) {
      if (!payload || payload.version !== 1 || !Array.isArray(payload.teams) || !Array.isArray(payload.players)) throw new Error("対応していない名簿データです");
      for (const team of payload.teams) await this.put("teams", team);
      for (const player of payload.players) await this.put("players", player);
    }
  };
})();
