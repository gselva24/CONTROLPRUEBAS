# Estructura de Google Sheets

Esta es la base esperada por `apps-script/Code.gs`.

## Opciones

| Columna | Nombre |
| --- | --- |
| A | Fruta |

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
| B | Fecha |
| C | Nombre_Pedido |
| D | Fruta |
| E | Cajas_Empacadas |
| F | Estado_Empaque |

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
