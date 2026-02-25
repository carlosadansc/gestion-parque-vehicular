# Sistema de Gestión de Parque Vehicular - DIF La Paz

Aplicación web para la administración integral del parque vehicular del Sistema para el Desarrollo Integral de la Familia (DIF) La Paz, BCS.

## Tabla de Contenidos

- [Características](#características)
- [Tech Stack](#tech-stack)
- [Requisitos Previos](#requisitos-previos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Ejecución](#ejecución)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Módulos del Sistema](#módulos-del-sistema)
- [Google Sheets como Base de Datos](#google-sheets-como-base-de-datos)
- [Configuración de Google Apps Script](#configuración-de-google-apps-script)
- [Usuario por Defecto](#usuario-por-defecto)
- [Capturas de Pantalla](#capturas-de-pantalla)
- [Licencia](#licencia)

---

## Características

### Gestión Vehicular
- **Vehículos**: Registro completo de unidades vehiculares con asignación de choferes, mantenimiento y seguimiento de estado
- **Choferes**: Administración de operadores con control de licencias y vigencia

### Control Operativo
- **Combustible**: Control detallado de gastos de gasolina/diesel por vehículo
- **Bitácoras de Viaje**: Registro diario de recorridos con origen, destino y propósito
- **Planificación**: Programación de viajes y asignaciones vehiculares

### Mantenimiento y Seguridad
- **Mantenimiento**: Seguimiento de servicios, reparaciones y preventivas
- **Inspecciones**: Verificaciones periódicas de vehículos (condiciones, documentación)
- **Incidentes**: Registro de accidentes, fallas y novedades

### Administración
- **Reportes**: Generación de informes y estadísticas con visualizaciones
- **Usuarios**: Gestión de cuentas de acceso al sistema
- **Configuración**: Ajustes globales del sistema

---

## Tech Stack

| Tecnología | Propósito |
|------------|-----------|
| **React 19** | Framework UI |
| **Vite** | Build tool y servidor de desarrollo |
| **TypeScript** | Tipado estático |
| **Recharts** | Gráficos y visualizaciones |
| **react-to-pdf** | Generación de PDFs |
| **Google Sheets API** | Base de datos |

---

## Requisitos Previos

- **Node.js** 18+ 
- **Cuenta de Google** (para Google Sheets)

---

## Instalación

```bash
# Clonar el repositorio
git clone <url-del-repositorio>
cd gestion-de-parque-vehicular-ft-google-sheets

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

---

## Configuración

### Configurar Google Sheets

1. Acceder a **Configuración** dentro de la aplicación
2. Ir a **Configuración Google Sheets**
3. Copiar el código de Google Apps Script proporcionado
4. Crear un nuevo proyecto en [Google Apps Script](https://script.google.com/)
5. Pegar el código y guardar
6. Implementar como aplicación web (Deploy > New deployment)
7. Copiar la URL del deployment (formato: `https://script.google.com/macros/s/.../exec`)
8. Pegar la URL en la configuración de la aplicación

---

## Ejecución

```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm run preview
```

---

## Estructura del Proyecto

```
gestion-de-parque-vehicular-ft-google-sheets/
├── components/                 # Componentes React
│   ├── Dashboard.tsx          # Panel principal con estadísticas
│   ├── Drivers.tsx            # Gestión de choferes
│   ├── Fuel.tsx               # Control de combustible
│   ├── Header.tsx             # Encabezado de la aplicación
│   ├── Incidents.tsx          # Registro de incidentes
│   ├── Inspections.tsx        # Inspecciones vehiculares
│   ├── Maintenance.tsx         # Mantenimiento de unidades
│   ├── Planning.tsx           # Planificación de viajes
│   ├── Reports.tsx            # Generación de reportes
│   ├── Settings.tsx           # Configuración del sistema
│   ├── Sidebar.tsx            # Menú de navegación
│   ├── TravelLogs.tsx         # Bitácoras de viaje
│   ├── Users.tsx              # Administración de usuarios
│   └── Vehicles.tsx           # Gestión de vehículos
├── services/                   # Servicios externos
│   └── googleSheets.ts        # Integración con Google Sheets
├── utils/                      # Utilidades
│   └── password.ts            # Funciones de contraseña
├── public/                     # Recursos estáticos
│   └── images/
│       └── logo-dif.png       # Logo de la institución
├── dist/                       # Build de producción
├── App.tsx                     # Componente principal
├── constants.tsx              # Constantes y datos predefinidos
├── index.html                  # Template HTML
├── index.tsx                   # Punto de entrada
├── metadata.json               # Metadatos del proyecto
├── package.json                # Dependencias
├── tsconfig.json              # Configuración TypeScript
└── vite.config.ts             # Configuración Vite
```

---

## Módulos del Sistema

### Dashboard
Panel principal que muestra:
- Resumen del parque vehicular (total vehículos, activos, en mantenimiento)
- Gráficos de consumo de combustible
- Actividad reciente
- Indicadores clave de gestión

### Vehículos
- Alta, edición y eliminación de vehículos
- Información: marca, modelo, año, placa, número de serie
- Asignación de chofer
- Estado actual (activo, mantenimiento, dado de baja)
- Historial de mantenimiento

### Choferes
- Registro de operadores
- Control de licencias (número, tipo, vigencia)
- Historial de viajes asignados

### Combustible
- Registro de cargas de combustible
- Costo por litro y total
- Kilometraje al momento de carga
- Asignación por vehículo

### Bitácoras de Viaje
- Registro diario de recorridos
- Origen y destino
- Propósito del viaje
- Kilometraje inicial y final
- Chofer asignado

### Planificación
- Programación de viajes futuros
- Asignación de vehículo y chofer
- Estado de la planificación (pendiente, completado, cancelado)

### Mantenimiento
- Registro de servicios y reparaciones
- Tipos de mantenimiento (preventivo, correctivo)
- Costo y proveedor
- Kilometraje al momento del servicio

### Inspecciones
- Verificaciones periódicas de vehículos
- Checklist de condiciones físicas
- Revisión de documentación
- Estado de neumáticos, líquidos, etc.

### Incidentes
- Registro de accidentes y fallas
- Descripción del incidente
- Daños reportados
- Acciones tomadas

### Reportes
- Generación de informes personalizados
- Reportes de consumo de combustible
- Reportes de mantenimiento
- Reportes de utilización vehicular
- Exportación a PDF

### Usuarios
- Creación de cuentas de usuario
- Roles y permisos
- Control de acceso

### Configuración
- Configuración de Google Sheets
- Parámetros del sistema
- Catálogos (áreas, tipos de mantenimiento)

---

## Google Sheets como Base de Datos

Este proyecto utiliza **Google Sheets** como base de datos. Los datos se sincronizan automáticamente entre la aplicación y las hojas de cálculo de Google.

### Hojas Requeridas

| Hoja | Descripción |
|------|-------------|
| `Vehiculos` | Registro de unidades |
| `Choferes` | Operadores y licencias |
| `Combustible` | Historial de cargas |
| `Incidencias` | Accidentes y novedades |
| `Planeacion` | Programación de viajes |
| `Areas` | Áreas de destino |
| `BitacorasViaje` | Control de recorridos |
| `Mantenimiento` | Servicios y reparaciones |
| `TiposMantenimiento` | Catálogo de servicios |
| `Revisiones` | Inspecciones |
| `Ajustes` | Configuración del sistema |
| `Usuarios` | Cuentas de acceso |

---

## Configuración de Google Apps Script

El código de Apps Script se encuentra en la sección **Configuración** de la aplicación. Copia el código y pégalo en Google Apps Script para permitir la comunicación con Google Sheets.

### Pasos:
1. Ir a [Google Apps Script](https://script.google.com/)
2. Crear nuevo proyecto
3. Pegar el código completoar el
4. Guard proyecto
5. Deploy > New deployment
6. Seleccionar tipo: **Web app**
7. Ejecutar como: **Me**
8. Quién tiene acceso: **Anyone** (o Anyone with Google Account)
9. Deploy
10. Copiar la URL del deployment

---

## Usuario por Defecto

| Campo | Valor |
|-------|-------|
| Usuario | `admin` |
| Contraseña | `Macaco123` |

> **Nota**: Se recomienda cambiar la contraseña después del primer acceso.

---

## Capturas de Pantalla

Ver carpeta `screenshots/` para ver ejemplos de cada módulo:
- Dashboard
- Gestión de vehículos
- Bitácoras de viaje
- Reportes
- Inspecciones
- Y más...

---

## Licencia

Privado - DIF La Paz

---

## Soporte

Para issues o sugerencias, contactar al equipo de desarrollo.
