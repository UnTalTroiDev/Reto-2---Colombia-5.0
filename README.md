# SECOP Dashboard · Reto 1

Dashboard de análisis del dataset **SECOP Integrado** (`jbjy-vk9h`) de datos.gov.co.

## Estrategia

5.6 millones de filas. En lugar de descargarlas, este dashboard usa **agregaciones server-side**
de la API SODA v2 (`$select=count`, `sum`, `$group`, `$where`). El análisis de calidad de datos
corre sobre una **muestra** (5.000 filas por defecto) — suficiente estadísticamente para detectar
nulos, duplicados, placeholders y tipos inconsistentes.

## Páginas

- **/** — Resumen: métricas globales (total, valor contratado, entidades, proveedores) + top
  rankings + breakdowns por estado/tipo/modalidad/departamento/sector.
- **/calidad** — Reporte de calidad: score 0-100, issues por severidad, tabla por campo. Soporta
  `?size=20000` (máx 50.000) para muestras más grandes.
- **/explorar** — Tabla paginada con filtros (departamento, estado, búsqueda libre). Click en ID
  abre la URL del proceso.

## Comandos

```bash
npm install
npm run dev
```

Visitar http://localhost:3000.

## Variables de entorno

Opcional: `SOCRATA_APP_TOKEN` para mayor rate limit. Ver `.env.example`.
