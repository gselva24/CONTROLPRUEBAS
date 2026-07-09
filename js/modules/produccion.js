const PRODUCCION_CONFIG = {
    Planchas: { prefix: "pl", textClass: "text-sky-300" },
    Tamales: { prefix: "ta", textClass: "text-rose-300" }
};
const produccionModo = { Planchas: "nuevo", Tamales: "nuevo" };

function normalizarAreaProduccion(valor) {
    const area = (valor || "").toString().trim().toLowerCase();
    if (area === "plancha" || area === "planchas") return "planchas";
    if (area === "tamal" || area === "tamales") return "tamales";
    return area;
}

function produccionConfig(area) {
    return PRODUCCION_CONFIG[area];
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

function productosClienteProduccion(area, idCliente) {
    return productosClienteCatalog
        .filter(rel => rel.visibleApp !== "NO" && rel.idCliente === idCliente)
        .map(rel => {
            const producto = productosCatalog.find(p => p.idProducto === rel.idProducto && p.visibleApp !== "NO");
            return { relacion: rel, producto };
        })
        .filter(item => item.producto && normalizarAreaProduccion(item.producto.area) === normalizarAreaProduccion(area));
}

function renderModuloProduccion(area) {
    const config = produccionConfig(area);
    if (!config) return;
    renderClientesProduccion(area);
    renderProductosProduccion(area);
    renderLotesProduccionSelect(area);
    actualizarTotalProduccion(area);
    renderReportesProduccion(area);
    aplicarProduccionMode(area);
}

function renderClientesProduccion(area) {
    const config = produccionConfig(area);
    const select = document.getElementById(`${config.prefix}-cliente-select`);
    if (!select) return;
    const actual = select.value;
    select.innerHTML = '<option value="">-- Seleccionar cliente --</option>';
    clientesCatalog
        .filter(cliente => cliente.visibleApp !== "NO")
        .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), "es"))
        .forEach(cliente => {
            select.innerHTML += `<option value="${cliente.idCliente}">${cliente.codigo} - ${cliente.nombre}</option>`;
        });
    if (clientesCatalog.some(cliente => cliente.idCliente === actual && cliente.visibleApp !== "NO")) select.value = actual;
}

function renderProductosProduccion(area) {
    const config = produccionConfig(area);
    const clienteSelect = document.getElementById(`${config.prefix}-cliente-select`);
    const productoSelect = document.getElementById(`${config.prefix}-producto-select`);
    const info = document.getElementById(`${config.prefix}-producto-info`);
    if (!clienteSelect || !productoSelect) return;

    const actual = productoSelect.value;
    const productos = productosClienteProduccion(area, clienteSelect.value);
    productoSelect.innerHTML = '<option value="">-- Seleccionar producto --</option>';
    productos.forEach(item => {
        productoSelect.innerHTML += `<option value="${item.relacion.idProductoCliente}">${item.relacion.nombreComercial}</option>`;
    });
    if (productos.some(item => item.relacion.idProductoCliente === actual)) productoSelect.value = actual;

    const seleccionado = productos.find(item => item.relacion.idProductoCliente === productoSelect.value);
    if (info) {
        info.innerHTML = seleccionado
            ? `<span class="text-slate-400">Producto base:</span> <strong>${seleccionado.producto.nombreBase}</strong><br>
               <span class="text-slate-400">Presentación:</span> ${seleccionado.producto.presentacion || "Sin presentación"}<br>
               <span class="text-slate-400">Unidad de producción:</span> ${seleccionado.producto.unidadProduccion || "unidad"}`
            : "";
        info.classList.toggle("hidden", !seleccionado);
    }
    actualizarTotalProduccion(area);
}

function actualizarProductoProduccion(area) {
    renderProductosProduccion(area);
    actualizarTotalProduccion(area);
}

function unidadProduccionSeleccionada(area) {
    const seleccion = buscarProductoProduccionSeleccionado(area);
    return seleccion?.producto?.unidadProduccion || "unidad";
}

function actualizarTotalProduccion(area) {
    const config = produccionConfig(area);
    const funcionales = Math.max(0, Number(document.getElementById(`${config.prefix}-funcionales`)?.value || 0));
    const averia = Math.max(0, Number(document.getElementById(`${config.prefix}-averia`)?.value || 0));
    const total = document.getElementById(`${config.prefix}-total`);
    const unidad = document.getElementById(`${config.prefix}-total-unidad`);
    if (total) total.textContent = (funcionales + averia).toLocaleString("es-GT", { maximumFractionDigits: 2 });
    if (unidad) unidad.textContent = ` ${unidadProduccionSeleccionada(area)}`;
    const unidadFinal = document.getElementById(`${config.prefix}-unidad-final`);
    if (unidadFinal && !unidadFinal.value) unidadFinal.value = unidadProduccionSeleccionada(area);
}

function buscarProductoProduccionSeleccionado(area) {
    const config = produccionConfig(area);
    const idCliente = document.getElementById(`${config.prefix}-cliente-select`)?.value || "";
    const idProductoCliente = document.getElementById(`${config.prefix}-producto-select`)?.value || "";
    return productosClienteProduccion(area, idCliente)
        .find(item => item.relacion.idProductoCliente === idProductoCliente) || null;
}

function lotesGestionablesProduccion(area) {
    return produccionesAreas
        .filter(item => item.visibleApp !== "NO")
        .filter(item => normalizarAreaProduccion(item.area) === normalizarAreaProduccion(area))
        .filter(item => ["En proceso", "Pausado"].includes(item.estadoProduccion || ""));
}

function loteProduccionSeleccionado(area) {
    const config = produccionConfig(area);
    const id = document.getElementById(`${config.prefix}-lote-select`)?.value || "";
    return lotesGestionablesProduccion(area).find(item => item.idProduccion === id) || null;
}

function renderLotesProduccionSelect(area) {
    const config = produccionConfig(area);
    const select = document.getElementById(`${config.prefix}-lote-select`);
    if (!select) return;
    const actual = select.value;
    const lotes = lotesGestionablesProduccion(area).slice().reverse();
    select.innerHTML = '<option value="">-- Seleccionar lote --</option>';
    lotes.forEach(lote => {
        select.innerHTML += `<option value="${lote.idProduccion}">${lote.codigoProduccion} - ${lote.producto} - ${lote.cliente} (${lote.estadoProduccion})</option>`;
    });
    if (lotes.some(lote => lote.idProduccion === actual)) select.value = actual;
}

function toggleNode(node, visible) {
    if (node) node.classList.toggle("hidden", !visible);
}

function aplicarProduccionMode(area) {
    const config = produccionConfig(area);
    if (!config) return;
    const modo = produccionModo[area] || "nuevo";
    const gestionando = modo === "gestionar";
    const clienteBox = document.getElementById(`${config.prefix}-cliente-select`)?.closest("div");
    const productoBox = document.getElementById(`${config.prefix}-producto-select`)?.closest("div");
    const infoProducto = document.getElementById(`${config.prefix}-producto-info`);
    const cantidadGrid = document.getElementById(`${config.prefix}-funcionales`)?.closest(".grid");
    const totalBox = document.getElementById(`${config.prefix}-total`)?.parentElement;
    const unidadFinal = document.getElementById(`${config.prefix}-unidad-final`);
    const iniciarBtn = document.getElementById(`${config.prefix}-iniciar-btn`);
    const finalizarBtn = document.getElementById(`${config.prefix}-finalizar-btn`);
    const gestionPanel = document.getElementById(`${config.prefix}-gestion-panel`);
    const newBtn = document.getElementById(`${config.prefix}-mode-new-btn`);
    const manageBtn = document.getElementById(`${config.prefix}-mode-manage-btn`);
    const lote = loteProduccionSeleccionado(area);

    toggleNode(clienteBox, !gestionando);
    toggleNode(productoBox, !gestionando);
    if (infoProducto && gestionando) infoProducto.classList.add("hidden");
    toggleNode(gestionPanel, gestionando);
    toggleNode(cantidadGrid, gestionando && Boolean(lote));
    toggleNode(totalBox, gestionando && Boolean(lote));
    toggleNode(unidadFinal, gestionando && Boolean(lote));
    toggleNode(iniciarBtn, !gestionando);
    toggleNode(finalizarBtn, gestionando && Boolean(lote));

    if (newBtn) newBtn.className = !gestionando
        ? `flex-1 py-2 rounded-lg font-bold ${area === "Tamales" ? "bg-rose-600" : "bg-sky-600"} text-white`
        : "flex-1 py-2 rounded-lg font-bold bg-slate-700 text-slate-300";
    if (manageBtn) manageBtn.className = gestionando
        ? `flex-1 py-2 rounded-lg font-bold ${area === "Tamales" ? "bg-rose-600" : "bg-sky-600"} text-white`
        : "flex-1 py-2 rounded-lg font-bold bg-slate-700 text-slate-300";

    actualizarLoteProduccion(area);
}

function setProduccionMode(area, mode) {
    produccionModo[area] = mode === "gestionar" ? "gestionar" : "nuevo";
    renderLotesProduccionSelect(area);
    aplicarProduccionMode(area);
}

function actualizarLoteProduccion(area) {
    const config = produccionConfig(area);
    const lote = loteProduccionSeleccionado(area);
    const info = document.getElementById(`${config.prefix}-lote-info`);
    const pauseBtn = document.getElementById(`${config.prefix}-pausar-btn`);
    const resumeBtn = document.getElementById(`${config.prefix}-retomar-btn`);
    const finalizarBtn = document.getElementById(`${config.prefix}-finalizar-btn`);
    const cantidadGrid = document.getElementById(`${config.prefix}-funcionales`)?.closest(".grid");
    const totalBox = document.getElementById(`${config.prefix}-total`)?.parentElement;
    const unidadFinal = document.getElementById(`${config.prefix}-unidad-final`);
    if (produccionModo[area] !== "gestionar") {
        toggleNode(pauseBtn, false);
        toggleNode(resumeBtn, false);
        return;
    }

    toggleNode(pauseBtn, Boolean(lote && lote.estadoProduccion === "En proceso"));
    toggleNode(resumeBtn, Boolean(lote && lote.estadoProduccion === "Pausado"));
    toggleNode(finalizarBtn, Boolean(lote));
    toggleNode(cantidadGrid, Boolean(lote));
    toggleNode(totalBox, Boolean(lote));
    toggleNode(unidadFinal, Boolean(lote));

    if (!lote) {
        if (info) info.classList.add("hidden");
        return;
    }
    if (unidadFinal) unidadFinal.value = lote.unidadMedida || unidadFinal.value || "unidad";
    if (info) {
        info.innerHTML = `
            <div><span class="text-slate-400">Estado:</span> <span class="font-black text-amber-300">${lote.estadoProduccion}</span></div>
            <div><span class="text-slate-400">Producto:</span> <span class="font-bold">${lote.producto}</span></div>
            <div><span class="text-slate-400">Cliente:</span> <span class="font-bold">${lote.cliente}</span></div>
            <div><span class="text-slate-400">Codigo:</span> <span class="font-mono font-bold">${lote.codigoProduccion}</span></div>`;
        info.classList.remove("hidden");
    }
}

function postProduccionArea(area, payload, successMessage) {
    document.getElementById("global-status").innerText = `Guardando ${area}...`;
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
        alert(successMessage);
        resetProduccionArea(area);
        loadedDataViews = {};
        fetchDataFromCloud({ force: true });
    })
    .catch(err => {
        console.error(err);
        alert("Error de red al guardar la produccion.");
    });
}

function iniciarProduccionArea(area) {
    const config = produccionConfig(area);
    const idCliente = document.getElementById(`${config.prefix}-cliente-select`).value;
    const seleccion = buscarProductoProduccionSeleccionado(area);
    const responsable = document.getElementById(`${config.prefix}-responsable`).value.trim();
    const nota = document.getElementById(`${config.prefix}-nota`).value.trim();

    if (!idCliente) { alert("Seleccione el cliente destinatario."); return; }
    if (!seleccion) { alert(`Seleccione un producto valido del area de ${area}.`); return; }
    if (!responsable) { alert("Ingrese el responsable."); return; }

    postProduccionArea(area, {
        action: "iniciarProduccionArea",
        area,
        idCliente,
        idProductoCliente: seleccion.relacion.idProductoCliente,
        responsable,
        nota,
        fecha: new Date().toISOString()
    }, "Lote iniciado y guardado.");
}

function pausarProduccionArea(area) {
    const config = produccionConfig(area);
    const lote = loteProduccionSeleccionado(area);
    const responsable = document.getElementById(`${config.prefix}-responsable`).value.trim();
    if (!lote) { alert("Seleccione un lote."); return; }
    if (!responsable) { alert("Ingrese el responsable."); return; }
    const motivo = prompt("Motivo de pausa:");
    if (!motivo) { alert("Ingrese el motivo de pausa."); return; }
    postProduccionArea(area, {
        action: "pausarProduccionArea",
        idProduccion: lote.idProduccion,
        responsable,
        motivoPausa: motivo
    }, "Lote pausado.");
}

function retomarProduccionArea(area) {
    const config = produccionConfig(area);
    const lote = loteProduccionSeleccionado(area);
    const responsable = document.getElementById(`${config.prefix}-responsable`).value.trim();
    if (!lote) { alert("Seleccione un lote."); return; }
    if (!responsable) { alert("Ingrese el responsable."); return; }
    postProduccionArea(area, {
        action: "retomarProduccionArea",
        idProduccion: lote.idProduccion,
        responsable
    }, "Lote retomado.");
}

function finalizarProduccionArea(area) {
    const config = produccionConfig(area);
    const lote = loteProduccionSeleccionado(area);
    const unidadesFuncionales = Number(document.getElementById(`${config.prefix}-funcionales`).value);
    const unidadesAveria = Number(document.getElementById(`${config.prefix}-averia`).value || 0);
    const unidadMedida = document.getElementById(`${config.prefix}-unidad-final`).value.trim() || unidadFuenteProduccion(lote);
    const responsable = document.getElementById(`${config.prefix}-responsable`).value.trim();
    const nota = document.getElementById(`${config.prefix}-nota`).value.trim();

    if (!lote) { alert("Seleccione un lote."); return; }
    if (!Number.isFinite(unidadesFuncionales) || unidadesFuncionales <= 0) { alert("Ingrese una cantidad funcional valida."); return; }
    if (!Number.isFinite(unidadesAveria) || unidadesAveria < 0) { alert("La averia debe ser un numero igual o mayor a cero."); return; }
    if (!unidadMedida) { alert("Ingrese la unidad final."); return; }
    if (!responsable) { alert("Ingrese el responsable."); return; }

    postProduccionArea(area, {
        action: "finalizarProduccionArea",
        idProduccion: lote.idProduccion,
        unidadesFuncionales,
        unidadesAveria,
        unidadMedida,
        responsable,
        nota
    }, "Lote finalizado.");
}

function submitProduccionArea(area) {
    const config = produccionConfig(area);
    const idCliente = document.getElementById(`${config.prefix}-cliente-select`).value;
    const seleccion = buscarProductoProduccionSeleccionado(area);
    const unidadesFuncionales = Number(document.getElementById(`${config.prefix}-funcionales`).value);
    const unidadesAveria = Number(document.getElementById(`${config.prefix}-averia`).value || 0);
    const responsable = document.getElementById(`${config.prefix}-responsable`).value.trim();
    const nota = document.getElementById(`${config.prefix}-nota`).value.trim();

    if (!idCliente) { alert("Seleccione el cliente destinatario."); return; }
    if (!seleccion) { alert(`Seleccione un producto válido del área de ${area}.`); return; }
    if (!Number.isFinite(unidadesFuncionales) || unidadesFuncionales <= 0) {
        alert("Ingrese una cantidad funcional válida.");
        return;
    }
    if (!Number.isFinite(unidadesAveria) || unidadesAveria < 0) {
        alert("La avería debe ser un número igual o mayor a cero.");
        return;
    }
    if (!responsable) { alert("Ingrese el responsable del reporte."); return; }

    document.getElementById("global-status").innerText = `Guardando producción de ${area}...`;
    fetch(GOOGLE_SHEETS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
            action: "registroProduccionArea",
            area,
            idCliente,
            idProductoCliente: seleccion.relacion.idProductoCliente,
            unidadesFuncionales,
            unidadesAveria,
            responsable,
            nota,
            fecha: new Date().toISOString()
        })
    })
    .then(res => res.json())
    .then(resData => {
        if (resData && resData.status === "error") {
            alert("Error: " + resData.message);
            return;
        }
        alert(`Producción registrada: ${resData.codigoProduccion || "registro guardado"}.`);
        resetProduccionArea(area);
        fetchDataFromCloud();
    })
    .catch(err => {
        console.error(err);
        alert("Error de red al guardar la producción.");
    });
}

function resetProduccionArea(area) {
    const config = produccionConfig(area);
    document.getElementById(`${config.prefix}-cliente-select`).value = "";
    document.getElementById(`${config.prefix}-producto-select`).innerHTML = '<option value="">-- Seleccionar producto --</option>';
    document.getElementById(`${config.prefix}-funcionales`).value = "";
    document.getElementById(`${config.prefix}-averia`).value = "";
    const loteSelect = document.getElementById(`${config.prefix}-lote-select`);
    if (loteSelect) loteSelect.value = "";
    const unidadFinal = document.getElementById(`${config.prefix}-unidad-final`);
    if (unidadFinal) unidadFinal.value = "";
    document.getElementById(`${config.prefix}-responsable`).value = "";
    document.getElementById(`${config.prefix}-nota`).value = "";
    document.getElementById(`${config.prefix}-producto-info`).classList.add("hidden");
    actualizarTotalProduccion(area);
    aplicarProduccionMode(area);
}

function formatearFechaProduccion(valor) {
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? String(valor || "") : fecha.toLocaleDateString("es-GT");
}

function renderReportesProduccion(area) {
    const config = produccionConfig(area);
    const container = document.getElementById(`${config.prefix}-reportes`);
    if (!container) return;
    const reportes = produccionesAreas
        .filter(item => item.visibleApp !== "NO" && normalizarAreaProduccion(item.area) === normalizarAreaProduccion(area))
        .slice()
        .reverse();

    if (!reportes.length) {
        container.innerHTML = '<p class="text-center text-xs text-slate-500 py-3">No hay producciones registradas.</p>';
        return;
    }

    container.innerHTML = reportes.slice(0, 20).map(item => {
        const disponible = Number(
            typeof item.cantidadDisponible !== "undefined"
                ? item.cantidadDisponible
                : Number(item.funcionalesDisponibles || 0) + Number(item.averiaDisponible || 0)
        );
        const unidad = item.unidadMedida || "unidad";
        return `
            <article class="border border-slate-700 rounded-lg p-3 space-y-2 bg-slate-900/50">
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <strong class="font-mono text-xs ${config.textClass}">${item.codigoProduccion}</strong>
                        <p class="font-bold text-sm break-words">${item.producto}</p>
                        <p class="text-[10px] text-slate-400">${item.cliente} · ${formatearFechaProduccion(item.fecha)}</p>
                    </div>
                    <span class="text-[10px] font-black uppercase text-slate-300">${item.estadoProduccion || item.estadoDisponibilidad}</span>
                </div>
                <p class="text-[10px] text-slate-400">Reportado: ${Number(item.unidadesFuncionales || 0).toLocaleString("es-GT", { maximumFractionDigits: 2 })} funcionales + ${Number(item.unidadesAveria || 0).toLocaleString("es-GT", { maximumFractionDigits: 2 })} avería</p>
                <div class="grid grid-cols-2 gap-2 text-xs">
                    <div><span class="block text-slate-500">Total físico</span><strong>${Number(item.totalFisico || 0).toLocaleString("es-GT", { maximumFractionDigits: 2 })} ${unidad}</strong></div>
                    <div><span class="block text-slate-500">Disponible para Empaque</span><strong>${disponible.toLocaleString("es-GT", { maximumFractionDigits: 2 })} ${unidad}</strong></div>
                </div>
            </article>`;
    }).join("");
}
