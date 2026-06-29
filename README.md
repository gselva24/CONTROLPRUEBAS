# MES Comercializadora 503

Aplicacion web para registrar y consultar operaciones de planta: frutas, empaque, bodega/inventario e historial de trazabilidad.

## Estructura actual

- `index.html`: estructura visual de la aplicacion.
- `css/styles.css`: estilos propios que complementan Tailwind CDN.
- `js/app.js`: arranque de la aplicacion y cambio de vistas.
- `js/config.js`: URL publicada de Apps Script y configuracion basica.
- `js/state.js`: estado compartido en memoria para catalogos, lotes, historial e inventario.
- `js/api.js`: sincronizacion con Apps Script y operaciones compartidas de guardado.
- `js/modules/frutas.js`: flujo de lotes de frutas.
- `js/modules/empaque.js`: flujo de empaque.
- `js/modules/bodega.js`: flujo de bodega e inventario.
- `js/modules/historial.js`: tarjetas de historial y trazabilidad.
- `js/modules/admin.js`: acciones de gerente, catalogo y gestion de lotes.
- `apps-script/Code.gs`: backend de Google Apps Script para leer/escribir en Google Sheets.
- `docs/estructura-google-sheets.md`: referencia de hojas y columnas esperadas.

## Flujo de trabajo recomendado

1. Probar cambios primero en este repositorio.
2. Subir cambios a GitHub.
3. Publicar el frontend con GitHub Pages.
4. Copiar `apps-script/Code.gs` al editor de Google Apps Script y desplegar una nueva version web.
5. Actualizar `GOOGLE_SHEETS_URL` en `js/app.js` si cambia la URL del despliegue.

## Nota de arquitectura

La version actual separa HTML, CSS, JavaScript base y modulos por area sin cambiar la experiencia de uso. Los siguientes cambios funcionales deben hacerse principalmente en el modulo correspondiente y tocar `js/api.js`, `js/state.js`, `apps-script/Code.gs` o la documentacion solo cuando el cambio necesite datos compartidos, backend o nuevas columnas.
