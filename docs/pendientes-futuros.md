# Pendientes funcionales futuros

Estos temas quedan registrados para integraciones y cambios futuros. No forman
parte del comportamiento actual y deben definirse antes de implementarlos.

## Peso_Caja_Lb

- Definir si el peso se obtiene del catalogo de producto, de la presentacion o
  de una medicion real por sesion.
- Establecer reglas de redondeo, tolerancias y validacion de valores extremos.
- Evitar que el supervisor tenga que repetir un dato que ya pertenezca al
  producto o a su presentacion.

## Productos combinados

- Definir si nombres como `Mango Ciruela` representan una mezcla, una
  presentacion comercial o dos materias primas relacionadas.
- Determinar como se descuentan y trazan los lotes de cada fruta.
- Mantener separados el nombre comercial del cliente y la composicion tecnica
  usada por produccion.

## Cuarto frio

- Modelar ubicaciones fisicas, existencias por ubicacion y estados del producto.
- Registrar entradas, traslados internos, entregas a produccion, devoluciones y
  cargas a contenedor.
- Vincular cada movimiento con lote, pedido, cantidad, responsable, fecha y
  ubicaciones de origen y destino.

## Autenticacion y roles

- Mantener temporalmente el PIN actual.
- Antes de migrar a Supabase/PostgreSQL, definir usuarios reales, sesiones,
  recuperacion de acceso, roles y permisos por accion.
- Preparar una matriz de permisos para gerente, supervisor y futuros perfiles,
  con auditoria de quien crea o modifica cada registro.
