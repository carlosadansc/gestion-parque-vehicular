# Skill: Parque Vehicular DIF

## Proyecto
Aplicación React + Vite + TypeScript para gestión de parque vehicular del DIF La Paz, usa Google Sheets como base de datos.

## Comandos

```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm run preview
```

## Estructura
- `components/` - Componentes React (Dashboard, Vehicles, Drivers, Fuel, TravelLogs, Maintenance, Inspections, Incidents, Planning, Reports, Users, Settings)
- `services/` - Integración con Google Sheets
- `utils/` - Utilidades
- `types.ts` - Tipos TypeScript
- `constants.tsx` - Constantes globales
- `index.css` - Estilos globales con Tailwind v4
- `index.html` - HTML principal

## Convenciones
- Componentes en PascalCase (Vehicles.tsx, TravelLogs.tsx)
- Tipos en PascalCase con sufijo Type/Interface
- Estado con useState, efectos con useEffect
- Integración Google Sheets en services/googleSheets.ts
- CSS con Tailwind CSS v4 (configuración en index.css con @theme)

## Tailwind v4
El proyecto usa Tailwind v4 con configuración CSS-first:

```css
@import "tailwindcss";

@theme {
  --color-primary: #135bec;
  --color-secondary: #0f172a;
  /* ... más tokens */
}
```

## Tareas Comunes

### Agregar nuevo módulo
1. Crear componente en `components/`
2. Agregar ruta en App.tsx
3. Agregar entrada en Sidebar.tsx
4. Definir tipos en types.ts si es necesario

### Modificar modelo de datos
1. Actualizar types.ts
2. Actualizar services/googleSheets.ts
3. Actualizar constants.tsx si hay catálogos

### Generar build
```bash
npm run build
```

## Tech Stack
- React 19
- Vite 6
- TypeScript 5.8
- Tailwind CSS v4
- Recharts (gráficos)
- react-to-pdf (PDFs)
- Google Sheets API (BD)

## Google Sheets Integration

El proyecto usa Google Sheets como base de datos. Los datos se sincronizan automáticamente.

### Hojas esperadas:
- Vehiculos, Choferes, Combustible, Incidencias, Planeacion
- Areas, BitacorasViaje, Mantenimiento, TiposMantenimiento
- Revisiones, Ajustes, Usuarios

### Configuración:
1. Ir a Configuración en la app
2. Pegar código de Google Apps Script
3. Deploy como Web App
4. Copiar URL del deployment

## Usuario por Defecto
- Usuario: `admin`
- Contraseña: `Macaco123`

## Accesibilidad
El proyecto sigue las Web Interface Guidelines:
- aria-label en botones de icono
- aria-hidden en iconos decorativos
- focus-visible en inputs
- prefers-reduced-motion para animaciones
- color-scheme: light
