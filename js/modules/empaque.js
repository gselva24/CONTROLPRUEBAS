function renderEmpaqueSelect() {
    renderEmpaquePedidoSelect();
    renderEmpaqueDetalleSelect();
}

function renderEmpaquePedidoSelect() {
    const select = document.getElementById("e-pedido-cliente-select");
    if (!select) return;
    const actual = select.value;
    select.innerHTML = '<option value="">-- Seleccionar pedido --</option>';
    pedidosCliente
        .filter(p => p.visibleApp !== "NO" && p.estadoPedido !== "Completado" && p.estadoPedido !== "Cancelado")
        .forEach(p => {
            select.innerHTML += `<option value="${p.idPedido}">${p.idPedido} - ${p.cliente}</option>`;
        });
    if (pedidosCliente.some(p => p.idPedido === actual)) select.value = actual;
}

function renderEmpaqueDetalleSelect() {
    const select = document.getElementById("e-detalle-pedido-select");
    const pedidoSelect = document.getElementById("e-pedido-cliente-select");
    if (!select || !pedidoSelect) return;
    const actual = select.value;
    const idPedido = pedidoSelect.value;
    const detalles = detallesEmpaqueElegibles(idPedido);
    select.innerHTML = '<option value="">-- Seleccionar línea de empaque --</option>';
    detalles.forEach((detalle, index) => {
        const key = detalle.idLinea || `legacy-${index}`;
        const completada = Number(detalle.cantidadCompletada || 0);
        const pedida = Number(detalle.cantidadPedida || 0);
        select.innerHTML += `<option value="${key}">${detalle.producto} · ${detalle.presentacion || "Sin presentación"} (${completada}/${pedida} cajas)</option>`;
    });
    if (detalles.some(detalle => detalle.idLinea === actual)) select.value = actual;
    actualizarInfoPedidoEmpaque();
}

function detallesEmpaqueElegibles(idPedido) {
    return detallePedidosCliente
        .filter(d => d.idPedido === idPedido && d.visibleApp !== "NO" && d.estadoDetalle !== "Completado" && d.estadoDetalle !== "Cancelado")
        .filter(d => ["empaque", "plancha", "planchas", "tamal", "tamales"].includes(normalizarTextoFront(d.area)));
}

function buscarDetalleEmpaqueSeleccionado() {
    const detalleSelect = document.getElementById("e-detalle-pedido-select");
    const pedidoSelect = document.getElementById("e-pedido-cliente-select");
    if (!detalleSelect || !pedidoSelect || !detalleSelect.value) return null;
    const detalles = detallesEmpaqueElegibles(pedidoSelect.value);
    if (detalleSelect.value.indexOf("legacy-") === 0) {
        return detalles[Number(detalleSelect.value.replace("legacy-", ""))] || null;
    }
    return detalles.find(detalle => detalle.idLinea === detalleSelect.value) || null;
}

if (typeof normalizarTextoFront !== "function") {
    function normalizarTextoFront(valor) {
        return (valor || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
    }
}

function tipoFuenteDetalleEmpaque(detalle) {
    if (!detalle) return "Fruta";
    return ["plancha", "planchas", "tamal", "tamales"].includes(normalizarTextoFront(detalle.area))
        ? "Produccion"
        : "Fruta";
}

function parseFuenteEmpaque(valor) {
    const partes = (valor || "").split("|");
    if (partes[0] === "PRODUCCION") {
        return { tipo: "Produccion", id: partes[1] || "" };
    }
    if (partes[0] === "FRUTA") return { tipo: "Fruta", id: partes[1] || "" };
    return { tipo: "Fruta", id: valor || "" };
}

function cantidadDisponibleProduccion(produccion) {
    if (!produccion) return 0;
    if (typeof produccion.cantidadDisponible !== "undefined") {
        return Number(produccion.cantidadDisponible || 0);
    }
    return Number(produccion.funcionalesDisponibles || 0) + Number(produccion.averiaDisponible || 0);
}

function unidadFuenteProduccion(produccion) {
    return produccion?.unidadMedida || "unidad";
}

function renderEmpaqueLoteSelect() {
    const select = document.getElementById("e-lote-fruta-select");
    const pedidoSelect = document.getElementById("e-pedido-cliente-select");
    if (!select || !pedidoSelect) return;
    const detalle = buscarDetalleEmpaqueSeleccionado();
    const tipoFuente = tipoFuenteDetalleEmpaque(detalle);
    const label = document.getElementById("e-fuente-label");
    if (!detalle) {
        if (label) label.textContent = "Fuente de producción:";
        select.innerHTML = '<option value="">-- Seleccione primero una línea --</option>';
        return;
    }

    if (tipoFuente === "Produccion") {
        const areaDetalle = normalizarAreaProduccion(detalle?.area);
        if (label) label.textContent = `Lotes disponibles de ${detalle?.area || "producción"}:`;
        select.innerHTML = '<option value="">-- Seleccionar producción --</option>';
        produccionesAreas
            .filter(p => p.visibleApp !== "NO")
            .filter(p => normalizarAreaProduccion(p.area) === areaDetalle)
            .filter(p => cantidadDisponibleProduccion(p) > 0)
            .slice()
            .reverse()
            .forEach(p => {
                const disponible = cantidadDisponibleProduccion(p);
                const unidad = unidadFuenteProduccion(p);
                select.innerHTML += `<option value="PRODUCCION|${p.idProduccion}">${p.codigoProduccion} - ${p.producto} - ${p.cliente} (${disponible.toLocaleString("es-GT", { maximumFractionDigits: 2 })} ${unidad})</option>`;
            });
        return;
    }

    if (label) label.textContent = "Lote de fruta disponible:";
    select.innerHTML = '<option value="">-- Seleccionar lote de fruta --</option>';
    pedidosPendientes
        .filter(p => p.visibleApp === "SI" && p.estadoFrutas === "Finalizado" && p.estadoEmpaqueGlobal !== "Empacado Total")
        .filter(p => !detalle || normalizarTextoFront(p.fruta) === normalizarTextoFront(detalle.productoBaseProduccion || detalle.producto))
        .forEach(p => {
            const disponible = Number(p.pesoDisponibleEmpaque || p.pesoProcesado || 0);
            select.innerHTML += `<option value="FRUTA|${p.id}">${p.id} - ${p.fruta} (${disponible} lb disp.)</option>`;
        });
}

function actualizarInfoPedidoEmpaque() {
    renderEmpaqueLoteSelect();
    actualizarControlesFuenteEmpaque();
    actualizarInfoEmpaque();
}

function actualizarControlesFuenteEmpaque() {
    const detalle = buscarDetalleEmpaqueSeleccionado();
    const esProduccion = tipoFuenteDetalleEmpaque(detalle) === "Produccion";
    const fuente = parseFuenteEmpaque(document.getElementById("e-lote-fruta-select")?.value || "");
    const produccion = esProduccion
        ? produccionesAreas.find(item => item.idProduccion === fuente.id)
        : null;
    const unidad = esProduccion ? unidadFuenteProduccion(produccion) : "lb";
    const medidaLabel = document.getElementById("e-medida-label");
    const medidaInput = document.getElementById("e-presentacion-lb");
    const usoWrapper = document.getElementById("e-uso-lote-wrapper");
    const sobranteLabel = document.getElementById("e-sobrante-label");
    if (medidaLabel) medidaLabel.textContent = esProduccion ? `Contenido por caja (${unidad}):` : "Presentación (lb/caja):";
    if (medidaInput) medidaInput.placeholder = esProduccion ? "48" : "10";
    if (sobranteLabel) sobranteLabel.textContent = `Sobrante declarado del lote (${unidad}):`;
    if (usoWrapper) usoWrapper.classList.remove("hidden");
    actualizarCamposUsoLote();
}

function actualizarInfoEmpaque() {
    actualizarControlesFuenteEmpaque();
    const fuenteSelect = document.getElementById("e-lote-fruta-select");
    const pedidoSelect = document.getElementById("e-pedido-cliente-select");
    const box = document.getElementById("e-info-box");
    if (!fuenteSelect || !pedidoSelect || !box) return;

    const fuente = parseFuenteEmpaque(fuenteSelect.value);
    const pedido = pedidosCliente.find(p => p.idPedido === pedidoSelect.value);
    const detalle = buscarDetalleEmpaqueSeleccionado();
    const lote = fuente.tipo === "Fruta" ? pedidosPendientes.find(p => p.id === fuente.id) : null;
    const produccion = fuente.tipo === "Produccion" ? produccionesAreas.find(p => p.idProduccion === fuente.id) : null;
    if (!pedido && !detalle && !lote && !produccion) {
        box.classList.add("hidden");
        return;
    }

    const disponibleLb = lote ? Number(lote.pesoDisponibleEmpaque || lote.pesoProcesado || 0) : 0;
    const disponibleProduccion = cantidadDisponibleProduccion(produccion);
    const unidadProduccion = unidadFuenteProduccion(produccion);
    box.innerHTML = `
        ${pedido ? `<div><span class="text-slate-400">Pedido:</span> <span class="font-mono font-bold text-emerald-300">${pedido.idPedido}</span> · ${pedido.cliente}</div>` : ""}
        ${detalle ? `<div><span class="text-slate-400">Línea:</span> <span class="font-bold">${detalle.producto}</span> · ${detalle.presentacion || "Sin presentación"} (${detalle.cantidadCompletada}/${detalle.cantidadPedida} cajas)</div>` : ""}
        ${lote ? `<div><span class="text-slate-400">Lote fruta:</span> <span class="font-mono font-bold text-amber-300">${lote.id}</span> · ${lote.fruta}</div>
        <div><span class="text-slate-400">Disponible:</span> <span class="font-black text-cyan-300">${disponibleLb} lb</span></div>` : ""}
        ${produccion ? `<div><span class="text-slate-400">Producción:</span> <span class="font-mono font-bold text-sky-300">${produccion.codigoProduccion}</span> · ${produccion.area}</div>
        <div><span class="text-slate-400">Producto del lote:</span> ${produccion.producto}</div>
        <div><span class="text-slate-400">Cliente de origen:</span> ${produccion.cliente}</div>
        <div><span class="text-slate-400">Disponible:</span> <span class="font-black text-cyan-300">${disponibleProduccion.toLocaleString("es-GT", { maximumFractionDigits: 2 })} ${unidadProduccion}</span></div>` : ""}
    `;
    box.classList.remove("hidden");
}

function actualizarCamposUsoLote() {
    const uso = document.getElementById("e-estado-uso-lote");
    const sobrante = document.getElementById("e-sobrante-box");
    if (!uso || !sobrante) return;
    sobrante.classList.toggle("hidden", uso.value !== "Empacado Parcial");
}

function resetEmpaqueForm() {
    document.getElementById("e-pedido-cliente-select").value = "";
    document.getElementById("e-detalle-pedido-select").innerHTML = '<option value="">-- Seleccionar línea de empaque --</option>';
    document.getElementById("e-lote-fruta-select").innerHTML = '<option value="">-- Seleccionar fuente --</option>';
    document.getElementById("e-presentacion-lb").value = "";
    document.getElementById("e-cajas").value = "";
    document.getElementById("e-estado-uso-lote").value = "Empacado Total";
    document.getElementById("e-sobrante-lb").value = "";
    document.getElementById("e-responsable").value = "";
    document.getElementById("e-nota").value = "";
    document.getElementById("e-info-box").classList.add("hidden");
    actualizarControlesFuenteEmpaque();
}

function submitEmpaque() {
    const pedido = pedidosCliente.find(p => p.idPedido === document.getElementById("e-pedido-cliente-select").value);
    const detalle = buscarDetalleEmpaqueSeleccionado();
    const fuente = parseFuenteEmpaque(document.getElementById("e-lote-fruta-select").value);
    const medidaPorCaja = Number(document.getElementById("e-presentacion-lb").value);
    const cajas = Number(document.getElementById("e-cajas").value);
    const responsable = document.getElementById("e-responsable").value.trim();
    const nota = document.getElementById("e-nota").value.trim();
    const estadoUsoLote = document.getElementById("e-estado-uso-lote").value;
    const sobranteFuente = Number(document.getElementById("e-sobrante-lb").value || 0);

    if (!pedido) { alert("Seleccione un pedido de cliente."); return; }
    if (!detalle) { alert("Seleccione una línea del armado."); return; }
    if (!fuente.id) { alert("Seleccione una fuente disponible."); return; }
    if (!Number.isInteger(cajas) || cajas <= 0) { alert("Ingrese una cantidad válida de cajas hechas."); return; }
    if (!medidaPorCaja || medidaPorCaja <= 0) {
        alert(tipoFuenteDetalleEmpaque(detalle) === "Produccion" ? "Ingrese el contenido por caja." : "Ingrese la presentación en libras por caja.");
        return;
    }
    if (!responsable) { alert("Ingrese el responsable del registro."); return; }
    const cajasPendientes = Number(detalle.cantidadPedida || 0) - Number(detalle.cantidadCompletada || 0);
    if (cajas > cajasPendientes) {
        alert(`La línea solo tiene ${cajasPendientes} cajas pendientes.`);
        return;
    }

    let payload;
    if (fuente.tipo === "Produccion") {
        const produccion = produccionesAreas.find(p => p.idProduccion === fuente.id);
        const disponibles = cantidadDisponibleProduccion(produccion);
        if (!produccion) { alert("No se encontró la producción seleccionada."); return; }
        if (normalizarAreaProduccion(produccion.area) !== normalizarAreaProduccion(detalle.area)) {
            alert("El lote seleccionado no pertenece al área responsable de esta línea.");
            return;
        }
        if (estadoUsoLote === "Empacado Parcial" && (sobranteFuente <= 0 || sobranteFuente >= disponibles)) {
            alert(`Ingrese un sobrante mayor a cero y menor a ${disponibles.toLocaleString("es-GT", { maximumFractionDigits: 2 })} ${unidadFuenteProduccion(produccion)}.`);
            return;
        }
        payload = {
            action: "registroEmpaqueProduccion",
            idPedidoCliente: pedido.idPedido,
            idLinea: detalle.idLinea,
            idProduccion: produccion.idProduccion,
            cantidadPorCaja: medidaPorCaja,
            cajas,
            estadoUsoLote,
            sobranteFuente: estadoUsoLote === "Empacado Parcial" ? sobranteFuente : 0,
            responsable,
            nota,
            fecha: new Date().toISOString()
        };
    } else {
        const lote = pedidosPendientes.find(p => p.id === fuente.id);
        const sobranteLb = sobranteFuente;
        if (!lote) { alert("Seleccione un lote de fruta disponible."); return; }
        if (normalizarTextoFront(lote.fruta) !== normalizarTextoFront(detalle.productoBaseProduccion || detalle.producto)) {
            alert("La fruta del lote no coincide con la fruta solicitada en el pedido.");
            return;
        }
        if (estadoUsoLote === "Empacado Parcial" && (sobranteLb <= 0 || sobranteLb >= Number(lote.pesoDisponibleEmpaque || lote.pesoProcesado || 0))) {
            alert("Ingrese un sobrante mayor a cero y menor al disponible del lote.");
            return;
        }
        payload = {
            action: "registroEmpaquePedido",
            idPedidoCliente: pedido.idPedido,
            idPedidoTecnico: pedido.idPedidoTecnico || "",
            idLinea: detalle.idLinea || "",
            cliente: pedido.cliente,
            codigoCliente: pedido.codigoCliente,
            areaDetalle: detalle.area,
            productoDetalle: detalle.producto,
            presentacionDetalle: detalle.presentacion || "",
            unidadDetalle: detalle.unidad,
            presentacionLb: medidaPorCaja,
            cajas,
            idLoteFruta: lote.id,
            idLoteTecnico: lote.idLoteTecnico || "",
            fruta: lote.fruta,
            estadoUsoLote,
            sobranteLoteLb: estadoUsoLote === "Empacado Parcial" ? sobranteLb : 0,
            responsable,
            nota,
            fecha: new Date().toISOString()
        };
    }

    document.getElementById("global-status").innerText = "Guardando Empaque...";
    fetch(GOOGLE_SHEETS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(resData => {
        if (resData && resData.status === "error") {
            alert("Error: " + resData.message);
            return;
        }
        alert("Empaque registrado exitosamente.");
        resetEmpaqueForm();
        fetchDataFromCloud();
        switchView("pedidos");
    })
    .catch(err => {
        console.error(err);
        alert("Error al guardar empaque.");
    });
}
