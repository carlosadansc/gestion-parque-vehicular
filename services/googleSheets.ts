
export interface SyncData {
  vehicles: any[];
  drivers: any[];
  fuelEntries: any[];
  incidents: any[];
  plannings?: any[];
  areas?: any[];
  travelLogs?: any[];
  maintenanceRecords?: any[];
  settings?: any[];
  users?: any[];
  inspections?: any[];
  maintenanceTypes?: any[];
  suppliers?: any[];
}

class GoogleSheetsService {
  private serviceUrl: string = localStorage.getItem('fleet_pro_service_url') || '';

  setServiceUrl(url: string) {
    const cleanUrl = url.trim();
    this.serviceUrl = cleanUrl;
    localStorage.setItem('fleet_pro_service_url', cleanUrl);
  }

  getServiceUrl() {
    return this.serviceUrl;
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

  async pushData(type: 'fuel' | 'update-fuel' | 'incident' | 'update-incident' | 'vehicle' | 'driver' | 'planning' | 'update-planning' | 'area' | 'delete-area' | 'travel-log' | 'update-travel-log' | 'update-vehicle' | 'update-driver' | 'maintenance' | 'update-maintenance' | 'user' | 'update-user' | 'update-setting' | 'inspection' | 'update-inspection' | 'maintenance-type' | 'supplier' | 'update-supplier', payload: any): Promise<boolean> {
    if (!this.serviceUrl || !this.isValidScriptUrl()) {
      return false;
    }
    
    try {
      await fetch(this.serviceUrl, {
        method: 'POST',
        mode: 'no-cors', 
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
      
      return true;
    } catch (error) {
      console.error('Error al enviar datos:', error);
      return false;
    }
  }
}

export const googleSheets = new GoogleSheetsService();
