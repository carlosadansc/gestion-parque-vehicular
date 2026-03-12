---
name: parque-vehicular-app
description: Mantenimiento y extension del sistema de Gestion de Parque Vehicular (React + Vite + Google Sheets). Usar cuando se pidan cambios en modulos funcionales (Vehiculos, Choferes, Combustible, Bitacoras, Mantenimiento, Revisiones, Incidentes, Reportes, Usuarios, Configuracion), validaciones de datos, sincronizacion con Google Sheets o formatos imprimibles.
---

# Parque Vehicular App Skill

## Flujo Base

1. Ubicar el modulo en `App.tsx`:
   - Revisar `case View.*` y el componente renderizado.
2. Trazar impacto de datos:
   - Tipos en `types.ts`
   - Validacion en `App.tsx` (`validate*Payload`)
   - Persistencia en `services/googleSheets.ts` (`pushData`, `fetchData`)
3. Aplicar cambio en UI del componente objetivo (`components/*.tsx`).
4. Validar compilacion con:
   - `npm run build`

## Mapa Rapido del Proyecto

- Entrada y orquestacion: `App.tsx`
- Tipos compartidos: `types.ts`
- Sincronizacion backend: `services/googleSheets.ts`
- Modulos principales: `components/`
  - `Vehicles.tsx`, `Drivers.tsx`, `Fuel.tsx`, `TravelLogs.tsx`
  - `Maintenance.tsx`, `Inspections.tsx`, `Incidents.tsx`
  - `Reports.tsx`, `Users.tsx`, `Settings.tsx`

## Regla de Cambios de Datos

Si agregas o cambias un campo funcional:

1. Actualizar interfaz en `types.ts`.
2. Ajustar validacion correspondiente en `App.tsx`.
3. Ajustar lectura/escritura en `services/googleSheets.ts`.
4. Reflejar campo en formularios/tabla/impresion del componente.
5. Actualizar el script de Google Sheets para copiar/pegar en `components/Settings.tsx` (bloque `appsScriptCode`, version y notas de cambios).

No dejar cambios parciales (solo UI o solo tipo).

Si cambia la estructura de hojas/columnas en Google Sheets, tambien debe reflejarse en ese script dentro de la vista de `Settings`.

## Regla para Formatos Imprimibles

- Mantener IDs de impresion unicos (`#inspection-printable`, `#maintenance-printable`, `#daily-revision-printable`, etc.).
- En `@media print`, asegurar:
  - ocultar UI no imprimible,
  - visibilidad solo del contenedor imprimible,
  - control de saltos de pagina para formatos multihoja.
- Si hay vista previa en overlay (`fixed`), ajustar a layout estatico en print para evitar corte de paginas.

## Convenciones de Este Repo

- Mantener etiquetas de negocio en espanol.
- Evitar tocar modulos no relacionados con la solicitud.
- Usar fallback de logo institucional si el recurso configurado falla.

## Checklist de Entrega

1. Cambio funcional aplicado en modulo objetivo.
2. Sincronizacion y tipos consistentes.
3. `npm run build` exitoso.
4. Resumen final con archivos tocados y comportamiento resultante.
