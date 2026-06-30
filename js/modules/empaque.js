function renderEmpaqueSelect() {
    renderEmpaquePedidoSelect();
    renderEmpaqueLoteSelect();
    renderEmpaqueDetalleSelect();
    actualizarInfoEmpaque();
}

function renderEmpaquePedidoSelect() {
    const select = document.getElementById('e-pedido-cliente-select');
    if (!select) return;
    select.innerHTML = '<option value="">-- Seleccionar pedido --</option>';
    pedidosCliente
        .filter(p => p.visibleApp !== "NO" && p.estadoPedido !== "Completado" && p.estadoPedido !== "Cancelado")
        .forEach(p => {
            select.innerHTML += `<option value="${p.idPedido}">${p.idPedido} - ${p.cliente}</option>`;
        });
}

function renderEmpaqueDetalleSelect() {
    const select = document.getElementById('e-detalle-pedido-select');
    if (!select) return;
    const idPedido = document.getElementById('e-pedido-cliente-select').value;
    select.innerHTML = '<option value="">-- Seleccionar línea de empaque --</option>';
    detallesEmpaqueElegibles(idPedido).forEach((d, index) => {
            const key = String(index);
            const completada = Number(d.cantidadCompletada || 0);
            const pedida = Number(d.cantidadPedida || 0);
            select.innerHTML += `<option value="${key}">${d.producto} · ${d.presentacion || 'Sin presentación'} (${completada}/${pedida} ${d.unidad})</option>`;
        });
    actualizarInfoPedidoEmpaque();
}

function detallesEmpaqueElegibles(idPedido) {
    return detallePedidosCliente
        .filter(d => d.idPedido === idPedido && d.visibleApp !== "NO" && d.estadoDetalle !== "Completado" && d.estadoDetalle !== "Cancelado")
        .filter(d => normalizarTextoFront(d.area) === "empaque");
}

function renderEmpaqueLoteSelect() {
    const select = document.getElementById('e-lote-fruta-select');
    if (!select) return;
    const detalle = buscarDetalleEmpaqueSeleccionado();
    select.innerHTML = '<option value="">-- Seleccionar lote de fruta --</option>';
    pedidosPendientes
        .filter(p => p.visibleApp === "SI" && p.estadoFrutas === "Finalizado" && p.estadoEmpaqueGlobal !== "Empacado Total")
        .filter(p => !detalle || normalizarTextoFront(p.fruta) === normalizarTextoFront(detalle.producto))
        .forEach(p => {
            const disponible = Number(p.pesoDisponibleEmpaque || p.pesoProcesado || 0);
            select.innerHTML += `<option value="${p.id}">${p.id} - ${p.fruta} (${disponible} lb disp.)</option>`;
        });
}

function buscarDetalleEmpaqueSeleccionado() {
    const key = document.getElementById('e-detalle-pedido-select').value;
    if (!key) return null;
    const idPedido = document.getElementById('e-pedido-cliente-select').value;
    return detallesEmpaqueElegibles(idPedido)[Number(key)] || null;
}

function normalizarTextoFront(valor) {
    return (valor || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
}

function actualizarInfoPedidoEmpaque() {
    const detalle = buscarDetalleEmpaqueSeleccionado();
    renderEmpaqueLoteSelect();
    if (detalle && detalle.presentacion) {
        const match = String(detalle.presentacion).match(/(\d+(?:\.\d+)?)/);
        if (match && !document.getElementById('e-presentacion-lb').value) {
            document.getElementById('e-presentacion-lb').value = match[1];
        }
    }
    actualizarInfoEmpaque();
}

function actualizarInfoEmpaque() {
    const loteId = document.getElementById('e-lote-fruta-select').value;
    const box = document.getElementById('e-info-box');
    const pedido = pedidosCliente.find(p => p.idPedido === document.getElementById('e-pedido-cliente-select').value);
    const detalle = buscarDetalleEmpaqueSeleccionado();
    const lote = pedidosPendientes.find(p => p.id === loteId);
    if (!box) return;
    if (!pedido && !detalle && !lote) {
        box.classList.add('hidden');
        return;
    }

    const disponible = lote ? Number(lote.pesoDisponibleEmpaque || lote.pesoProcesado || 0) : 0;
    box.innerHTML = `
        ${pedido ? `<div><span class="text-slate-400">Pedido:</span> <span class="font-mono font-bold text-emerald-300">${pedido.idPedido}</span> · ${pedido.cliente}</div>` : ""}
        ${detalle ? `<div><span class="text-slate-400">Línea:</span> <span class="font-bold">${detalle.producto}</span> (${detalle.cantidadCompletada}/${detalle.cantidadPedida} ${detalle.unidad})</div>` : ""}
        ${lote ? `<div><span class="text-slate-400">Lote fruta:</span> <span class="font-mono font-bold text-amber-300">${lote.id}</span> · ${lote.fruta}</div>
        <div><span class="text-slate-400">Disponible:</span> <span class="font-black text-cyan-300">${disponible} lb</span></div>` : ""}
    `;
    box.classList.remove('hidden');
}

function actualizarCamposUsoLote() {
    const parcial = document.getElementById('e-estado-uso-lote').value === "Empacado Parcial";
    document.getElementById('e-sobrante-box').classList.toggle('hidden', !parcial);
}

function resetEmpaqueForm() {
    document.getElementById('e-pedido-cliente-select').value = "";
    document.getElementById('e-detalle-pedido-select').innerHTML = '<option value="">-- Seleccionar línea de empaque --</option>';
    document.getElementById('e-lote-fruta-select').value = "";
    document.getElementById('e-presentacion-lb').value = "";
    document.getElementById('e-cajas').value = "";
    document.getElementById('e-estado-uso-lote').value = "Empacado Total";
    document.getElementById('e-sobrante-lb').value = "";
    document.getElementById('e-responsable').value = "";
    document.getElementById('e-nota').value = "";
    document.getElementById('e-info-box').classList.add('hidden');
    actualizarCamposUsoLote();
}

function submitEmpaque() {
    const pedido = pedidosCliente.find(p => p.idPedido === document.getElementById('e-pedido-cliente-select').value);
    const detalle = buscarDetalleEmpaqueSeleccionado();
    const lote = pedidosPendientes.find(p => p.id === document.getElementById('e-lote-fruta-select').value);
    const presentacionLb = Number(document.getElementById('e-presentacion-lb').value);
    const cajas = Number(document.getElementById('e-cajas').value);
    const estadoUsoLote = document.getElementById('e-estado-uso-lote').value;
    const sobranteLb = Number(document.getElementById('e-sobrante-lb').value || 0);

    if (!pedido) { alert("Seleccione un pedido de cliente."); return; }
    if (!detalle) { alert("Seleccione una línea de empaque del armado."); return; }
    if (!lote) { alert("Seleccione un lote de fruta disponible."); return; }
    if (normalizarTextoFront(lote.fruta) !== normalizarTextoFront(detalle.producto)) {
        alert("La fruta del lote no coincide con la fruta solicitada en el pedido.");
        return;
    }
    if (!presentacionLb || presentacionLb <= 0) { alert("Ingrese presentación en lb por caja."); return; }
    if (!cajas || cajas <= 0) { alert("Ingrese cajas hechas."); return; }
    const cajasPendientes = Number(detalle.cantidadPedida || 0) - Number(detalle.cantidadCompletada || 0);
    if (cajas > cajasPendientes) {
        alert(`La línea solo tiene ${cajasPendientes} ${detalle.unidad} pendientes.`);
        return;
    }
    if (estadoUsoLote === "Empacado Parcial" && (sobranteLb <= 0 || sobranteLb >= Number(lote.pesoDisponibleEmpaque || lote.pesoProcesado || 0))) {
        alert("Ingrese un sobrante mayor a cero y menor al disponible del lote.");
        return;
    }

    const payload = {
        action: "registroEmpaquePedido",
        idPedidoCliente: pedido.idPedido,
        cliente: pedido.cliente,
        codigoCliente: pedido.codigoCliente,
        areaDetalle: detalle.area,
        productoDetalle: detalle.producto,
        presentacionDetalle: detalle.presentacion || "",
        unidadDetalle: detalle.unidad,
        presentacionLb: presentacionLb,
        cajas: cajas,
        idLoteFruta: lote.id,
        fruta: lote.fruta,
        estadoUsoLote: estadoUsoLote,
        sobranteLoteLb: estadoUsoLote === "Empacado Parcial" ? sobranteLb : 0,
        responsable: document.getElementById('e-responsable').value.trim(),
        nota: document.getElementById('e-nota').value.trim(),
        fecha: new Date().toLocaleString('es-ES')
    };

    document.getElementById('global-status').innerText = "⏳ Guardando Empaque...";
    fetch(GOOGLE_SHEETS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(resData => {
        if (resData && resData.status === "error") {
            alert("❌ " + resData.message);
        } else {
            alert("✅ ¡Empaque registrado exitosamente!");
            resetEmpaqueForm();
            fetchDataFromCloud();
            switchView('pedidos');
        }
    })
    .catch(err => { console.error(err); alert("❌ Error al guardar empaque."); });
}
