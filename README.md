# MES Comercializadora 503

Aplicacion web para registrar y consultar operaciones de planta: frutas, empaque, bodega/inventario e historial de trazabilidad.

## Estructura actual

- `index.html`: estructura visual de la aplicacion.
- `css/styles.css`: estilos propios que complementan Tailwind CDN.
- `js/app.js`: logica del frontend, conexion con Apps Script y manejo de vistas.
- `apps-script/Code.gs`: backend de Google Apps Script para leer/escribir en Google Sheets.
- `docs/estructura-google-sheets.md`: referencia de hojas y columnas esperadas.

## Flujo de trabajo recomendado

1. Probar cambios primero en este repositorio.
2. Subir cambios a GitHub.
3. Publicar el frontend con GitHub Pages.
4. Copiar `apps-script/Code.gs` al editor de Google Apps Script y desplegar una nueva version web.
5. Actualizar `GOOGLE_SHEETS_URL` en `js/app.js` si cambia la URL del despliegue.

## Nota de arquitectura

La version actual ya separa HTML, CSS y JavaScript sin cambiar la experiencia de uso. El siguiente paso natural es dividir `js/app.js` por modulo: frutas, empaque, bodega, historial, administracion y API.
