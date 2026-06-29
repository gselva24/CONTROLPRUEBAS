//Script Google sheets API conexiÃ³n con aplicaciÃ³n
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var data = { frutas: [], pedidosPendientes: [], pedidosParciales: [], historial: [], inventarioBodega: [], movimientosBodega: [] };

  // 1. Cargar Opciones del CatÃ¡logo
  var sheetOpciones = ss.getSheetByName("Opciones");
  if (sheetOpciones) {
    var opts = sheetOpciones.getDataRange().getValues();
    for (var i = 1; i < opts.length; i++) {
      if (opts[i][0]) data.frutas.push(opts[i][0].toString());
    }
  }

  var metricasPorPedido = {};
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
        estadoFrutas: row[8], estadoEmpaqueGlobal: row[12], visibleApp: row[13]
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
        visibleApp: invRow[6] || "SI"
      });
    }
  }

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
        nota: movRow[10]
      });
    }
  }

  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  // ValidaciÃ³n de seguridad: Si no hay datos, terminar inmediatamente
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
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: "El servidor estÃ¡ ocupado. Intente de nuevo."})).setMimeType(ContentService.MimeType.JSON);
  }

  // EjecuciÃ³n segura de procesos bajo bloqueo mutuo
  try {
    var params = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // -- GERENCIA: ACTUALIZAR CATÃLOGO --
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

    // -- OPERATIVO: NUEVO FLUJO DE FRUTAS POR ESTADOS --
    if (params.action === "iniciarLoteFrutas") {
      var sheetFNuevo = getOrCreateSheet_(ss, "Pedidos_Fruta", ["ID", "Fecha", "Nombre_Pedido", "Proveedor_Iniciales", "Fruta", "Peso_Neto_Entrada_Lb", "Peso_Neto_Final_Lb", "Rendimiento_Peso", "Estado_Frutas", "Peso_Averia_Lb", "Peso_Desecho_Lb", "Nota_Final", "Estado_Empaque", "Visible_App"]);
      var sheetTNuevo = getOrCreateSheet_(ss, "Tiempos_Procesado", ["ID", "Nombre_Pedido", "Fruta", "FechaHora_Inicio", "FechaHora_Finalizacion", "Tiempo_Total_Min", "Tiempo_Pausado_Min", "Tiempo_Produccion_Min", "Motivo_Pausa", "Pausa_Activa_Desde"]);
      var pesoEntradaNuevo = numeroSeguro_(params.pesoEntrada);
      var proveedorIniciales = (params.proveedorIniciales || "").toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!params.nombrePedido) return json_(false, "Ingrese el nombre del pedido.");
      if (!proveedorIniciales) return json_(false, "Ingrese las iniciales del proveedor.");
      if (!pesoEntradaNuevo || pesoEntradaNuevo <= 0) return json_(false, "El peso de entrada debe ser mayor a cero.");

      var idNuevo = crearIdFrutaProveedor_(ss, proveedorIniciales);
      var ahoraInicio = new Date();
      sheetFNuevo.appendRow([idNuevo, params.fecha || Utilities.formatDate(ahoraInicio, Session.getScriptTimeZone(), "dd/MM/yyyy"), params.nombrePedido, proveedorIniciales, params.frutaTipo, pesoEntradaNuevo, "", "", "En proceso", "", "", "", "Pendiente", "SI"]);
      sheetTNuevo.appendRow([idNuevo, params.nombrePedido, params.frutaTipo, ahoraInicio, "", 0, 0, 0, "", ""]);
      return ContentService.createTextOutput(JSON.stringify({status: "success", newId: idNuevo})).setMimeType(ContentService.MimeType.JSON);
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

      sheetTFin.getRange(filaTFin, 5).setValue(ahoraFin);
      sheetTFin.getRange(filaTFin, 6).setValue(redondearMin_(tiempoTotal));
      sheetTFin.getRange(filaTFin, 7).setValue(redondearMin_(tiempoPausado));
      sheetTFin.getRange(filaTFin, 8).setValue(redondearMin_(tiempoProduccion));
      sheetTFin.getRange(filaTFin, 10).setValue("");
      calcularMateriaPrima(params.idPedido);
      return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
    }
    // -- OPERATIVO: REGISTRO DE EMPAQUE --
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
      var sheetInv = getOrCreateSheet_(ss, "Inventario_Bodega", ["ID", "Producto", "Categoria", "Unidad", "Stock", "Ultima_Actualizacion", "Visible_App"]);
      var sheetMov = getOrCreateSheet_(ss, "Movimientos_Bodega", ["Fecha", "Tipo_Movimiento", "ID", "Producto", "Categoria", "Unidad", "Cantidad", "Stock_Anterior", "Stock_Nuevo", "Responsable", "Nota"]);
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
        sheetInv.appendRow([idItem, nombreItem, params.categoria || "", params.unidad || "", 0, "", "SI"]);
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
        params.nota || ""
      ]);

      return ContentService.createTextOutput(JSON.stringify({status: "success", idItem: idItem, stockNuevo: stockNuevo})).setMimeType(ContentService.MimeType.JSON);
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

function getOrCreateSheet_(ss, nombre, headers) {
  var sheet = ss.getSheetByName(nombre);
  if (!sheet) {
    sheet = ss.insertSheet(nombre);
    sheet.appendRow(headers);
    return sheet;
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
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


