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
La aplicacion usa estas filas para mostrar en Historial el avance del pedido y todos los pedidos en los que participo cada lote.

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

Para una linea del area `Empaque`, `Producto_Detalle` debe coincidir con una fruta del catalogo `Opciones`.
Al registrar una sesion, Apps Script tambien verifica que esa fruta sea la misma del lote seleccionado en `Pedidos_Fruta`.

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
