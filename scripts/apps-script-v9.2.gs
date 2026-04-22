/**
 * API FLOTA PRO v9.2 - Fix guardado incidencias y catalogo de tipos
 */

const CONFIG = {
  sheets: {
    "Vehiculos": [
      "id", "plate", "model", "assignedDriverId", "status", "image", "date_registered",
      "economicNumber", "inventory", "condition", "location", "vin", "odometer", "brand", "year", "type", "line", "color", "cylinders", "fuelType",
      "engineStatus", "clutchStatus", "transmissionStatus", "shifterStatus", "steeringStatus", "suspensionStatus", "tempGaugeStatus", "oilGaugeStatus",
      "tiresStatus", "shocksStatus", "brakesStatus", "batteryStatus", "lightsStatus", "hornStatus", "wipersStatus", "speedoStatus",
      "observations", "accessories_notes"
    ],
    "Revisiones": [
      "id", "date", "vehicleId", "inspectorName", "odometer", "observations",
      "engineStatus", "clutchStatus", "transmissionStatus", "shifterStatus", "steeringStatus", "suspensionStatus", "tempGaugeStatus", "oilGaugeStatus",
      "tiresStatus", "shocksStatus", "brakesStatus", "batteryStatus", "lightsStatus", "hornStatus", "wipersStatus", "speedoStatus"
    ],
    "Choferes": ["id", "name", "licenseType", "licenseNumber", "phone", "status", "assignedVehicleId", "image", "notes"],
    "Combustible": ["id", "date", "vehicleId", "driverId", "liters", "cost", "odometer"],
    "CombustibleAdquisiciones": ["id", "consecutiveNumber", "internalFolio", "date", "isQr", "validFrom", "validTo", "description", "amount", "area", "supplier"],
    "CombustibleEntregas": ["id", "consecutiveNumber", "date", "acquisitionId", "acquisitionConsecutiveNumber", "acquisitionInternalFolio", "acquisitionType", "area", "amount", "purpose", "recipientName", "recipientPosition", "notes"],
    "Incidencias": ["id", "consecutiveNumber", "date", "type", "title", "description", "vehicleId", "driverId", "status"],
    "Planeacion": ["id", "date", "vehicleId", "driverId", "areaId", "notes", "departureTime", "arrivalTime", "destination", "status"],
    "Areas": ["id", "name", "description"],
    "BitacorasViaje": ["id", "date", "departureTime", "arrivalTime", "driverId", "vehicleId", "initialOdometer", "finalOdometer", "destination", "areaId", "notes", "initialFuelLevel", "finalFuelLevel"],
    "Mantenimiento": ["id", "consecutiveNumber", "date", "vehicleId", "serviceType", "description", "quoteNumber", "quoteCost", "paymentMethod", "invoiceNumber", "invoiceAmount", "odometer", "provider", "entryDate", "exitDate", "status", "estimatedDeliveryDate", "internalDocumentNumber", "providerContact"],
    "TiposMantenimiento": ["id", "name"],
    "TiposIncidencia": ["id", "name", "value"],
    "Proveedores": ["id", "name", "contact", "phone", "email", "address", "notes"],
    "Ajustes": ["key", "value"],
    "Usuarios": ["id", "name", "username", "password", "role", "status", "lastLogin"]
  }
};

const ACTION_TO_SHEET = {
  "fuel": "Combustible",
  "update-fuel": "Combustible",
  "fuel-acquisition": "CombustibleAdquisiciones",
  "update-fuel-acquisition": "CombustibleAdquisiciones",
  "fuel-delivery": "CombustibleEntregas",
  "update-fuel-delivery": "CombustibleEntregas",
  "incident": "Incidencias",
  "update-incident": "Incidencias",
  "vehicle": "Vehiculos",
  "update-vehicle": "Vehiculos",
  "inspection": "Revisiones",
  "update-inspection": "Revisiones",
  "driver": "Choferes",
  "update-driver": "Choferes",
  "planning": "Planeacion",
  "update-planning": "Planeacion",
  "area": "Areas",
  "delete-area": "Areas",
  "travel-log": "BitacorasViaje",
  "update-travel-log": "BitacorasViaje",
  "maintenance": "Mantenimiento",
  "update-maintenance": "Mantenimiento",
  "maintenance-type": "TiposMantenimiento",
  "update-maintenance-type": "TiposMantenimiento",
  "incident-type": "TiposIncidencia",
  "update-incident-type": "TiposIncidencia",
  "supplier": "Proveedores",
  "update-supplier": "Proveedores",
  "user": "Usuarios",
  "update-user": "Usuarios"
};

function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(CONFIG.sheets).forEach(function(name) {
    getOrCreateSheet(ss, name);
  });

  const data = {};
  Object.keys(CONFIG.sheets).forEach(function(name) {
    data[name.toLowerCase()] = getSheetData(ss, name);
  });

  return jsonResponse({
    vehicles: data.vehiculos,
    inspections: data.revisiones,
    drivers: data.choferes,
    fuelEntries: data.combustible,
    fuelAcquisitions: data.combustibleadquisiciones,
    fuelDeliveries: data.combustibleentregas,
    incidents: data.incidencias,
    plannings: data.planeacion,
    areas: data.areas,
    travelLogs: data.bitacorasviaje,
    maintenanceRecords: data.mantenimiento,
    maintenanceTypes: data.tiposmantenimiento,
    incidentTypes: data.tiposincidencia,
    suppliers: data.proveedores,
    settings: data.ajustes,
    users: data.usuarios
  });
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  try {
    const body = parsePostBody(e);
    const action = String(body.action || "").trim();
    const d = body.data;

    if (!action) throw new Error("Accion vacia.");
    if (action === "update-setting") {
      if (!d || typeof d !== "object") throw new Error("Carga de datos invalida.");
      const settingsSheet = getOrCreateSheet(ss, "Ajustes");
      updateSettingValue(settingsSheet, d.key, d.value);
      return jsonResponse({ status: "success" });
    }

    if (!d || typeof d !== "object") throw new Error("Carga de datos invalida.");
    const sheetName = ACTION_TO_SHEET[action];
    if (!sheetName) throw new Error("Accion no soportada: " + action);

    const payload = sanitizePayloadByAction(action, d);
    if ((action === "user" || action === "update-user") && payload.password) {
      payload.password = Utilities.base64Encode(
        Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(payload.password))
      );
    }

    const sheet = getOrCreateSheet(ss, sheetName);
    const headersInSheet = getSheetHeaders(sheet);

    const requiresUniqueName =
      action === "maintenance-type" ||
      action === "update-maintenance-type" ||
      action === "incident-type" ||
      action === "update-incident-type" ||
      action === "supplier" ||
      action === "update-supplier";

    if (requiresUniqueName && hasDuplicateName(sheet, headersInSheet, payload.name, action.indexOf("update-") === 0 ? payload.id : "")) {
      throw new Error("Ya existe un registro con ese nombre.");
    }

    if (action === "delete-area") {
      if (!payload.id) throw new Error("El id es obligatorio para eliminar un area.");
      deleteRowById(sheet, payload.id, headersInSheet);
      return jsonResponse({ status: "success" });
    }

    if (action.indexOf("update-") === 0) {
      if (!payload.id) throw new Error("El id es obligatorio para actualizar.");
      const updated = updateRowDynamic(sheet, payload.id, payload, headersInSheet);
      if (!updated) throw new Error("No se encontro el registro a actualizar.");
      return jsonResponse({ status: "success" });
    }

    appendRowDynamic(sheet, payload, headersInSheet);
    return jsonResponse({ status: "success" });
  } catch (err) {
    return jsonResponse({ status: "error", message: String(err && err.message ? err.message : err) });
  }
}

function parsePostBody(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    throw new Error("JSON invalido en postData.contents");
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function sanitizePayloadByAction(action, dataObj) {
  const clean = dataObj || {};

  if (action === "incident" || action === "update-incident") {
    if (!clean.status) clean.status = "pending";
    if (clean.type !== undefined) clean.type = String(clean.type).trim();
    if (clean.title !== undefined) clean.title = String(clean.title).trim();
    if (clean.description !== undefined) clean.description = String(clean.description).trim();
  }

  if (action === "incident-type" || action === "update-incident-type") {
    if (!clean.name && clean.value) clean.name = String(clean.value).trim().toUpperCase();
    if (!clean.value && clean.name) clean.value = normalizeIncidentTypeValue(clean.name);
  }

  return clean;
}

function normalizeIncidentTypeValue(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .trim()
    .toLowerCase();
}

function appendRowDynamic(sheet, dataObj, headers) {
  const row = headers.map(function(h) {
    if (h === "date_registered") return new Date();
    return dataObj[h] !== undefined ? dataObj[h] : "";
  });
  sheet.appendRow(row);
}

function updateRowDynamic(sheet, id, dataObj, headers) {
  const data = sheet.getDataRange().getValues();
  const idColIndex = headers.indexOf("id");
  if (idColIndex === -1) return false;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idColIndex]) === String(id)) {
      headers.forEach(function(h, j) {
        if (dataObj[h] !== undefined) {
          sheet.getRange(i + 1, j + 1).setValue(dataObj[h]);
        }
      });
      return true;
    }
  }
  return false;
}

function deleteRowById(sheet, id, headers) {
  const idColIndex = headers.indexOf("id");
  if (idColIndex === -1) return false;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idColIndex]) === String(id)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function normalizeForCompare(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function hasDuplicateName(sheet, headers, candidateName, excludeId) {
  const nameColIndex = headers.indexOf("name");
  if (nameColIndex === -1) return false;

  const normalizedCandidate = normalizeForCompare(candidateName);
  if (!normalizedCandidate) return false;

  const idColIndex = headers.indexOf("id");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const existingName = normalizeForCompare(data[i][nameColIndex]);
    if (existingName !== normalizedCandidate) continue;
    if (excludeId && idColIndex !== -1 && String(data[i][idColIndex]) === String(excludeId)) continue;
    return true;
  }
  return false;
}

function updateSettingValue(sheet, key, value) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(key)) {
      sheet.getRange(i + 1, 2).setValue(value);
      return true;
    }
  }
  sheet.appendRow([key, value]);
  return true;
}

function getOrCreateSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    const headers = CONFIG.sheets[name];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold").setBackground("#f1f5f9");
    sheet.setFrozenRows(1);
    if (name === "TiposIncidencia") seedDefaultIncidentTypes(sheet);
    return sheet;
  }

  ensureColumns(sheet, name);
  if (name === "TiposIncidencia" && sheet.getLastRow() < 2) {
    seedDefaultIncidentTypes(sheet);
  }
  return sheet;
}

function seedDefaultIncidentTypes(sheet) {
  const defaults = [
    ["IT-1", "MECANICA", "mechanical"],
    ["IT-2", "TRANSITO / MULTA", "traffic"],
    ["IT-3", "ACCIDENTE", "accident"],
    ["IT-4", "ROBO", "theft"]
  ];
  sheet.getRange(2, 1, defaults.length, defaults[0].length).setValues(defaults);
}

function ensureColumns(sheet, name) {
  const expected = CONFIG.sheets[name];
  if (!expected) return;

  const existing = getSheetHeaders(sheet);
  expected.forEach(function(col) {
    if (existing.indexOf(col) === -1) {
      const newCol = existing.length + 1;
      sheet.getRange(1, newCol).setValue(col).setFontWeight("bold").setBackground("#f1f5f9");
      existing.push(col);
    }
  });
}

function getSheetHeaders(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol <= 0) return [];
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
    return String(h).trim();
  });
}

function getSheetData(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values.shift().map(function(h) { return String(h).trim(); });
  return values.map(function(row) {
    const obj = {};
    headers.forEach(function(h, i) {
      if (h) obj[h] = row[i];
    });
    return obj;
  });
}
