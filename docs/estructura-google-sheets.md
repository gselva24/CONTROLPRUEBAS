# Estructura de Google Sheets

Esta es la base esperada por `apps-script/Code.gs`.

## Opciones

| Columna | Nombre |
| --- | --- |
| A | Fruta |

## Clientes

Catalogo editable por gerente para generar pedidos de cliente.

| Columna | Nombre |
| --- | --- |
| A | Codigo_Cliente |
| B | Nombre_Cliente |
| C | Visible_App |
| D | ID_Cliente |

`ID_Cliente` es un UUID tecnico. El codigo de cliente sigue siendo el dato visible.

## Productos

Catalogo general de productos fisicos y sus presentaciones.

| Columna | Nombre |
| --- | --- |
| A | ID_Producto |
| B | Nombre_Base |
| C | Presentacion |
| D | Area_Responsable |
| E | Producto_Base_Produccion |
| F | Visible_App |
| G | Fecha_Creacion |
| H | Unidad_Produccion |

Para productos del area `Empaque`, `Producto_Base_Produccion` se selecciona del
catalogo de frutas y debe coincidir con una fruta de `Opciones`. Para Planchas,
Tamales y cualquier otra area, el backend completa este campo con `Nombre_Base`;
el gerente no necesita ingresarlo.

`Unidad_Produccion` define la unidad con la que se reporta y descuenta el lote:
por ejemplo `unidad`, `lb`, `oz fl`, `kg` o `litro`. Los productos de Empaque
usan `lb` porque su fuente directa son los lotes de frutas. El contenido por
caja continua siendo declarado por el supervisor de Empaque en cada sesion.

## Productos_Cliente

Relacion entre un producto general y el nombre comercial usado por cada cliente.

| Columna | Nombre |
| --- | --- |
| A | ID_Producto_Cliente |
| B | ID_Cliente |
| C | Codigo_Cliente |
| D | ID_Producto |
| E | Nombre_Comercial |
| F | Visible_App |
| G | Fecha_Creacion |

## Pedidos_Cliente

Encabezado general del pedido/armado.

| Columna | Nombre |
| --- | --- |
| A | ID_Pedido |
| B | Fecha_Creacion |
| C | Cliente |
| D | Codigo_Cliente |
| E | Fecha_Carga |
| F | Estado_Pedido |
| G | Visible_App |
| H | Nota |
| I | ID_Pedido_Tecnico |
| J | ID_Cliente |

Estados de `Estado_Pedido`:

- `Abierto`
- `En proceso`
- `Completado`
- `Cancelado`

El ID se genera con formato `CODIGO-DDMM-###`, usando el codigo del cliente y la fecha de carga.

## Detalle_Pedido_Cliente

Lineas del armado creado por gerencia. Varias filas pueden compartir el mismo `ID_Pedido`.

| Columna | Nombre |
| --- | --- |
| A | ID_Pedido |
| B | Area |
| C | Producto |
| D | Presentacion |
| E | Unidad |
| F | Cantidad_Pedida |
| G | Cantidad_Completada |
| H | Estado_Detalle |
| I | Visible_App |
| J | Nota |
| K | ID_Linea |
| L | ID_Pedido_Tecnico |
| M | ID_Producto_Cliente |
| N | ID_Producto |
| O | Producto_Base_Produccion |

`Producto`, `Presentacion` y `Unidad` son una copia historica del catalogo al crear el pedido. Aunque el catalogo cambie despues, el pedido conserva el texto original. Todas las cantidades de pedido se guardan en cajas.

Estados de `Estado_Detalle`:

- `Pendiente`
- `Parcial`
- `Completado`
- `Cancelado`

## Pedidos_Fruta

| Columna | Nombre |
| --- | --- |
| A | ID |
| B | Fecha |
| C | Nombre_Pedido |
| D | Proveedor_Iniciales |
| E | Fruta |
| F | Peso_Neto_Entrada_Lb |
| G | Peso_Neto_Final_Lb |
| H | Rendimiento_Peso |
| I | Estado_Frutas |
| J | Peso_Averia_Lb |
| K | Peso_Desecho_Lb |
| L | Nota_Final |
| M | Estado_Empaque |
| N | Visible_App |
| O | Peso_Disponible_Empaque_Lb |
| P | ID_Lote_Tecnico |

Estados principales de `Estado_Frutas`:

- `En proceso`
- `Pausado`
- `Finalizado`

Estados principales de `Estado_Empaque`:

- `Pendiente`
- `Empacado Parcial`
- `Empacado Total`

## Tiempos_Procesado

| Columna | Nombre |
| --- | --- |
| A | ID |
| B | Nombre_Pedido |
| C | Fruta |
| D | FechaHora_Inicio |
| E | FechaHora_Finalizacion |
| F | Tiempo_Total_Min |
| G | Tiempo_Pausado_Min |
| H | Tiempo_Produccion_Min |
| I | Motivo_Pausa |
| J | Pausa_Activa_Desde |
| K | ID_Sesion_Produccion |

`Motivo_Pausa` guarda motivos concatenados cuando un lote se pausa varias veces.

## Empaque_Salidas

| Columna | Nombre |
| --- | --- |
| A | ID |
| B | Nombre_Pedido |
| C | Fruta |
| D | Fecha_Empaque |
| E | Cajas |
| F | Estado_Empaque |

## Empaque_Sesiones

Registro detallado de cada sesion de empaque vinculada a un pedido de cliente y a un lote de fruta.
La aplicacion usa estas filas para mostrar en Historial los pedidos en los que participo cada lote.

| Columna | Nombre |
| --- | --- |
| A | ID_Sesion_Empaque |
| B | Fecha |
| C | ID_Pedido_Cliente |
| D | Cliente |
| E | Codigo_Cliente |
| F | Area_Detalle |
| G | Producto_Detalle |
| H | Presentacion_Detalle |
| I | Unidad |
| J | Cajas_Hechas |
| K | Presentacion_Lb |
| L | ID_Lote_Fruta |
| M | Fruta |
| N | Estado_Uso_Lote |
| O | Sobrante_Lote_Lb |
| P | Responsable |
| Q | Nota |
| R | Estado_Registro |
| S | Fecha_Reversion |
| T | Motivo_Reversion |
| U | ID_Linea |
| V | ID_Asignacion |
| W | ID_Lote_Tecnico |
| X | ID_Pedido_Tecnico |
| Y | Tipo_Fuente |
| Z | ID_Produccion |
| AA | Codigo_Produccion |
| AB | Categoria_Unidades |
| AC | Unidades_Por_Caja |
| AD | Unidades_Consumidas |
| AE | Cantidad_Por_Caja |
| AF | Cantidad_Fuente_Anterior |
| AG | Cantidad_Fuente_Sobrante |
| AH | Cantidad_Fuente_Consumida |
| AI | Unidad_Fuente |
| AJ | ID_Producto_Fuente |
| AK | ID_Producto_Destino |

Para una linea del area `Empaque`, `Producto_Base_Produccion` debe coincidir con la fruta del lote seleccionado. El nombre comercial puede ser diferente para cada cliente.

Para lineas de Planchas y Tamales, Empaque muestra todos los lotes disponibles
del area responsable. No exige coincidencia de cliente, nombre comercial ni
`ID_Producto`: el supervisor elige la fuente y la linea de destino. La relacion
queda auditada mediante `ID_Produccion`, `ID_Linea`, `ID_Producto_Fuente` e
`ID_Producto_Destino`.

`Estado_Registro` usa `Activa` o `Revertida`. Cuando se cancela o elimina un pedido, sus sesiones activas se marcan como revertidas, se registra la fecha y el motivo, y el peso asignado se reincorpora al lote sin borrar la trazabilidad original.

El peso reincorporado se calcula como `Cajas_Hechas * Presentacion_Lb` y nunca puede superar `Peso_Neto_Final_Lb` del lote. Despues se recalculan `Estado_Empaque`, `Peso_Disponible_Empaque_Lb`, `Empaque_Salidas` y `Control_Materia_Prima`.

Los modulos futuros que asignen otros productos a pedidos deben guardar un registro de asignacion con estado activo/revertido y agregar su adaptador de reincorporacion dentro de `revertirAsignacionesPedidoCliente_`. Actualmente Empaque admite lotes de `Pedidos_Fruta` y reportes de `Produccion_Areas`.

`Tipo_Fuente` distingue `Fruta` y `Produccion`. Las columnas `Categoria_Unidades`,
`Unidades_Por_Caja` y `Unidades_Consumidas` se conservan por compatibilidad con
registros anteriores. Las columnas genericas AE:AK son las autoritativas para
nuevas sesiones y permiten manejar unidades, libras, onzas fluidas u otras
medidas sin cambiar el esquema.

Al cancelar un pedido, `Cantidad_Fuente_Consumida` se reincorpora a la fuente.
El valor nunca puede superar la cantidad fisica original y la sesion permanece
como `Revertida` para conservar trazabilidad.

## Produccion_Areas

Reportes terminados de Planchas y Tamales. No contienen `ID_Pedido`; Empaque
realiza posteriormente la asignacion.

| Columna | Nombre |
| --- | --- |
| A | ID_Produccion |
| B | Codigo_Produccion |
| C | Fecha |
| D | Area |
| E | ID_Cliente |
| F | Codigo_Cliente |
| G | Cliente |
| H | ID_Producto |
| I | ID_Producto_Cliente |
| J | Producto |
| K | Presentacion |
| L | Unidades_Funcionales |
| M | Unidades_Averia |
| N | Total_Fisico |
| O | Funcionales_Disponibles |
| P | Averia_Disponible |
| Q | Estado_Disponibilidad |
| R | Responsable |
| S | Nota |
| T | Visible_App |
| U | Unidad_Medida |
| V | Cantidad_Disponible |

`Total_Fisico` es la suma de cantidad funcional y averia. `Unidad_Medida`
proviene del producto general. `Cantidad_Disponible` es el saldo autoritativo
que Empaque modifica al declarar uso total o parcial.

`Funcionales_Disponibles` y `Averia_Disponible` se conservan como columnas
historicas para no romper registros anteriores; las nuevas asignaciones no
separan el consumo por categoria. Los estados de disponibilidad son
`Disponible`, `Parcial` y `Agotado`.

## Asignaciones_Pedido

Relacion tecnica entre una linea de pedido y cada lote o recurso utilizado para completarla. Una linea puede tener muchas asignaciones.

| Columna | Nombre |
| --- | --- |
| A | ID_Asignacion |
| B | Fecha |
| C | ID_Pedido_Tecnico |
| D | ID_Linea |
| E | ID_Lote_Tecnico |
| F | ID_Sesion |
| G | Area |
| H | Cantidad |
| I | Unidad |
| J | Estado_Asignacion |
| K | Fecha_Reversion |
| L | Motivo_Reversion |
| M | ID_Pedido_Visible |
| N | ID_Lote_Visible |
| O | Cantidad_Fuente_Consumida |
| P | Unidad_Fuente |
| Q | ID_Producto_Fuente |
| R | ID_Producto_Destino |

Las columnas H:I describen la salida terminada que avanza el pedido, normalmente
cajas. Las columnas O:R describen el recurso de origen consumido. Esta separacion
evita mezclar "cajas completadas" con "unidades/libras/onzas retiradas" y se
traduce directamente a claves foraneas y cantidades en PostgreSQL.

## Inventario_Bodega

| Columna | Nombre |
| --- | --- |
| A | ID |
| B | Producto |
| C | Categoria |
| D | Unidad |
| E | Stock |
| F | Ultima_Actualizacion |
| G | Visible_App |
| H | ID_Item_Tecnico |

## Movimientos_Bodega

| Columna | Nombre |
| --- | --- |
| A | Fecha |
| B | Tipo_Movimiento |
| C | ID |
| D | Producto |
| E | Categoria |
| F | Unidad |
| G | Cantidad |
| H | Stock_Anterior |
| I | Stock_Nuevo |
| J | Responsable |
| K | Nota |
| L | ID_Movimiento |

## Estructuras futuras

La migracion crea tambien las hojas vacias `Ubicaciones`, `Cargas_Contenedor` y `Detalle_Carga_Contenedor`. Estas reservan los UUID y relaciones que usaran el futuro modulo de cuarto frio y carga, pero todavia no modifican la operacion actual.

## Control_Materia_Prima

Hoja de resumen reconstruible desde los registros operativos.

| Columna | Nombre |
| --- | --- |
| A | ID |
| B | Nombre_Pedido |
| C | Fruta |
| D | Total_Peso_Procesado_Lb |
| E | Total_Cajas |
| F | Rendimiento_Cajas_Por_Lb |

Los valores de esta hoja se usan para mostrar libras y cajas procesadas en las tarjetas de historial.

## Migracion tecnica

La funcion publica `migrarEstructuraTecnica()` puede ejecutarse manualmente desde Apps Script. Tambien se ejecuta automaticamente una vez al usar la nueva version.

La migracion:

- agrega columnas al final, sin desplazar las actuales;
- genera UUID solo cuando faltan;
- crea asignaciones para sesiones de Empaque existentes;
- completa `Unidad_Produccion`, `Unidad_Medida` y `Cantidad_Disponible` en registros anteriores;
- rellena relaciones genericas de consumo cuando pueden reconstruirse;
- puede repetirse sin duplicar identificadores ni asignaciones.
