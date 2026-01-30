
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
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    const map: Record<string, string> = {};
    settings.forEach(s => { map[s.key] = s.value; });
    setLocalSettings(map);
  }, [settings]);

  const handleSaveUrl = () => {
    if (!serviceUrl.includes('script.google.com/macros/s/') || !serviceUrl.includes('/exec')) {
      setSaveStatus('error');
      alert("Error: La URL debe terminar en /exec.");
      setTimeout(() => setSaveStatus('idle'), 3000);
      return;
    }

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
 * API FLOTA PRO v8.0 - PLANEACIÓN ACTUALIZADA (ESTADO)
 */

const CONFIG = {
  sheets: {
    "Vehiculos": [
      "id", "plate", "model", "assignedDriverId", "status", "image", "date_registered",
      "inventory", "condition", "location", "vin", "odometer", "brand", "year", "type", "line", "color", "cylinders", "fuelType",
      "engineStatus", "clutchStatus", "transmissionStatus", "shifterStatus", "steeringStatus", "suspensionStatus", "tempGaugeStatus", "oilGaugeStatus",
      "tiresStatus", "shocksStatus", "brakesStatus", "batteryStatus", "lightsStatus", "hornStatus", "wipersStatus", "speedoStatus",
      "observations", "accessories_notes"
    ],
    "Revisiones": [
      "id", "date", "vehicleId", "inspectorName", "odometer", "observations",
      "engineStatus", "clutchStatus", "transmissionStatus", "shifterStatus", "steeringStatus", "suspensionStatus", "tempGaugeStatus", "oilGaugeStatus",
      "tiresStatus", "shocksStatus", "brakesStatus", "batteryStatus", "lightsStatus", "hornStatus", "wipersStatus", "speedoStatus"
    ],
    "Choferes": ["id", "name", "licenseType", "phone", "status", "assignedVehicleId", "image"],
    "Combustible": ["id", "date", "vehicleId", "driverId", "liters", "cost", "odometer"],
    "Incidencias": ["id", "date", "type", "title", "description", "vehicleId", "driverId", "status"],
    "Planeacion": ["id", "date", "vehicleId", "driverId", "areaId", "notes", "departureTime", "arrivalTime", "destination", "status"],
    "Areas": ["id", "name", "description"],
    "BitacorasViaje": ["id", "date", "departureTime", "arrivalTime", "driverId", "vehicleId", "initialOdometer", "finalOdometer", "destination", "areaId", "notes", "initialFuelLevel", "finalFuelLevel"],
    "Mantenimiento": ["id", "date", "vehicleId", "serviceType", "description", "quoteNumber", "quoteCost", "invoiceNumber", "invoiceAmount", "odometer", "provider", "entryDate", "exitDate", "status", "estimatedDeliveryDate", "internalDocumentNumber", "providerContact"],
    "TiposMantenimiento": ["id", "name"],
    "Ajustes": ["key", "value"],
    "Usuarios": ["id", "name", "username", "password", "role", "status", "lastLogin"]
  }
};

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(CONFIG.sheets).forEach(name => getOrCreateSheet(ss, name));
  
  const userSheet = ss.getSheetByName("Usuarios");
  if (userSheet.getLastRow() < 2) {
    const defaultPassHash = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, "Macaco123"));
    userSheet.appendRow(["USR-1", "Administrador", "admin", defaultPassHash, "admin", "active", ""]);
  }

  const data = {};
  Object.keys(CONFIG.sheets).forEach(name => {
    data[name.toLowerCase()] = getSheetData(ss, name);
  });
  
  const response = {
    vehicles: data.vehiculos,
    inspections: data.revisiones,
    drivers: data.choferes,
    fuelEntries: data.combustible,
    incidents: data.incidencias,
    plannings: data.planeacion,
    areas: data.areas,
    travelLogs: data.bitacorasviaje,
    maintenanceRecords: data.mantenimiento,
    maintenanceTypes: data.tiposmantenimiento,
    settings: data.ajustes,
    users: data.usuarios
  };

  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  try {
    const contents = JSON.parse(e.postData.contents);
    const action = contents.action;
    const d = contents.data;
    
    if (action === 'update-setting') {
      const sheet = getOrCreateSheet(ss, "Ajustes");
      updateSettingValue(sheet, d.key, d.value);
      return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
    }
    
    let sheetName = "";
    if (action === 'fuel') sheetName = "Combustible";
    else if (action === 'incident') sheetName = "Incidencias";
    else if (action === 'vehicle' || action === 'update-vehicle') sheetName = "Vehiculos";
    else if (action === 'inspection') sheetName = "Revisiones";
    else if (action === 'driver' || action === 'update-driver') sheetName = "Choferes";
    else if (action === 'planning' || action === 'update-planning') sheetName = "Planeacion";
    else if (action === 'area') sheetName = "Areas";
    else if (action === 'travel-log' || action === 'update-travel-log') sheetName = "BitacorasViaje";
    else if (action === 'maintenance' || action === 'update-maintenance') sheetName = "Mantenimiento";
    else if (action === 'maintenance-type') sheetName = "TiposMantenimiento";
    else if (action === 'user' || action === 'update-user') {
      sheetName = "Usuarios";
      if (d.password) d.password = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, d.password));
    }
    
    const sheet = getOrCreateSheet(ss, sheetName);
    const headersInSheet = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    if (action.startsWith('update-')) {
      updateRowDynamic(sheet, d.id, d, headersInSheet);
    } else {
      appendRowDynamic(sheet, d, headersInSheet);
    }
    
    return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function appendRowDynamic(sheet, dataObj, headers) {
  const row = headers.map(h => {
    if (h === 'date_registered') return new Date();
    return dataObj[h] !== undefined ? dataObj[h] : "";
  });
  sheet.appendRow(row);
}

function updateRowDynamic(sheet, id, dataObj, headers) {
  const data = sheet.getDataRange().getValues();
  const idColIndex = headers.indexOf("id");
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idColIndex] === id) {
      headers.forEach((h, j) => {
        if (dataObj[h] !== undefined) {
          sheet.getRange(i + 1, j + 1).setValue(dataObj[h]);
        }
      });
      return true;
    }
  }
  return false;
}

function updateSettingValue(sheet, key, value) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
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
  }
  return sheet;
}

function getSheetData(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) return [];
  const range = sheet.getDataRange();
  const values = range.getValues();
  if (values.length < 2) return [];
  const headers = values.shift().map(h => h.toString().trim());
  return values.map((row) => {
    const obj = {};
    headers.forEach((h, i) => { if (h) obj[h] = row[i]; });
    return obj;
  });
}`.trim();

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Configuración del Sistema</h2>
          <p className="text-slate-500 font-medium mt-1.5">Ajustes del conector en la nube y seguridad de accesos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8 space-y-8">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary filled">palette</span>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Identidad Visual</h3>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre de la App</label>
                <input className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold outline-none focus:border-primary transition-all" value={localSettings['APP_NAME'] || ''} onChange={e => handleUpdate('APP_NAME', e.target.value)} />
              </div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Color Principal (Botones/Acentos)</label>
                  <div className="flex gap-4 items-center">
                    <input type="color" className="size-12 rounded-xl cursor-pointer border-none bg-transparent" value={localSettings['PRIMARY_COLOR'] || '#135bec'} onChange={e => handleUpdate('PRIMARY_COLOR', e.target.value)} />
                    <input className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-mono font-bold outline-none" value={localSettings['PRIMARY_COLOR'] || '#135bec'} onChange={e => handleUpdate('PRIMARY_COLOR', e.target.value)} />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Color del Menú (Fondo Lateral)</label>
                  <div className="flex gap-4 items-center">
                    <input type="color" className="size-12 rounded-xl cursor-pointer border-none bg-transparent" value={localSettings['SECONDARY_COLOR'] || '#0f172a'} onChange={e => handleUpdate('SECONDARY_COLOR', e.target.value)} />
                    <input className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-mono font-bold outline-none" value={localSettings['SECONDARY_COLOR'] || '#0f172a'} onChange={e => handleUpdate('SECONDARY_COLOR', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-[#0f172a] text-white flex items-center justify-between">
              <h3 className="text-sm font-black flex items-center gap-2 uppercase tracking-widest"><span className="material-symbols-outlined text-primary">bolt</span>Configuración Google Sheets</h3>
            </div>
            <div className="p-8 space-y-8">
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">URL /exec</label>
                <div className={`flex rounded-xl border transition-all ${saveStatus === 'error' ? 'border-rose-500 ring-4 ring-rose-50' : 'border-slate-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10'}`}>
                  <input className="flex-1 text-slate-900 text-sm font-bold p-4 bg-transparent outline-none" placeholder="https://script.google.com/macros/s/.../exec" value={serviceUrl} onChange={(e) => setServiceUrl(e.target.value)} />
                  <button onClick={handleSaveUrl} disabled={saveStatus === 'saving'} className="bg-primary text-white px-6 font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all">{saveStatus === 'saving' ? 'Guardando...' : 'Actualizar'}</button>
                </div>
              </div>
              <div className="bg-slate-900 rounded-xl p-6 shadow-inner">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Apps Script (v8.0 - Planeación Status)</h4>
                  <button onClick={() => { navigator.clipboard.writeText(appsScriptCode); alert("¡Copiado!"); }} className="bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black py-1.5 px-3 rounded-lg transition-colors border border-slate-700">COPIAR CÓDIGO</button>
                </div>
                <pre className="text-[10px] font-mono text-slate-400 overflow-x-auto max-h-48 custom-scrollbar leading-relaxed">{appsScriptCode}</pre>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm sticky top-28">
            <h3 className="text-lg font-black text-slate-900 mb-6">Seguridad V8.0</h3>
            <ul className="space-y-6">
              <li className="flex gap-4">
                <span className="size-6 bg-primary text-white text-[10px] font-black flex items-center justify-center rounded-full shrink-0">1</span>
                <div><p className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-1">Actualización BD</p><p className="text-[11px] font-bold text-slate-400 leading-relaxed">Se agregó campo 'status' a Planeación (Programado/Completado/Cancelado).</p></div>
              </li>
              <li className="flex gap-4">
                <span className="size-6 bg-primary text-white text-[10px] font-black flex items-center justify-center rounded-full shrink-0">2</span>
                <div><p className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-1">Importante</p><p className="text-[11px] font-bold text-slate-400 leading-relaxed">Debes actualizar el código en Apps Script para guardar el estado de los viajes.</p></div>
              </li>
              <li className="flex gap-4">
                <span className="size-6 bg-primary text-white text-[10px] font-black flex items-center justify-center rounded-full shrink-0">3</span>
                <div><p className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-1">Sincronización</p><p className="text-[11px] font-bold text-slate-400 leading-relaxed">Al guardar el nuevo script, la hoja "Planeacion" añadirá la columna automáticamente.</p></div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
