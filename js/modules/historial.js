function numeroHistorial(valor, decimales) {
    return Number(valor || 0).toLocaleString('es-GT', {
        maximumFractionDigits: decimales
    });
}

function fechaHistorial(valor) {
    if (!valor) return "Sin fecha";
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return String(valor);
    return fecha.toLocaleString('es-GT', {
        dateStyle: "short",
        timeStyle: "short"
    });
}

function sesionesDePedido(idPedido) {
    return empaqueSesiones.filter(s => s.idPedido === idPedido);
}

function sesionesDeLote(idLote) {
    return empaqueSesiones.filter(s => s.idLoteFruta === idLote);
}

function renderHistorialPedidos() {
    const container = document.getElementById('historial-pedidos-container');
    if (!container) return;

    const pedidosVisibles = pedidosCliente.filter(p => p.visibleApp !== "NO");
    container.innerHTML = "";
    if (!pedidosVisibles.length) {
        container.innerHTML = '<p class="text-center text-xs text-slate-500 py-4">No hay pedidos registrados.</p>';
        return;
    }

    [...pedidosVisibles].reverse().forEach(pedido => {
        const detalles = detallesDePedido(pedido.idPedido);
        const progreso = calcularProgresoPedido(detalles);
        const estilo = estilosEstadoPedido(pedido.estadoPedido);
        const sesiones = sesionesDePedido(pedido.idPedido);
        const cajasTotales = sesiones.reduce((total, s) => total + Number(s.cajasHechas || 0), 0);
        const pesoTotal = sesiones.reduce((total, s) => total + Number(s.pesoEmpacadoLb || 0), 0);

        const lineasHtml = detalles.map(detalle => {
            const pedida = Number(detalle.cantidadPedida || 0);
            const completada = Number(detalle.cantidadCompletada || 0);
            const porcentaje = pedida > 0 ? Math.min(100, Math.round((completada / pedida) * 100)) : 0;
            return `
                <div class="border-t border-slate-700/70 pt-2">
                    <div class="flex justify-between gap-3 text-[10px]">
                        <span><b class="text-slate-200">${detalle.area} · ${detalle.producto}</b><br><span class="text-slate-500">${detalle.presentacion || "Sin presentación"}</span></span>
                        <span class="text-right font-bold text-slate-300">${numeroHistorial(completada, 2)} / ${numeroHistorial(pedida, 2)}<br><span class="font-normal text-slate-500">${detalle.unidad}</span></span>
                    </div>
                    <div class="mt-2 h-1.5 bg-slate-950 rounded-full overflow-hidden">
                        <div class="${porcentaje >= 100 ? "bg-emerald-500" : porcentaje > 0 ? "bg-sky-500" : "bg-amber-500"} h-full rounded-full" style="width:${porcentaje}%"></div>
                    </div>
                </div>`;
        }).join("");

        const sesionesHtml = sesiones.length
            ? [...sesiones].reverse().map(sesion => `
                <div class="bg-slate-950/60 border border-slate-700/70 rounded-lg p-2.5">
                    <div class="flex justify-between gap-3">
                        <span class="font-mono font-bold text-amber-300">${sesion.idLoteFruta}</span>
                        <span class="font-black ${sesion.estadoUsoLote === "Empacado Total" ? "text-emerald-300" : "text-amber-300"}">${sesion.estadoUsoLote}</span>
                    </div>
                    <div class="mt-1 text-[10px] text-slate-400">
                        ${sesion.fruta} · ${numeroHistorial(sesion.cajasHechas, 0)} cajas · ${numeroHistorial(sesion.pesoEmpacadoLb, 2)} lb
                    </div>
                    <div class="mt-1 text-[9px] text-slate-500">
                        ${fechaHistorial(sesion.fecha)}
                        ${sesion.estadoUsoLote === "Empacado Parcial" ? ` · Sobrante declarado: ${numeroHistorial(sesion.sobranteLoteLb, 2)} lb` : ""}
                    </div>
                </div>`).join("")
            : '<p class="text-[10px] text-slate-500 py-2">Todavía no se han asignado lotes a este pedido.</p>';

        const card = document.createElement('article');
        card.className = `bg-slate-800 p-4 rounded-xl border ${estilo.border} shadow-xl text-xs space-y-3`;
        card.innerHTML = `
            <div class="flex justify-between gap-3 border-b border-slate-700 pb-2">
                <span class="font-mono bg-slate-900 px-2 py-0.5 rounded text-emerald-300 font-bold">${pedido.idPedido}</span>
                <span class="font-black ${estilo.text} uppercase">${pedido.estadoPedido}</span>
            </div>
            <div>
                <h3 class="text-sm font-black text-slate-100">${pedido.cliente}</h3>
                <p class="text-[10px] text-slate-400">Carga: ${pedido.fechaCarga} · ${detalles.length} línea(s)</p>
            </div>
            <div class="${estilo.bg} border ${estilo.border} rounded-lg p-3">
                <div class="flex justify-between text-[10px] font-bold text-slate-300 mb-2">
                    <span>Avance del pedido</span>
                    <span>${progreso.porcentaje}%</span>
                </div>
                <div class="h-2 bg-slate-950 rounded-full overflow-hidden">
                    <div class="${estilo.bar} h-full rounded-full" style="width:${progreso.porcentaje}%"></div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <div class="bg-slate-900/70 border border-slate-700 rounded-lg p-2.5">
                    <span class="block text-[9px] uppercase font-black text-slate-500">Cajas registradas</span>
                    <span class="text-lg font-black text-slate-100">${numeroHistorial(cajasTotales, 0)}</span>
                </div>
                <div class="bg-slate-900/70 border border-slate-700 rounded-lg p-2.5">
                    <span class="block text-[9px] uppercase font-black text-slate-500">Peso empacado</span>
                    <span class="text-lg font-black text-slate-100">${numeroHistorial(pesoTotal, 2)} <small class="text-[9px] text-slate-500">lb</small></span>
                </div>
            </div>
            <div class="space-y-2">
                <h4 class="text-[9px] font-black uppercase text-slate-400">Avance por línea</h4>
                ${lineasHtml}
            </div>
            <div class="space-y-2">
                <h4 class="text-[9px] font-black uppercase text-slate-400">Lotes utilizados</h4>
                ${sesionesHtml}
            </div>`;
        container.appendChild(card);
    });
}

function renderMobileHistory() {
    renderHistorialPedidos();

    const container = document.getElementById('cards-container');
    if (!container) return;
    container.innerHTML = "";
    const filtrado = historialCompleto.filter(i => i.visibleApp === "SI");
    if (filtrado.length === 0) {
        container.innerHTML = '<p class="text-center text-xs text-slate-500 py-4">No hay lotes activos.</p>';
        return;
    }

    [...filtrado].reverse().forEach(p => {
        const frutaEstilos = (p.estadoFrutas === "Proceso Completo" || p.estadoFrutas === "Finalizado")
            ? { bg: "bg-emerald-950/40", border: "border-emerald-700/50", text: "text-emerald-400", lightText: "text-emerald-200" }
            : { bg: "bg-amber-950/40", border: "border-amber-700/50", text: "text-amber-400", lightText: "text-amber-200" };

        const empaqueEstilos = p.estadoEmpaqueGlobal === "Empacado Total"
            ? { bg: "bg-emerald-950/40", border: "border-emerald-700/50", text: "text-emerald-400", lightText: "text-emerald-200" }
            : (p.estadoEmpaqueGlobal === "Empacado Parcial"
                ? { bg: "bg-amber-950/40", border: "border-amber-700/50", text: "text-amber-400", lightText: "text-amber-200" }
                : { bg: "bg-slate-900/60", border: "border-slate-700/50", text: "text-slate-400", lightText: "text-slate-300" });

        const sesiones = sesionesDeLote(p.id);
        const cajasAsignadas = sesiones.reduce((total, s) => total + Number(s.cajasHechas || 0), 0);
        const pesoEmpacado = sesiones.reduce((total, s) => total + Number(s.pesoEmpacadoLb || 0), 0);
        const asignacionesHtml = sesiones.length
            ? [...sesiones].reverse().map(sesion => `
                <div class="bg-slate-950/60 border border-slate-700/70 rounded-lg p-2.5">
                    <div class="flex justify-between gap-3">
                        <span class="font-mono font-bold text-emerald-300">${sesion.idPedido}</span>
                        <span class="font-bold text-slate-300">${numeroHistorial(sesion.cajasHechas, 0)} cajas</span>
                    </div>
                    <div class="mt-1 text-[10px] text-slate-400">${sesion.cliente} · ${numeroHistorial(sesion.pesoEmpacadoLb, 2)} lb · ${sesion.estadoUsoLote}</div>
                    <div class="mt-1 text-[9px] text-slate-500">${fechaHistorial(sesion.fecha)}</div>
                </div>`).join("")
            : '<p class="text-[10px] text-slate-500 py-1">Este lote todavía no tiene asignaciones de empaque.</p>';

        const card = document.createElement('article');
        card.className = "bg-slate-800 p-4 rounded-xl border border-slate-700/70 shadow-xl text-xs space-y-3";
        card.innerHTML = `
            <div class="flex justify-between border-b border-slate-700 pb-2">
                <span class="font-mono bg-slate-900 px-2 py-0.5 rounded text-amber-400 font-bold">${p.id}</span>
                <span class="font-black text-slate-300 uppercase">${p.fruta}</span>
            </div>
            <div>
                <h4 class="text-sm font-black text-slate-100">${p.nombre}</h4>
                <p class="text-[10px] text-slate-400 mt-0.5">Fecha: ${p.fecha}</p>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <div class="bg-slate-900/70 border border-slate-700 p-2.5 rounded-lg">
                    <span class="block text-[9px] uppercase font-black text-indigo-300">Libras procesadas</span>
                    <span class="block text-lg font-black text-slate-100">${numeroHistorial(p.pesoProcesado, 2)}</span>
                </div>
                <div class="bg-slate-900/70 border border-slate-700 p-2.5 rounded-lg">
                    <span class="block text-[9px] uppercase font-black text-cyan-300">Disponible</span>
                    <span class="block text-lg font-black text-slate-100">${numeroHistorial(p.pesoDisponibleEmpaque, 2)} <small class="text-[9px] text-slate-500">lb</small></span>
                </div>
                <div class="bg-slate-900/70 border border-slate-700 p-2.5 rounded-lg">
                    <span class="block text-[9px] uppercase font-black text-amber-300">Cajas registradas</span>
                    <span class="block text-lg font-black text-slate-100">${numeroHistorial(cajasAsignadas || p.cajasProcesadas, 0)}</span>
                </div>
                <div class="bg-slate-900/70 border border-slate-700 p-2.5 rounded-lg">
                    <span class="block text-[9px] uppercase font-black text-emerald-300">Peso empacado</span>
                    <span class="block text-lg font-black text-slate-100">${numeroHistorial(pesoEmpacado, 2)} <small class="text-[9px] text-slate-500">lb</small></span>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-2 pt-1">
                <div class="${frutaEstilos.bg} border ${frutaEstilos.border} p-2.5 rounded-lg text-center">
                    <span class="block text-[9px] uppercase font-black ${frutaEstilos.text} mb-1">Frutas</span>
                    <span class="font-bold ${frutaEstilos.lightText}">${p.estadoFrutas}</span>
                </div>
                <div class="${empaqueEstilos.bg} border ${empaqueEstilos.border} p-2.5 rounded-lg text-center">
                    <span class="block text-[9px] uppercase font-black ${empaqueEstilos.text} mb-1">Empaque</span>
                    <span class="font-bold ${empaqueEstilos.lightText}">${p.estadoEmpaqueGlobal}</span>
                </div>
            </div>
            <div class="space-y-2">
                <h4 class="text-[9px] font-black uppercase text-slate-400">Uso del lote</h4>
                ${asignacionesHtml}
            </div>`;
        container.appendChild(card);
    });
}
