
export interface SyncData {
  vehicles: any[];
  drivers: any[];
  fuelEntries: any[];
  fuelAcquisitions?: any[];
  fuelDeliveries?: any[];
  incidents: any[];
  plannings?: any[];
  areas?: any[];
  travelLogs?: any[];
  maintenanceRecords?: any[];
  settings?: any[];
  users?: any[];
  inspections?: any[];
  maintenanceTypes?: any[];
  incidentTypes?: any[];
  suppliers?: any[];
  vehicleRequests?: any[];
}

const configuredServiceUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL?.trim() || '';

class GoogleSheetsService {
  private serviceUrl: string = configuredServiceUrl;
  private lastErrorMessage = '';


  getServiceUrl() {
    return this.serviceUrl;
  }

  getLastError() {
    return this.lastErrorMessage;
  }

  isEnvironmentConfigured() {
    return Boolean(configuredServiceUrl);
  }

  isValidScriptUrl() {
    return this.serviceUrl.includes('script.google.com/macros/s/') && this.serviceUrl.includes('/exec');
  }

  async fetchData(): Promise<SyncData | null> {
    if (!this.serviceUrl || !this.isValidScriptUrl()) return null;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(this.serviceUrl, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Servidor respondió con estado: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async pushData(type: 'fuel' | 'update-fuel' | 'fuel-acquisition' | 'update-fuel-acquisition' | 'fuel-delivery' | 'update-fuel-delivery' | 'incident' | 'update-incident' | 'vehicle' | 'delete-vehicle' | 'driver' | 'planning' | 'update-planning' | 'area' | 'delete-area' | 'travel-log' | 'update-travel-log' | 'vehicle-request' | 'update-vehicle-request' | 'update-vehicle' | 'update-driver' | 'maintenance' | 'update-maintenance' | 'user' | 'update-user' | 'update-setting' | 'inspection' | 'update-inspection' | 'maintenance-type' | 'update-maintenance-type' | 'delete-maintenance-type' | 'incident-type' | 'update-incident-type' | 'supplier' | 'update-supplier' | 'delete-supplier', payload: any): Promise<boolean> {
    this.lastErrorMessage = '';
    if (!this.serviceUrl || !this.isValidScriptUrl()) {
      this.lastErrorMessage = 'La URL de Apps Script no está configurada o no es válida.';
      return false;
    }
    
    try {
      const response = await fetch(this.serviceUrl, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ 
          action: type, 
          data: payload,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        this.lastErrorMessage = `El servidor respondió con HTTP ${response.status}.`;
        console.error(this.lastErrorMessage);
        return false;
      }

      const responseText = await response.text();
      if (!responseText) return true;

      try {
        const parsed = JSON.parse(responseText);
        if (parsed?.status && parsed.status !== 'success') {
          this.lastErrorMessage = parsed?.message || parsed?.status || 'Apps Script rechazó la operación.';
          console.error('Error devuelto por Apps Script:', this.lastErrorMessage);
          return false;
        }
      } catch (_) {
        if (responseText.trim().startsWith('<')) {
          const plainText = responseText
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          this.lastErrorMessage = plainText.slice(-500) || 'Apps Script devolvió una respuesta inválida.';
          console.error('Respuesta inválida de Apps Script:', this.lastErrorMessage);
          return false;
        }
      }

      return true;
    } catch (error) {
      this.lastErrorMessage = error instanceof Error ? error.message : 'No se pudo conectar con Apps Script.';
      console.error('Error al enviar datos:', this.lastErrorMessage);
      return false;
    }
  }
}

export const googleSheets = new GoogleSheetsService();
