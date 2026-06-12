# Anti-AI-Code Patterns for This Project

## Extracted Shared Code

### MapResizeHandler (was duplicated 7 times)
- **Before**: 30-line identical component copy-pasted in every map file
- **After**: Single shared hook at `src/hooks/useMapResize.tsx`
- **Usage**: `import { MapResizeHandler } from "@/hooks/useMapResize";`

## AI Text Patterns Cleaned

### Login Page (before → after)
- "Infraestructura Telemétrica de Emergencias" → removed entirely
- "Ecosistema de Auxilio Mecánico Integrado" → "Auxilio Mecánico en Tiempo Real"
- "Consola centralizada multi-inquilino de alta resiliencia..." → "Conecta conductores varados con talleres cercanos..."
- "Multi-Tenant / Aislamiento Total" → "24/7 / Disponibilidad"
- "Gemini AI / Clasificación Asíncrona" → "< 25 min / Tiempo de Arribo"
- "PWA Sync / Operación Sin Internet" → "GPS / Seguimiento en Vivo"
- "Credenciales de Prueba Rápida" → "Acceso Rápido de Prueba"

### Footers (all pages)
- "© 2026 Auxilio.AI • Row-Level Multi-Tenant GPRS Protection" → "© 2026 Auxilio.AI"

### Loading Messages (all pages)
- "Cargando Seguimiento Telemétrico..." → "Cargando..."
- "Cargando Asistente de Reporte..." → "Cargando..."
- "Cargando visualización del mapa de flota..." → "Cargando mapa..."
- "Cargando modulo cartografico..." → "Cargando mapa..."
- etc.

## Rules for Writing Non-AI Code
1. Loading messages should be short: "Cargando..." not "Cargando módulo cartográfico de alta precisión..."
2. Copy text should describe WHAT the user gets, not HOW the system works internally
3. Footer should be minimal — just brand name and year
4. Don't use technical architecture terms in user-facing text
5. Avoid buzzwords: "resiliencia", "telemétrico", "asíncrono", "multi-inquilino"
6. Extract repeated code into shared modules — 7 copies of the same function is a red flag
