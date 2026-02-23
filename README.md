# Sistema de Gestión de Parque Vehicular - DIF La Paz

Aplicación web para la administración integral del parque vehicular del Sistema para el Desarrollo Integral de la Familia (DIF) La Paz, BCS.

## Características

- **Vehículos**: Registro y gestión de unidades con asignación de choferes
- **Choferes**: Administración de operadores y licencias
- **Combustible**: Control de gastos de gasolina/diesel
- **Incidentes**: Registro de accidentes y novedades
- **Mantenimiento**: Seguimiento de servicios y reparaciones
- **Bitácoras de Viaje**: Control diario de recorridos
- **Planificación**: Programación de viajes y asignaciones
- **Inspecciones**: Verificaciones periódicas de vehículos
- **Reportes**: Generación de informes y estadísticas

## Tech Stack

- React 19
- Vite
- TypeScript
- Tailwind CSS
- Recharts (gráficos)
- Google Sheets API (base de datos)

## Requisitos

- Node.js 18+
- Cuenta de Google Sheets configurada
- Clave API de Gemini (para funciones de IA)

## Instalación

```bash
npm install
```

## Google Sheets como Base de Datos

Este proyecto utiliza **Google Sheets** como base de datos para almacenar toda la información. Los datos se sincronizan automáticamente entre la aplicación y las hojas de cálculo.

### Hojas utilizadas:

- **Vehiculos**: Registro de unidades
- **Choferes**: Operadores y licencias
- **Combustible**: Historial de cargas de combustible
- **Incidencias**: Accidentes y novedades
- **Planeacion**: Programación de viajes
- **Areas**: Áreas de destino
- **BitacorasViaje**: Control de recorridos
- **Mantenimiento**: Servicios y reparaciones
- **TiposMantenimiento**: Catálogo de tipos de servicio
- **Revisiones**: Inspecciones de vehículos
- **Ajustes**: Configuración del sistema
- **Usuarios**: Cuentas de acceso

### Configuración

1. Crear archivo `.env.local` con las variables:

```
GEMINI_API_KEY=tu_clave_api
VITE_GOOGLE_SHEETS_URL=url_de_google_sheets
```

2. Copiar el código de Apps Script desde el módulo de Configuración en la aplicación (Settings > Configuración Google Sheets > COPIAR CÓDIGO)

3. Pegar el código en Google Apps Script y configurar como aplicación web

## Ejecución

```bash
npm run dev
```

## Estructura del Proyecto

```
├── components/          # Componentes de React
│   ├── Dashboard.tsx    # Panel principal
│   ├── Vehicles.tsx    # Gestión de vehículos
│   ├── Drivers.tsx     # Gestión de choferes
│   ├── Fuel.tsx        # Control de combustible
│   ├── Incidents.tsx   # Registro de incidentes
│   ├── Maintenance.tsx # Mantenimiento
│   ├── TravelLogs.tsx  # Bitácoras de viaje
│   ├── Planning.tsx    # Planificación
│   ├── Inspections.tsx # Inspecciones
│   ├── Reports.tsx     # Reportes
│   ├── Users.tsx       # Administración de usuarios
│   └── Settings.tsx    # Configuración
├── services/
│   └── googleSheets.ts # Integración con Google Sheets
├── types.ts             # Tipos TypeScript
├── constants.tsx       # Constantes y datos iniciales
└── App.tsx             # Componente principal
```

## Usuario por defecto

- Usuario: `admin`
- Contraseña: `Macaco123`

## Licencia

Privado - DIF La Paz
