let pedidoLineasForm = [];
let pedidoDetalleExpandido = "";
let pedidoClienteLineasId = "";

function formatearFechaCargaPedido(valor) {
    if (!valor) return "Sin fecha";
    const texto = String(valor);
    const fechaSimple = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (fechaSimple) return `${fechaSimple[3]}-${fechaSimple[2]}-${fechaSimple[1]}`;

    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return texto;
    const dia = String(fecha.getDate()).padStart(2, "0");
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    return `${dia}-${mes}-${fecha.getFullYear()}`;
}

function toggleDetallePedido(idPedido) {
    pedidoDetalleExpandido = pedidoDetalleExpandido === idPedido ? "" : idPedido;
    renderPedidosCards();
}

function actualizarVistaPedidosGerente() {
    const adminPanel = document.getElementById('p-admin-panel');
    if (!adminPanel) return;
    adminPanel.classList.toggle('hidden', !isAdmin);
    renderClientesList();
    renderProductosAdmin();
}

function setPedidosMode(mode) {
    document.getElementById('p-create-panel').classList.toggle('hidden', mode !== 'crear');
    document.getElementById('p-clientes-panel').classList.toggle('hidden', mode !== 'clientes');
    document.getElementById('p-products-panel').classList.toggle('hidden', mode !== 'productos');

    ["lista", "crear", "clientes", "productos"].forEach(nombre => {
        document.getElementById(`p-mode-${nombre === "crear" ? "create" : nombre === "clientes" ? "clients" : nombre === "productos" ? "products" : "list"}-btn`).className = nombre === mode
            ? "py-2 rounded-lg font-bold bg-emerald-600 text-white"
            : "py-2 rounded-lg font-bold bg-slate-700 text-slate-300";
    });

    if (mode === 'crear' && !document.getElementById('p-fecha-carga').value) {
        document.getElementById('p-fecha-carga').valueAsDate = new Date();
    }
    if (mode === 'productos') renderProductosAdmin();
}

function renderClientesSelect() {
    const select = document.getElementById('p-cliente-select');
    if (!select) return;
    const valorActual = select.value;
    select.innerHTML = '<option value="">-- Seleccionar cliente --</option>';
    clientesCatalog
        .filter(c => c.visibleApp !== "NO")
        .sort((a, b) => String(a.codigo).localeCompare(String(b.codigo)))
        .forEach(c => {
            select.innerHTML += `<option value="${c.idCliente || c.codigo}">${c.codigo} - ${c.nombre}</option>`;
        });
    if (Array.from(select.options || []).some(option => option.value === valorActual)) select.value = valorActual;
    renderClientesProductosSelect();
    actualizarInfoClientePedido();
}

function buscarClienteSeleccionado(valor) {
    return clientesCatalog.find(c => c.idCliente === valor || c.codigo === valor) || null;
}

function actualizarInfoClientePedido() {
    const seleccion = document.getElementById('p-cliente-select').value;
    const info = document.getElementById('p-cliente-info');
    const cliente = buscarClienteSeleccionado(seleccion);
    if (pedidoLineasForm.length && pedidoClienteLineasId && seleccion !== pedidoClienteLineasId) {
        pedidoLineasForm = [];
        pedidoClienteLineasId = "";
        renderPedidoLineasForm();
    }
    if (!cliente) {
        info.classList.add('hidden');
        renderProductosPedidoSelect();
        return;
    }
    info.innerHTML = `<span class="text-slate-400">Cliente:</span> <span class="font-black text-emerald-300">${cliente.nombre}</span><br><span class="text-slate-400">Código:</span> <span class="font-mono font-bold">${cliente.codigo}</span>`;
    info.classList.remove('hidden');
    renderProductosPedidoSelect();
}

function productoGeneralPorId(idProducto) {
    return productosCatalog.find(p => p.idProducto === idProducto) || null;
}

function productoClientePorId(idProductoCliente) {
    return productosClienteCatalog.find(p => p.idProductoCliente === idProductoCliente) || null;
}

function renderProductosPedidoSelect() {
    const select = document.getElementById('p-linea-producto-cliente');
    if (!select) return;
    const cliente = buscarClienteSeleccionado(document.getElementById('p-cliente-select').value);
    const valorActual = select.value;
    select.innerHTML = '<option value="">-- Seleccionar producto --</option>';
    if (cliente) {
        productosClienteCatalog
            .filter(rel => rel.idCliente === cliente.idCliente && rel.visibleApp !== "NO")
            .filter(rel => {
                const producto = productoGeneralPorId(rel.idProducto);
                return producto && producto.visibleApp !== "NO";
            })
            .sort((a, b) => a.nombreComercial.localeCompare(b.nombreComercial))
            .forEach(rel => {
                const producto = productoGeneralPorId(rel.idProducto);
                select.innerHTML += `<option value="${rel.idProductoCliente}">${rel.nombreComercial} · ${producto.presentacion}</option>`;
            });
    }
    if (Array.from(select.options || []).some(option => option.value === valorActual)) select.value = valorActual;
    actualizarInfoProductoPedido();
}

function actualizarInfoProductoPedido() {
    const info = document.getElementById('p-linea-producto-info');
    const relacion = productoClientePorId(document.getElementById('p-linea-producto-cliente').value);
    const producto = relacion ? productoGeneralPorId(relacion.idProducto) : null;
    if (!relacion || !producto) {
        info.classList.add('hidden');
        return;
    }
    info.innerHTML = `
        <span class="block font-black text-emerald-300">${relacion.nombreComercial}</span>
        <span class="text-slate-400">${producto.nombreBase} · ${producto.presentacion}</span><br>
        <span class="text-slate-500">Área:</span> ${producto.area}
        ${producto.productoBaseProduccion ? `<br><span class="text-slate-500">Base de producción:</span> ${producto.productoBaseProduccion}` : ""}`;
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
    }, "Cliente guardado.", "clientes");
}

function ocultarClientePedido(codigo) {
    if (!isAdmin) { alert("Active modo gerente."); return; }
    if (!confirm("¿Ocultar este cliente del menú?")) return;
    postPedidos({ action: "ocultarClientePedido", codigoCliente: codigo }, "Cliente ocultado.", "clientes");
}

function renderClientesProductosSelect() {
    const select = document.getElementById('p-producto-cliente-select');
    if (!select) return;
    const valorActual = select.value;
    select.innerHTML = '<option value="">-- Seleccionar cliente --</option>';
    clientesCatalog
        .filter(c => c.visibleApp !== "NO")
        .sort((a, b) => String(a.codigo).localeCompare(String(b.codigo)))
        .forEach(c => {
            select.innerHTML += `<option value="${c.idCliente}">${c.codigo} - ${c.nombre}</option>`;
        });
    if (Array.from(select.options || []).some(option => option.value === valorActual)) select.value = valorActual;
}

function renderProductosAdmin() {
    const generalSelect = document.getElementById('p-producto-general-select');
    const list = document.getElementById('p-productos-list');
    const baseSelect = document.getElementById('p-producto-base-produccion');
    if (!generalSelect || !list || !baseSelect) return;

    const baseActual = baseSelect.value;
    baseSelect.innerHTML = '<option value="">-- Seleccionar fruta base --</option>';
    frutasCatalog.forEach(fruta => {
        baseSelect.innerHTML += `<option value="${fruta}">${fruta}</option>`;
    });
    if (frutasCatalog.includes(baseActual)) baseSelect.value = baseActual;
    generalSelect.innerHTML = '<option value="">-- Seleccionar producto general --</option>';
    const activos = productosCatalog
        .filter(p => p.visibleApp !== "NO")
        .sort((a, b) => a.nombreBase.localeCompare(b.nombreBase));
    activos.forEach(producto => {
        generalSelect.innerHTML += `<option value="${producto.idProducto}">${producto.nombreBase} · ${producto.presentacion}</option>`;
    });

    list.innerHTML = activos.length ? "" : '<p class="text-center text-slate-500 py-2">No hay productos generales.</p>';
    activos.forEach(producto => {
        list.innerHTML += `
            <div class="flex justify-between gap-3 bg-slate-900/70 border border-slate-700 rounded-lg p-3">
                <div class="min-w-0">
                    <span class="block font-black text-slate-100">${producto.nombreBase}</span>
                    <span class="block text-[10px] text-slate-400">${producto.presentacion} · ${producto.area}</span>
                    ${normalizarTextoFront(producto.area) === "empaque" && producto.productoBaseProduccion ? `<span class="block text-[9px] text-slate-500">Fruta: ${producto.productoBaseProduccion}</span>` : ""}
                </div>
                <button onclick="ocultarProductoGeneral('${producto.idProducto}')" class="text-rose-300 text-[10px] font-black uppercase">Ocultar</button>
            </div>`;
    });
    actualizarCampoBaseProduccionProducto();
    renderClientesProductosSelect();
    renderProductosClienteList();
}

function actualizarCampoBaseProduccionProducto() {
    const area = document.getElementById('p-producto-area');
    const wrapper = document.getElementById('p-producto-base-wrapper');
    const base = document.getElementById('p-producto-base-produccion');
    if (!area || !wrapper || !base) return;
    const esEmpaque = normalizarTextoFront(area.value) === "empaque";
    wrapper.classList.toggle("hidden", !esEmpaque);
    if (!esEmpaque) base.value = "";
}

function renderProductosClienteList() {
    const list = document.getElementById('p-productos-cliente-list');
    const selectCliente = document.getElementById('p-producto-cliente-select');
    if (!list || !selectCliente) return;
    const idCliente = selectCliente.value;
    const relaciones = productosClienteCatalog
        .filter(rel => rel.idCliente === idCliente && rel.visibleApp !== "NO")
        .sort((a, b) => a.nombreComercial.localeCompare(b.nombreComercial));
    list.innerHTML = relaciones.length ? "" : '<p class="text-center text-slate-500 py-2">No hay productos asignados a este cliente.</p>';
    relaciones.forEach(rel => {
        const producto = productoGeneralPorId(rel.idProducto);
        list.innerHTML += `
            <div class="flex justify-between gap-3 bg-slate-900/70 border border-slate-700 rounded-lg p-3">
                <div class="min-w-0">
                    <span class="block font-black text-slate-100">${rel.nombreComercial}</span>
                    <span class="block text-[10px] text-slate-400">${producto ? `${producto.nombreBase} · ${producto.presentacion}` : "Producto no disponible"}</span>
                </div>
                <button onclick="ocultarProductoCliente('${rel.idProductoCliente}')" class="text-rose-300 text-[10px] font-black uppercase">Ocultar</button>
            </div>`;
    });
}

function agregarProductoGeneral() {
    if (!isAdmin) { alert("Active modo gerente."); return; }
    const nombreBase = document.getElementById('p-producto-base-nombre').value.trim();
    const presentacion = document.getElementById('p-producto-presentacion').value.trim();
    const area = document.getElementById('p-producto-area').value.trim();
    const esEmpaque = normalizarTextoFront(area) === "empaque";
    const productoBaseProduccion = esEmpaque
        ? document.getElementById('p-producto-base-produccion').value.trim()
        : nombreBase;
    if (!nombreBase || !presentacion || !area) {
        alert("Ingrese nombre base, presentación y área.");
        return;
    }
    if (esEmpaque && !productoBaseProduccion) {
        alert("Para Empaque seleccione la fruta base de producción.");
        return;
    }
    postPedidos({
        action: "guardarProductoGeneral",
        nombreBase,
        presentacion,
        area,
        productoBaseProduccion
    }, "Producto general guardado.", "productos");
}

function asignarProductoCliente() {
    if (!isAdmin) { alert("Active modo gerente."); return; }
    const idCliente = document.getElementById('p-producto-cliente-select').value;
    const idProducto = document.getElementById('p-producto-general-select').value;
    const nombreComercial = document.getElementById('p-producto-nombre-comercial').value.trim();
    if (!idCliente || !idProducto || !nombreComercial) {
        alert("Seleccione cliente, producto e ingrese el nombre comercial.");
        return;
    }
    postPedidos({
        action: "guardarProductoCliente",
        idCliente,
        idProducto,
        nombreComercial
    }, "Producto asignado al cliente.", "productos");
}

function ocultarProductoGeneral(idProducto) {
    if (!isAdmin) { alert("Active modo gerente."); return; }
    if (!confirm("¿Ocultar este producto general?")) return;
    postPedidos({ action: "ocultarProductoGeneral", idProducto }, "Producto ocultado.", "productos");
}

function ocultarProductoCliente(idProductoCliente) {
    if (!isAdmin) { alert("Active modo gerente."); return; }
    if (!confirm("¿Ocultar este producto del catálogo del cliente?")) return;
    postPedidos({ action: "ocultarProductoCliente", idProductoCliente }, "Producto del cliente ocultado.", "productos");
}

function agregarLineaPedido() {
    const idProductoCliente = document.getElementById('p-linea-producto-cliente').value;
    const relacion = productoClientePorId(idProductoCliente);
    const productoGeneral = relacion ? productoGeneralPorId(relacion.idProducto) : null;
    const cantidad = Math.floor(Number(document.getElementById('p-linea-cantidad').value));

    if (!relacion || !productoGeneral || !cantidad || cantidad <= 0) {
        alert("Seleccione producto e ingrese una cantidad válida de cajas.");
        return;
    }

    pedidoLineasForm.push({
        idProductoCliente: relacion.idProductoCliente,
        idProducto: productoGeneral.idProducto,
        area: productoGeneral.area,
        producto: relacion.nombreComercial,
        presentacion: productoGeneral.presentacion,
        unidad: "cajas",
        productoBaseProduccion: productoGeneral.productoBaseProduccion || "",
        cantidadPedida: cantidad,
        nota: ""
    });
    pedidoClienteLineasId = document.getElementById('p-cliente-select').value;
    document.getElementById('p-linea-producto-cliente').value = "";
    document.getElementById('p-linea-cantidad').value = "";
    actualizarInfoProductoPedido();
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
                    <span class="block font-black text-slate-100">${linea.producto}</span>
                    <span class="block text-[10px] text-slate-400">${linea.presentacion || 'Sin presentación'} · ${linea.area}</span>
                    <span class="block text-[10px] font-bold text-emerald-300">${linea.cantidadPedida} cajas</span>
                </div>
                <button onclick="eliminarLineaPedido(${index})" class="text-rose-300 text-[10px] font-black uppercase">Quitar</button>
            </div>`;
    });
}

function resetPedidoForm() {
    document.getElementById('p-cliente-select').value = "";
    document.getElementById('p-fecha-carga').value = "";
    document.getElementById('p-nota').value = "";
    document.getElementById('p-linea-producto-cliente').value = "";
    document.getElementById('p-linea-cantidad').value = "";
    pedidoLineasForm = [];
    pedidoClienteLineasId = "";
    renderPedidoLineasForm();
    actualizarInfoClientePedido();
}

function submitPedidoCliente() {
    if (!isAdmin) { alert("Active modo gerente."); return; }
    const cliente = buscarClienteSeleccionado(document.getElementById('p-cliente-select').value);
    const fechaCarga = document.getElementById('p-fecha-carga').value;
    if (!cliente) { alert("Seleccione un cliente."); return; }
    if (!fechaCarga) { alert("Seleccione fecha de carga."); return; }
    if (pedidoLineasForm.length === 0) { alert("Agregue al menos una línea al armado."); return; }

    postPedidos({
        action: "crearPedidoCliente",
        idCliente: cliente.idCliente,
        fechaCarga: fechaCarga,
        nota: document.getElementById('p-nota').value.trim(),
        lineas: pedidoLineasForm
    }, "Pedido guardado.");
}

function limpiarFormularioCatalogo(mode) {
    if (mode === "clientes") {
        document.getElementById('p-cliente-codigo-nuevo').value = "";
        document.getElementById('p-cliente-nombre-nuevo').value = "";
    }
    if (mode === "productos") {
        document.getElementById('p-producto-base-nombre').value = "";
        document.getElementById('p-producto-presentacion').value = "";
        document.getElementById('p-producto-area').value = "";
        document.getElementById('p-producto-base-produccion').value = "";
        document.getElementById('p-producto-nombre-comercial').value = "";
        actualizarCampoBaseProduccionProducto();
    }
}

function postPedidos(payload, successMessage, modeAfter = "lista") {
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
            let mensaje = successMessage;
            if (payload.action === "cancelarPedidoCliente" && Array.isArray(resData.lotesLiberados)) {
                const pesoLiberado = resData.lotesLiberados.reduce((total, lote) => total + Number(lote.pesoReincorporadoLb || 0), 0);
                const unidadesLiberadas = resData.lotesLiberados.reduce((total, lote) => total + Number(lote.unidadesReincorporadas || 0), 0);
                const partes = [];
                if (pesoLiberado > 0) partes.push(`${pesoLiberado.toLocaleString('es-GT', { maximumFractionDigits: 2 })} lb`);
                if (unidadesLiberadas > 0) partes.push(`${unidadesLiberadas.toLocaleString('es-GT')} unidades`);
                if (partes.length) mensaje += ` Se reincorporaron ${partes.join(" y ")} a sus fuentes.`;
            }
            alert(mensaje);
            if (payload.action === "crearPedidoCliente") resetPedidoForm();
            limpiarFormularioCatalogo(modeAfter);
            setPedidosMode(modeAfter);
            fetchDataFromCloud();
        }
    })
    .catch(err => { console.error(err); alert("Error de red al guardar pedido."); });
}

function detallesDePedido(idPedido) {
    return detallePedidosCliente.filter(d => d.idPedido === idPedido && d.visibleApp !== "NO");
}

function calcularProgresoPedido(detalles) {
    if (!detalles.length) return { porcentaje: 0 };
    const sumaPorcentajes = detalles.reduce((acc, d) => {
        const pedida = Number(d.cantidadPedida || 0);
        const completada = Number(d.cantidadCompletada || 0);
        return acc + (pedida > 0 ? Math.min(100, (completada / pedida) * 100) : 0);
    }, 0);
    return { porcentaje: Math.round(sumaPorcentajes / detalles.length) };
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
        const estaExpandido = pedidoDetalleExpandido === pedido.idPedido;
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
            <article class="bg-slate-800 rounded-xl border ${estilo.border} shadow-xl text-xs overflow-hidden">
                <button type="button" onclick="toggleDetallePedido('${pedido.idPedido}')" aria-expanded="${estaExpandido}" class="w-full p-4 text-left space-y-3 active:bg-slate-700/50">
                    <div class="flex justify-between gap-3">
                        <span class="font-mono bg-slate-900 px-2 py-0.5 rounded text-emerald-300 font-bold tracking-wider">${pedido.idPedido}</span>
                        <span class="font-black ${estilo.text} uppercase">${pedido.estadoPedido}</span>
                    </div>
                    <div class="flex justify-between gap-3">
                        <div class="min-w-0">
                            <h4 class="text-sm font-black text-slate-100 break-words">${pedido.cliente}</h4>
                            <p class="text-[10px] text-slate-400 mt-0.5">Código: ${pedido.codigoCliente}</p>
                        </div>
                        <div class="shrink-0 text-right">
                            <span class="block text-[9px] uppercase font-black text-slate-500">Fecha de carga</span>
                            <span class="font-bold text-slate-200">${formatearFechaCargaPedido(pedido.fechaCarga)}</span>
                        </div>
                    </div>
                    <div class="${estilo.bg} border ${estilo.border} rounded-lg p-3">
                        <div class="flex justify-between text-[10px] font-bold text-slate-300 mb-2">
                            <span>Progreso general</span>
                            <span>${progreso.porcentaje}%</span>
                        </div>
                        <div class="h-2 bg-slate-900 rounded-full overflow-hidden">
                            <div class="${estilo.bar} h-full rounded-full" style="width:${progreso.porcentaje}%"></div>
                        </div>
                    </div>
                </button>
                <div class="${estaExpandido ? '' : 'hidden'} px-4 pb-4 space-y-3 border-t border-slate-700/70">
                    ${pedido.nota ? `<p class="text-[10px] text-slate-400 pt-3"><span class="font-black uppercase text-slate-500">Nota:</span> ${pedido.nota}</p>` : ""}
                    <div class="${pedido.nota ? '' : 'pt-3'}">
                        <h5 class="text-[9px] font-black uppercase text-slate-500">Detalle del armado</h5>
                    </div>
                    ${lineasHtml}
                    <div class="grid grid-cols-3 gap-2 pt-1 ${isAdmin ? '' : 'hidden'}">
                        <button onclick="ocultarPedidoCliente('${pedido.idPedido}')" class="bg-slate-700 text-white text-[10px] font-bold py-2 rounded-lg">Ocultar</button>
                        <button onclick="cancelarPedidoCliente('${pedido.idPedido}')" class="bg-amber-600 text-slate-950 text-[10px] font-black py-2 rounded-lg">Cancelar</button>
                        <button onclick="eliminarPedidoCliente('${pedido.idPedido}')" class="bg-rose-600 text-white text-[10px] font-black py-2 rounded-lg">Eliminar</button>
                    </div>
                </div>
            </article>`;
    });
}

function ocultarPedidoCliente(idPedido) {
    if (!isAdmin) { alert("Active modo gerente."); return; }
    if (!confirm("¿Ocultar este pedido de la app?")) return;
    postPedidos({ action: "ocultarPedidoCliente", idPedido: idPedido }, "Pedido ocultado.");
}

function cancelarPedidoCliente(idPedido) {
    if (!isAdmin) { alert("Active modo gerente."); return; }
    if (!confirm("¿Cancelar este pedido y liberar sus asignaciones activas?")) return;
    postPedidos({ action: "cancelarPedidoCliente", idPedido: idPedido }, "Pedido cancelado.");
}

function eliminarPedidoCliente(idPedido) {
    if (!isAdmin) { alert("Active modo gerente."); return; }
    if (!confirm("¿Eliminar este pedido y su detalle de Google Sheets?")) return;
    postPedidos({ action: "eliminarPedidoCliente", idPedido: idPedido }, "Pedido eliminado.");
}
