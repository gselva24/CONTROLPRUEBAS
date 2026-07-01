const PRODUCCION_CONFIG = {
    Planchas: { prefix: "pl", textClass: "text-sky-300" },
    Tamales: { prefix: "ta", textClass: "text-rose-300" }
};

function normalizarAreaProduccion(valor) {
    const area = (valor || "").toString().trim().toLowerCase();
    if (area === "plancha" || area === "planchas") return "planchas";
    if (area === "tamal" || area === "tamales") return "tamales";
    return area;
}

function produccionConfig(area) {
    return PRODUCCION_CONFIG[area];
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
    actualizarTotalProduccion(area);
    renderReportesProduccion(area);
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
               <span class="text-slate-400">Presentación:</span> ${seleccionado.producto.presentacion || "Sin presentación"}`
            : "";
        info.classList.toggle("hidden", !seleccionado);
    }
}

function actualizarProductoProduccion(area) {
    renderProductosProduccion(area);
}

function actualizarTotalProduccion(area) {
    const config = produccionConfig(area);
    const funcionales = Math.max(0, Math.floor(Number(document.getElementById(`${config.prefix}-funcionales`)?.value || 0)));
    const averia = Math.max(0, Math.floor(Number(document.getElementById(`${config.prefix}-averia`)?.value || 0)));
    const total = document.getElementById(`${config.prefix}-total`);
    if (total) total.textContent = (funcionales + averia).toLocaleString("es-GT");
}

function buscarProductoProduccionSeleccionado(area) {
    const config = produccionConfig(area);
    const idCliente = document.getElementById(`${config.prefix}-cliente-select`)?.value || "";
    const idProductoCliente = document.getElementById(`${config.prefix}-producto-select`)?.value || "";
    return productosClienteProduccion(area, idCliente)
        .find(item => item.relacion.idProductoCliente === idProductoCliente) || null;
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
    if (!Number.isInteger(unidadesFuncionales) || unidadesFuncionales <= 0) {
        alert("Ingrese una cantidad válida de unidades funcionales.");
        return;
    }
    if (!Number.isInteger(unidadesAveria) || unidadesAveria < 0) {
        alert("La avería debe ser un número entero igual o mayor a cero.");
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
    document.getElementById(`${config.prefix}-responsable`).value = "";
    document.getElementById(`${config.prefix}-nota`).value = "";
    document.getElementById(`${config.prefix}-producto-info`).classList.add("hidden");
    actualizarTotalProduccion(area);
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
        const funcionales = Number(item.funcionalesDisponibles || 0);
        const averia = Number(item.averiaDisponible || 0);
        return `
            <article class="border border-slate-700 rounded-lg p-3 space-y-2 bg-slate-900/50">
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <strong class="font-mono text-xs ${config.textClass}">${item.codigoProduccion}</strong>
                        <p class="font-bold text-sm break-words">${item.producto}</p>
                        <p class="text-[10px] text-slate-400">${item.cliente} · ${formatearFechaProduccion(item.fecha)}</p>
                    </div>
                    <span class="text-[10px] font-black uppercase text-slate-300">${item.estadoDisponibilidad}</span>
                </div>
                <p class="text-[10px] text-slate-400">Reportado: ${Number(item.unidadesFuncionales || 0).toLocaleString("es-GT")} funcionales + ${Number(item.unidadesAveria || 0).toLocaleString("es-GT")} avería</p>
                <div class="grid grid-cols-2 gap-2 text-xs">
                    <div><span class="block text-slate-500">Funcionales disponibles</span><strong>${funcionales.toLocaleString("es-GT")} unid.</strong></div>
                    <div><span class="block text-slate-500">Avería disponible</span><strong>${averia.toLocaleString("es-GT")} unid.</strong></div>
                </div>
            </article>`;
    }).join("");
}
