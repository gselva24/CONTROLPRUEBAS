# Configuracion de clasp

El repositorio esta vinculado de forma local y privada al proyecto Apps Script.
El Script ID vive en `.clasp.json`, que esta excluido de Git.

## Archivos

- `apps-script/Code.gs`: codigo fuente controlado por Git.
- `apps-script/appsscript.json`: manifiesto del proyecto Apps Script.
- `.claspignore`: limita las subidas a esos dos archivos.
- `scripts/clasp.ps1`: ejecuta la instalacion local de clasp usando Node de
  Codex o una instalacion normal de Node.

## Comandos seguros de consulta

```powershell
.\scripts\clasp.ps1 status
.\scripts\clasp.ps1 versions
.\scripts\clasp.ps1 deployments
```

## Flujo para publicar

1. Revisar y probar los cambios locales.
2. Ejecutar `status` para confirmar los archivos incluidos.
3. Ejecutar `push` solamente despues de aprobar el cambio.
4. Crear una version con una descripcion.
5. Reutilizar el despliegue existente mediante `redeploy`.

```powershell
.\scripts\clasp.ps1 push
.\scripts\clasp.ps1 version "Descripcion del cambio"
.\scripts\clasp.ps1 deployments
.\scripts\clasp.ps1 redeploy ID_DESPLIEGUE NUMERO_VERSION "Descripcion"
```

`pull` puede reemplazar los archivos locales. Antes de usarlo, descargar el
proyecto remoto en una carpeta temporal y comparar ambas versiones.

Nunca guardar `.clasprc.json`, tokens OAuth o credenciales dentro del
repositorio.
