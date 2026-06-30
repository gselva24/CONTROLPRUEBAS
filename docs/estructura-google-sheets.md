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

Para productos del area `Empaque`, `Producto_Base_Produccion` debe coincidir con una fruta de `Opciones`. El peso por caja no se guarda todavia; Empaque mantiene su ingreso manual.

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

Para una linea del area `Empaque`, `Producto_Base_Produccion` debe coincidir con la fruta del lote seleccionado. El nombre comercial puede ser diferente para cada cliente.

`Estado_Registro` usa `Activa` o `Revertida`. Cuando se cancela o elimina un pedido, sus sesiones activas se marcan como revertidas, se registra la fecha y el motivo, y el peso asignado se reincorpora al lote sin borrar la trazabilidad original.

El peso reincorporado se calcula como `Cajas_Hechas * Presentacion_Lb` y nunca puede superar `Peso_Neto_Final_Lb` del lote. Despues se recalculan `Estado_Empaque`, `Peso_Disponible_Empaque_Lb`, `Empaque_Salidas` y `Control_Materia_Prima`.

Los modulos futuros que asignen otros productos a pedidos deben guardar un registro de asignacion con estado activo/revertido y agregar su adaptador de reincorporacion dentro de `revertirAsignacionesPedidoCliente_`. Actualmente el flujo operativo conectado es Empaque con lotes de `Pedidos_Fruta`.

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
- puede repetirse sin duplicar identificadores ni asignaciones.
