# Tailwind Design System (v4)

Build production-ready design systems with Tailwind CSS v4.

> **Nota**: Este skill está adaptado para Tailwind CSS v4. Tu proyecto usa Tailwind CDN (v3.x), algunos conceptos pueden variar.

## Configuración CSS-first (v4)

```css
@import "tailwindcss";

@theme {
  --color-primary: #135bec;
  --color-secondary: #0f172a;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-2xl: 1rem;
  
  --animate-fade-in: fade-in 0.2s ease-out;
  --animate-slide-in: slide-in 0.3s ease-out;
  
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slide-in {
    from { transform: translateY(-0.5rem); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
}
```

## Conceptos Clave

### Jerarquía de Tokens

```
Brand Tokens (abstracto)
    └── Semantic Tokens (propósito)
        └── Component Tokens (específico)

Ejemplo:
    #135bec → --color-primary → bg-primary
```

### Arquitectura de Componentes

```
Base styles → Variants → Sizes → States → Overrides
```

## Patrones

### Botones con CVA

```typescript
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white hover:bg-primary/90',
        destructive: 'bg-destructive text-white hover:bg-destructive/90',
        outline: 'border border-border bg-background hover:bg-accent',
        ghost: 'hover:bg-accent',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)
```

### Utilidad cn()

```typescript
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## Best Practices

### Do's
- Usar `@theme` para configuración CSS-first
- Usar tokens semánticos: `bg-primary` no `bg-blue-500`
- Usar `size-*` como shorthand para `w-* h-*`
- Añadir accesibilidad (ARIA, focus states)

### Don'ts
- No usar valores arbitrarios - extender `@theme`
- No hardcodear colores - usar tokens semánticos
- No olvidar dark mode - probar ambos temas
- No usar `transition: all` - listar propiedades explícitamente

## Recursos
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [CVA Documentation](https://cva.style/docs)
