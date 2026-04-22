
import React, { useState, useEffect } from 'react';
import { AppSetting } from '../types';
import { googleSheets } from '../services/googleSheets';

interface SettingsProps {
  settings: AppSetting[];
  onUpdateSetting: (key: string, value: string) => void;
  onUrlChange?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onUpdateSetting, onUrlChange }) => {
  const [serviceUrl, setServiceUrl] = useState(googleSheets.getServiceUrl());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [urlError, setUrlError] = useState('');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    const map: Record<string, string> = {};
    settings.forEach(s => { map[s.key] = s.value; });
    setLocalSettings(map);
  }, [settings]);

  const handleSaveUrl = () => {
    if (!serviceUrl.includes('script.google.com/macros/s/') || !serviceUrl.includes('/exec')) {
      setUrlError('La URL debe terminar en /exec.');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      return;
    }

    setUrlError('');
    setSaveStatus('saving');
    googleSheets.setServiceUrl(serviceUrl);
    setTimeout(() => {
      setSaveStatus('saved');
      if (onUrlChange) onUrlChange();
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 800);
  };

  const handleUpdate = (key: string, value: string) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    onUpdateSetting(key, value);
  };

const appsScriptCode = `
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
`.trim();


  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-text tracking-tight">Configuración del Sistema</h2>
          <p className="text-text-muted text-sm font-medium mt-1">Ajustes del conector en la nube y seguridad de accesos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8 space-y-8">
          <section className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border bg-surface-subtle flex items-center gap-3">
              <span className="material-symbols-outlined text-primary filled">palette</span>
              <h3 className="text-sm font-black text-text uppercase tracking-widest">Identidad Visual</h3>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Nombre de la App</label>
                <input className="w-full bg-surface-subtle border border-border rounded-xl p-4 text-sm font-bold outline-none focus:border-primary transition-all" value={localSettings['APP_NAME'] || ''} onChange={e => handleUpdate('APP_NAME', e.target.value)} />
              </div>
              
              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Jefe de Recursos Materiales</label>
                <input className="w-full bg-surface-subtle border border-border rounded-xl p-4 text-sm font-bold outline-none focus:border-primary transition-all" value={localSettings['HEAD_OF_MATERIAL_RESOURCES'] || ''} onChange={e => handleUpdate('HEAD_OF_MATERIAL_RESOURCES', e.target.value)} placeholder="Nombre del jefe de recursos materiales" />
              </div>
              
              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Director General</label>
                <input className="w-full bg-surface-subtle border border-border rounded-xl p-4 text-sm font-bold outline-none focus:border-primary transition-all" value={localSettings['INSTITUTION_HEAD_NAME'] || ''} onChange={e => handleUpdate('INSTITUTION_HEAD_NAME', e.target.value)} placeholder="Nombre del director general" />
              </div>
              
              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Encargado de Parque Vehicular</label>
                <input className="w-full bg-surface-subtle border border-border rounded-xl p-4 text-sm font-bold outline-none focus:border-primary transition-all" value={localSettings['VEHICLE_MANAGER_NAME'] || ''} onChange={e => handleUpdate('VEHICLE_MANAGER_NAME', e.target.value)} placeholder="Nombre del encargado de parque vehicular" />
              </div>
              
              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Cargo del Director General</label>
                <input className="w-full bg-surface-subtle border border-border rounded-xl p-4 text-sm font-bold outline-none focus:border-primary transition-all" value={localSettings['INSTITUTION_HEAD_POS'] || ''} onChange={e => handleUpdate('INSTITUTION_HEAD_POS', e.target.value)} placeholder="Cargo del director general" />
              </div>
              
              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Cargo del Encargado de Parque Vehicular</label>
                <input className="w-full bg-surface-subtle border border-border rounded-xl p-4 text-sm font-bold outline-none focus:border-primary transition-all" value={localSettings['VEHICLE_MANAGER_POS'] || ''} onChange={e => handleUpdate('VEHICLE_MANAGER_POS', e.target.value)} placeholder="Cargo del encargado de parque vehicular" />
              </div>
              
               <div className="space-y-3">
                 <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Cargo del Jefe de Recursos Materiales</label>
                 <input className="w-full bg-surface-subtle border border-border rounded-xl p-4 text-sm font-bold outline-none focus:border-primary transition-all" value={localSettings['HEAD_OF_MATERIAL_RESOURCES_POS'] || ''} onChange={e => handleUpdate('HEAD_OF_MATERIAL_RESOURCES_POS', e.target.value)} placeholder="Cargo del jefe de recursos materiales" />
               </div>
               
               <div className="space-y-3">
                 <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Coordinador Administrativo</label>
                 <input className="w-full bg-surface-subtle border border-border rounded-xl p-4 text-sm font-bold outline-none focus:border-primary transition-all" value={localSettings['ADMINISTRATIVE_COORDINATOR_NAME'] || ''} onChange={e => handleUpdate('ADMINISTRATIVE_COORDINATOR_NAME', e.target.value)} placeholder="Nombre del coordinador administrativo" />
               </div>
               
               <div className="space-y-3">
                 <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Cargo del Coordinador Administrativo</label>
                 <input className="w-full bg-surface-subtle border border-border rounded-xl p-4 text-sm font-bold outline-none focus:border-primary transition-all" value={localSettings['ADMINISTRATIVE_COORDINATOR_POS'] || ''} onChange={e => handleUpdate('ADMINISTRATIVE_COORDINATOR_POS', e.target.value)} placeholder="Cargo del coordinador administrativo" />
               </div>
            </div>
          </section>

          <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border bg-[#0f172a] text-white flex items-center justify-between">
              <h3 className="text-sm font-black flex items-center gap-2 uppercase tracking-widest"><span className="material-symbols-outlined text-primary">bolt</span>Configuración Google Sheets</h3>
            </div>
            <div className="p-8 space-y-8">
              <div className="space-y-3">
                <label className="text-[11px] font-black text-text-muted uppercase tracking-widest ml-1">URL /exec</label>
                <div className={`flex rounded-xl border transition-all ${saveStatus === 'error' ? 'border-rose-500 ring-4 ring-rose-50' : 'border-border focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10'}`}>
                  <input className="flex-1 text-text text-sm font-bold p-4 bg-transparent outline-none" placeholder="https://script.google.com/macros/s/.../exec" value={serviceUrl} onChange={(e) => { setServiceUrl(e.target.value); if (urlError) setUrlError(''); }} />
                  <button onClick={handleSaveUrl} disabled={saveStatus === 'saving'} className="bg-primary text-white px-6 font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all">{saveStatus === 'saving' ? 'Guardando...' : 'Actualizar'}</button>
                </div>
                {urlError && (
                  <p className="text-xs font-bold text-rose-600">{urlError}</p>
                )}
              </div>
              <div className="bg-secondary rounded-xl p-6 shadow-inner">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[10pt] font-black text-primary uppercase tracking-[0.2em] mb-4">Apps Script (v9.1 - Catálogo de tipos de incidencia)</h4>
                  <button onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(appsScriptCode);
                      setCopyStatus('copied');
                    } catch (error) {
                      setCopyStatus('error');
                    } finally {
                      setTimeout(() => setCopyStatus('idle'), 2000);
                    }
                  }} className="bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black py-1.5 px-3 rounded-lg transition-colors border border-slate-700">{copyStatus === 'copied' ? 'COPIADO' : copyStatus === 'error' ? 'ERROR AL COPIAR' : 'COPIAR CÓDIGO'}</button>
                </div>
                <pre className="text-[10px] font-mono text-text-muted overflow-x-auto max-h-48 custom-scrollbar leading-relaxed">{appsScriptCode}</pre>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-4 space-y-6">
          <div className="bg-surface p-8 rounded-[2rem] border border-border shadow-sm sticky top-28">
            <h4 className="text-[10pt] font-black text-primary uppercase tracking-[0.2em] mb-4">Novedades v8.9</h4>
            <ul className="space-y-6">
              <li className="flex gap-4">
                <span className="size-6 bg-primary text-white text-[10px] font-black flex items-center justify-center rounded-full shrink-0">1</span>
                <div><p className="text-[11px] font-black text-text uppercase tracking-widest mb-1">Folio Consecutivo en Incidencias</p><p className="text-[11px] font-bold text-text-muted leading-relaxed">Cada incidencia ahora recibe un folio INC-0001, INC-0002... que se muestra en las tarjetas y en el PDF.</p></div>
              </li>
              <li className="flex gap-4">
                <span className="size-6 bg-primary text-white text-[10px] font-black flex items-center justify-center rounded-full shrink-0">2</span>
                <div><p className="text-[11px] font-black text-text uppercase tracking-widest mb-1">Firma del Coordinador Administrativo</p><p className="text-[11px] font-bold text-text-muted leading-relaxed">Si configuras el nombre del Coordinador Administrativo, aparecerá como tercer firmante en el reporte PDF de incidencias.</p></div>
              </li>
              <li className="flex gap-4">
                <span className="size-6 bg-primary text-white text-[10px] font-black flex items-center justify-center rounded-full shrink-0">3</span>
                <div><p className="text-[11px] font-black text-text uppercase tracking-widest mb-1">Nuevo catálogo de incidencias</p><p className="text-[11px] font-bold text-text-muted leading-relaxed">La hoja "TiposIncidencia" alimenta el dropdown y permite guardar nuevos tipos desde el formulario.</p></div>
              </li>
              <li className="flex gap-4">
                <span className="size-6 bg-primary text-white text-[10px] font-black flex items-center justify-center rounded-full shrink-0">4</span>
                <div><p className="text-[11px] font-black text-text uppercase tracking-widest mb-1">Adquisiciones de Combustible</p><p className="text-[11px] font-bold text-text-muted leading-relaxed">Nueva hoja "CombustibleAdquisiciones" para vales y compras por código QR.</p></div>
              </li>
              <li className="flex gap-4">
                <span className="size-6 bg-primary text-white text-[10px] font-black flex items-center justify-center rounded-full shrink-0">5</span>
                <div><p className="text-[11px] font-black text-text uppercase tracking-widest mb-1">Importante</p><p className="text-[11px] font-bold text-text-muted leading-relaxed">Debes actualizar el código en Apps Script para crear o reconocer las nuevas columnas.</p></div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
