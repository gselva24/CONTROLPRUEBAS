# Flujo de productos y pedidos

## Catalogo general

El gerente registra una sola vez el producto fisico:

- nombre base;
- presentacion;
- area responsable;
- producto base de produccion, si pertenece a Empaque;
- unidad de produccion, si pertenece a Planchas o Tamales.

Ejemplo: `Nance`, presentacion `12x15 oz.`, area `Empaque`, base de produccion `Nance`.

La base de produccion solo se selecciona manualmente para `Empaque`, porque debe
identificar la fruta de `Pedidos_Fruta`. En Planchas, Tamales y otras areas se
guarda automaticamente el nombre base. La unidad (`unidad`, `oz fl`, `lb`,
etc.) acompana el lote desde el reporte hasta su uso en Empaque.

## Nombre comercial por cliente

El gerente selecciona un cliente y relaciona el producto general con el nombre que aparecera en sus pedidos.

Un mismo producto puede llamarse de forma diferente para clientes distintos. La relacion tiene su propio `ID_Producto_Cliente`.

## Creacion del pedido

1. Seleccionar cliente.
2. Seleccionar el modulo responsable: Empaque, Tamales o Planchas.
3. Seleccionar uno de los productos configurados para ese cliente y modulo.
4. Revisar presentacion, area y producto base mostrados por la aplicacion.
5. Ingresar cantidad de cajas.
6. Agregar todas las lineas necesarias y guardar.

La aplicacion copia los datos del catalogo a la linea y genera `ID_Linea`.

## Empaque con varios lotes

Empaque selecciona una linea mediante `ID_Linea`. Solo aparecen lotes cuya fruta coincide con `Producto_Base_Produccion`.

Cada sesion:

- suma cajas a la misma linea;
- puede usar un lote completo o parcial;
- crea un `ID_Asignacion`;
- conserva `ID_Lote_Tecnico`, `ID_Linea` e `ID_Pedido_Tecnico`.

La linea permanece disponible hasta completar la cantidad de cajas pedida, por lo que pueden utilizarse varios lotes y varias sesiones.

## Produccion de Planchas y Tamales

Los supervisores reportan la produccion terminada una sola vez. El reporte
selecciona cliente y producto, pero no selecciona pedido ni actualiza su avance.

Cada reporte conserva:

- cantidad funcional reportada;
- cantidad de averia;
- total fisico producido.

El sistema genera automaticamente el identificador y codigo de produccion. El
reporte se convierte en un lote con `Unidad_Medida` y `Cantidad_Disponible`.

Empaque selecciona la linea del pedido. Si la linea pertenece a Tamales, muestra
todos los lotes disponibles de Tamales; si pertenece a Planchas, muestra todos
los de Planchas. No se bloquea por cliente ni por nombre de producto: el
supervisor decide la relacion operativa y el sistema guarda los identificadores
de fuente y destino.

En cada sesion se registra:

- presentacion o contenido por caja;
- cajas hechas;
- uso total o parcial del lote;
- cantidad sobrante declarada y unidad;
- responsable y nota.

La cantidad consumida real es `Cantidad_Fuente_Anterior -
Cantidad_Fuente_Sobrante`. Solo el registro de Empaque incrementa
`Cantidad_Completada` en la linea del pedido.

## Compatibilidad

Los pedidos y sesiones anteriores conservan los campos de texto y reciben UUID durante la migracion. Los pedidos nuevos usan los catalogos y relaciones tecnicas.
