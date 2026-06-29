let pedidoLineasForm = [];

function actualizarVistaPedidosGerente() {
    const adminPanel = document.getElementById('p-admin-panel');
    if (!adminPanel) return;
    adminPanel.classList.toggle('hidden', !isAdmin);
    renderClientesList();
}

function setPedidosMode(mode) {
    document.getElementById('p-create-panel').classList.toggle('hidden', mode !== 'crear');
    document.getElementById('p-clientes-panel').classList.toggle('hidden', mode !== 'clientes');

    document.getElementById('p-mode-list-btn').className = mode === 'lista'
        ? "flex-1 py-2 rounded-lg font-bold bg-emerald-600 text-white"
        : "flex-1 py-2 rounded-lg font-bold bg-slate-700 text-slate-300";
    document.getElementById('p-mode-create-btn').className = mode === 'crear'
        ? "flex-1 py-2 rounded-lg font-bold bg-emerald-600 text-white"
        : "flex-1 py-2 rounded-lg font-bold bg-slate-700 text-slate-300";
    document.getElementById('p-mode-clients-btn').className = mode === 'clientes'
        ? "flex-1 py-2 rounded-lg font-bold bg-emerald-600 text-white"
        : "flex-1 py-2 rounded-lg font-bold bg-slate-700 text-slate-300";

    if (mode === 'crear' && !document.getElementById('p-fecha-carga').value) {
        document.getElementById('p-fecha-carga').valueAsDate = new Date();
    }
}

function renderClientesSelect() {
    const select = document.getElementById('p-cliente-select');
    if (!select) return;
    select.innerHTML = '<option value="">-- Seleccionar cliente --</option>';
    clientesCatalog
        .filter(c => c.visibleApp !== "NO")
        .sort((a, b) => String(a.codigo).localeCompare(String(b.codigo)))
        .forEach(c => {
            select.innerHTML += `<option value="${c.codigo}">${c.codigo} - ${c.nombre}</option>`;
        });
    actualizarInfoClientePedido();
}

function actualizarInfoClientePedido() {
    const codigo = document.getElementById('p-cliente-select').value;
    const info = document.getElementById('p-cliente-info');
    const cliente = clientesCatalog.find(c => c.codigo === codigo);
    if (!cliente) {
        info.classList.add('hidden');
        return;
    }
    info.innerHTML = `<span class="text-slate-400">Cliente:</span> <span class="font-black text-emerald-300">${cliente.nombre}</span><br><span class="text-slate-400">Código:</span> <span class="font-mono font-bold">${cliente.codigo}</span>`;
    info.classList.remove('hidden');
}

function renderClientesList() {
    const list = document.getElementById('p-clientes-list');
    if (!list) return;
    const activos = clientesCatalog.filter(c => c.visibleApp !== "NO");
    list.innerHTML = activos.length ? "" : `<p class="text-center text-slate-500 py-3">No hay clientes registrados.</p>`;
    activos
        .sort((a, b) => String(a.codigo).localeCompare(String(b.codigo)))
        .forEach(c => {
            list.innerHTML += `
                <div class="flex justify-between gap-3 bg-slate-900/70 border border-slate-700 rounded-xl p-3">
                    <div>
                        <span class="block font-black text-slate-100">${c.codigo}</span>
                        <span class="block text-[10px] text-slate-400">${c.nombre}</span>
                    </div>
                    <button onclick="ocultarClientePedido('${c.codigo}')" class="text-rose-300 text-[10px] font-black uppercase ${isAdmin ? '' : 'hidden'}">Ocultar</button>
                </div>`;
        });
}

function agregarClientePedido() {
    if (!isAdmin) { alert("Active modo gerente."); return; }
    const codigo = document.getElementById('p-cliente-codigo-nuevo').value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const nombre = document.getElementById('p-cliente-nombre-nuevo').value.trim();
    if (!codigo || !nombre) { alert("Ingrese código y nombre del cliente."); return; }

    postPedidos({
        action: "guardarClientePedido",
        codigoCliente: codigo,
        nombreCliente: nombre
    }, "Cliente guardado.");
}

function ocultarClientePedido(codigo) {
    if (!isAdmin) { alert("Active modo gerente."); return; }
    if (!confirm("¿Ocultar este cliente del menú?")) return;
    postPedidos({ action: "ocultarClientePedido", codigoCliente: codigo }, "Cliente ocultado.");
}

function agregarLineaPedido() {
    const area = document.getElementById('p-linea-area').value.trim();
    const producto = document.getElementById('p-linea-producto').value.trim();
    const presentacion = document.getElementById('p-linea-presentacion').value.trim();
    const unidad = document.getElementById('p-linea-unidad').value.trim();
    const cantidad = Number(document.getElementById('p-linea-cantidad').value);

    if (!area || !producto || !unidad || !cantidad || cantidad <= 0) {
        alert("Ingrese área, producto, unidad y cantidad pedida.");
        return;
    }

    pedidoLineasForm.push({ area, producto, presentacion, unidad, cantidadPedida: cantidad, nota: "" });
    document.getElementById('p-linea-area').value = "";
    document.getElementById('p-linea-producto').value = "";
    document.getElementById('p-linea-presentacion').value = "";
    document.getElementById('p-linea-unidad').value = "";
    document.getElementById('p-linea-cantidad').value = "";
    renderPedidoLineasForm();
}

function eliminarLineaPedido(index) {
    pedidoLineasForm.splice(index, 1);
    renderPedidoLineasForm();
}

function renderPedidoLineasForm() {
    const container = document.getElementById('p-lineas-form');
    container.innerHTML = pedidoLineasForm.length ? "" : `<p class="text-slate-500 text-center py-2">Agregue al menos una línea del armado.</p>`;
    pedidoLineasForm.forEach((linea, index) => {
        container.innerHTML += `
            <div class="flex justify-between gap-3 bg-slate-900/70 border border-slate-700 rounded-xl p-3">
                <div>
                    <span class="block font-black text-slate-100">${linea.area} · ${linea.producto}</span>
                    <span class="block text-[10px] text-slate-400">${linea.presentacion || 'Sin presentación'} · ${linea.cantidadPedida} ${linea.unidad}</span>
                </div>
                <button onclick="eliminarLineaPedido(${index})" class="text-rose-300 text-[10px] font-black uppercase">Quitar</button>
            </div>`;
    });
}

function resetPedidoForm() {
    document.getElementById('p-cliente-select').value = "";
    document.getElementById('p-fecha-carga').value = "";
    document.getElementById('p-nota').value = "";
    document.getElementById('p-cliente-codigo-nuevo').value = "";
    document.getElementById('p-cliente-nombre-nuevo').value = "";
    pedidoLineasForm = [];
    renderPedidoLineasForm();
    renderClientesSelect();
}

function submitPedidoCliente() {
    if (!isAdmin) { alert("Active modo gerente."); return; }
    const codigo = document.getElementById('p-cliente-select').value;
    const cliente = clientesCatalog.find(c => c.codigo === codigo);
    const fechaCarga = document.getElementById('p-fecha-carga').value;
    if (!cliente) { alert("Seleccione un cliente."); return; }
    if (!fechaCarga) { alert("Seleccione fecha de carga."); return; }
    if (pedidoLineasForm.length === 0) { alert("Agregue al menos una línea al armado."); return; }

    postPedidos({
        action: "crearPedidoCliente",
        cliente: cliente.nombre,
        codigoCliente: cliente.codigo,
        fechaCarga: fechaCarga,
        nota: document.getElementById('p-nota').value.trim(),
        lineas: pedidoLineasForm
    }, "Pedido guardado.");
}

function postPedidos(payload, successMessage) {
    document.getElementById('global-status').innerText = "Guardando...";
    fetch(GOOGLE_SHEETS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(resData => {
        if (resData && resData.status === "error") {
            alert("Error: " + resData.message);
        } else {
            alert(successMessage);
            resetPedidoForm();
            setPedidosMode('lista');
            fetchDataFromCloud();
        }
    })
    .catch(err => { console.error(err); alert("Error de red al guardar pedido."); });
}

function detallesDePedido(idPedido) {
    return detallePedidosCliente.filter(d => d.idPedido === idPedido && d.visibleApp !== "NO");
}

function calcularProgresoPedido(detalles) {
    const totalPedido = detalles.reduce((acc, d) => acc + Number(d.cantidadPedida || 0), 0);
    const totalCompletado = detalles.reduce((acc, d) => acc + Number(d.cantidadCompletada || 0), 0);
    const porcentaje = totalPedido > 0 ? Math.min(100, Math.round((totalCompletado / totalPedido) * 100)) : 0;
    return { totalPedido, totalCompletado, porcentaje };
}

function estilosEstadoPedido(estado) {
    if (estado === "Completado") return { bg: "bg-emerald-950/40", border: "border-emerald-700/50", text: "text-emerald-300", bar: "bg-emerald-500" };
    if (estado === "En proceso") return { bg: "bg-sky-950/40", border: "border-sky-700/50", text: "text-sky-300", bar: "bg-sky-500" };
    if (estado === "Cancelado") return { bg: "bg-rose-950/40", border: "border-rose-700/50", text: "text-rose-300", bar: "bg-rose-500" };
    return { bg: "bg-amber-950/30", border: "border-amber-700/40", text: "text-amber-300", bar: "bg-amber-500" };
}

function renderPedidosResumen() {
    if (!document.getElementById('p-resumen-abiertos')) return;
    const visibles = pedidosCliente.filter(p => p.visibleApp !== "NO");
    const hoy = new Date().toISOString().slice(0, 10);
    document.getElementById('p-resumen-abiertos').innerText = visibles.filter(p => p.estadoPedido === "Abierto").length;
    document.getElementById('p-resumen-proceso').innerText = visibles.filter(p => p.estadoPedido === "En proceso").length;
    document.getElementById('p-resumen-completados').innerText = visibles.filter(p => p.estadoPedido === "Completado").length;
    document.getElementById('p-resumen-hoy').innerText = visibles.filter(p => String(p.fechaCarga).slice(0, 10) === hoy).length;
}

function renderPedidosCards() {
    const container = document.getElementById('p-cards-container');
    if (!container) return;
    const adminPanel = document.getElementById('p-admin-panel');
    if (adminPanel) adminPanel.classList.toggle('hidden', !isAdmin);
    const visibles = pedidosCliente.filter(p => p.visibleApp !== "NO");
    container.innerHTML = "";
    if (visibles.length === 0) {
        container.innerHTML = `<p class="text-center text-xs text-slate-500 py-4">No hay pedidos registrados.</p>`;
        return;
    }

    [...visibles].reverse().forEach(pedido => {
        const detalles = detallesDePedido(pedido.idPedido);
        const progreso = calcularProgresoPedido(detalles);
        const estilo = estilosEstadoPedido(pedido.estadoPedido);
        const lineasHtml = detalles.map(d => {
            const pedida = Number(d.cantidadPedida || 0);
            const completada = Number(d.cantidadCompletada || 0);
            const porcentaje = pedida > 0 ? Math.min(100, Math.round((completada / pedida) * 100)) : 0;
            const lineaEstilo = estilosEstadoPedido(d.estadoDetalle === "Parcial" ? "En proceso" : d.estadoDetalle);
            return `
                <div class="border-t border-slate-700/70 pt-3">
                    <div class="flex justify-between gap-3">
                        <div>
                            <span class="block text-[9px] uppercase font-black ${lineaEstilo.text}">${d.area}</span>
                            <span class="block font-black text-slate-100">${d.producto}</span>
                            <span class="block text-[10px] text-slate-400">${d.presentacion || 'Sin presentación'}</span>
                        </div>
                        <div class="text-right">
                            <span class="block font-black text-slate-200">${completada} / ${pedida}</span>
                            <span class="block text-[10px] text-slate-500">${d.unidad}</span>
                        </div>
                    </div>
                    <div class="mt-2 h-2 bg-slate-900 rounded-full overflow-hidden">
                        <div class="${lineaEstilo.bar} h-full rounded-full" style="width:${porcentaje}%"></div>
                    </div>
                    <div class="mt-1 flex justify-between text-[9px] text-slate-500">
                        <span>${d.estadoDetalle}</span>
                        <span>${porcentaje}%</span>
                    </div>
                </div>`;
        }).join("");

        container.innerHTML += `
            <div class="bg-slate-800 p-4 rounded-xl border ${estilo.border} shadow-xl text-xs space-y-3">
                <div class="flex justify-between gap-3 border-b border-slate-700 pb-2">
                    <span class="font-mono bg-slate-900 px-2 py-0.5 rounded text-emerald-300 font-bold tracking-wider">${pedido.idPedido}</span>
                    <span class="font-black ${estilo.text} uppercase">${pedido.estadoPedido}</span>
                </div>
                <div>
                    <h4 class="text-sm font-black text-slate-100">${pedido.cliente}</h4>
                    <p class="text-[10px] text-slate-400 mt-0.5">Código: ${pedido.codigoCliente} · Carga: ${pedido.fechaCarga}</p>
                    ${pedido.nota ? `<p class="text-[10px] text-slate-500 mt-1">${pedido.nota}</p>` : ""}
                </div>
                <div class="${estilo.bg} border ${estilo.border} rounded-xl p-3">
                    <div class="flex justify-between text-[10px] font-bold text-slate-300 mb-2">
                        <span>Progreso general</span>
                        <span>${progreso.porcentaje}%</span>
                    </div>
                    <div class="h-2 bg-slate-900 rounded-full overflow-hidden">
                        <div class="${estilo.bar} h-full rounded-full" style="width:${progreso.porcentaje}%"></div>
                    </div>
                </div>
                ${lineasHtml}
                <div class="grid grid-cols-3 gap-2 pt-1 ${isAdmin ? '' : 'hidden'}">
                    <button onclick="ocultarPedidoCliente('${pedido.idPedido}')" class="bg-slate-700 text-white text-[10px] font-bold py-2 rounded-xl">Ocultar</button>
                    <button onclick="cancelarPedidoCliente('${pedido.idPedido}')" class="bg-amber-600 text-slate-950 text-[10px] font-black py-2 rounded-xl">Cancelar</button>
                    <button onclick="eliminarPedidoCliente('${pedido.idPedido}')" class="bg-rose-600 text-white text-[10px] font-black py-2 rounded-xl">Eliminar</button>
                </div>
            </div>`;
    });
}

function ocultarPedidoCliente(idPedido) {
    if (!isAdmin) { alert("Active modo gerente."); return; }
    if (!confirm("¿Ocultar este pedido de la app?")) return;
    postPedidos({ action: "ocultarPedidoCliente", idPedido: idPedido }, "Pedido ocultado.");
}

function cancelarPedidoCliente(idPedido) {
    if (!isAdmin) { alert("Active modo gerente."); return; }
    if (!confirm("¿Cancelar este pedido?")) return;
    postPedidos({ action: "cancelarPedidoCliente", idPedido: idPedido }, "Pedido cancelado.");
}

function eliminarPedidoCliente(idPedido) {
    if (!isAdmin) { alert("Active modo gerente."); return; }
    if (!confirm("¿Eliminar este pedido y su detalle de Google Sheets?")) return;
    postPedidos({ action: "eliminarPedidoCliente", idPedido: idPedido }, "Pedido eliminado.");
}
