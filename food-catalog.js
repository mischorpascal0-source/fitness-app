const fitnessFoodCatalog = (() => {
  const foodDialog = document.querySelector("#food-dialog");
  const foodForm = document.querySelector("#food-form");
  const lookupForm = document.querySelector("#food-lookup-form");
  const lookupStatus = document.querySelector("#food-lookup-status");
  const results = document.querySelector("#food-lookup-results");
  const portion = document.querySelector("#food-portion");
  const amount = foodForm.elements.amount;
  const missingDialog = document.querySelector("#food-missing-dialog");
  const missingForm = document.querySelector("#food-missing-form");
  const missingStatus = document.querySelector("#food-missing-status");
  const missingSave = missingForm.querySelector("button[type=submit]");
  const scanDialog = document.querySelector("#food-scan-dialog");
  const scanPermissionHint = document.querySelector("#food-scan-permission-hint");
  const scanStatus = document.querySelector("#food-scan-status");
  const scanManual = document.querySelector("#food-scan-manual");
  const video = document.querySelector("#food-scan-video");
  const cameraPreferenceKey = "fitness-app.barcode-camera.v1";
  const nutrients = { kcal: "calories", protein: "protein", carbs: "carbs", fat: "fat" };
  const sourceNames = { own: "Eigenes Lebensmittel", shared: "Gemeinsamer Katalog", off: "Open Food Facts" };
  let accountId, product, missingBarcode, missingShared, lookupController, saveController, camera, scannerScript;

  async function request(action, payload, controller) {
    const response = await fetch("/api/foods", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Fitness-Account": accountId },
      body: JSON.stringify({ action, ...payload }),
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(16000)]),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) throw new Error(data?.error || "Der Lebensmittelkatalog ist gerade nicht erreichbar.");
    return data;
  }

  function renderPortion() {
    if (!product || !amount.validity.valid) return;
    for (const [key, field] of Object.entries(nutrients)) {
      const value = product[key];
      const precision = key === "kcal" ? 1 : 10;
      foodForm.elements[field].value = value == null ? "" : Math.round(value * amount.valueAsNumber / 100 * precision) / precision;
    }
  }

  function selectProduct(next) {
    product = next;
    foodForm.elements.foodName.value = product.name.slice(0, 100);
    const source = sourceNames[product.source];
    const incomplete = Object.keys(nutrients).some((key) => product[key] == null);
    document.querySelector("#food-portion-source").textContent = incomplete
      ? source + " · Ergänze die fehlenden Werte für deine Menge vom Etikett." : source;
    document.querySelector("#food-portion-label").textContent = "Gegessene Menge in " + product.unit;
    portion.hidden = false;
    amount.disabled = false;
    amount.value = 100;
    results.hidden = true;
    lookupStatus.textContent = "";
    renderPortion();
    amount.focus();
  }

  function showResults(products) {
    lookupStatus.textContent = products.length ? "" : "Kein Treffer. Du kannst das Lebensmittel unten manuell eintragen.";
    results.hidden = !products.length;
    results.replaceChildren(...products.map((item) => {
      const row = document.createElement("li");
      const copy = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = item.name;
      const detail = document.createElement("small");
      detail.textContent = [item.brand, item.quantity, sourceNames[item.source]].filter(Boolean).join(" · ");
      const choose = document.createElement("button");
      choose.type = "button";
      choose.className = "plan-button";
      choose.textContent = "Auswählen";
      choose.setAttribute("aria-label", item.name + " auswählen");
      choose.addEventListener("click", () => selectProduct(item));
      copy.append(title, detail);
      row.append(copy, choose);
      return row;
    }));
  }

  function addMissing(barcode, unavailable, canShare) {
    missingBarcode = barcode;
    missingShared = canShare === true;
    missingForm.reset();
    missingStatus.textContent = "";
    document.querySelector("#food-missing-code").textContent = barcode;
    document.querySelector("#food-missing-title").textContent = missingShared ? "Neues Katalogprodukt" : "Eigenes Lebensmittel";
    const reason = unavailable ? "Open Food Facts ist gerade nicht erreichbar." : "Zu diesem Barcode wurde kein Produkt gefunden.";
    const audience = missingShared
      ? "Als Administrator der App speicherst du das Produkt für alle angemeldeten Nutzer."
      : "Speichere die Werte vom Etikett in deinem Konto.";
    document.querySelector("#food-missing-context").textContent = reason + " " + audience;
    missingSave.textContent = missingShared ? "Für alle speichern" : "Lebensmittel speichern";
    if (!missingDialog.open) missingDialog.showModal();
  }

  async function lookup(action, payload) {
    if (!accountId) {
      lookupStatus.textContent = "Melde dich an, um Lebensmittel zu suchen.";
      return;
    }
    lookupController?.abort();
    const controller = new AbortController();
    lookupController = controller;
    lookupStatus.textContent = "Lebensmittel werden gesucht …";
    results.hidden = true;
    try {
      const data = await request(action, payload, controller);
      if (lookupController !== controller || !foodDialog.open) return;
      if (action === "search") showResults(data.products);
      else if (data.product) selectProduct(data.product);
      else {
        lookupStatus.textContent = "";
        addMissing(payload.barcode, data.unavailable, data.canShare);
      }
    } catch (error) {
      if (lookupController === controller) lookupStatus.textContent = error.message;
    } finally {
      if (lookupController === controller) lookupController = null;
    }
  }

  function loadScanner() {
    if (!scannerScript) {
      scannerScript = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "/zxing-browser-0.2.1.min.js";
        script.addEventListener("load", () => resolve(window.ZXingBrowser), { once: true });
        script.addEventListener("error", () => {
          script.remove();
          scannerScript = null;
          reject(new Error("Der Barcode-Scanner konnte nicht geladen werden."));
        }, { once: true });
        document.head.append(script);
      });
    }
    return scannerScript;
  }

  function stopCamera() {
    const current = camera;
    camera = null;
    current?.controls?.stop();
    current?.stream?.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
    video.hidden = true;
  }

  function cameraRemembered() {
    try {
      return localStorage.getItem(cameraPreferenceKey) === "allowed";
    } catch {
      return false;
    }
  }

  function rememberCamera(allowed) {
    try {
      if (allowed) localStorage.setItem(cameraPreferenceKey, "allowed");
      else localStorage.removeItem(cameraPreferenceKey);
    } catch {
      // The browser can still grant camera access with local storage blocked.
    }
  }

  async function scan() {
    if (scanDialog.open) return;
    const current = {};
    camera = current;
    scanPermissionHint.hidden = cameraRemembered();
    scanManual.hidden = true;
    scanStatus.textContent = "Kamera wird geöffnet …";
    scanDialog.showModal();
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Kamera nicht verfügbar");
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      if (camera !== current || !scanDialog.open) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      current.stream = stream;
      rememberCamera(true);
      scanPermissionHint.hidden = true;
      const { BrowserMultiFormatReader } = await loadScanner();
      if (camera !== current) return;
      video.hidden = false;
      scanStatus.textContent = "";
      const reader = new BrowserMultiFormatReader();
      current.controls = await reader.decodeFromStream(stream, video, (result) => {
        if (!result || camera !== current) return;
        const barcode = foodCode.normalize(result.getText());
        if (!barcode) {
          scanStatus.textContent = "Der QR-Code enthält keinen erkennbaren Produktbarcode.";
          return;
        }
        stopCamera();
        scanDialog.close();
        lookupForm.elements.query.value = barcode;
        lookup("barcode", { barcode });
      });
      if (camera !== current) current.controls.stop();
    } catch (error) {
      if (camera !== current) return;
      stopCamera();
      scanPermissionHint.hidden = true;
      scanManual.hidden = false;
      if (["NotAllowedError", "SecurityError"].includes(error?.name)) {
        rememberCamera(false);
        scanStatus.textContent = "Kamerazugriff blockiert. Erlaube die Kamera in den Einstellungen der Website oder des Geräts.";
      } else {
        scanStatus.textContent = "Der Scanner konnte nicht gestartet werden. Gib den Barcode ein oder versuche es erneut.";
      }
    }
  }

  function reset() {
    lookupController?.abort();
    lookupController = null;
    saveController?.abort();
    saveController = null;
    missingSave.disabled = false;
    if (scanDialog.open) scanDialog.close();
    if (missingDialog.open) missingDialog.close();
    stopCamera();
    missingBarcode = undefined;
    missingShared = false;
    product = undefined;
    portion.hidden = true;
    amount.disabled = true;
    results.hidden = true;
    results.replaceChildren();
    lookupForm.reset();
    lookupStatus.textContent = "";
  }

  lookupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = lookupForm.elements.query.value.trim();
    const barcode = foodCode.normalize(query);
    if (barcode) lookup("barcode", { barcode });
    else if (/^\d+$|^https?:\/\//i.test(query)) lookupStatus.textContent = "Gib einen gültigen Produktbarcode ein.";
    else lookup("search", { query });
  });
  document.querySelector("#food-scan-open").addEventListener("click", scan);
  scanManual.addEventListener("click", () => {
    scanDialog.close();
    lookupForm.elements.query.focus();
  });
  scanDialog.addEventListener("close", () => { if (!scanDialog.open) stopCamera(); });
  missingDialog.addEventListener("close", () => {
    if (missingDialog.open) return;
    saveController?.abort();
    saveController = null;
    missingSave.disabled = false;
  });
  missingForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!missingBarcode || !accountId || saveController) return;
    const controller = new AbortController();
    saveController = controller;
    missingSave.disabled = true;
    missingStatus.textContent = "Wird gespeichert …";
    try {
      const { product } = await request("save", {
        barcode: missingBarcode,
        expectedShared: missingShared,
        name: missingForm.elements.name.value.trim(),
        unit: missingForm.elements.unit.value,
        ...Object.fromEntries(Object.keys(nutrients).map((key) => [key, missingForm.elements[key].valueAsNumber])),
      }, controller);
      if (saveController !== controller || !missingDialog.open) return;
      missingDialog.close();
      selectProduct(product);
      lookupStatus.textContent = product.source === "shared"
        ? "Lebensmittel mit Barcode für alle im gemeinsamen Katalog gespeichert."
        : "Lebensmittel mit Barcode im Konto gespeichert.";
    } catch (error) {
      if (saveController === controller) missingStatus.textContent = error.message;
    } finally {
      if (saveController === controller) {
        saveController = null;
        missingSave.disabled = false;
      }
    }
  });
  amount.addEventListener("input", renderPortion);
  document.querySelector("#food-clear-selection").addEventListener("click", () => {
    product = undefined;
    portion.hidden = true;
    amount.disabled = true;
    foodForm.elements.foodName.focus();
  });
  foodDialog.addEventListener("close", () => { if (!foodDialog.open) reset(); });

  return { reset, setAccount(id) { reset(); accountId = id; } };
})();
