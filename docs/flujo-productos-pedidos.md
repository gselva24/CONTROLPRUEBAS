# Flujo de productos y pedidos

## Catalogo general

El gerente registra una sola vez el producto fisico:

- nombre base;
- presentacion;
- area responsable;
- producto base de produccion.

Ejemplo: `Nance`, presentacion `12x15 oz.`, area `Empaque`, base de produccion `Nance`.

## Nombre comercial por cliente

El gerente selecciona un cliente y relaciona el producto general con el nombre que aparecera en sus pedidos.

Un mismo producto puede llamarse de forma diferente para clientes distintos. La relacion tiene su propio `ID_Producto_Cliente`.

## Creacion del pedido

1. Seleccionar cliente.
2. Seleccionar uno de sus productos configurados.
3. Revisar presentacion, area y producto base mostrados por la aplicacion.
4. Ingresar cantidad de cajas.
5. Agregar todas las lineas necesarias y guardar.

La aplicacion copia los datos del catalogo a la linea y genera `ID_Linea`.

## Empaque con varios lotes

Empaque selecciona una linea mediante `ID_Linea`. Solo aparecen lotes cuya fruta coincide con `Producto_Base_Produccion`.

Cada sesion:

- suma cajas a la misma linea;
- puede usar un lote completo o parcial;
- crea un `ID_Asignacion`;
- conserva `ID_Lote_Tecnico`, `ID_Linea` e `ID_Pedido_Tecnico`.

La linea permanece disponible hasta completar la cantidad de cajas pedida, por lo que pueden utilizarse varios lotes y varias sesiones.

## Compatibilidad

Los pedidos y sesiones anteriores conservan los campos de texto y reciben UUID durante la migracion. Los pedidos nuevos usan los catalogos y relaciones tecnicas.
