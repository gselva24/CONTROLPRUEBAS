//Script Google sheets API conexión con aplicación
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  asegurarEstructuraTecnica_(ss, false);
  var data = { frutas: [], pedidosPendientes: [], pedidosParciales: [], historial: [], inventarioBodega: [], movimientosBodega: [], clientes: [], productos: [], productosCliente: [], pedidosCliente: [], detallePedidosCliente: [], asignacionesPedido: [], empaqueSesiones: [], produccionesAreas: [] };
  var appContext = e && e.parameter ? (e.parameter.app || "") : "";
  var viewContext = e && e.parameter && e.parameter.view ? e.parameter.view : "full";
  var estadoContext = e && e.parameter ? (e.parameter.estado || "todos") : "todos";
  var limitContext = e && e.parameter ? numeroEnteroSeguro_(e.parameter.limit) : 0;
  var cacheKey = crearCacheKeyGet_(appContext, viewContext, estadoContext, limitContext);
  var cachedPayload = leerCacheGet_(cacheKey);
  if (cachedPayload) {
    return ContentService.createTextOutput(cachedPayload).setMimeType(ContentService.MimeType.JSON);
  }
  var planLectura = crearPlanLecturaGet_(appContext, viewContext);

  // 1. Cargar Opciones del Catálogo
  if (planLectura.catalogoFrutas) {
    var sheetOpciones = ss.getSheetByName("Opciones");
    if (sheetOpciones) {
      var opts = sheetOpciones.getDataRange().getValues();
      for (var i = 1; i < opts.length; i++) {
        if (opts[i][0]) data.frutas.push(opts[i][0].toString());
      }
    }
  }

  if (planLectura.clientes) {
    var sheetClientes = ss.getSheetByName("Clientes");
    if (sheetClientes) {
      var clientesData = sheetClientes.getDataRange().getValues();
      for (var c = 1; c < clientesData.length; c++) {
        data.clientes.push({
          codigo: clientesData[c][0],
          nombre: clientesData[c][1],
          visibleApp: clientesData[c][2] || "SI",
          idCliente: clientesData[c][3] || ""
        });
      }
    }
  }

  if (planLectura.productos) {
    var sheetProductos = ss.getSheetByName("Productos");
    if (sheetProductos) {
      var productosData = sheetProductos.getDataRange().getValues();
      for (var pr = 1; pr < productosData.length; pr++) {
        if (!productosData[pr][0]) continue;
        data.productos.push({
          idProducto: productosData[pr][0],
          nombreBase: productosData[pr][1],
          presentacion: productosData[pr][2],
          area: productosData[pr][3],
          productoBaseProduccion: productosData[pr][4],
          visibleApp: productosData[pr][5] || "SI",
          fechaCreacion: productosData[pr][6] || "",
          unidadProduccion: productosData[pr][7] || (normalizarTexto_(productosData[pr][3]) === "empaque" ? "lb" : "unidad")
        });
      }
    }
  }

  if (planLectura.productosCliente) {
    var sheetProductosCliente = ss.getSheetByName("Productos_Cliente");
    if (sheetProductosCliente) {
      var productosClienteData = sheetProductosCliente.getDataRange().getValues();
      for (var pcr = 1; pcr < productosClienteData.length; pcr++) {
        if (!productosClienteData[pcr][0]) continue;
        data.productosCliente.push({
          idProductoCliente: productosClienteData[pcr][0],
          idCliente: productosClienteData[pcr][1],
          codigoCliente: productosClienteData[pcr][2],
          idProducto: productosClienteData[pcr][3],
          nombreComercial: productosClienteData[pcr][4],
          visibleApp: productosClienteData[pcr][5] || "SI",
          fechaCreacion: productosClienteData[pcr][6] || ""
        });
      }
    }
  }

  if (planLectura.pedidos) {
    var sheetPedidosCliente = ss.getSheetByName("Pedidos_Cliente");
    if (sheetPedidosCliente) {
      var pedidosClienteData = sheetPedidosCliente.getDataRange().getValues();
      for (var pc = 1; pc < pedidosClienteData.length; pc++) {
        data.pedidosCliente.push({
          idPedido: pedidosClienteData[pc][0],
          fechaCreacion: pedidosClienteData[pc][1],
          cliente: pedidosClienteData[pc][2],
          codigoCliente: pedidosClienteData[pc][3],
          fechaCarga: pedidosClienteData[pc][4],
          estadoPedido: pedidosClienteData[pc][5],
          visibleApp: pedidosClienteData[pc][6] || "SI",
          nota: pedidosClienteData[pc][7] || "",
          idPedidoTecnico: pedidosClienteData[pc][8] || "",
          idCliente: pedidosClienteData[pc][9] || ""
        });
      }
    }
  }

  if (planLectura.detallePedidos) {
    var sheetDetallePedidoCliente = ss.getSheetByName("Detalle_Pedido_Cliente");
    if (sheetDetallePedidoCliente) {
      var detallePedidoData = sheetDetallePedidoCliente.getDataRange().getValues();
      for (var dp = 1; dp < detallePedidoData.length; dp++) {
        data.detallePedidosCliente.push({
          idPedido: detallePedidoData[dp][0],
          area: detallePedidoData[dp][1],
          producto: detallePedidoData[dp][2],
          presentacion: detallePedidoData[dp][3],
          unidad: detallePedidoData[dp][4],
          cantidadPedida: numeroSeguro_(detallePedidoData[dp][5]),
          cantidadCompletada: numeroSeguro_(detallePedidoData[dp][6]),
          estadoDetalle: detallePedidoData[dp][7],
          visibleApp: detallePedidoData[dp][8] || "SI",
          nota: detallePedidoData[dp][9] || "",
          idLinea: detallePedidoData[dp][10] || "",
          idPedidoTecnico: detallePedidoData[dp][11] || "",
          idProductoCliente: detallePedidoData[dp][12] || "",
          idProducto: detallePedidoData[dp][13] || "",
          productoBaseProduccion: detallePedidoData[dp][14] || detallePedidoData[dp][2]
        });
      }
    }
  }

  var metricasPorPedido = {};
  if (planLectura.frutas) {
    var sheetKPIResumen = ss.getSheetByName("Control_Materia_Prima");
    if (sheetKPIResumen) {
      var kpiResumenData = sheetKPIResumen.getDataRange().getValues();
      var kpiHeaders = kpiResumenData[0] || [];
      var kpiIdCol = buscarColumna_(kpiHeaders, ["ID", "IdPedido", "idPedido"]);
      var kpiPesoCol = buscarColumna_(kpiHeaders, ["Total_Peso_Procesado_Lb", "Total Peso Procesado Lb", "Peso_Procesado", "Peso Procesado"]);
      var kpiCajasCol = buscarColumna_(kpiHeaders, ["Total_Cajas", "Cajas", "Cajas_Procesadas", "Cajas Procesadas"]);
      if (kpiIdCol === -1) kpiIdCol = 0;
      if (kpiPesoCol === -1) kpiPesoCol = 3;
      if (kpiCajasCol === -1) kpiCajasCol = 4;
      for (var kr = 1; kr < kpiResumenData.length; kr++) {
        var idKPI = kpiResumenData[kr][kpiIdCol];
        if (idKPI) {
          metricasPorPedido[idKPI] = {
            pesoProcesado: numeroSeguro_(kpiResumenData[kr][kpiPesoCol]),
            cajasProcesadas: numeroSeguro_(kpiResumenData[kr][kpiCajasCol])
          };
        }
      }
    }

    // 2. Cargar Pedidos para Historial, Empaque y Retomar
    var sheetFrutas = ss.getSheetByName("Pedidos_Fruta");
    if (sheetFrutas) {
      var frutasData = sheetFrutas.getDataRange().getValues();
      for (var j = 1; j < frutasData.length; j++) {
        var row = frutasData[j];
        var metricas = metricasPorPedido[row[0]] || {};
        var pesoEntradaHistorial = numeroSeguro_(row[5]);
        var pesoKPI = numeroSeguro_(metricas.pesoProcesado);
        var pesoFinal = numeroSeguro_(row[6]);
        var pesoProcesado = pesoProcesadoValido_(pesoEntradaHistorial, pesoKPI) ? pesoKPI : 0;
        if (!pesoProcesado && pesoProcesadoValido_(pesoEntradaHistorial, pesoFinal)) pesoProcesado = pesoFinal;
        var p = {
          id: row[0], fecha: row[1], nombre: row[2], proveedorIniciales: row[3], fruta: row[4],
          pesoEntrada: row[5],
          pesoProcesado: pesoProcesado,
          cajasProcesadas: numeroEnteroSeguro_(metricas.cajasProcesadas),
          rendimientoPeso: row[7],
          estadoFrutas: row[8],
          estadoEmpaqueGlobal: row[12],
          visibleApp: row[13],
          pesoDisponibleEmpaque: row[14] !== "" && typeof row[14] !== "undefined" ? numeroSeguro_(row[14]) : pesoProcesado,
          idLoteTecnico: row[15] || ""
        };
        
        data.historial.push(p);

        if (p.visibleApp === "SI" && p.estadoFrutas === "Finalizado" && p.estadoEmpaqueGlobal !== "Empacado Total") {
          data.pedidosPendientes.push(p);
        }
        if (p.visibleApp === "SI" && (p.estadoFrutas === "En proceso" || p.estadoFrutas === "Pausado")) {
          data.pedidosParciales.push(p);
        }
      }
    }
  }

  if (planLectura.inventario) {
    var sheetInventario = ss.getSheetByName("Inventario_Bodega");
    if (sheetInventario) {
      var invData = sheetInventario.getDataRange().getValues();
      for (var b = 1; b < invData.length; b++) {
        var invRow = invData[b];
        data.inventarioBodega.push({
          id: invRow[0],
          nombre: invRow[1],
          categoria: invRow[2],
          unidad: invRow[3],
          stock: Number(invRow[4]) || 0,
          updatedAt: invRow[5],
          visibleApp: invRow[6] || "SI",
          idItemTecnico: invRow[7] || ""
        });
      }
    }
  }

  if (planLectura.movimientosBodega) {
    var sheetMovimientos = ss.getSheetByName("Movimientos_Bodega");
    if (sheetMovimientos) {
      var movData = sheetMovimientos.getDataRange().getValues();
      var inicioMov = Math.max(1, movData.length - 50);
      for (var mb = inicioMov; mb < movData.length; mb++) {
        var movRow = movData[mb];
        data.movimientosBodega.push({
          fecha: movRow[0],
          tipoMovimiento: movRow[1],
          idItem: movRow[2],
          nombreItem: movRow[3],
          cantidad: Number(movRow[6]) || 0,
          stockAnterior: Number(movRow[7]) || 0,
          stockNuevo: Number(movRow[8]) || 0,
          responsable: movRow[9],
          nota: movRow[10],
          idMovimiento: movRow[11] || ""
        });
      }
    }
  }

  if (planLectura.produccion) {
    var sheetProduccionAreas = ss.getSheetByName("Produccion_Areas");
    if (sheetProduccionAreas) {
      var produccionData = sheetProduccionAreas.getDataRange().getValues();
      for (var pa = 1; pa < produccionData.length; pa++) {
        if (!produccionData[pa][0]) continue;
        data.produccionesAreas.push({
          idProduccion: produccionData[pa][0],
          codigoProduccion: produccionData[pa][1],
          fecha: produccionData[pa][2],
          area: produccionData[pa][3],
          idCliente: produccionData[pa][4],
          codigoCliente: produccionData[pa][5],
          cliente: produccionData[pa][6],
          idProducto: produccionData[pa][7],
          idProductoCliente: produccionData[pa][8],
          producto: produccionData[pa][9],
          presentacion: produccionData[pa][10],
          unidadesFuncionales: numeroSeguro_(produccionData[pa][11]),
          unidadesAveria: numeroSeguro_(produccionData[pa][12]),
          totalFisico: numeroSeguro_(produccionData[pa][13]),
          funcionalesDisponibles: numeroSeguro_(produccionData[pa][14]),
          averiaDisponible: numeroSeguro_(produccionData[pa][15]),
          estadoDisponibilidad: produccionData[pa][16] || "Disponible",
          responsable: produccionData[pa][17] || "",
          nota: produccionData[pa][18] || "",
          visibleApp: produccionData[pa][19] || "SI",
          unidadMedida: produccionData[pa][20] || "unidad",
          cantidadDisponible: produccionData[pa][21] !== "" && typeof produccionData[pa][21] !== "undefined"
            ? numeroSeguro_(produccionData[pa][21])
            : numeroSeguro_(produccionData[pa][14]) + numeroSeguro_(produccionData[pa][15])
        });
      }
    }
  }

  if (planLectura.sesiones) {
    var sheetEmpaqueSesiones = ss.getSheetByName("Empaque_Sesiones");
    if (sheetEmpaqueSesiones) {
      var sesionesData = sheetEmpaqueSesiones.getDataRange().getValues();
      for (var se = 1; se < sesionesData.length; se++) {
        var cajasSesion = numeroEnteroSeguro_(sesionesData[se][9]);
        var presentacionSesion = numeroSeguro_(sesionesData[se][10]);
        data.empaqueSesiones.push({
          idSesion: sesionesData[se][0],
          fecha: sesionesData[se][1],
          idPedido: sesionesData[se][2],
          cliente: sesionesData[se][3],
          codigoCliente: sesionesData[se][4],
          area: sesionesData[se][5],
          producto: sesionesData[se][6],
          presentacion: sesionesData[se][7],
          unidad: sesionesData[se][8],
          cajasHechas: cajasSesion,
          presentacionLb: presentacionSesion,
          pesoEmpacadoLb: cajasSesion * presentacionSesion,
          idLoteFruta: sesionesData[se][11],
          fruta: sesionesData[se][12],
          estadoUsoLote: sesionesData[se][13],
          sobranteLoteLb: numeroSeguro_(sesionesData[se][14]),
          responsable: sesionesData[se][15] || "",
          nota: sesionesData[se][16] || "",
          estadoRegistro: sesionesData[se][17] || "Activa",
          fechaReversion: sesionesData[se][18] || "",
          motivoReversion: sesionesData[se][19] || "",
          idLinea: sesionesData[se][20] || "",
          idAsignacion: sesionesData[se][21] || "",
          idLoteTecnico: sesionesData[se][22] || "",
          idPedidoTecnico: sesionesData[se][23] || "",
          tipoFuente: sesionesData[se][24] || (sesionesData[se][11] ? "Fruta" : ""),
          idProduccion: sesionesData[se][25] || "",
          codigoProduccion: sesionesData[se][26] || "",
          categoriaUnidades: sesionesData[se][27] || "",
          unidadesPorCaja: numeroSeguro_(sesionesData[se][28]),
          unidadesConsumidas: numeroSeguro_(sesionesData[se][29]),
          cantidadPorCaja: numeroSeguro_(sesionesData[se][30] || sesionesData[se][28] || sesionesData[se][10]),
          cantidadFuenteAnterior: numeroSeguro_(sesionesData[se][31]),
          cantidadFuenteSobrante: numeroSeguro_(sesionesData[se][32]),
          cantidadFuenteConsumida: numeroSeguro_(sesionesData[se][33] || sesionesData[se][29]),
          unidadFuente: sesionesData[se][34] || (sesionesData[se][11] ? "lb" : "unidad"),
          idProductoFuente: sesionesData[se][35] || "",
          idProductoDestino: sesionesData[se][36] || ""
        });
      }
    }
  }

  if (planLectura.asignaciones) {
    var sheetAsignaciones = ss.getSheetByName("Asignaciones_Pedido");
    if (sheetAsignaciones) {
      var asignacionesData = sheetAsignaciones.getDataRange().getValues();
      for (var ap = 1; ap < asignacionesData.length; ap++) {
        if (!asignacionesData[ap][0]) continue;
        data.asignacionesPedido.push({
          idAsignacion: asignacionesData[ap][0],
          fecha: asignacionesData[ap][1],
          idPedidoTecnico: asignacionesData[ap][2],
          idLinea: asignacionesData[ap][3],
          idLoteTecnico: asignacionesData[ap][4],
          idSesion: asignacionesData[ap][5],
          area: asignacionesData[ap][6],
          cantidad: numeroSeguro_(asignacionesData[ap][7]),
          unidad: asignacionesData[ap][8],
          estadoAsignacion: asignacionesData[ap][9] || "Activa",
          fechaReversion: asignacionesData[ap][10] || "",
          motivoReversion: asignacionesData[ap][11] || "",
          idPedidoVisible: asignacionesData[ap][12] || "",
          idLoteVisible: asignacionesData[ap][13] || "",
          cantidadFuenteConsumida: numeroSeguro_(asignacionesData[ap][14]),
          unidadFuente: asignacionesData[ap][15] || "",
          idProductoFuente: asignacionesData[ap][16] || "",
          idProductoDestino: asignacionesData[ap][17] || ""
        });
      }
    }
  }

  var payloadGet = filtrarDataPorApp_(data, appContext, viewContext, estadoContext, limitContext);
  var jsonPayloadGet = JSON.stringify(payloadGet);
  guardarCacheGet_(cacheKey, jsonPayloadGet, viewContext, estadoContext);
  return ContentService.createTextOutput(jsonPayloadGet).setMimeType(ContentService.MimeType.JSON);
}

function crearPlanLecturaGet_(appContext, viewContext) {
  var contexto = normalizarTexto_(appContext || "");
  var view = normalizarTexto_(viewContext || "full");
  var full = view === "full" || (!contexto && view === "main");
  var plan = {
    catalogoFrutas: false,
    clientes: false,
    productos: false,
    productosCliente: false,
    pedidos: false,
    detallePedidos: false,
    frutas: false,
    inventario: false,
    movimientosBodega: false,
    produccion: false,
    sesiones: false,
    asignaciones: false
  };

  function activarTodo() {
    Object.keys(plan).forEach(function(key) { plan[key] = true; });
    return plan;
  }

  if (full) return activarTodo();

  var esFrutasEmpaque = contexto === "frutas-empaque" || contexto === "frutasempaque";
  var esProduccion = contexto === "planchas" || contexto === "plancha" || contexto === "tamales" || contexto === "tamal";
  if (!esFrutasEmpaque && !esProduccion) return activarTodo();

  if (esFrutasEmpaque) {
    if (view === "main") {
      plan.catalogoFrutas = true;
      plan.frutas = true;
      return plan;
    }
    if (view === "empaque") {
      plan.catalogoFrutas = true;
      plan.productos = true;
      plan.productosCliente = true;
      plan.pedidos = true;
      plan.detallePedidos = true;
      plan.frutas = true;
      plan.produccion = true;
      return plan;
    }
    if (view === "pedidos") {
      plan.catalogoFrutas = true;
      plan.clientes = true;
      plan.productos = true;
      plan.productosCliente = true;
      plan.pedidos = true;
      plan.detallePedidos = true;
      return plan;
    }
    if (view === "historial") {
      plan.frutas = true;
      plan.produccion = true;
      plan.sesiones = true;
      plan.asignaciones = true;
      return plan;
    }
  }

  if (esProduccion) {
    if (view === "main") {
      plan.clientes = true;
      plan.productos = true;
      plan.productosCliente = true;
      plan.produccion = true;
      return plan;
    }
    if (view === "pedidos") {
      plan.catalogoFrutas = true;
      plan.clientes = true;
      plan.productos = true;
      plan.productosCliente = true;
      plan.pedidos = true;
      plan.detallePedidos = true;
      return plan;
    }
    if (view === "historial") {
      plan.produccion = true;
      plan.sesiones = true;
      plan.asignaciones = true;
      return plan;
    }
  }

  return activarTodo();
}

function filtrarDataPorApp_(data, appContext, viewContext, estadoContext, limitContext) {
  var contexto = normalizarTexto_(appContext || "");
  var filtrado = JSON.parse(JSON.stringify(data));
  filtrado.appContext = appContext || "full";
  filtrado.viewContext = viewContext || "main";
  filtrado.estadoContext = estadoContext || "todos";

  if (contexto === "frutas-empaque" || contexto === "frutasempaque") {
    filtrado.inventarioBodega = [];
    filtrado.movimientosBodega = [];
    return filtrarDataPorVista_(filtrado, viewContext, estadoContext, limitContext);
  }

  var areaObjetivo = "";
  if (contexto === "planchas" || contexto === "plancha") areaObjetivo = "Planchas";
  if (contexto === "tamales" || contexto === "tamal") areaObjetivo = "Tamales";
  if (!areaObjetivo) return filtrado;

  var areaNormalizada = normalizarAreaOperativa_(areaObjetivo);
  var productosPermitidos = {};
  filtrado.productos = data.productos.filter(function(producto) {
    var coincide = normalizarAreaOperativa_(producto.area) === areaNormalizada;
    if (coincide) productosPermitidos[producto.idProducto] = true;
    return coincide;
  });
  filtrado.productosCliente = data.productosCliente.filter(function(relacion) {
    return productosPermitidos[relacion.idProducto];
  });

  var pedidosPermitidos = {};
  var lineasPermitidas = {};
  filtrado.detallePedidosCliente = data.detallePedidosCliente.filter(function(detalle) {
    var coincide = normalizarAreaOperativa_(detalle.area) === areaNormalizada;
    if (coincide) {
      pedidosPermitidos[detalle.idPedido] = true;
      if (detalle.idLinea) lineasPermitidas[detalle.idLinea] = true;
    }
    return coincide;
  });
  filtrado.pedidosCliente = data.pedidosCliente.filter(function(pedido) {
    return pedidosPermitidos[pedido.idPedido];
  });

  var produccionesPermitidas = {};
  filtrado.produccionesAreas = data.produccionesAreas.filter(function(produccion) {
    var coincide = normalizarAreaOperativa_(produccion.area) === areaNormalizada;
    if (coincide) produccionesPermitidas[produccion.idProduccion] = true;
    return coincide;
  });

  var sesionesPermitidas = {};
  filtrado.empaqueSesiones = data.empaqueSesiones.filter(function(sesion) {
    var coincide = normalizarAreaOperativa_(sesion.area) === areaNormalizada || produccionesPermitidas[sesion.idProduccion];
    if (coincide) sesionesPermitidas[sesion.idSesion] = true;
    return coincide;
  });
  filtrado.asignacionesPedido = data.asignacionesPedido.filter(function(asignacion) {
    return lineasPermitidas[asignacion.idLinea] || sesionesPermitidas[asignacion.idSesion];
  });

  filtrado.frutas = [];
  filtrado.pedidosPendientes = [];
  filtrado.pedidosParciales = [];
  filtrado.historial = [];
  filtrado.inventarioBodega = [];
  filtrado.movimientosBodega = [];
  return filtrarDataPorVista_(filtrado, viewContext, estadoContext, limitContext);
}

function filtrarDataPorVista_(data, viewContext, estadoContext, limitContext) {
  var view = normalizarTexto_(viewContext || "main");
  var estado = normalizarTexto_(estadoContext || "todos");
  var limit = Math.max(0, numeroEnteroSeguro_(limitContext));
  var filtrado = JSON.parse(JSON.stringify(data));

  if (view === "main") {
    delete filtrado.pedidosCliente;
    delete filtrado.detallePedidosCliente;
    delete filtrado.asignacionesPedido;
    delete filtrado.empaqueSesiones;
    delete filtrado.historial;
    return filtrado;
  }

  if (view === "empaque") {
    delete filtrado.pedidosParciales;
    delete filtrado.historial;
    delete filtrado.empaqueSesiones;
    delete filtrado.asignacionesPedido;
    delete filtrado.inventarioBodega;
    delete filtrado.movimientosBodega;
    return filtrado;
  }

  if (view === "pedidos") {
    delete filtrado.pedidosPendientes;
    delete filtrado.pedidosParciales;
    delete filtrado.historial;
    delete filtrado.empaqueSesiones;
    delete filtrado.asignacionesPedido;
    delete filtrado.inventarioBodega;
    delete filtrado.movimientosBodega;
    return filtrado;
  }

  if (view === "historial") {
    filtrarPorEstadoOperativo_(filtrado, estado);
    if (limit > 0) aplicarLimitHistorial_(filtrado, limit);
    delete filtrado.frutas;
    delete filtrado.clientes;
    delete filtrado.productos;
    delete filtrado.productosCliente;
    delete filtrado.pedidosCliente;
    delete filtrado.detallePedidosCliente;
    delete filtrado.pedidosPendientes;
    delete filtrado.pedidosParciales;
    delete filtrado.inventarioBodega;
    delete filtrado.movimientosBodega;
    return filtrado;
  }

  return filtrado;
}

function filtrarPorEstadoOperativo_(data, estado) {
  if (estado === "todos") return;
  var quiereCompletados = estado === "completados";
  data.historial = (data.historial || []).filter(function(lote) {
    return loteCompletadoFruta_(lote) === quiereCompletados;
  });
  data.produccionesAreas = (data.produccionesAreas || []).filter(function(lote) {
    return loteCompletadoProduccion_(lote) === quiereCompletados;
  });
}

function aplicarLimitHistorial_(data, limit) {
  data.historial = (data.historial || []).slice(Math.max(0, data.historial.length - limit));
  data.produccionesAreas = (data.produccionesAreas || []).slice(Math.max(0, data.produccionesAreas.length - limit));
}

function loteCompletadoFruta_(lote) {
  return lote.estadoEmpaqueGlobal === "Empacado Total" || numeroSeguro_(lote.pesoDisponibleEmpaque) <= 0;
}

function loteCompletadoProduccion_(lote) {
  return normalizarTexto_(lote.estadoDisponibilidad) === "agotado" || numeroSeguro_(lote.cantidadDisponible) <= 0;
}

function crearCacheKeyGet_(appContext, viewContext, estadoContext, limitContext) {
  return [
    "mes-v3",
    normalizarTexto_(appContext || "full"),
    normalizarTexto_(viewContext || "main"),
    normalizarTexto_(estadoContext || "todos"),
    String(limitContext || 0)
  ].join(":").slice(0, 240);
}

function leerCacheGet_(cacheKey) {
  try {
    return CacheService.getScriptCache().get(cacheKey);
  } catch (err) {
    return null;
  }
}

function guardarCacheGet_(cacheKey, payload, viewContext, estadoContext) {
  try {
    CacheService.getScriptCache().put(cacheKey, payload, ttlCacheGet_(viewContext, estadoContext));
  } catch (err) {}
}

function ttlCacheGet_(viewContext, estadoContext) {
  var view = normalizarTexto_(viewContext || "");
  var estado = normalizarTexto_(estadoContext || "");
  if (estado === "completados") return 180;
  if (view === "pedidos") return 25;
  return 30;
}

function limpiarCacheMes_() {
  try {
    var cache = CacheService.getScriptCache();
    ["frutas-empaque", "planchas", "tamales", "full"].forEach(function(app) {
      ["main", "empaque", "pedidos", "historial"].forEach(function(view) {
        ["activos", "completados", "todos"].forEach(function(estado) {
          [0, 50, 100].forEach(function(limit) {
            cache.remove(crearCacheKeyGet_(app, view, estado, limit));
          });
        });
      });
    });
  } catch (err) {}
}

function doPost(e) {
  // Validación de seguridad: Si no hay datos, terminar inmediatamente
  if (typeof e === 'undefined' || !e.postData) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: "No se recibieron datos viciados manualmente."}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Obtener el bloqueo del script para controlar la alta concurrencia
  var lock = LockService.getScriptLock();
  try {
    // Espera hasta 30 segundos (30000 ms) para obtener el bloqueo antes de lanzar un error
    lock.waitLock(30000);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: "El servidor está ocupado. Intente de nuevo."})).setMimeType(ContentService.MimeType.JSON);
  }

  // Ejecución segura de procesos bajo bloqueo mutuo
  try {
    var params = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    asegurarEstructuraTecnica_(ss, false);
    limpiarCacheMes_();
    
    // -- GERENCIA: ACTUALIZAR CATÁLOGO --
    if (params.action === "updateOptions") {
      var sheetOpt = getOrCreateSheet_(ss, "Opciones", ["Fruta"]);
      sheetOpt.clearContents();
      sheetOpt.appendRow(["Fruta"]);
      params.options.forEach(function(opt) { sheetOpt.appendRow([opt]); });
      return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    // -- GERENCIA: OCULTAR DE LA APP --
    if (params.action === "ocultarLoteManual") {
      var sheetOcultar = ss.getSheetByName("Pedidos_Fruta");
      var dataOcultar = sheetOcultar.getDataRange().getValues();
      for (var o = 1; o < dataOcultar.length; o++) {
        if (dataOcultar[o][0] == params.idPedido) {
          sheetOcultar.getRange(o + 1, 14).setValue("NO"); 
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    // -- GERENCIA: BORRADO EN CASCADA TOTAL --
    if (params.action === "deleteLote") {
      var pestanas = ["Pedidos_Fruta", "Empaque_Salidas", "Tiempos_Procesado", "Control_Materia_Prima"];
      pestanas.forEach(function(nombre) {
        var sheetDel = ss.getSheetByName(nombre);
        if (sheetDel) {
          var dataDel = sheetDel.getDataRange().getValues();
          for (var i = dataDel.length - 1; i >= 1; i--) {
            if (dataDel[i][0] == params.idPedido) sheetDel.deleteRow(i + 1);
          }
        }
      });
      return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    // -- GERENCIA: CLIENTES Y PEDIDOS / ARMADOS --
    if (params.action === "guardarClientePedido") {
      var sheetClientesPost = getOrCreateSheet_(ss, "Clientes", ["Codigo_Cliente", "Nombre_Cliente", "Visible_App", "ID_Cliente"]);
      var codigoClientePost = (params.codigoCliente || "").toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      var nombreClientePost = (params.nombreCliente || "").toString().trim();
      if (!codigoClientePost || !nombreClientePost) return json_(false, "Ingrese codigo y nombre del cliente.");

      var clientesPostData = sheetClientesPost.getDataRange().getValues();
      var filaClientePost = -1;
      for (var cp = 1; cp < clientesPostData.length; cp++) {
        if (clientesPostData[cp][0] == codigoClientePost) {
          filaClientePost = cp + 1;
          break;
        }
      }

      if (filaClientePost === -1) {
        sheetClientesPost.appendRow([codigoClientePost, nombreClientePost, "SI", crearUuid_()]);
      } else {
        sheetClientesPost.getRange(filaClientePost, 2).setValue(nombreClientePost);
        sheetClientesPost.getRange(filaClientePost, 3).setValue("SI");
        if (!sheetClientesPost.getRange(filaClientePost, 4).getValue()) sheetClientesPost.getRange(filaClientePost, 4).setValue(crearUuid_());
      }
      return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    if (params.action === "ocultarClientePedido") {
      var sheetClientesOcultar = ss.getSheetByName("Clientes");
      if (!sheetClientesOcultar) return json_(false, "No existe catalogo de clientes.");
      var clientesOcultarData = sheetClientesOcultar.getDataRange().getValues();
      for (var co = 1; co < clientesOcultarData.length; co++) {
        if (clientesOcultarData[co][0] == params.codigoCliente) {
          sheetClientesOcultar.getRange(co + 1, 3).setValue("NO");
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    if (params.action === "guardarProductoGeneral") {
      var sheetProductosPost = getOrCreateSheet_(ss, "Productos", ["ID_Producto", "Nombre_Base", "Presentacion", "Area_Responsable", "Producto_Base_Produccion", "Visible_App", "Fecha_Creacion", "Unidad_Produccion"]);
      var nombreBaseProducto = (params.nombreBase || "").toString().trim();
      var presentacionProducto = (params.presentacion || "").toString().trim();
      var areaProducto = normalizarAreaOperativa_(params.area);
      var baseProduccion = (params.productoBaseProduccion || "").toString().trim();
      var unidadProduccionProducto = (params.unidadProduccion || "").toString().trim();
      var idProductoEditar = (params.idProducto || "").toString().trim();
      if (!nombreBaseProducto || !presentacionProducto || !areaProducto) return json_(false, "Ingrese nombre base, presentacion y area.");
      if (normalizarTexto_(areaProducto) === "empaque" && (!baseProduccion || !frutaExisteEnCatalogo_(ss, baseProduccion))) {
        return json_(false, "Para Empaque seleccione una fruta valida como producto base de produccion.");
      }
      if (normalizarTexto_(areaProducto) === "empaque") {
        unidadProduccionProducto = "lb";
      } else {
        baseProduccion = nombreBaseProducto;
        if (!unidadProduccionProducto) return json_(false, "Seleccione la unidad de produccion.");
      }

      var productosPostData = sheetProductosPost.getDataRange().getValues();
      var filaProductoPost = idProductoEditar ? buscarFilaPorColumna_(sheetProductosPost, 1, idProductoEditar) : -1;
      if (idProductoEditar && filaProductoPost === -1) return json_(false, "No se encontro el producto que desea editar.");
      for (var pg = 1; pg < productosPostData.length; pg++) {
        if (
          normalizarTexto_(productosPostData[pg][1]) === normalizarTexto_(nombreBaseProducto) &&
          normalizarTexto_(productosPostData[pg][2]) === normalizarTexto_(presentacionProducto) &&
          normalizarTexto_(productosPostData[pg][3]) === normalizarTexto_(areaProducto)
        ) {
          if (idProductoEditar && pg + 1 !== filaProductoPost) {
            return json_(false, "Ya existe otro producto con el mismo nombre, presentacion y area.");
          }
          if (!idProductoEditar && filaProductoPost === -1) {
            filaProductoPost = pg + 1;
            break;
          }
        }
      }

      var idProductoPost = filaProductoPost === -1 ? crearUuid_() : sheetProductosPost.getRange(filaProductoPost, 1).getValue();
      if (filaProductoPost === -1) {
        sheetProductosPost.appendRow([idProductoPost, nombreBaseProducto, presentacionProducto, areaProducto, baseProduccion, "SI", new Date(), unidadProduccionProducto]);
      } else {
        sheetProductosPost.getRange(filaProductoPost, 2, 1, 5).setValues([[nombreBaseProducto, presentacionProducto, areaProducto, baseProduccion, "SI"]]);
        sheetProductosPost.getRange(filaProductoPost, 8).setValue(unidadProduccionProducto);
      }
      return ContentService.createTextOutput(JSON.stringify({status: "success", idProducto: idProductoPost})).setMimeType(ContentService.MimeType.JSON);
    }

    if (params.action === "ocultarProductoGeneral") {
      var sheetProductoOcultar = ss.getSheetByName("Productos");
      var filaProductoOcultar = buscarFilaPorColumna_(sheetProductoOcultar, 1, params.idProducto);
      if (filaProductoOcultar === -1) return json_(false, "No se encontro el producto.");
      sheetProductoOcultar.getRange(filaProductoOcultar, 6).setValue("NO");
      return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    if (params.action === "guardarProductoCliente") {
      var sheetProductoClientePost = getOrCreateSheet_(ss, "Productos_Cliente", ["ID_Producto_Cliente", "ID_Cliente", "Codigo_Cliente", "ID_Producto", "Nombre_Comercial", "Visible_App", "Fecha_Creacion"]);
      var sheetClienteRelacion = ss.getSheetByName("Clientes");
      var sheetProductoRelacion = ss.getSheetByName("Productos");
      var filaClienteRelacion = buscarFilaPorColumna_(sheetClienteRelacion, 4, params.idCliente);
      var filaProductoRelacion = buscarFilaPorColumna_(sheetProductoRelacion, 1, params.idProducto);
      var nombreComercial = (params.nombreComercial || "").toString().trim();
      if (filaClienteRelacion === -1 || filaProductoRelacion === -1) return json_(false, "Seleccione cliente y producto.");
      if (!nombreComercial) return json_(false, "Ingrese el nombre comercial para el cliente.");

      var codigoRelacion = sheetClienteRelacion.getRange(filaClienteRelacion, 1).getValue();
      var relacionesData = sheetProductoClientePost.getDataRange().getValues();
      var filaRelacion = -1;
      for (var rpc = 1; rpc < relacionesData.length; rpc++) {
        if (relacionesData[rpc][1] == params.idCliente && relacionesData[rpc][3] == params.idProducto) {
          filaRelacion = rpc + 1;
          break;
        }
      }
      var idProductoClientePost = filaRelacion === -1 ? crearUuid_() : sheetProductoClientePost.getRange(filaRelacion, 1).getValue();
      if (filaRelacion === -1) {
        sheetProductoClientePost.appendRow([idProductoClientePost, params.idCliente, codigoRelacion, params.idProducto, nombreComercial, "SI", new Date()]);
      } else {
        sheetProductoClientePost.getRange(filaRelacion, 3, 1, 4).setValues([[codigoRelacion, params.idProducto, nombreComercial, "SI"]]);
      }
      return ContentService.createTextOutput(JSON.stringify({status: "success", idProductoCliente: idProductoClientePost})).setMimeType(ContentService.MimeType.JSON);
    }

    if (params.action === "ocultarProductoCliente") {
      var sheetRelacionOcultar = ss.getSheetByName("Productos_Cliente");
      var filaRelacionOcultar = buscarFilaPorColumna_(sheetRelacionOcultar, 1, params.idProductoCliente);
      if (filaRelacionOcultar === -1) return json_(false, "No se encontro el producto del cliente.");
      sheetRelacionOcultar.getRange(filaRelacionOcultar, 6).setValue("NO");
      return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    if (params.action === "crearPedidoCliente") {
      var sheetPedidosPost = getOrCreateSheet_(ss, "Pedidos_Cliente", ["ID_Pedido", "Fecha_Creacion", "Cliente", "Codigo_Cliente", "Fecha_Carga", "Estado_Pedido", "Visible_App", "Nota", "ID_Pedido_Tecnico", "ID_Cliente"]);
      var sheetDetallePost = getOrCreateSheet_(ss, "Detalle_Pedido_Cliente", ["ID_Pedido", "Area", "Producto", "Presentacion", "Unidad", "Cantidad_Pedida", "Cantidad_Completada", "Estado_Detalle", "Visible_App", "Nota", "ID_Linea", "ID_Pedido_Tecnico", "ID_Producto_Cliente", "ID_Producto", "Producto_Base_Produccion"]);
      var sheetClientesPedido = ss.getSheetByName("Clientes");
      var filaClientePedido = params.idCliente ? buscarFilaPorColumna_(sheetClientesPedido, 4, params.idCliente) : buscarFilaPorColumna_(sheetClientesPedido, 1, params.codigoCliente);
      if (filaClientePedido === -1) return json_(false, "Seleccione un cliente valido.");
      var idClientePedido = sheetClientesPedido.getRange(filaClientePedido, 4).getValue();
      var codigoPedido = sheetClientesPedido.getRange(filaClientePedido, 1).getValue().toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      var clientePedido = sheetClientesPedido.getRange(filaClientePedido, 2).getValue().toString().trim();
      var fechaCargaPedido = params.fechaCarga;
      var lineasPedido = params.lineas || [];
      if (!codigoPedido || !clientePedido) return json_(false, "Seleccione cliente.");
      if (!fechaCargaPedido) return json_(false, "Seleccione fecha de carga.");
      if (!lineasPedido.length) return json_(false, "Agregue al menos una linea al armado.");

      var lineasNormalizadas = [];
      var sheetProductosPedido = ss.getSheetByName("Productos");
      var sheetProductosClientePedido = ss.getSheetByName("Productos_Cliente");
      for (var lp = 0; lp < lineasPedido.length; lp++) {
        var lineaValidar = lineasPedido[lp];
        var cantidadValidar = numeroEnteroSeguro_(lineaValidar.cantidadPedida);
        if (cantidadValidar <= 0) {
          return json_(false, "Hay una linea incompleta en el armado.");
        }

        if (lineaValidar.idProductoCliente) {
          var filaProductoClientePedido = buscarFilaPorColumna_(sheetProductosClientePedido, 1, lineaValidar.idProductoCliente);
          if (filaProductoClientePedido === -1) return json_(false, "No se encontro un producto configurado para el cliente.");
          if (sheetProductosClientePedido.getRange(filaProductoClientePedido, 2).getValue() != idClientePedido) return json_(false, "El producto no pertenece al cliente seleccionado.");
          if (normalizarTexto_(sheetProductosClientePedido.getRange(filaProductoClientePedido, 6).getValue()) === "no") return json_(false, "El producto del cliente esta oculto.");

          var idProductoLinea = sheetProductosClientePedido.getRange(filaProductoClientePedido, 4).getValue();
          var filaProductoPedido = buscarFilaPorColumna_(sheetProductosPedido, 1, idProductoLinea);
          if (filaProductoPedido === -1) return json_(false, "No se encontro el producto general.");
          var areaLinea = sheetProductosPedido.getRange(filaProductoPedido, 4).getValue();
          var baseLinea = sheetProductosPedido.getRange(filaProductoPedido, 5).getValue();
          if (normalizarTexto_(areaLinea) === "empaque" && !frutaExisteEnCatalogo_(ss, baseLinea)) {
            return json_(false, "El producto de Empaque no tiene una fruta base valida.");
          }
          lineasNormalizadas.push({
            area: areaLinea,
            producto: sheetProductosClientePedido.getRange(filaProductoClientePedido, 5).getValue(),
            presentacion: sheetProductosPedido.getRange(filaProductoPedido, 3).getValue(),
            unidad: "cajas",
            cantidadPedida: cantidadValidar,
            nota: lineaValidar.nota || "",
            idProductoCliente: lineaValidar.idProductoCliente,
            idProducto: idProductoLinea,
            productoBaseProduccion: baseLinea
          });
        } else {
          if (!lineaValidar.area || !lineaValidar.producto) return json_(false, "Hay una linea antigua incompleta en el armado.");
          lineasNormalizadas.push({
            area: lineaValidar.area,
            producto: lineaValidar.producto,
            presentacion: lineaValidar.presentacion || "",
            unidad: "cajas",
            cantidadPedida: cantidadValidar,
            nota: lineaValidar.nota || "",
            idProductoCliente: "",
            idProducto: "",
            productoBaseProduccion: lineaValidar.productoBaseProduccion || lineaValidar.producto
          });
        }
      }

      var idPedidoCliente = crearIdPedidoCliente_(ss, codigoPedido, fechaCargaPedido);
      var idPedidoTecnico = crearUuid_();
      var ahoraPedido = new Date();
      sheetPedidosPost.appendRow([idPedidoCliente, ahoraPedido, clientePedido, codigoPedido, fechaCargaPedido, "Abierto", "SI", params.nota || "", idPedidoTecnico, idClientePedido]);

      lineasNormalizadas.forEach(function(linea) {
        var cantidadPedida = numeroSeguro_(linea.cantidadPedida);
        if (linea.area && linea.producto && linea.unidad && cantidadPedida > 0) {
          sheetDetallePost.appendRow([
            idPedidoCliente,
            linea.area,
            linea.producto,
            linea.presentacion || "",
            linea.unidad,
            cantidadPedida,
            0,
            "Pendiente",
            "SI",
            linea.nota || "",
            crearUuid_(),
            idPedidoTecnico,
            linea.idProductoCliente || "",
            linea.idProducto || "",
            linea.productoBaseProduccion || ""
          ]);
        }
      });

      return ContentService.createTextOutput(JSON.stringify({status: "success", idPedido: idPedidoCliente, idPedidoTecnico: idPedidoTecnico})).setMimeType(ContentService.MimeType.JSON);
    }

    if (params.action === "ocultarPedidoCliente") {
      actualizarVisibilidadPedidoCliente_(ss, params.idPedido, "NO");
      return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    if (params.action === "cancelarPedidoCliente") {
      var lotesLiberadosCancelacion = revertirAsignacionesPedidoCliente_(ss, params.idPedido, "Pedido cancelado");
      actualizarEstadoPedidoCliente_(ss, params.idPedido, "Cancelado");
      return ContentService.createTextOutput(JSON.stringify({status: "success", lotesLiberados: lotesLiberadosCancelacion})).setMimeType(ContentService.MimeType.JSON);
    }

    if (params.action === "eliminarPedidoCliente") {
      revertirAsignacionesPedidoCliente_(ss, params.idPedido, "Pedido eliminado");
      eliminarPedidoCliente_(ss, params.idPedido);
      return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    // -- OPERATIVO: REPORTES DE PRODUCCION DE PLANCHAS Y TAMALES --
    if (params.action === "registroProduccionArea") {
      var headersProduccion = ["ID_Produccion", "Codigo_Produccion", "Fecha", "Area", "ID_Cliente", "Codigo_Cliente", "Cliente", "ID_Producto", "ID_Producto_Cliente", "Producto", "Presentacion", "Unidades_Funcionales", "Unidades_Averia", "Total_Fisico", "Funcionales_Disponibles", "Averia_Disponible", "Estado_Disponibilidad", "Responsable", "Nota", "Visible_App", "Unidad_Medida", "Cantidad_Disponible"];
      var sheetProduccionPost = getOrCreateSheet_(ss, "Produccion_Areas", headersProduccion);
      var sheetClientesProduccion = ss.getSheetByName("Clientes");
      var sheetProductosProduccion = ss.getSheetByName("Productos");
      var sheetProductosClienteProduccion = ss.getSheetByName("Productos_Cliente");
      var areaProduccion = normalizarAreaOperativa_(params.area);
      var unidadesFuncionalesIngresadas = numeroSeguro_(params.unidadesFuncionales);
      var unidadesAveriaIngresadas = numeroSeguro_(params.unidadesAveria);
      var unidadesFuncionales = unidadesFuncionalesIngresadas;
      var unidadesAveria = unidadesAveriaIngresadas;
      var responsableProduccion = (params.responsable || "").toString().trim();

      if (areaProduccion !== "Planchas" && areaProduccion !== "Tamales") return json_(false, "Seleccione un area de produccion valida.");
      if (unidadesFuncionales <= 0) return json_(false, "Las unidades funcionales deben ser mayores a cero.");
      if (unidadesAveria < 0) return json_(false, "La averia no puede ser negativa.");
      if (!responsableProduccion) return json_(false, "Ingrese el responsable del reporte.");

      var filaClienteProduccion = buscarFilaPorColumna_(sheetClientesProduccion, 4, params.idCliente);
      var filaRelacionProduccion = buscarFilaPorColumna_(sheetProductosClienteProduccion, 1, params.idProductoCliente);
      if (filaClienteProduccion === -1 || filaRelacionProduccion === -1) return json_(false, "Seleccione un cliente y producto validos.");
      if (sheetProductosClienteProduccion.getRange(filaRelacionProduccion, 2).getValue() != params.idCliente) {
        return json_(false, "El producto seleccionado no pertenece al cliente.");
      }
      if (normalizarTexto_(sheetProductosClienteProduccion.getRange(filaRelacionProduccion, 6).getValue()) === "no") {
        return json_(false, "El producto del cliente esta oculto.");
      }

      var idProductoProduccion = sheetProductosClienteProduccion.getRange(filaRelacionProduccion, 4).getValue();
      var filaProductoProduccion = buscarFilaPorColumna_(sheetProductosProduccion, 1, idProductoProduccion);
      if (filaProductoProduccion === -1) return json_(false, "No se encontro el producto general.");
      if (normalizarAreaOperativa_(sheetProductosProduccion.getRange(filaProductoProduccion, 4).getValue()) !== areaProduccion) {
        return json_(false, "El producto no corresponde al area seleccionada.");
      }

      var idProduccion = crearUuid_();
      var codigoProduccion = crearCodigoProduccion_(ss, areaProduccion);
      var codigoClienteProduccion = sheetClientesProduccion.getRange(filaClienteProduccion, 1).getValue();
      var clienteProduccion = sheetClientesProduccion.getRange(filaClienteProduccion, 2).getValue();
      var productoProduccion = sheetProductosClienteProduccion.getRange(filaRelacionProduccion, 5).getValue();
      var presentacionProduccion = sheetProductosProduccion.getRange(filaProductoProduccion, 3).getValue();
      var unidadMedidaProduccion = sheetProductosProduccion.getRange(filaProductoProduccion, 8).getValue() || "unidad";
      var totalFisicoProduccion = unidadesFuncionales + unidadesAveria;
      sheetProduccionPost.appendRow([
        idProduccion,
        codigoProduccion,
        params.fecha || new Date(),
        areaProduccion,
        params.idCliente,
        codigoClienteProduccion,
        clienteProduccion,
        idProductoProduccion,
        params.idProductoCliente,
        productoProduccion,
        presentacionProduccion,
        unidadesFuncionales,
        unidadesAveria,
        totalFisicoProduccion,
        unidadesFuncionales,
        unidadesAveria,
        "Disponible",
        responsableProduccion,
        params.nota || "",
        "SI",
        unidadMedidaProduccion,
        totalFisicoProduccion
      ]);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        idProduccion: idProduccion,
        codigoProduccion: codigoProduccion,
        totalFisico: totalFisicoProduccion
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // -- OPERATIVO: NUEVO FLUJO DE FRUTAS POR ESTADOS --
    if (params.action === "iniciarLoteFrutas") {
      var sheetFNuevo = getOrCreateSheet_(ss, "Pedidos_Fruta", ["ID", "Fecha", "Nombre_Pedido", "Proveedor_Iniciales", "Fruta", "Peso_Neto_Entrada_Lb", "Peso_Neto_Final_Lb", "Rendimiento_Peso", "Estado_Frutas", "Peso_Averia_Lb", "Peso_Desecho_Lb", "Nota_Final", "Estado_Empaque", "Visible_App", "Peso_Disponible_Empaque_Lb", "ID_Lote_Tecnico"]);
      var sheetTNuevo = getOrCreateSheet_(ss, "Tiempos_Procesado", ["ID", "Nombre_Pedido", "Fruta", "FechaHora_Inicio", "FechaHora_Finalizacion", "Tiempo_Total_Min", "Tiempo_Pausado_Min", "Tiempo_Produccion_Min", "Motivo_Pausa", "Pausa_Activa_Desde", "ID_Sesion_Produccion"]);
      var pesoEntradaNuevo = numeroSeguro_(params.pesoEntrada);
      var proveedorIniciales = (params.proveedorIniciales || "").toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!params.nombrePedido) return json_(false, "Ingrese el nombre del pedido.");
      if (!proveedorIniciales) return json_(false, "Ingrese las iniciales del proveedor.");
      if (!pesoEntradaNuevo || pesoEntradaNuevo <= 0) return json_(false, "El peso de entrada debe ser mayor a cero.");

      var idNuevo = crearIdFrutaProveedor_(ss, proveedorIniciales);
      var ahoraInicio = new Date();
      var idLoteTecnicoNuevo = crearUuid_();
      var idSesionProduccion = crearUuid_();
      sheetFNuevo.appendRow([idNuevo, params.fecha || Utilities.formatDate(ahoraInicio, Session.getScriptTimeZone(), "dd/MM/yyyy"), params.nombrePedido, proveedorIniciales, params.frutaTipo, pesoEntradaNuevo, "", "", "En proceso", "", "", "", "Pendiente", "SI", "", idLoteTecnicoNuevo]);
      sheetTNuevo.appendRow([idNuevo, params.nombrePedido, params.frutaTipo, ahoraInicio, "", 0, 0, 0, "", "", idSesionProduccion]);
      return ContentService.createTextOutput(JSON.stringify({status: "success", newId: idNuevo, idLoteTecnico: idLoteTecnicoNuevo, idSesionProduccion: idSesionProduccion})).setMimeType(ContentService.MimeType.JSON);
    }

    if (params.action === "pausarLoteFrutas") {
      var sheetFPausa = ss.getSheetByName("Pedidos_Fruta");
      var sheetTPausa = ss.getSheetByName("Tiempos_Procesado");
      var filaFPausa = buscarFilaPorId_(sheetFPausa, params.idPedido);
      var filaTPausa = buscarFilaPorId_(sheetTPausa, params.idPedido);
      if (filaFPausa === -1 || filaTPausa === -1) return json_(false, "No se encontro el lote.");
      var estadoActualPausa = sheetFPausa.getRange(filaFPausa, 9).getValue();
      if (estadoActualPausa === "Finalizado") return json_(false, "El lote ya esta finalizado.");
      if (estadoActualPausa === "Pausado") return json_(false, "El lote ya esta pausado.");
      var ahoraPausa = new Date();
      var motivoActual = sheetTPausa.getRange(filaTPausa, 9).getValue();
      var motivoNuevo = Utilities.formatDate(ahoraPausa, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm") + " - " + (params.motivoPausa || "Sin motivo");
      sheetFPausa.getRange(filaFPausa, 9).setValue("Pausado");
      sheetTPausa.getRange(filaTPausa, 9).setValue(motivoActual ? motivoActual + " | " + motivoNuevo : motivoNuevo);
      sheetTPausa.getRange(filaTPausa, 10).setValue(ahoraPausa);
      return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    if (params.action === "retomarLoteFrutas") {
      var sheetFRetoma = ss.getSheetByName("Pedidos_Fruta");
      var sheetTRetoma = ss.getSheetByName("Tiempos_Procesado");
      var filaFRetoma = buscarFilaPorId_(sheetFRetoma, params.idPedido);
      var filaTRetoma = buscarFilaPorId_(sheetTRetoma, params.idPedido);
      if (filaFRetoma === -1 || filaTRetoma === -1) return json_(false, "No se encontro el lote.");
      if (sheetFRetoma.getRange(filaFRetoma, 9).getValue() !== "Pausado") return json_(false, "Solo se pueden retomar lotes pausados.");
      var ahoraRetoma = new Date();
      var pausaInicio = sheetTRetoma.getRange(filaTRetoma, 10).getValue();
      var pausadoPrevio = numeroSeguro_(sheetTRetoma.getRange(filaTRetoma, 7).getValue());
      if (pausaInicio) pausadoPrevio += minutosEntre_(pausaInicio, ahoraRetoma);
      sheetFRetoma.getRange(filaFRetoma, 9).setValue("En proceso");
      sheetTRetoma.getRange(filaTRetoma, 7).setValue(redondearMin_(pausadoPrevio));
      sheetTRetoma.getRange(filaTRetoma, 10).setValue("");
      return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    if (params.action === "finalizarLoteFrutas") {
      var sheetFFin = ss.getSheetByName("Pedidos_Fruta");
      var sheetTFin = ss.getSheetByName("Tiempos_Procesado");
      var filaFFin = buscarFilaPorId_(sheetFFin, params.idPedido);
      var filaTFin = buscarFilaPorId_(sheetTFin, params.idPedido);
      if (filaFFin === -1 || filaTFin === -1) return json_(false, "No se encontro el lote.");

      var pesoEntradaFin = numeroSeguro_(sheetFFin.getRange(filaFFin, 6).getValue());
      var pesoFinalFin = numeroSeguro_(params.pesoFinal);
      var pesoAveriaFin = numeroSeguro_(params.pesoAveria);
      var pesoDesechoFin = numeroSeguro_(params.pesoDesecho);
      if (!pesoProcesadoValido_(pesoEntradaFin, pesoFinalFin)) return json_(false, "El peso final debe ser mayor a cero y no superar el peso de entrada.");
      if (pesoAveriaFin < 0 || pesoDesechoFin < 0) return json_(false, "Averia y desecho no pueden ser negativos.");

      var ahoraFin = new Date();
      var fechaInicio = sheetTFin.getRange(filaTFin, 4).getValue();
      var pausaActiva = sheetTFin.getRange(filaTFin, 10).getValue();
      var tiempoPausado = numeroSeguro_(sheetTFin.getRange(filaTFin, 7).getValue());
      if (pausaActiva) tiempoPausado += minutosEntre_(pausaActiva, ahoraFin);
      var tiempoTotal = fechaInicio ? minutosEntre_(fechaInicio, ahoraFin) : 0;
      var tiempoProduccion = Math.max(0, tiempoTotal - tiempoPausado);

      sheetFFin.getRange(filaFFin, 7).setValue(pesoFinalFin);
      sheetFFin.getRange(filaFFin, 8).setValue(pesoFinalFin / pesoEntradaFin);
      sheetFFin.getRange(filaFFin, 9).setValue("Finalizado");
      sheetFFin.getRange(filaFFin, 10).setValue(pesoAveriaFin);
      sheetFFin.getRange(filaFFin, 11).setValue(pesoDesechoFin);
      sheetFFin.getRange(filaFFin, 12).setValue(params.notaFinal || "");
      sheetFFin.getRange(filaFFin, 15).setValue(pesoFinalFin);

      sheetTFin.getRange(filaTFin, 5).setValue(ahoraFin);
      sheetTFin.getRange(filaTFin, 6).setValue(redondearMin_(tiempoTotal));
      sheetTFin.getRange(filaTFin, 7).setValue(redondearMin_(tiempoPausado));
      sheetTFin.getRange(filaTFin, 8).setValue(redondearMin_(tiempoProduccion));
      sheetTFin.getRange(filaTFin, 10).setValue("");
      calcularMateriaPrima(params.idPedido);
      return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
    }
    // -- OPERATIVO: REGISTRO DE EMPAQUE --
    if (params.action === "registroEmpaquePedido") {
      var sheetEmpaqueSesiones = getOrCreateSheet_(ss, "Empaque_Sesiones", ["ID_Sesion_Empaque", "Fecha", "ID_Pedido_Cliente", "Cliente", "Codigo_Cliente", "Area_Detalle", "Producto_Detalle", "Presentacion_Detalle", "Unidad", "Cajas_Hechas", "Presentacion_Lb", "ID_Lote_Fruta", "Fruta", "Estado_Uso_Lote", "Sobrante_Lote_Lb", "Responsable", "Nota", "Estado_Registro", "Fecha_Reversion", "Motivo_Reversion", "ID_Linea", "ID_Asignacion", "ID_Lote_Tecnico", "ID_Pedido_Tecnico", "Tipo_Fuente", "ID_Produccion", "Codigo_Produccion", "Categoria_Unidades", "Unidades_Por_Caja", "Unidades_Consumidas", "Cantidad_Por_Caja", "Cantidad_Fuente_Anterior", "Cantidad_Fuente_Sobrante", "Cantidad_Fuente_Consumida", "Unidad_Fuente", "ID_Producto_Fuente", "ID_Producto_Destino"]);
      var sheetAsignacionesEmpaque = getOrCreateSheet_(ss, "Asignaciones_Pedido", ["ID_Asignacion", "Fecha", "ID_Pedido_Tecnico", "ID_Linea", "ID_Lote_Tecnico", "ID_Sesion", "Area", "Cantidad", "Unidad", "Estado_Asignacion", "Fecha_Reversion", "Motivo_Reversion", "ID_Pedido_Visible", "ID_Lote_Visible", "Cantidad_Fuente_Consumida", "Unidad_Fuente", "ID_Producto_Fuente", "ID_Producto_Destino"]);
      var sheetDetallePedido = ss.getSheetByName("Detalle_Pedido_Cliente");
      var sheetPedidoCliente = ss.getSheetByName("Pedidos_Cliente");
      var sheetFrutaEmpaque = ss.getSheetByName("Pedidos_Fruta");
      var sheetEmpaqueSalidas = getOrCreateSheet_(ss, "Empaque_Salidas", ["ID", "Nombre_Pedido", "Fruta", "Fecha_Empaque", "Cajas", "Estado_Empaque"]);
      if (!sheetDetallePedido || !sheetPedidoCliente || !sheetFrutaEmpaque) return json_(false, "Faltan hojas de pedidos o frutas.");

      var cajasHechas = numeroEnteroSeguro_(params.cajas);
      var presentacionLb = numeroSeguro_(params.presentacionLb);
      var sobranteLote = numeroSeguro_(params.sobranteLoteLb);
      if (!params.idPedidoCliente) return json_(false, "Seleccione pedido de cliente.");
      if (!params.idLoteFruta) return json_(false, "Seleccione lote de fruta.");
      if (!cajasHechas || cajasHechas <= 0) return json_(false, "Ingrese cajas hechas.");
      if (!presentacionLb || presentacionLb <= 0) return json_(false, "Ingrese presentacion en libras.");
      if (params.estadoUsoLote === "Empacado Parcial" && sobranteLote <= 0) return json_(false, "Ingrese sobrante del lote parcial.");

      var filaDetallePedido = params.idLinea
        ? buscarFilaPorColumna_(sheetDetallePedido, 11, params.idLinea)
        : buscarFilaDetallePedido_(sheetDetallePedido, params.idPedidoCliente, params.areaDetalle, params.productoDetalle, params.presentacionDetalle, params.unidadDetalle);
      if (filaDetallePedido === -1) return json_(false, "No se encontro la linea del armado.");
      if (sheetDetallePedido.getRange(filaDetallePedido, 1).getValue() != params.idPedidoCliente) return json_(false, "La linea no pertenece al pedido seleccionado.");

      var filaPedidoCliente = buscarFilaPorId_(sheetPedidoCliente, params.idPedidoCliente);
      if (filaPedidoCliente === -1) return json_(false, "No se encontro el pedido de cliente.");
      var estadoPedidoGuardado = sheetPedidoCliente.getRange(filaPedidoCliente, 6).getValue();
      var visiblePedidoGuardado = sheetPedidoCliente.getRange(filaPedidoCliente, 7).getValue();
      if (normalizarTexto_(estadoPedidoGuardado) === "cancelado" || normalizarTexto_(estadoPedidoGuardado) === "completado" || normalizarTexto_(visiblePedidoGuardado) === "no") {
        return json_(false, "El pedido seleccionado ya no acepta registros.");
      }

      var filaLoteEmpaque = buscarFilaPorId_(sheetFrutaEmpaque, params.idLoteFruta);
      if (filaLoteEmpaque === -1) return json_(false, "No se encontro el lote de fruta.");

      var estadoDetalleGuardado = sheetDetallePedido.getRange(filaDetallePedido, 8).getValue();
      var visibleDetalleGuardado = sheetDetallePedido.getRange(filaDetallePedido, 9).getValue();
      if (normalizarTexto_(estadoDetalleGuardado) === "completado" || normalizarTexto_(estadoDetalleGuardado) === "cancelado" || normalizarTexto_(visibleDetalleGuardado) === "no") {
        return json_(false, "La linea seleccionada ya no acepta registros.");
      }

      var productoDetalleGuardado = sheetDetallePedido.getRange(filaDetallePedido, 3).getValue();
      var productoBaseGuardado = sheetDetallePedido.getRange(filaDetallePedido, 15).getValue() || productoDetalleGuardado;
      var frutaLoteGuardada = sheetFrutaEmpaque.getRange(filaLoteEmpaque, 5).getValue();
      if (normalizarTexto_(productoBaseGuardado) !== normalizarTexto_(frutaLoteGuardada)) {
        return json_(false, "La fruta del lote no coincide con la fruta solicitada en el pedido.");
      }

      var estadoFrutaEmpaque = sheetFrutaEmpaque.getRange(filaLoteEmpaque, 9).getValue();
      var estadoActualEmpaque = sheetFrutaEmpaque.getRange(filaLoteEmpaque, 13).getValue();
      var visibleLoteEmpaque = sheetFrutaEmpaque.getRange(filaLoteEmpaque, 14).getValue();
      if (normalizarTexto_(estadoFrutaEmpaque) !== "finalizado" || normalizarTexto_(estadoActualEmpaque) === "empacado total" || normalizarTexto_(visibleLoteEmpaque) === "no") {
        return json_(false, "El lote seleccionado ya no esta disponible para empaque.");
      }

      var disponibleGuardado = sheetFrutaEmpaque.getRange(filaLoteEmpaque, 15).getValue();
      var disponibleActual = disponibleGuardado !== "" && typeof disponibleGuardado !== "undefined"
        ? numeroSeguro_(disponibleGuardado)
        : numeroSeguro_(sheetFrutaEmpaque.getRange(filaLoteEmpaque, 7).getValue());
      if (disponibleActual <= 0) return json_(false, "El lote seleccionado no tiene peso disponible.");
      if (params.estadoUsoLote === "Empacado Parcial" && sobranteLote >= disponibleActual) return json_(false, "El sobrante debe ser menor al disponible actual.");

      var cantidadPedidaDetalle = numeroSeguro_(sheetDetallePedido.getRange(filaDetallePedido, 6).getValue());
      var cantidadCompletadaAnterior = numeroSeguro_(sheetDetallePedido.getRange(filaDetallePedido, 7).getValue());
      if (cajasHechas > cantidadPedidaDetalle - cantidadCompletadaAnterior) {
        return json_(false, "Las cajas ingresadas exceden la cantidad pendiente de la linea.");
      }
      var cantidadCompletadaDetalle = cantidadCompletadaAnterior + cajasHechas;
      var estadoDetalle = "Parcial";
      if (cantidadCompletadaDetalle <= 0) estadoDetalle = "Pendiente";
      if (cantidadCompletadaDetalle >= cantidadPedidaDetalle) estadoDetalle = "Completado";
      sheetDetallePedido.getRange(filaDetallePedido, 7).setValue(cantidadCompletadaDetalle);
      sheetDetallePedido.getRange(filaDetallePedido, 8).setValue(estadoDetalle);

      var estadoUsoLote = params.estadoUsoLote === "Empacado Parcial" ? "Empacado Parcial" : "Empacado Total";
      var nuevoDisponibleFruta = estadoUsoLote === "Empacado Total" ? 0 : sobranteLote;
      var cantidadConsumidaFruta = Math.max(0, disponibleActual - nuevoDisponibleFruta);
      sheetFrutaEmpaque.getRange(filaLoteEmpaque, 13).setValue(estadoUsoLote);
      sheetFrutaEmpaque.getRange(filaLoteEmpaque, 15).setValue(nuevoDisponibleFruta);

      var idSesionEmpaque = crearIdSesionEmpaque_(ss);
      var idLineaGuardado = sheetDetallePedido.getRange(filaDetallePedido, 11).getValue() || crearUuid_();
      var idPedidoTecnicoGuardado = sheetDetallePedido.getRange(filaDetallePedido, 12).getValue() || sheetPedidoCliente.getRange(filaPedidoCliente, 9).getValue() || crearUuid_();
      var idLoteTecnicoGuardado = sheetFrutaEmpaque.getRange(filaLoteEmpaque, 16).getValue() || crearUuid_();
      var idAsignacionEmpaque = crearUuid_();
      sheetDetallePedido.getRange(filaDetallePedido, 11).setValue(idLineaGuardado);
      sheetDetallePedido.getRange(filaDetallePedido, 12).setValue(idPedidoTecnicoGuardado);
      sheetFrutaEmpaque.getRange(filaLoteEmpaque, 16).setValue(idLoteTecnicoGuardado);
      var fechaEmpaque = params.fecha || new Date();
      sheetEmpaqueSesiones.appendRow([
        idSesionEmpaque,
        fechaEmpaque,
        params.idPedidoCliente,
        sheetPedidoCliente.getRange(filaPedidoCliente, 3).getValue() || "",
        sheetPedidoCliente.getRange(filaPedidoCliente, 4).getValue() || "",
        sheetDetallePedido.getRange(filaDetallePedido, 2).getValue() || "",
        productoDetalleGuardado,
        sheetDetallePedido.getRange(filaDetallePedido, 4).getValue() || "",
        sheetDetallePedido.getRange(filaDetallePedido, 5).getValue() || "",
        cajasHechas,
        presentacionLb,
        params.idLoteFruta,
        frutaLoteGuardada,
        estadoUsoLote,
        estadoUsoLote === "Empacado Total" ? 0 : sobranteLote,
        params.responsable || "",
        params.nota || "",
        "Activa",
        "",
        "",
        idLineaGuardado,
        idAsignacionEmpaque,
        idLoteTecnicoGuardado,
        idPedidoTecnicoGuardado,
        "Fruta",
        "",
        "",
        "",
        0,
        0,
        presentacionLb,
        disponibleActual,
        nuevoDisponibleFruta,
        cantidadConsumidaFruta,
        "lb",
        "",
        sheetDetallePedido.getRange(filaDetallePedido, 14).getValue() || ""
      ]);
      sheetAsignacionesEmpaque.appendRow([
        idAsignacionEmpaque,
        fechaEmpaque,
        idPedidoTecnicoGuardado,
        idLineaGuardado,
        idLoteTecnicoGuardado,
        idSesionEmpaque,
        "Empaque",
        cajasHechas,
        "cajas",
        "Activa",
        "",
        "",
        params.idPedidoCliente,
        params.idLoteFruta,
        cantidadConsumidaFruta,
        "lb",
        "",
        sheetDetallePedido.getRange(filaDetallePedido, 14).getValue() || ""
      ]);

      var dataEmpaqueNueva = sheetEmpaqueSalidas.getDataRange().getValues();
      var filaEmpaqueSalida = -1;
      for (var es = 1; es < dataEmpaqueNueva.length; es++) {
        if (dataEmpaqueNueva[es][0] == params.idLoteFruta) {
          filaEmpaqueSalida = es + 1;
          break;
        }
      }
      if (filaEmpaqueSalida === -1) {
        sheetEmpaqueSalidas.appendRow([params.idLoteFruta, params.idPedidoCliente, frutaLoteGuardada, fechaEmpaque, cajasHechas, estadoUsoLote]);
      } else {
        var cajasPrevias = numeroEnteroSeguro_(sheetEmpaqueSalidas.getRange(filaEmpaqueSalida, 5).getValue());
        sheetEmpaqueSalidas.getRange(filaEmpaqueSalida, 2).setValue(params.idPedidoCliente);
        sheetEmpaqueSalidas.getRange(filaEmpaqueSalida, 4).setValue(fechaEmpaque);
        sheetEmpaqueSalidas.getRange(filaEmpaqueSalida, 5).setValue(cajasPrevias + cajasHechas);
        sheetEmpaqueSalidas.getRange(filaEmpaqueSalida, 6).setValue(estadoUsoLote);
      }

      recalcularEstadoPedidoCliente_(ss, params.idPedidoCliente);
      calcularMateriaPrima(params.idLoteFruta);
      return ContentService.createTextOutput(JSON.stringify({status: "success", idSesionEmpaque: idSesionEmpaque})).setMimeType(ContentService.MimeType.JSON);
    }

    if (params.action === "registroEmpaqueProduccion") {
      var headersSesionesProduccion = ["ID_Sesion_Empaque", "Fecha", "ID_Pedido_Cliente", "Cliente", "Codigo_Cliente", "Area_Detalle", "Producto_Detalle", "Presentacion_Detalle", "Unidad", "Cajas_Hechas", "Presentacion_Lb", "ID_Lote_Fruta", "Fruta", "Estado_Uso_Lote", "Sobrante_Lote_Lb", "Responsable", "Nota", "Estado_Registro", "Fecha_Reversion", "Motivo_Reversion", "ID_Linea", "ID_Asignacion", "ID_Lote_Tecnico", "ID_Pedido_Tecnico", "Tipo_Fuente", "ID_Produccion", "Codigo_Produccion", "Categoria_Unidades", "Unidades_Por_Caja", "Unidades_Consumidas", "Cantidad_Por_Caja", "Cantidad_Fuente_Anterior", "Cantidad_Fuente_Sobrante", "Cantidad_Fuente_Consumida", "Unidad_Fuente", "ID_Producto_Fuente", "ID_Producto_Destino"];
      var sheetSesionesProduccion = getOrCreateSheet_(ss, "Empaque_Sesiones", headersSesionesProduccion);
      var sheetAsignacionesProduccion = getOrCreateSheet_(ss, "Asignaciones_Pedido", ["ID_Asignacion", "Fecha", "ID_Pedido_Tecnico", "ID_Linea", "ID_Lote_Tecnico", "ID_Sesion", "Area", "Cantidad", "Unidad", "Estado_Asignacion", "Fecha_Reversion", "Motivo_Reversion", "ID_Pedido_Visible", "ID_Lote_Visible", "Cantidad_Fuente_Consumida", "Unidad_Fuente", "ID_Producto_Fuente", "ID_Producto_Destino"]);
      var sheetDetalleProduccion = ss.getSheetByName("Detalle_Pedido_Cliente");
      var sheetPedidoProduccion = ss.getSheetByName("Pedidos_Cliente");
      var sheetFuenteProduccion = ss.getSheetByName("Produccion_Areas");
      if (!sheetDetalleProduccion || !sheetPedidoProduccion || !sheetFuenteProduccion) return json_(false, "Faltan hojas de pedidos o produccion.");

      var cajasProduccion = numeroEnteroSeguro_(params.cajas);
      var cantidadPorCajaProduccion = numeroSeguro_(params.cantidadPorCaja || params.unidadesPorCaja);
      var sobranteFuenteProduccion = numeroSeguro_(params.sobranteFuente);
      var usoParcialProduccion = normalizarTexto_(params.estadoUsoLote).indexOf("parcial") !== -1;
      if (!params.idPedidoCliente || !params.idLinea) return json_(false, "Seleccione pedido y linea.");
      if (!params.idProduccion) return json_(false, "Seleccione una produccion disponible.");
      if (numeroSeguro_(params.cajas) !== cajasProduccion) return json_(false, "Las cajas deben ser un numero entero.");
      if (cajasProduccion <= 0 || cantidadPorCajaProduccion <= 0) return json_(false, "Ingrese cajas y contenido por caja validos.");

      var filaDetalleProduccion = buscarFilaPorColumna_(sheetDetalleProduccion, 11, params.idLinea);
      var filaPedidoProduccion = buscarFilaPorId_(sheetPedidoProduccion, params.idPedidoCliente);
      var filaFuenteProduccion = buscarFilaPorColumna_(sheetFuenteProduccion, 1, params.idProduccion);
      if (filaDetalleProduccion === -1 || filaPedidoProduccion === -1 || filaFuenteProduccion === -1) {
        return json_(false, "No se encontro el pedido, la linea o la produccion.");
      }
      if (sheetDetalleProduccion.getRange(filaDetalleProduccion, 1).getValue() != params.idPedidoCliente) {
        return json_(false, "La linea no pertenece al pedido seleccionado.");
      }

      var estadoPedidoProduccion = sheetPedidoProduccion.getRange(filaPedidoProduccion, 6).getValue();
      var visiblePedidoProduccion = sheetPedidoProduccion.getRange(filaPedidoProduccion, 7).getValue();
      var estadoDetalleProduccion = sheetDetalleProduccion.getRange(filaDetalleProduccion, 8).getValue();
      var visibleDetalleProduccion = sheetDetalleProduccion.getRange(filaDetalleProduccion, 9).getValue();
      if (
        normalizarTexto_(estadoPedidoProduccion) === "cancelado" ||
        normalizarTexto_(estadoPedidoProduccion) === "completado" ||
        normalizarTexto_(visiblePedidoProduccion) === "no" ||
        normalizarTexto_(estadoDetalleProduccion) === "cancelado" ||
        normalizarTexto_(estadoDetalleProduccion) === "completado" ||
        normalizarTexto_(visibleDetalleProduccion) === "no"
      ) {
        return json_(false, "El pedido o la linea ya no acepta registros.");
      }

      var areaDetalleProduccion = normalizarAreaOperativa_(sheetDetalleProduccion.getRange(filaDetalleProduccion, 2).getValue());
      var areaFuenteProduccion = normalizarAreaOperativa_(sheetFuenteProduccion.getRange(filaFuenteProduccion, 4).getValue());
      if (areaDetalleProduccion !== areaFuenteProduccion) {
        return json_(false, "La produccion seleccionada no corresponde al area de la linea.");
      }
      var idProductoFuenteProduccion = sheetFuenteProduccion.getRange(filaFuenteProduccion, 8).getValue();
      var idProductoDetalleProduccion = sheetDetalleProduccion.getRange(filaDetalleProduccion, 14).getValue();
      if (normalizarTexto_(sheetFuenteProduccion.getRange(filaFuenteProduccion, 20).getValue()) === "no") {
        return json_(false, "La produccion seleccionada esta oculta.");
      }

      var unidadFuenteProduccion = sheetFuenteProduccion.getRange(filaFuenteProduccion, 21).getValue() || "unidad";
      var disponibleGuardadoProduccion = sheetFuenteProduccion.getRange(filaFuenteProduccion, 22).getValue();
      var disponibleProduccion = disponibleGuardadoProduccion !== "" && typeof disponibleGuardadoProduccion !== "undefined"
        ? numeroSeguro_(disponibleGuardadoProduccion)
        : numeroSeguro_(sheetFuenteProduccion.getRange(filaFuenteProduccion, 15).getValue()) + numeroSeguro_(sheetFuenteProduccion.getRange(filaFuenteProduccion, 16).getValue());
      if (disponibleProduccion <= 0) return json_(false, "La produccion seleccionada ya no tiene cantidad disponible.");
      if (usoParcialProduccion && (sobranteFuenteProduccion <= 0 || sobranteFuenteProduccion >= disponibleProduccion)) {
        return json_(false, "El sobrante debe ser mayor a cero y menor a la cantidad disponible.");
      }

      var pedidaProduccion = numeroEnteroSeguro_(sheetDetalleProduccion.getRange(filaDetalleProduccion, 6).getValue());
      var completadaAnteriorProduccion = numeroEnteroSeguro_(sheetDetalleProduccion.getRange(filaDetalleProduccion, 7).getValue());
      if (cajasProduccion > pedidaProduccion - completadaAnteriorProduccion) {
        return json_(false, "Las cajas ingresadas exceden la cantidad pendiente de la linea.");
      }

      var nuevoDisponibleProduccion = usoParcialProduccion ? sobranteFuenteProduccion : 0;
      var cantidadConsumidaProduccion = disponibleProduccion - nuevoDisponibleProduccion;
      if (cantidadConsumidaProduccion <= 0) return json_(false, "La cantidad consumida debe ser mayor a cero.");
      sheetFuenteProduccion.getRange(filaFuenteProduccion, 21).setValue(unidadFuenteProduccion);
      sheetFuenteProduccion.getRange(filaFuenteProduccion, 22).setValue(nuevoDisponibleProduccion);
      actualizarEstadoDisponibilidadProduccion_(sheetFuenteProduccion, filaFuenteProduccion);

      var completadaProduccion = completadaAnteriorProduccion + cajasProduccion;
      sheetDetalleProduccion.getRange(filaDetalleProduccion, 7).setValue(completadaProduccion);
      sheetDetalleProduccion.getRange(filaDetalleProduccion, 8).setValue(completadaProduccion >= pedidaProduccion ? "Completado" : "Parcial");

      var idSesionProduccionEmpaque = crearIdSesionEmpaque_(ss);
      var idAsignacionProduccion = crearUuid_();
      var idPedidoTecnicoProduccion = sheetDetalleProduccion.getRange(filaDetalleProduccion, 12).getValue() || sheetPedidoProduccion.getRange(filaPedidoProduccion, 9).getValue() || crearUuid_();
      var codigoFuenteProduccion = sheetFuenteProduccion.getRange(filaFuenteProduccion, 2).getValue();
      var fechaEmpaqueProduccion = params.fecha || new Date();
      sheetSesionesProduccion.appendRow([
        idSesionProduccionEmpaque,
        fechaEmpaqueProduccion,
        params.idPedidoCliente,
        sheetPedidoProduccion.getRange(filaPedidoProduccion, 3).getValue() || "",
        sheetPedidoProduccion.getRange(filaPedidoProduccion, 4).getValue() || "",
        sheetDetalleProduccion.getRange(filaDetalleProduccion, 2).getValue() || "",
        sheetDetalleProduccion.getRange(filaDetalleProduccion, 3).getValue() || "",
        sheetDetalleProduccion.getRange(filaDetalleProduccion, 4).getValue() || "",
        sheetDetalleProduccion.getRange(filaDetalleProduccion, 5).getValue() || "cajas",
        cajasProduccion,
        0,
        "",
        "",
        nuevoDisponibleProduccion > 0 ? "Uso parcial" : "Uso total",
        0,
        params.responsable || "",
        params.nota || "",
        "Activa",
        "",
        "",
        params.idLinea,
        idAsignacionProduccion,
        params.idProduccion,
        idPedidoTecnicoProduccion,
        "Produccion",
        params.idProduccion,
        codigoFuenteProduccion,
        "",
        cantidadPorCajaProduccion,
        cantidadConsumidaProduccion,
        cantidadPorCajaProduccion,
        disponibleProduccion,
        nuevoDisponibleProduccion,
        cantidadConsumidaProduccion,
        unidadFuenteProduccion,
        idProductoFuenteProduccion,
        idProductoDetalleProduccion
      ]);
      sheetAsignacionesProduccion.appendRow([
        idAsignacionProduccion,
        fechaEmpaqueProduccion,
        idPedidoTecnicoProduccion,
        params.idLinea,
        params.idProduccion,
        idSesionProduccionEmpaque,
        "Empaque",
        cajasProduccion,
        "cajas",
        "Activa",
        "",
        "",
        params.idPedidoCliente,
        codigoFuenteProduccion,
        cantidadConsumidaProduccion,
        unidadFuenteProduccion,
        idProductoFuenteProduccion,
        idProductoDetalleProduccion
      ]);

      recalcularEstadoPedidoCliente_(ss, params.idPedidoCliente);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        idSesionEmpaque: idSesionProduccionEmpaque,
        cantidadConsumida: cantidadConsumidaProduccion,
        unidadFuente: unidadFuenteProduccion
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (params.action === "registroEmpaque") {
      var sheetE = getOrCreateSheet_(ss, "Empaque_Salidas", ["ID", "Nombre_Pedido", "Fruta", "Fecha_Empaque", "Cajas", "Estado_Empaque"]);
      var dataE = sheetE.getDataRange().getValues();
      var found = false;
      for (var m = 1; m < dataE.length; m++) {
        if (dataE[m][0] === params.idPedido) {
          var filaE = m + 1;
          var nuevasCajas = (Number(dataE[m][4]) || 0) + Number(params.cajas);
          sheetE.getRange(filaE, 4).setValue(params.fechaEmpaque);
          sheetE.getRange(filaE, 5).setValue(nuevasCajas);
          sheetE.getRange(filaE, 6).setValue(params.estadoEmpaque);
          found = true; break;
        }
      }
      
      if (!found) sheetE.appendRow([params.idPedido, params.nombrePedido, params.frutaTipo, params.fechaEmpaque, params.cajas, params.estadoEmpaque]);
      
      var sheetF2 = ss.getSheetByName("Pedidos_Fruta");
      var dataF2 = sheetF2.getDataRange().getValues();
      for (var n = 1; n < dataF2.length; n++) {
        if (dataF2[n][0] === params.idPedido) {
          sheetF2.getRange(n + 1, 13).setValue(params.estadoEmpaque);
          break;
        }
      }
      
      calcularMateriaPrima(params.idPedido);
      return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    // -- OPERATIVO: MOVIMIENTOS DE BODEGA / INVENTARIO --
    if (params.action === "registroBodega") {
      var sheetInv = getOrCreateSheet_(ss, "Inventario_Bodega", ["ID", "Producto", "Categoria", "Unidad", "Stock", "Ultima_Actualizacion", "Visible_App", "ID_Item_Tecnico"]);
      var sheetMov = getOrCreateSheet_(ss, "Movimientos_Bodega", ["Fecha", "Tipo_Movimiento", "ID", "Producto", "Categoria", "Unidad", "Cantidad", "Stock_Anterior", "Stock_Nuevo", "Responsable", "Nota", "ID_Movimiento"]);
      var cantidad = Number(params.cantidad);

      if (!cantidad || cantidad <= 0) {
        return ContentService.createTextOutput(JSON.stringify({status: "error", message: "La cantidad debe ser mayor a cero."})).setMimeType(ContentService.MimeType.JSON);
      }

      var nombreItem = (params.nombreItem || "").toString().trim();
      if (!nombreItem) {
        return ContentService.createTextOutput(JSON.stringify({status: "error", message: "Debe indicar el producto o insumo."})).setMimeType(ContentService.MimeType.JSON);
      }

      var invData = sheetInv.getDataRange().getValues();
      var filaInv = -1;
      var idItem = params.idItem || "";
      var nombreNormalizado = normalizarTexto_(nombreItem);

      for (var bi = 1; bi < invData.length; bi++) {
        var idCoincide = idItem && invData[bi][0] == idItem;
        var nombreCoincide = normalizarTexto_(invData[bi][1]) === nombreNormalizado;
        if (idCoincide || nombreCoincide) {
          filaInv = bi + 1;
          idItem = invData[bi][0];
          break;
        }
      }

      if (filaInv === -1) {
        if (params.tipoMovimiento !== "Entrada") {
          return ContentService.createTextOutput(JSON.stringify({status: "error", message: "No se puede registrar salida de un producto que no existe."})).setMimeType(ContentService.MimeType.JSON);
        }

        idItem = crearIdBodega_(ss);
        sheetInv.appendRow([idItem, nombreItem, params.categoria || "", params.unidad || "", 0, "", "SI", crearUuid_()]);
        filaInv = sheetInv.getLastRow();
        invData = sheetInv.getDataRange().getValues();
      }

      var stockAnterior = Number(sheetInv.getRange(filaInv, 5).getValue()) || 0;
      var stockNuevo = params.tipoMovimiento === "Salida" ? stockAnterior - cantidad : stockAnterior + cantidad;

      if (stockNuevo < 0) {
        return ContentService.createTextOutput(JSON.stringify({status: "error", message: "La salida supera la existencia actual."})).setMimeType(ContentService.MimeType.JSON);
      }

      sheetInv.getRange(filaInv, 2).setValue(nombreItem);
      sheetInv.getRange(filaInv, 3).setValue(params.categoria || sheetInv.getRange(filaInv, 3).getValue());
      sheetInv.getRange(filaInv, 4).setValue(params.unidad || sheetInv.getRange(filaInv, 4).getValue());
      sheetInv.getRange(filaInv, 5).setValue(stockNuevo);
      sheetInv.getRange(filaInv, 6).setValue(params.fecha || new Date());
      sheetInv.getRange(filaInv, 7).setValue("SI");

      var idMovimientoBodega = crearUuid_();
      sheetMov.appendRow([
        params.fecha || new Date(),
        params.tipoMovimiento,
        idItem,
        nombreItem,
        params.categoria || sheetInv.getRange(filaInv, 3).getValue(),
        params.unidad || sheetInv.getRange(filaInv, 4).getValue(),
        cantidad,
        stockAnterior,
        stockNuevo,
        params.responsable || "",
        params.nota || "",
        idMovimientoBodega
      ]);

      return ContentService.createTextOutput(JSON.stringify({status: "success", idItem: idItem, idMovimiento: idMovimientoBodega, stockNuevo: stockNuevo})).setMimeType(ContentService.MimeType.JSON);
    }

  } finally {
    // Liberar siempre el bloqueo de peticiones
    lock.releaseLock();
  }
}

function calcularMateriaPrima(idPedido) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetFruta = ss.getSheetByName("Pedidos_Fruta");
  var dataFruta = sheetFruta.getDataRange().getValues();
  var totalPesoOut = 0; var pesoEntrada = 0; var nombrePedido = ""; var frutaTipo = "";
  
  for (var i = 1; i < dataFruta.length; i++) {
    if (dataFruta[i][0] == idPedido) {
      pesoEntrada = numeroSeguro_(dataFruta[i][5]);
      totalPesoOut = numeroSeguro_(dataFruta[i][6]);
      if (!pesoProcesadoValido_(pesoEntrada, totalPesoOut)) totalPesoOut = 0;
      nombrePedido = dataFruta[i][2]; frutaTipo = dataFruta[i][4]; break;
    }
  }
  
  var sheetEmpaque = ss.getSheetByName("Empaque_Salidas");
  var dataEmpaque = sheetEmpaque ? sheetEmpaque.getDataRange().getValues() : [];
  var totalCajas = 0;
  
  for (var j = 1; j < dataEmpaque.length; j++) {
    if (dataEmpaque[j][0] == idPedido) {
      totalCajas = numeroEnteroSeguro_(dataEmpaque[j][4]);
      if (!nombrePedido) nombrePedido = dataEmpaque[j][1];
      if (!frutaTipo) frutaTipo = dataEmpaque[j][2];
      break;
    }
  }
  
  var pesoPorCaja = totalCajas > 0 ? (totalPesoOut / totalCajas) : 0;
  var sheetKPI = getOrCreateSheet_(ss, "Control_Materia_Prima", ["ID", "Pedido", "Fruta", "Total_Peso_Procesado_Lb", "Total_Cajas", "Peso_Por_Caja"]);
  var dataKPI = sheetKPI.getDataRange().getValues();
  var filaKPIIndex = -1;
  
  for (var k = 1; k < dataKPI.length; k++) {
    if (dataKPI[k][0] == idPedido) { filaKPIIndex = k + 1; break; }
  }
  
  if (filaKPIIndex !== -1) {
    sheetKPI.getRange(filaKPIIndex, 4).setValue(totalPesoOut);
    sheetKPI.getRange(filaKPIIndex, 5).setValue(totalCajas);
    sheetKPI.getRange(filaKPIIndex, 6).setValue(pesoPorCaja);
  } else if (totalPesoOut > 0 || totalCajas > 0) {
    sheetKPI.appendRow([idPedido, nombrePedido, frutaTipo, totalPesoOut, totalCajas, pesoPorCaja]);
  }
}

function migrarEstructuraTecnica() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  asegurarEstructuraTecnica_(ss, true);
  return "Migracion tecnica completada.";
}

function asegurarEstructuraTecnica_(ss, forzar) {
  var properties = PropertiesService.getScriptProperties();
  var clave = "MIGRACION_TECNICA_V4_" + ss.getId();
  if (!forzar && properties.getProperty(clave) === "OK") return;

  var sheetClientes = getOrCreateSheet_(ss, "Clientes", ["Codigo_Cliente", "Nombre_Cliente", "Visible_App", "ID_Cliente"]);
  completarIdsTecnicos_(sheetClientes, 4, 1);
  var clientesData = sheetClientes.getDataRange().getValues();
  var clienteIdPorCodigo = {};
  for (var c = 1; c < clientesData.length; c++) {
    if (clientesData[c][0]) clienteIdPorCodigo[clientesData[c][0].toString()] = clientesData[c][3];
  }

  var sheetProductos = getOrCreateSheet_(ss, "Productos", ["ID_Producto", "Nombre_Base", "Presentacion", "Area_Responsable", "Producto_Base_Produccion", "Visible_App", "Fecha_Creacion", "Unidad_Produccion"]);
  completarIdsTecnicos_(sheetProductos, 1, 2);
  var productosData = sheetProductos.getDataRange().getValues();
  for (var prod = 1; prod < productosData.length; prod++) {
    if (!productosData[prod][0] || productosData[prod][7]) continue;
    sheetProductos.getRange(prod + 1, 8).setValue(normalizarTexto_(productosData[prod][3]) === "empaque" ? "lb" : "unidad");
  }
  var sheetProductosCliente = getOrCreateSheet_(ss, "Productos_Cliente", ["ID_Producto_Cliente", "ID_Cliente", "Codigo_Cliente", "ID_Producto", "Nombre_Comercial", "Visible_App", "Fecha_Creacion"]);
  completarIdsTecnicos_(sheetProductosCliente, 1, 5);
  var productosClienteData = sheetProductosCliente.getDataRange().getValues();
  for (var pc = 1; pc < productosClienteData.length; pc++) {
    if (!productosClienteData[pc][1] && clienteIdPorCodigo[productosClienteData[pc][2]]) {
      sheetProductosCliente.getRange(pc + 1, 2).setValue(clienteIdPorCodigo[productosClienteData[pc][2]]);
    }
  }

  var sheetPedidos = getOrCreateSheet_(ss, "Pedidos_Cliente", ["ID_Pedido", "Fecha_Creacion", "Cliente", "Codigo_Cliente", "Fecha_Carga", "Estado_Pedido", "Visible_App", "Nota", "ID_Pedido_Tecnico", "ID_Cliente"]);
  completarIdsTecnicos_(sheetPedidos, 9, 1);
  var pedidosData = sheetPedidos.getDataRange().getValues();
  var pedidoTecnicoPorVisible = {};
  for (var p = 1; p < pedidosData.length; p++) {
    if (!pedidosData[p][0]) continue;
    var idClientePedido = pedidosData[p][9] || clienteIdPorCodigo[pedidosData[p][3]] || "";
    if (idClientePedido && !pedidosData[p][9]) sheetPedidos.getRange(p + 1, 10).setValue(idClientePedido);
    pedidoTecnicoPorVisible[pedidosData[p][0]] = pedidosData[p][8];
  }

  var sheetDetalle = getOrCreateSheet_(ss, "Detalle_Pedido_Cliente", ["ID_Pedido", "Area", "Producto", "Presentacion", "Unidad", "Cantidad_Pedida", "Cantidad_Completada", "Estado_Detalle", "Visible_App", "Nota", "ID_Linea", "ID_Pedido_Tecnico", "ID_Producto_Cliente", "ID_Producto", "Producto_Base_Produccion"]);
  completarIdsTecnicos_(sheetDetalle, 11, 1);
  var detalleData = sheetDetalle.getDataRange().getValues();
  var detallePorClave = {};
  for (var d = 1; d < detalleData.length; d++) {
    if (!detalleData[d][0]) continue;
    if (!detalleData[d][11] && pedidoTecnicoPorVisible[detalleData[d][0]]) {
      sheetDetalle.getRange(d + 1, 12).setValue(pedidoTecnicoPorVisible[detalleData[d][0]]);
      detalleData[d][11] = pedidoTecnicoPorVisible[detalleData[d][0]];
    }
    if (!detalleData[d][14] && normalizarTexto_(detalleData[d][1]) === "empaque") {
      sheetDetalle.getRange(d + 1, 15).setValue(detalleData[d][2]);
      detalleData[d][14] = detalleData[d][2];
    }
    var claveDetalle = crearClaveDetalle_(detalleData[d][0], detalleData[d][1], detalleData[d][2], detalleData[d][3], detalleData[d][4]);
    if (!detallePorClave[claveDetalle]) detallePorClave[claveDetalle] = detalleData[d];
  }

  var sheetFrutas = getOrCreateSheet_(ss, "Pedidos_Fruta", ["ID", "Fecha", "Nombre_Pedido", "Proveedor_Iniciales", "Fruta", "Peso_Neto_Entrada_Lb", "Peso_Neto_Final_Lb", "Rendimiento_Peso", "Estado_Frutas", "Peso_Averia_Lb", "Peso_Desecho_Lb", "Nota_Final", "Estado_Empaque", "Visible_App", "Peso_Disponible_Empaque_Lb", "ID_Lote_Tecnico"]);
  completarIdsTecnicos_(sheetFrutas, 16, 1);
  var frutasData = sheetFrutas.getDataRange().getValues();
  var loteTecnicoPorVisible = {};
  for (var f = 1; f < frutasData.length; f++) {
    if (frutasData[f][0]) loteTecnicoPorVisible[frutasData[f][0]] = frutasData[f][15];
  }

  var sheetTiempos = getOrCreateSheet_(ss, "Tiempos_Procesado", ["ID", "Nombre_Pedido", "Fruta", "FechaHora_Inicio", "FechaHora_Finalizacion", "Tiempo_Total_Min", "Tiempo_Pausado_Min", "Tiempo_Produccion_Min", "Motivo_Pausa", "Pausa_Activa_Desde", "ID_Sesion_Produccion"]);
  completarIdsTecnicos_(sheetTiempos, 11, 1);

  var sheetInventario = getOrCreateSheet_(ss, "Inventario_Bodega", ["ID", "Producto", "Categoria", "Unidad", "Stock", "Ultima_Actualizacion", "Visible_App", "ID_Item_Tecnico"]);
  completarIdsTecnicos_(sheetInventario, 8, 1);

  var sheetMovimientos = getOrCreateSheet_(ss, "Movimientos_Bodega", ["Fecha", "Tipo_Movimiento", "ID", "Producto", "Categoria", "Unidad", "Cantidad", "Stock_Anterior", "Stock_Nuevo", "Responsable", "Nota", "ID_Movimiento"]);
  completarIdsTecnicos_(sheetMovimientos, 12, 1);

  var sheetProduccion = getOrCreateSheet_(ss, "Produccion_Areas", ["ID_Produccion", "Codigo_Produccion", "Fecha", "Area", "ID_Cliente", "Codigo_Cliente", "Cliente", "ID_Producto", "ID_Producto_Cliente", "Producto", "Presentacion", "Unidades_Funcionales", "Unidades_Averia", "Total_Fisico", "Funcionales_Disponibles", "Averia_Disponible", "Estado_Disponibilidad", "Responsable", "Nota", "Visible_App", "Unidad_Medida", "Cantidad_Disponible"]);
  var produccionData = sheetProduccion.getDataRange().getValues();
  var unidadProductoPorId = {};
  var produccionTecnicaPorId = {};
  var productosActualizados = sheetProductos.getDataRange().getValues();
  for (var pu = 1; pu < productosActualizados.length; pu++) {
    if (productosActualizados[pu][0]) unidadProductoPorId[productosActualizados[pu][0]] = productosActualizados[pu][7] || "unidad";
  }
  for (var prd = 1; prd < produccionData.length; prd++) {
    if (!produccionData[prd][0]) continue;
    var unidadProduccionMigrada = produccionData[prd][20] || unidadProductoPorId[produccionData[prd][7]] || "unidad";
    if (!produccionData[prd][20]) {
      sheetProduccion.getRange(prd + 1, 21).setValue(unidadProduccionMigrada);
    }
    if (produccionData[prd][21] === "" || typeof produccionData[prd][21] === "undefined") {
      var disponibleMigrado = numeroSeguro_(produccionData[prd][14]) + numeroSeguro_(produccionData[prd][15]);
      sheetProduccion.getRange(prd + 1, 22).setValue(disponibleMigrado);
    }
    produccionTecnicaPorId[produccionData[prd][0]] = {
      unidad: unidadProduccionMigrada,
      idProducto: produccionData[prd][7] || ""
    };
  }

  var headersSesiones = ["ID_Sesion_Empaque", "Fecha", "ID_Pedido_Cliente", "Cliente", "Codigo_Cliente", "Area_Detalle", "Producto_Detalle", "Presentacion_Detalle", "Unidad", "Cajas_Hechas", "Presentacion_Lb", "ID_Lote_Fruta", "Fruta", "Estado_Uso_Lote", "Sobrante_Lote_Lb", "Responsable", "Nota", "Estado_Registro", "Fecha_Reversion", "Motivo_Reversion", "ID_Linea", "ID_Asignacion", "ID_Lote_Tecnico", "ID_Pedido_Tecnico", "Tipo_Fuente", "ID_Produccion", "Codigo_Produccion", "Categoria_Unidades", "Unidades_Por_Caja", "Unidades_Consumidas", "Cantidad_Por_Caja", "Cantidad_Fuente_Anterior", "Cantidad_Fuente_Sobrante", "Cantidad_Fuente_Consumida", "Unidad_Fuente", "ID_Producto_Fuente", "ID_Producto_Destino"];
  var sheetSesiones = getOrCreateSheet_(ss, "Empaque_Sesiones", headersSesiones);

  var sheetAsignaciones = getOrCreateSheet_(ss, "Asignaciones_Pedido", ["ID_Asignacion", "Fecha", "ID_Pedido_Tecnico", "ID_Linea", "ID_Lote_Tecnico", "ID_Sesion", "Area", "Cantidad", "Unidad", "Estado_Asignacion", "Fecha_Reversion", "Motivo_Reversion", "ID_Pedido_Visible", "ID_Lote_Visible", "Cantidad_Fuente_Consumida", "Unidad_Fuente", "ID_Producto_Fuente", "ID_Producto_Destino"]);
  var asignacionesData = sheetAsignaciones.getDataRange().getValues();
  var asignacionesExistentes = {};
  for (var a = 1; a < asignacionesData.length; a++) {
    if (asignacionesData[a][0]) asignacionesExistentes[asignacionesData[a][0]] = a + 1;
  }

  var sesionesData = sheetSesiones.getDataRange().getValues();
  for (var s = 1; s < sesionesData.length; s++) {
    if (!sesionesData[s][0]) continue;
    var claveSesion = crearClaveDetalle_(sesionesData[s][2], sesionesData[s][5], sesionesData[s][6], sesionesData[s][7], sesionesData[s][8]);
    var detalleSesion = detallePorClave[claveSesion] || [];
    var idLinea = sesionesData[s][20] || detalleSesion[10] || "";
    var idAsignacion = sesionesData[s][21] || crearUuid_();
    var idLoteTecnico = sesionesData[s][22] || loteTecnicoPorVisible[sesionesData[s][11]] || "";
    var idPedidoTecnico = sesionesData[s][23] || pedidoTecnicoPorVisible[sesionesData[s][2]] || "";
    sheetSesiones.getRange(s + 1, 21, 1, 4).setValues([[idLinea, idAsignacion, idLoteTecnico, idPedidoTecnico]]);
    var tipoFuenteMigrada = sesionesData[s][24] || (sesionesData[s][11] ? "Fruta" : (sesionesData[s][25] ? "Produccion" : ""));
    var esProduccionMigrada = normalizarTexto_(tipoFuenteMigrada) === "produccion";
    var produccionTecnica = produccionTecnicaPorId[sesionesData[s][25]] || {};
    var cantidadPorCajaMigrada = numeroSeguro_(sesionesData[s][30] || sesionesData[s][28] || sesionesData[s][10]);
    var cantidadConsumidaMigrada = numeroSeguro_(sesionesData[s][33] || sesionesData[s][29]);
    if (!esProduccionMigrada && cantidadConsumidaMigrada <= 0) {
      cantidadConsumidaMigrada = numeroEnteroSeguro_(sesionesData[s][9]) * numeroSeguro_(sesionesData[s][10]);
    }
    var cantidadSobranteMigrada = numeroSeguro_(sesionesData[s][32] || sesionesData[s][14]);
    var unidadFuenteMigrada = sesionesData[s][34] || (esProduccionMigrada ? produccionTecnica.unidad || "unidad" : "lb");
    var idProductoFuenteMigrado = sesionesData[s][35] || (esProduccionMigrada ? produccionTecnica.idProducto || "" : "");
    var idProductoDestinoMigrado = sesionesData[s][36] || detalleSesion[13] || "";
    sheetSesiones.getRange(s + 1, 25).setValue(tipoFuenteMigrada);
    sheetSesiones.getRange(s + 1, 31, 1, 7).setValues([[
      cantidadPorCajaMigrada,
      sesionesData[s][31] || "",
      cantidadSobranteMigrada,
      cantidadConsumidaMigrada,
      unidadFuenteMigrada,
      idProductoFuenteMigrado,
      idProductoDestinoMigrado
    ]]);

    if (!asignacionesExistentes[idAsignacion]) {
      sheetAsignaciones.appendRow([
        idAsignacion,
        sesionesData[s][1],
        idPedidoTecnico,
        idLinea,
        idLoteTecnico,
        sesionesData[s][0],
        sesionesData[s][5] || "Empaque",
        numeroEnteroSeguro_(sesionesData[s][9]),
        sesionesData[s][8] || "cajas",
        normalizarTexto_(sesionesData[s][17] || "Activa") === "revertida" ? "Revertida" : "Activa",
        sesionesData[s][18] || "",
        sesionesData[s][19] || "",
        sesionesData[s][2],
        sesionesData[s][11] || sesionesData[s][26],
        cantidadConsumidaMigrada,
        unidadFuenteMigrada,
        idProductoFuenteMigrado,
        idProductoDestinoMigrado
      ]);
      asignacionesExistentes[idAsignacion] = sheetAsignaciones.getLastRow();
    } else {
      sheetAsignaciones.getRange(asignacionesExistentes[idAsignacion], 15, 1, 4).setValues([[
        cantidadConsumidaMigrada,
        unidadFuenteMigrada,
        idProductoFuenteMigrado,
        idProductoDestinoMigrado
      ]]);
    }
  }

  var sheetUbicaciones = getOrCreateSheet_(ss, "Ubicaciones", ["ID_Ubicacion", "Codigo_Ubicacion", "Nombre", "Tipo", "Visible_App"]);
  completarIdsTecnicos_(sheetUbicaciones, 1, 2);
  var sheetCargas = getOrCreateSheet_(ss, "Cargas_Contenedor", ["ID_Carga", "Codigo_Carga", "Fecha", "ID_Pedido_Tecnico", "Numero_Contenedor", "Estado", "Visible_App"]);
  completarIdsTecnicos_(sheetCargas, 1, 2);
  var sheetDetalleCargas = getOrCreateSheet_(ss, "Detalle_Carga_Contenedor", ["ID_Detalle_Carga", "ID_Carga", "ID_Lote_Tecnico", "Cantidad_Cajas", "ID_Movimiento"]);
  completarIdsTecnicos_(sheetDetalleCargas, 1, 2);

  properties.setProperty(clave, "OK");
}

function completarIdsTecnicos_(sheet, columnaId, columnaRequerida) {
  if (!sheet || sheet.getLastRow() < 2) return;
  var cantidad = sheet.getLastRow() - 1;
  var requeridos = sheet.getRange(2, columnaRequerida, cantidad, 1).getValues();
  var ids = sheet.getRange(2, columnaId, cantidad, 1).getValues();
  var cambio = false;
  for (var i = 0; i < cantidad; i++) {
    if (requeridos[i][0] && !ids[i][0]) {
      ids[i][0] = crearUuid_();
      cambio = true;
    }
  }
  if (cambio) sheet.getRange(2, columnaId, cantidad, 1).setValues(ids);
}

function crearUuid_() {
  return Utilities.getUuid();
}

function crearClaveDetalle_(idPedido, area, producto, presentacion, unidad) {
  return [
    idPedido || "",
    normalizarTexto_(area),
    normalizarTexto_(producto),
    normalizarTexto_(presentacion),
    normalizarTexto_(unidad)
  ].join("|");
}

function getOrCreateSheet_(ss, nombre, headers) {
  var sheet = ss.getSheetByName(nombre);
  if (!sheet) {
    sheet = ss.insertSheet(nombre);
    if (headers && typeof sheet.getMaxColumns === "function" && headers.length > sheet.getMaxColumns()) {
      sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
    }
    sheet.appendRow(headers);
    return sheet;
  }

  if (headers && typeof sheet.getMaxColumns === "function" && headers.length > sheet.getMaxColumns()) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  } else if (headers && headers.length) {
    var existingHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0];
    for (var h = 0; h < headers.length; h++) {
      if (!existingHeaders[h]) sheet.getRange(1, h + 1).setValue(headers[h]);
    }
  }
  return sheet;
}

function normalizarTexto_(valor) {
  return (valor || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizarAreaOperativa_(valor) {
  var area = normalizarTexto_(valor);
  if (area === "plancha" || area === "planchas") return "Planchas";
  if (area === "tamal" || area === "tamales") return "Tamales";
  if (area === "empaque") return "Empaque";
  return (valor || "").toString().trim();
}

function actualizarEstadoDisponibilidadProduccion_(sheet, fila) {
  if (!sheet || fila < 2) return;
  var original = numeroSeguro_(sheet.getRange(fila, 14).getValue());
  if (original <= 0) original = numeroSeguro_(sheet.getRange(fila, 12).getValue()) + numeroSeguro_(sheet.getRange(fila, 13).getValue());
  var disponibleGuardado = sheet.getRange(fila, 22).getValue();
  var disponible = disponibleGuardado !== "" && typeof disponibleGuardado !== "undefined"
    ? numeroSeguro_(disponibleGuardado)
    : numeroSeguro_(sheet.getRange(fila, 15).getValue()) + numeroSeguro_(sheet.getRange(fila, 16).getValue());
  var estado = "Disponible";
  if (disponible <= 0) estado = "Agotado";
  else if (disponible < original) estado = "Parcial";
  sheet.getRange(fila, 17).setValue(estado);
}

function json_(ok, message) {
  return ContentService
    .createTextOutput(JSON.stringify({status: ok ? "success" : "error", message: message || ""}))
    .setMimeType(ContentService.MimeType.JSON);
}

function buscarFilaPorId_(sheet, idPedido) {
  if (!sheet || !idPedido) return -1;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] == idPedido) return i + 2;
  }
  return -1;
}

function buscarFilaPorColumna_(sheet, columna, valor) {
  if (!sheet || !valor || sheet.getLastRow() < 2) return -1;
  var valores = sheet.getRange(2, columna, sheet.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < valores.length; i++) {
    if (valores[i][0] == valor) return i + 2;
  }
  return -1;
}

function minutosEntre_(inicio, fin) {
  var inicioDate = new Date(inicio);
  var finDate = new Date(fin);
  var diff = (finDate.getTime() - inicioDate.getTime()) / 60000;
  return diff > 0 ? diff : 0;
}

function redondearMin_(valor) {
  return Math.round((Number(valor) || 0) * 100) / 100;
}

function numeroSeguro_(valor) {
  if (typeof valor === "number") return isFinite(valor) ? valor : 0;
  if (valor === null || typeof valor === "undefined") return 0;
  var limpio = valor.toString().trim().replace(/,/g, "");
  var numero = Number(limpio);
  return isFinite(numero) ? numero : 0;
}

function numeroEnteroSeguro_(valor) {
  var numero = Math.floor(numeroSeguro_(valor));
  if (numero < 0) return 0;
  if (numero > 1000000) return 0;
  return numero;
}

function buscarColumna_(headers, nombres) {
  var normalizados = nombres.map(function(nombre) { return normalizarTexto_(nombre).replace(/_/g, " "); });
  for (var i = 0; i < headers.length; i++) {
    var header = normalizarTexto_(headers[i]).replace(/_/g, " ");
    if (normalizados.indexOf(header) !== -1) return i;
  }
  return -1;
}

function pesoProcesadoValido_(pesoEntrada, pesoProcesado) {
  pesoEntrada = numeroSeguro_(pesoEntrada);
  pesoProcesado = numeroSeguro_(pesoProcesado);
  if (!pesoEntrada || pesoEntrada <= 0) return false;
  if (!pesoProcesado || pesoProcesado <= 0) return false;
  return pesoProcesado <= pesoEntrada;
}

function idExisteEnLibro_(ss, idBuscado) {
  if (!idBuscado) return true;
  var sheets = ss.getSheets();
  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) continue;
    var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var r = 0; r < ids.length; r++) {
      if (ids[r][0] == idBuscado) return true;
    }
  }
  return false;
}

function crearIdPedidoCliente_(ss, codigoCliente, fechaCarga) {
  var codigo = (codigoCliente || "CLI").toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!codigo) codigo = "CLI";

  var fechaObj;
  if (typeof fechaCarga === "string" && fechaCarga.indexOf("-") !== -1) {
    var partes = fechaCarga.split("-");
    fechaObj = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
  } else {
    fechaObj = new Date(fechaCarga || new Date());
  }

  var dd = ("0" + fechaObj.getDate()).slice(-2);
  var mm = ("0" + (fechaObj.getMonth() + 1)).slice(-2);
  var base = codigo + "-" + dd + mm;

  for (var secuencia = 1; secuencia <= 999; secuencia++) {
    var consecutivo = ("00" + secuencia).slice(-3);
    var id = base + "-" + consecutivo;
    if (!idExisteEnLibro_(ss, id)) return id;
  }

  return base + "-" + new Date().getTime();
}

function actualizarVisibilidadPedidoCliente_(ss, idPedido, visibleApp) {
  var sheetPedidos = ss.getSheetByName("Pedidos_Cliente");
  var sheetDetalle = ss.getSheetByName("Detalle_Pedido_Cliente");
  if (sheetPedidos) {
    var dataPedidos = sheetPedidos.getDataRange().getValues();
    for (var p = 1; p < dataPedidos.length; p++) {
      if (dataPedidos[p][0] == idPedido) sheetPedidos.getRange(p + 1, 7).setValue(visibleApp);
    }
  }
  if (sheetDetalle) {
    var dataDetalle = sheetDetalle.getDataRange().getValues();
    for (var d = 1; d < dataDetalle.length; d++) {
      if (dataDetalle[d][0] == idPedido) sheetDetalle.getRange(d + 1, 9).setValue(visibleApp);
    }
  }
}

function actualizarEstadoPedidoCliente_(ss, idPedido, estado) {
  var sheetPedidos = ss.getSheetByName("Pedidos_Cliente");
  var sheetDetalle = ss.getSheetByName("Detalle_Pedido_Cliente");
  if (sheetPedidos) {
    var dataPedidos = sheetPedidos.getDataRange().getValues();
    for (var p = 1; p < dataPedidos.length; p++) {
      if (dataPedidos[p][0] == idPedido) sheetPedidos.getRange(p + 1, 6).setValue(estado);
    }
  }
  if (estado === "Cancelado" && sheetDetalle) {
    var dataDetalle = sheetDetalle.getDataRange().getValues();
    for (var d = 1; d < dataDetalle.length; d++) {
      if (dataDetalle[d][0] == idPedido) {
        sheetDetalle.getRange(d + 1, 7).setValue(0);
        sheetDetalle.getRange(d + 1, 8).setValue("Cancelado");
      }
    }
  }
}

function revertirAsignacionesPedidoCliente_(ss, idPedido, motivo) {
  if (!idPedido) return [];
  var sheetSesiones = ss.getSheetByName("Empaque_Sesiones");
  if (!sheetSesiones) return [];
  sheetSesiones = getOrCreateSheet_(ss, "Empaque_Sesiones", ["ID_Sesion_Empaque", "Fecha", "ID_Pedido_Cliente", "Cliente", "Codigo_Cliente", "Area_Detalle", "Producto_Detalle", "Presentacion_Detalle", "Unidad", "Cajas_Hechas", "Presentacion_Lb", "ID_Lote_Fruta", "Fruta", "Estado_Uso_Lote", "Sobrante_Lote_Lb", "Responsable", "Nota", "Estado_Registro", "Fecha_Reversion", "Motivo_Reversion", "ID_Linea", "ID_Asignacion", "ID_Lote_Tecnico", "ID_Pedido_Tecnico", "Tipo_Fuente", "ID_Produccion", "Codigo_Produccion", "Categoria_Unidades", "Unidades_Por_Caja", "Unidades_Consumidas", "Cantidad_Por_Caja", "Cantidad_Fuente_Anterior", "Cantidad_Fuente_Sobrante", "Cantidad_Fuente_Consumida", "Unidad_Fuente", "ID_Producto_Fuente", "ID_Producto_Destino"]);

  var dataSesiones = sheetSesiones.getDataRange().getValues();
  var lotesAReincorporar = {};
  var produccionesAReincorporar = {};
  var ahora = new Date();
  for (var i = 1; i < dataSesiones.length; i++) {
    if (dataSesiones[i][2] != idPedido) continue;
    if (normalizarTexto_(dataSesiones[i][17] || "Activa") === "revertida") continue;

    var tipoFuenteSesion = normalizarTexto_(dataSesiones[i][24] || (dataSesiones[i][11] ? "Fruta" : ""));
    if (tipoFuenteSesion === "produccion") {
      var idProduccionSesion = dataSesiones[i][25];
      var cantidadProduccionSesion = numeroSeguro_(dataSesiones[i][33] || dataSesiones[i][29]);
      var unidadProduccionSesion = dataSesiones[i][34] || "unidad";
      if (idProduccionSesion) {
        if (!produccionesAReincorporar[idProduccionSesion]) {
          produccionesAReincorporar[idProduccionSesion] = { cantidad: 0, unidad: unidadProduccionSesion };
        }
        produccionesAReincorporar[idProduccionSesion].cantidad += cantidadProduccionSesion;
      }
    } else {
      var idLote = dataSesiones[i][11];
      var pesoAsignado = numeroSeguro_(dataSesiones[i][33]);
      if (pesoAsignado <= 0) pesoAsignado = numeroEnteroSeguro_(dataSesiones[i][9]) * numeroSeguro_(dataSesiones[i][10]);
      if (idLote) {
        lotesAReincorporar[idLote] = numeroSeguro_(lotesAReincorporar[idLote]) + pesoAsignado;
      }
    }

    sheetSesiones.getRange(i + 1, 18, 1, 3).setValues([[
      "Revertida",
      ahora,
      (motivo || "Pedido cancelado") + ": " + idPedido
    ]]);
  }

  var sheetAsignaciones = ss.getSheetByName("Asignaciones_Pedido");
  if (sheetAsignaciones) {
    var dataAsignaciones = sheetAsignaciones.getDataRange().getValues();
    for (var a = 1; a < dataAsignaciones.length; a++) {
      if (dataAsignaciones[a][12] != idPedido) continue;
      if (normalizarTexto_(dataAsignaciones[a][9] || "Activa") === "revertida") continue;
      sheetAsignaciones.getRange(a + 1, 10, 1, 3).setValues([[
        "Revertida",
        ahora,
        (motivo || "Pedido cancelado") + ": " + idPedido
      ]]);
    }
  }

  var lotesLiberados = [];
  Object.keys(lotesAReincorporar).forEach(function(idLote) {
    reincorporarLoteEmpaque_(ss, idLote, lotesAReincorporar[idLote]);
    lotesLiberados.push({
      tipoFuente: "Fruta",
      idLote: idLote,
      pesoReincorporadoLb: lotesAReincorporar[idLote]
    });
  });
  Object.keys(produccionesAReincorporar).forEach(function(idProduccion) {
    var reincorporacion = produccionesAReincorporar[idProduccion];
    reincorporarProduccionEmpaque_(ss, idProduccion, reincorporacion.cantidad);
    lotesLiberados.push({
      tipoFuente: "Produccion",
      idProduccion: idProduccion,
      cantidadReincorporada: reincorporacion.cantidad,
      unidad: reincorporacion.unidad,
      unidadesReincorporadas: reincorporacion.unidad === "unidad" ? reincorporacion.cantidad : 0
    });
  });
  return lotesLiberados;
}

function reincorporarProduccionEmpaque_(ss, idProduccion, cantidad) {
  var sheetProduccion = ss.getSheetByName("Produccion_Areas");
  if (!sheetProduccion) return;
  var filaProduccion = buscarFilaPorColumna_(sheetProduccion, 1, idProduccion);
  if (filaProduccion === -1) return;
  var original = numeroSeguro_(sheetProduccion.getRange(filaProduccion, 14).getValue());
  if (original <= 0) original = numeroSeguro_(sheetProduccion.getRange(filaProduccion, 12).getValue()) + numeroSeguro_(sheetProduccion.getRange(filaProduccion, 13).getValue());
  var disponibleGuardado = sheetProduccion.getRange(filaProduccion, 22).getValue();
  var disponible = disponibleGuardado !== "" && typeof disponibleGuardado !== "undefined"
    ? numeroSeguro_(disponibleGuardado)
    : numeroSeguro_(sheetProduccion.getRange(filaProduccion, 15).getValue()) + numeroSeguro_(sheetProduccion.getRange(filaProduccion, 16).getValue());
  sheetProduccion.getRange(filaProduccion, 22).setValue(Math.min(original, disponible + numeroSeguro_(cantidad)));
  actualizarEstadoDisponibilidadProduccion_(sheetProduccion, filaProduccion);
}

function reincorporarLoteEmpaque_(ss, idLote, pesoReincorporado) {
  var sheetFrutas = ss.getSheetByName("Pedidos_Fruta");
  if (!sheetFrutas) return;
  var filaLote = buscarFilaPorId_(sheetFrutas, idLote);
  if (filaLote === -1) return;

  var pesoFinal = numeroSeguro_(sheetFrutas.getRange(filaLote, 7).getValue());
  var disponibleGuardado = sheetFrutas.getRange(filaLote, 15).getValue();
  var disponibleActual = disponibleGuardado !== "" && typeof disponibleGuardado !== "undefined"
    ? numeroSeguro_(disponibleGuardado)
    : pesoFinal;
  var nuevoDisponible = disponibleActual + numeroSeguro_(pesoReincorporado);
  if (pesoFinal > 0) nuevoDisponible = Math.min(pesoFinal, nuevoDisponible);

  var resumenActivo = resumenSesionesActivasLote_(ss, idLote);
  var nuevoEstado = "Pendiente";
  if (resumenActivo.totalCajas > 0 && nuevoDisponible > 0) nuevoEstado = "Empacado Parcial";
  if (resumenActivo.totalCajas > 0 && nuevoDisponible <= 0) nuevoEstado = "Empacado Total";

  sheetFrutas.getRange(filaLote, 13).setValue(nuevoEstado);
  sheetFrutas.getRange(filaLote, 15).setValue(nuevoDisponible);
  sincronizarEmpaqueSalidaLote_(ss, idLote, resumenActivo, nuevoEstado);
  calcularMateriaPrima(idLote);
}

function resumenSesionesActivasLote_(ss, idLote) {
  var resumen = { totalCajas: 0, ultimoPedido: "", fruta: "", ultimaFecha: "" };
  var sheetSesiones = ss.getSheetByName("Empaque_Sesiones");
  if (!sheetSesiones) return resumen;
  var data = sheetSesiones.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][11] != idLote) continue;
    if (normalizarTexto_(data[i][17] || "Activa") === "revertida") continue;
    resumen.totalCajas += numeroEnteroSeguro_(data[i][9]);
    resumen.ultimoPedido = data[i][2] || resumen.ultimoPedido;
    resumen.fruta = data[i][12] || resumen.fruta;
    resumen.ultimaFecha = data[i][1] || resumen.ultimaFecha;
  }
  return resumen;
}

function sincronizarEmpaqueSalidaLote_(ss, idLote, resumen, estadoEmpaque) {
  var sheetSalidas = getOrCreateSheet_(ss, "Empaque_Salidas", ["ID", "Nombre_Pedido", "Fruta", "Fecha_Empaque", "Cajas", "Estado_Empaque"]);
  var data = sheetSalidas.getDataRange().getValues();
  var filaSalida = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == idLote) {
      filaSalida = i + 1;
      break;
    }
  }

  if (resumen.totalCajas <= 0) {
    if (filaSalida !== -1) sheetSalidas.deleteRow(filaSalida);
    return;
  }

  var valores = [[
    idLote,
    resumen.ultimoPedido,
    resumen.fruta,
    resumen.ultimaFecha,
    resumen.totalCajas,
    estadoEmpaque
  ]];
  if (filaSalida === -1) sheetSalidas.appendRow(valores[0]);
  else sheetSalidas.getRange(filaSalida, 1, 1, 6).setValues(valores);
}

function eliminarPedidoCliente_(ss, idPedido) {
  ["Pedidos_Cliente", "Detalle_Pedido_Cliente"].forEach(function(nombre) {
    var sheet = ss.getSheetByName(nombre);
    if (!sheet) return;
    var data = sheet.getDataRange().getValues();
    for (var i = data.length - 1; i >= 1; i--) {
      if (data[i][0] == idPedido) sheet.deleteRow(i + 1);
    }
  });
}

function buscarFilaDetallePedido_(sheetDetalle, idPedido, area, producto, presentacion, unidad) {
  if (!sheetDetalle || !idPedido) return -1;
  var data = sheetDetalle.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (
      data[i][0] == idPedido &&
      normalizarTexto_(data[i][1]) === normalizarTexto_(area) &&
      normalizarTexto_(data[i][2]) === normalizarTexto_(producto) &&
      normalizarTexto_(data[i][3]) === normalizarTexto_(presentacion || "") &&
      normalizarTexto_(data[i][4]) === normalizarTexto_(unidad)
    ) {
      return i + 1;
    }
  }
  return -1;
}

function frutaExisteEnCatalogo_(ss, fruta) {
  var sheetOpciones = ss.getSheetByName("Opciones");
  if (!sheetOpciones) return false;
  var data = sheetOpciones.getDataRange().getValues();
  var frutaNormalizada = normalizarTexto_(fruta);
  for (var i = 1; i < data.length; i++) {
    if (normalizarTexto_(data[i][0]) === frutaNormalizada) return true;
  }
  return false;
}

function recalcularEstadoPedidoCliente_(ss, idPedido) {
  var sheetPedidos = ss.getSheetByName("Pedidos_Cliente");
  var sheetDetalle = ss.getSheetByName("Detalle_Pedido_Cliente");
  if (!sheetPedidos || !sheetDetalle) return;

  var dataDetalle = sheetDetalle.getDataRange().getValues();
  var totalLineas = 0;
  var lineasCompletadas = 0;
  var lineasConAvance = 0;
  for (var i = 1; i < dataDetalle.length; i++) {
    if (dataDetalle[i][0] != idPedido || dataDetalle[i][8] === "NO") continue;
    totalLineas++;
    var pedida = numeroSeguro_(dataDetalle[i][5]);
    var completada = numeroSeguro_(dataDetalle[i][6]);
    var estadoLinea = "Pendiente";
    if (completada > 0 && completada < pedida) estadoLinea = "Parcial";
    if (pedida > 0 && completada >= pedida) estadoLinea = "Completado";
    sheetDetalle.getRange(i + 1, 8).setValue(estadoLinea);
    if (estadoLinea === "Completado") lineasCompletadas++;
    if (completada > 0) lineasConAvance++;
  }

  var estadoPedido = "Abierto";
  if (totalLineas > 0 && lineasCompletadas === totalLineas) estadoPedido = "Completado";
  else if (lineasConAvance > 0) estadoPedido = "En proceso";

  var dataPedidos = sheetPedidos.getDataRange().getValues();
  for (var p = 1; p < dataPedidos.length; p++) {
    if (dataPedidos[p][0] == idPedido && dataPedidos[p][5] !== "Cancelado") {
      sheetPedidos.getRange(p + 1, 6).setValue(estadoPedido);
      break;
    }
  }
}

function crearIdSesionEmpaque_(ss) {
  var fechaObj = new Date();
  var dd = ("0" + fechaObj.getDate()).slice(-2);
  var mm = ("0" + (fechaObj.getMonth() + 1)).slice(-2);
  var base = "EMP-" + dd + mm;

  for (var intento = 1; intento <= 999; intento++) {
    var consecutivo = ("00" + intento).slice(-3);
    var id = base + "-" + consecutivo;
    if (!idExisteEnLibro_(ss, id)) return id;
  }

  return base + "-" + new Date().getTime();
}

function crearCodigoProduccion_(ss, area) {
  var fechaObj = new Date();
  var dd = ("0" + fechaObj.getDate()).slice(-2);
  var mm = ("0" + (fechaObj.getMonth() + 1)).slice(-2);
  var prefijo = normalizarAreaOperativa_(area) === "Tamales" ? "TAM" : "PLA";
  var base = prefijo + "-" + dd + mm;
  var sheetProduccion = ss.getSheetByName("Produccion_Areas");
  for (var intento = 1; intento <= 999; intento++) {
    var consecutivo = ("00" + intento).slice(-3);
    var id = base + "-" + consecutivo;
    if (buscarFilaPorColumna_(sheetProduccion, 2, id) === -1) return id;
  }
  return base + "-" + new Date().getTime();
}

function crearIdFrutaProveedor_(ss, proveedorIniciales) {
  var fechaObj = new Date();
  var dd = ("0" + fechaObj.getDate()).slice(-2);
  var mm = ("0" + (fechaObj.getMonth() + 1)).slice(-2);
  var iniciales = (proveedorIniciales || "PROV").toString().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!iniciales) iniciales = "PROV";

  for (var intento = 0; intento < 100; intento++) {
    var codigo = Math.floor(100 + Math.random() * 900);
    var id = dd + mm + "-" + iniciales + "-" + codigo;
    if (!idExisteEnLibro_(ss, id)) return id;
  }

  return dd + mm + "-" + iniciales + "-" + new Date().getTime();
}

function crearIdBodega_(ss) {
  var fechaObj = new Date();
  var mm = ("0" + (fechaObj.getMonth() + 1)).slice(-2);
  var dd = ("0" + fechaObj.getDate()).slice(-2);
  var fechaId = mm + dd;

  for (var intento = 0; intento < 100; intento++) {
    var codigo = Math.floor(1000 + Math.random() * 9000);
    var id = "BOD-" + fechaId + "-" + codigo;
    if (!idExisteEnLibro_(ss, id)) return id;
  }

  return "BOD-" + fechaId + "-" + new Date().getTime();
}

function reconstruirControlMateriaPrima() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetKPI = getOrCreateSheet_(ss, "Control_Materia_Prima", ["ID", "Pedido", "Fruta", "Total_Peso_Procesado_Lb", "Total_Cajas", "Peso_Por_Caja"]);
  sheetKPI.clearContents();
  sheetKPI.appendRow(["ID", "Pedido", "Fruta", "Total_Peso_Procesado_Lb", "Total_Cajas", "Peso_Por_Caja"]);

  var sheetFruta = ss.getSheetByName("Pedidos_Fruta");
  if (!sheetFruta) return;
  var dataFruta = sheetFruta.getDataRange().getValues();
  for (var i = 1; i < dataFruta.length; i++) {
    if (dataFruta[i][0]) calcularMateriaPrima(dataFruta[i][0]);
  }
}



