# Map Component Design Patterns

## Tile Provider
All maps use CARTO Voyager (light) tiles for consistency with the minimalist green theme:
```
https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png
```

## Marker Design Language
All markers use flat design with subtle shadows (no glow/neon effects):

### Incident Markers (circles)
- Critical: `#c62828` (deep red)
- High: `#e65100` (deep orange) 
- Normal: `#1b4d2c` (primary green)
- Completed: `#2e7d32` (accent green)
- Style: `12px circle, 2px white border, box-shadow: 0 1px 3px rgba(0,0,0,0.3)`

### Workshop/Taller Markers (squares)
- Color: `#1b4d2c` (primary green)
- Style: `14px square (3px radius), 2px white border, "T" label inside`

### Tech/Mechanic Markers (circles)
- Color: `#2e7d32` (accent green)
- Style: `12px circle, 2px white border`

### Client Location Markers  
- Color: `#c62828` (red, to signify emergency)
- Style: `14px circle, 2.5px white border`

### Draggable Pin
- Color: `#c62828` (red)
- Style: `16px circle, 2.5px white border, heavier shadow`

## Route Polylines
- Color: `#1b4d2c` (primary green)
- Outer shadow line: weight 5, opacity 0.15
- Inner route line: weight 3, opacity 0.7

## Map Overlay Panels (legends, toggles)
- White background, `border: 1px solid #dce3db`
- `border-radius: 8px`, `shadow-sm`
- Text: hardcoded hex values (not Tailwind classes) to avoid CSS override conflicts

## Files Modified
- `src/components/InteractiveMap.tsx`
- `src/components/MapaGlobal.tsx` 
- `src/components/KPIMap.tsx`
- `src/app/dashboard/taller/solicitud/[id]/SimpleMap.tsx`
- `src/app/dashboard/taller/kpis/KPIMap.tsx`
- `src/app/dashboard/cliente/reportar/DraggableLeafletMap.tsx`
- `src/app/dashboard/cliente/emergencia/[id]/TrackingMap.tsx`
