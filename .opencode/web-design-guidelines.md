# Web Interface Guidelines

Revisa el código UI para cumplimiento de guidelines de diseño web.

## Reglas

### Accesibilidad
- Botones de icono necesitan `aria-label`
- Controles de formulario necesitan `<label>` o `aria-label`
- Elementos interactivos necesitan handlers de teclado (`onKeyDown`/`onKeyUp`)
- Usar `<button>` para acciones, `<a>`/`<Link>` para navegación (no `<div onClick>`)
- Imágenes necesitan `alt` (o `alt=""` si es decorativo)
- Iconos decorativos necesitan `aria-hidden="true"`
- Actualizaciones async (toasts, validación) necesitan `aria-live="polite"`
- Usar HTML semántico (`<button>`, `<a>`, `<label>`, `<table>`) antes de ARIA
- Encabezados jerárquicos `<h1>`–`<h6>`; incluir skip link para contenido principal
- `scroll-margin-top` en anclas de encabezados

### Estados Focus
- Elementos interactivos necesitan focus visible: `focus-visible:ring-*`
- Nunca `outline-none` sin reemplazo de focus
- Usar `:focus-visible` sobre `:focus` (evitar ring en click)
- Group focus con `:focus-within` para controles compuestos

### Formularios
- Inputs necesitan `autocomplete` y `name` significativo
- Usar tipo correcto (`email`, `tel`, `url`, `number`) e `inputmode`
- Nunca bloquear paste (`onPaste` + `preventDefault`)
- Labels clickeables (`htmlFor` o envolviendo control)
- Checkboxes/radios: label + control comparten target único
- Botón submit habilitado hasta que inicia request; spinner durante request
- Errores inline junto a campos; enfocar primer error al submit
- Placeholders terminan con `…` y muestran ejemplo
- `autocomplete="off"` en campos no-auth para evitar triggers de password manager

### Animación
- Respetar `prefers-reduced-motion`
- Animar solo `transform`/`opacity` (compositor-friendly)
- Nunca `transition: all`—listar propiedades explícitamente
- Establecer `transform-origin` correcto

### Tipografía
- `…` no `...`
- Comillas rizadas `"` `"` no rectas `"`
- Espacios no quebrables: `10&nbsp;MB`, `⌘&nbsp;K`
- Estados loading terminan con `…`: `"Loading…"`, `"Saving…"`
- `font-variant-numeric: tabular-nums` para columnas de números
- Usar `text-wrap: balance` en encabezados

### Manejo de Contenido
- Contenedores de texto manejan contenido largo: `truncate`, `line-clamp-*`
- Flex children necesitan `min-w-0` para permitir truncamiento
- Manejar estados vacíos—no renderizar UI rota para strings/arrays vacíos

### Imágenes
- `<img>` necesita `width` y `height` explícitos (previene CLS)
- Imágenes below-fold: `loading="lazy"`
- Imágenes above-fold críticas: `priority` o `fetchpriority="high"`

### Performance
- Listas grandes (>50 items): virtualizar
- No lecturas de layout en render (`getBoundingClientRect`, etc)
- Preferir inputs uncontrolled
- Fonts críticos: preload con `font-display: swap`

### Navegación & Estado
- URL refleja estado—filtros, tabs, paginación en query params
- Links usan `<a>`/`<Link>` (soporta Cmd/Ctrl+click, middle-click)
- Deep-link todo estado con useState (considerar sync via URL)

### Touch & Interacción
- `touch-action: manipulation` (previene delay de double-tap)
- `overscroll-behavior: contain` en modals/drawers

### Dark Mode & Theming
- `color-scheme: dark` en `<html>` para temas oscuros
- `<meta name="theme-color">` igual al background

### Hydration Safety
- Inputs con `value` necesitan `onChange` (o usar `defaultValue`)
- Date/time rendering: guardar contra mismatch de hydration

### Hover & Estados Interactivos
- Botones/links necesitan estado `hover:`
- Estados interactivos aumentan contraste

### Anti-patterns (flaggear)
- `user-scalable=no` o `maximum-scale=1`
- `onPaste` con `preventDefault`
- `transition: all`
- `outline-none` sin reemplazo focus-visible
- Inline `onClick` navigation sin `<a>`
- `<div>` o `<span>` con click handlers (debería ser `<button>`)
- Imágenes sin dimensiones
- Arrays grandes `.map()` sin virtualización
- Form inputs sin labels
- Botones de icono sin `aria-label`
- Formatos hardcodeados de fecha/número (usar `Intl.*`)

## Formato de Output

Agrupar por archivo. Usar formato `file:line` (clickable en VS Code).

```
## src/Button.tsx

src/Button.tsx:42 - icon button missing aria-label
src/Button.tsx:18 - input lacks label

## src/Modal.tsx

✓ pass
```

Estado + ubicación. Explicación solo si fix no es obvio. Sin preamble.
