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

function textoSeguroHistorial(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function toggleReporteHistorial(id) {
    const reporte = document.getElementById(id);
    if (reporte) reporte.classList.toggle("hidden");
}

function todasSesionesDeLote(idLote) {
    return empaqueSesiones.filter(s => s.idLoteFruta === idLote);
}

function todasSesionesDeProduccion(idProduccion) {
    return empaqueSesiones.filter(s => s.idProduccion === idProduccion);
}

function resumenMovimientosHistorial(sesiones) {
    return sesiones
        .filter(s => normalizarTextoFront(s.estadoRegistro || "Activa") !== "revertida")
        .reduce((total, sesion) => {
            const retirada = Number(sesion.cantidadFuenteConsumida || sesion.unidadesConsumidas || 0);
            total.usado += typeof sesion.cantidadFuenteUtilizada !== "undefined"
                ? Number(sesion.cantidadFuenteUtilizada || 0)
                : retirada;
            total.averia += Number(sesion.cantidadAveriaSesion || 0);
            total.desecho += Number(sesion.cantidadDesechoSesion || 0);
            total.salida += retirada;
            total.cajas += Number(sesion.cajasHechas || 0);
            return total;
        }, { usado: 0, averia: 0, desecho: 0, salida: 0, cajas: 0 });
}

function detalleMovimientoHistorial(sesion, unidadFallback) {
    const unidad = textoSeguroHistorial(sesion.unidadMovimiento || sesion.unidadFuente || unidadFallback || "unidad");
    const retirada = Number(sesion.cantidadFuenteConsumida || sesion.unidadesConsumidas || 0);
    const utilizada = typeof sesion.cantidadFuenteUtilizada !== "undefined"
        ? Number(sesion.cantidadFuenteUtilizada || 0)
        : retirada;
    const averia = Number(sesion.cantidadAveriaSesion || 0);
    const desecho = Number(sesion.cantidadDesechoSesion || 0);
    const revertida = normalizarTextoFront(sesion.estadoRegistro || "Activa") === "revertida";
    return `
        <div class="bg-slate-950/70 border ${revertida ? "border-rose-800/70" : "border-slate-700/70"} rounded-lg p-3 space-y-2">
            <div class="flex justify-between gap-3">
                <span class="font-mono font-bold ${revertida ? "text-rose-300" : "text-emerald-300"}">${textoSeguroHistorial(sesion.idPedido || "Sin pedido")}</span>
                <span class="font-bold text-slate-200">${numeroHistorial(sesion.cajasHechas, 0)} cajas</span>
            </div>
            <p class="text-[10px] text-slate-300">${textoSeguroHistorial(sesion.cliente || "Sin cliente")} · ${textoSeguroHistorial(sesion.producto || sesion.fruta || "Sin producto")} · ${textoSeguroHistorial(sesion.presentacionRegistro || sesion.presentacion || "Sin presentacion")}</p>
            <p class="text-[9px] text-slate-500">Sesion: ${textoSeguroHistorial(sesion.idSesion || "Sin ID")} · ${textoSeguroHistorial(sesion.tipoFuente || "Fuente")} · ${textoSeguroHistorial(sesion.estadoUsoLote || "Sin estado de uso")}</p>
            <div class="grid grid-cols-2 gap-1 text-[10px] text-slate-400">
                <span>Anterior: <strong class="text-slate-200">${numeroHistorial(sesion.cantidadFuenteAnterior, 2)} ${unidad}</strong></span>
                <span>Usado: <strong class="text-emerald-300">${numeroHistorial(utilizada, 2)} ${unidad}</strong></span>
                <span>Averia: <strong class="text-amber-300">${numeroHistorial(averia, 2)} ${unidad}</strong></span>
                <span>Desecho: <strong class="text-rose-300">${numeroHistorial(desecho, 2)} ${unidad}</strong></span>
                <span>Salida total: <strong class="text-slate-200">${numeroHistorial(retirada, 2)} ${unidad}</strong></span>
                <span>Sobrante: <strong class="text-cyan-300">${numeroHistorial(sesion.cantidadFuenteSobrante, 2)} ${unidad}</strong></span>
            </div>
            <p class="text-[9px] text-slate-500">${fechaHistorial(sesion.fecha)} · ${textoSeguroHistorial(sesion.responsable || "Sin responsable")} · ${textoSeguroHistorial(sesion.estadoRegistro || "Activa")}</p>
            ${sesion.nota ? `<p class="text-[10px] text-slate-400">Nota: ${textoSeguroHistorial(sesion.nota)}</p>` : ""}
            ${revertida && sesion.motivoReversion ? `<p class="text-[10px] text-rose-300">Reversion: ${textoSeguroHistorial(sesion.motivoReversion)}</p>` : ""}
        </div>`;
}

function sesionesDeLote(idLote) {
    return empaqueSesiones.filter(s =>
        s.idLoteFruta === idLote &&
        normalizarTextoFront(s.estadoRegistro || "Activa") !== "revertida"
    );
}

function sesionesDeProduccion(idProduccion) {
    return empaqueSesiones.filter(s =>
        s.idProduccion === idProduccion &&
        normalizarTextoFront(s.estadoRegistro || "Activa") !== "revertida"
    );
}

function historialAreasPermitidas() {
    return (typeof APP_CONFIG !== "undefined" && APP_CONFIG.historyAreas) || ["frutas", "planchas", "tamales"];
}

function historialAreaVisible(area) {
    const normalizada = normalizarAreaProduccion(area);
    if (!historialAreasPermitidas().includes(normalizada)) return false;
    return historialAreaFiltro === "todos" || historialAreaFiltro === normalizada;
}

function loteFrutaCompletado(lote) {
    const disponible = typeof lote.cantidadDisponibleEmpaque !== "undefined"
        ? Number(lote.cantidadDisponibleEmpaque || 0)
        : Number(lote.pesoDisponibleEmpaque || 0);
    return lote.estadoEmpaqueGlobal === "Empacado Total" || disponible <= 0;
}

function loteProduccionCompletado(lote) {
    return normalizarTextoFront(lote.estadoDisponibilidad) === "agotado" || cantidadDisponibleProduccion(lote) <= 0;
}

function coincideFiltroEstado(completado) {
    if (historialEstadoFiltro === "todos") return true;
    if (historialEstadoFiltro === "completados") return completado;
    return !completado;
}

function setHistorialAreaFiltro(area) {
    historialAreaFiltro = area;
    renderMobileHistory();
}

function setHistorialEstadoFiltro(estado) {
    historialEstadoFiltro = estado;
    if (typeof fetchDataView === "function") {
        fetchDataView("historial", { estado, limit: estado === "completados" ? 100 : 50 });
        return;
    }
    renderMobileHistory();
}

function renderHistorialFiltros() {
    const areaContainer = document.getElementById("historial-area-filters");
    const estadoContainer = document.getElementById("historial-estado-filters");
    if (areaContainer) {
        const areas = historialAreasPermitidas();
        const opciones = areas.length > 1
            ? [{ id: "todos", label: "Todos" }].concat(areas.map(area => ({ id: area, label: area === "frutas" ? "Frutas" : area === "planchas" ? "Planchas" : "Tamales" })))
            : areas.map(area => ({ id: area, label: area === "planchas" ? "Planchas" : area === "tamales" ? "Tamales" : "Frutas" }));
        if (!opciones.some(opcion => opcion.id === historialAreaFiltro)) historialAreaFiltro = opciones[0]?.id || "todos";
        areaContainer.innerHTML = opciones.map(opcion => `
            <button type="button" onclick="setHistorialAreaFiltro('${opcion.id}')" class="${historialAreaFiltro === opcion.id ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'} px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-700">${opcion.label}</button>
        `).join("");
    }
    if (estadoContainer) {
        const opcionesEstado = [
            { id: "activos", label: "Activos" },
            { id: "completados", label: "Completados" },
            { id: "todos", label: "Todos" }
        ];
        estadoContainer.innerHTML = opcionesEstado.map(opcion => `
            <button type="button" onclick="setHistorialEstadoFiltro('${opcion.id}')" class="${historialEstadoFiltro === opcion.id ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'} px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-700">${opcion.label}</button>
        `).join("");
    }
}

function renderMobileHistory() {
    renderHistorialFiltros();
    const container = document.getElementById('cards-container');
    if (container) {
    container.innerHTML = "";
    const filtrado = historialAreaVisible("frutas")
        ? historialCompleto.filter(i => i.visibleApp === "SI" && coincideFiltroEstado(loteFrutaCompletado(i)))
        : [];
    if (filtrado.length === 0) {
        container.innerHTML = '<p class="text-center text-xs text-slate-500 py-4">No hay lotes para este filtro.</p>';
    } else [...filtrado].reverse().forEach((p, indice) => {
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
        const cantidadDisponible = typeof p.cantidadDisponibleEmpaque !== "undefined" ? p.cantidadDisponibleEmpaque : p.pesoDisponibleEmpaque;
        const unidadDisponible = p.unidadDisponibleEmpaque || "lb";
        const todasSesiones = todasSesionesDeLote(p.id);
        const totalesMovimientos = resumenMovimientosHistorial(todasSesiones);
        const reporteId = `reporte-fruta-${indice}`;
        const movimientosHtml = todasSesiones.length
            ? [...todasSesiones].reverse().map(sesion => detalleMovimientoHistorial(sesion, unidadDisponible)).join("")
            : '<p class="text-[10px] text-slate-500 py-1">Este lote todavia no tiene movimientos de Empaque.</p>';

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
                    <span class="block text-lg font-black text-slate-100">${numeroHistorial(cantidadDisponible, 2)} <small class="text-[9px] text-slate-500">${unidadDisponible}</small></span>
                </div>
                <div class="bg-slate-900/70 border border-slate-700 p-2.5 rounded-lg">
                    <span class="block text-[9px] uppercase font-black text-amber-300">Cajas registradas</span>
                    <span class="block text-lg font-black text-slate-100">${numeroHistorial(cajasAsignadas || p.cajasProcesadas, 0)}</span>
                </div>
                <div class="bg-slate-900/70 border border-slate-700 p-2.5 rounded-lg">
                    <span class="block text-[9px] uppercase font-black text-emerald-300">Sesiones de uso</span>
                    <span class="block text-lg font-black text-slate-100">${numeroHistorial(sesiones.length, 0)}</span>
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
            <button type="button" onclick="toggleReporteHistorial('${reporteId}')" class="w-full bg-slate-700 text-slate-100 text-[10px] font-black uppercase py-2.5 rounded-lg border border-slate-600">Ver reporte del lote</button>
            <div id="${reporteId}" class="hidden space-y-3 border-t border-slate-700 pt-3">
                <div class="grid grid-cols-2 gap-2 text-[10px]">
                    <span>Proveedor: <strong>${textoSeguroHistorial(p.proveedorIniciales || "Sin dato")}</strong></span>
                    <span>Entrada: <strong>${numeroHistorial(p.pesoEntrada, 2)} lb</strong></span>
                    <span>Procesado: <strong>${numeroHistorial(p.pesoProcesado, 2)} lb</strong></span>
                    <span>Averia proceso: <strong>${numeroHistorial(p.pesoAveria, 2)} lb</strong></span>
                    <span>Desecho proceso: <strong>${numeroHistorial(p.pesoDesecho, 2)} lb</strong></span>
                    <span>Disponible actual: <strong>${numeroHistorial(cantidadDisponible, 2)} ${textoSeguroHistorial(unidadDisponible)}</strong></span>
                    <span>Usado total: <strong>${numeroHistorial(totalesMovimientos.usado, 2)} ${textoSeguroHistorial(unidadDisponible)}</strong></span>
                    <span>Averia en Empaque: <strong>${numeroHistorial(totalesMovimientos.averia, 2)} ${textoSeguroHistorial(unidadDisponible)}</strong></span>
                    <span>Desecho en Empaque: <strong>${numeroHistorial(totalesMovimientos.desecho, 2)} ${textoSeguroHistorial(unidadDisponible)}</strong></span>
                </div>
                ${p.notaFinal ? `<p class="text-[10px] text-slate-400">Nota final: ${textoSeguroHistorial(p.notaFinal)}</p>` : ""}
                <h4 class="text-[9px] font-black uppercase text-slate-400">Movimientos de Empaque (${todasSesiones.length})</h4>
                <div class="space-y-2">${movimientosHtml}</div>
            </div>
            <div class="${isAdmin ? 'grid' : 'hidden'} grid-cols-2 gap-2 pt-1">
                <button type="button" onclick="gerenteOcultarLoteApp('${p.id}')" class="bg-slate-700 text-white text-[10px] font-bold py-2.5 rounded-lg">Ocultar</button>
                <button type="button" onclick="gerenteBorrarLoteTotal('${p.id}')" class="bg-rose-600 text-white text-[10px] font-black py-2.5 rounded-lg">Eliminar</button>
            </div>`;
        container.appendChild(card);
    });
    }

    renderHistorialProduccion("Planchas", "planchas-history-container");
    renderHistorialProduccion("Tamales", "tamales-history-container");
}

function renderHistorialProduccion(area, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const reportes = produccionesAreas
        .filter(item => item.visibleApp !== "NO" && normalizarAreaProduccion(item.area) === normalizarAreaProduccion(area))
        .filter(item => historialAreaVisible(area))
        .filter(item => coincideFiltroEstado(loteProduccionCompletado(item)))
        .slice()
        .reverse();

    if (!reportes.length) {
        container.innerHTML = '<p class="text-center text-xs text-slate-500 py-4">No hay lotes para este filtro.</p>';
        return;
    }

    container.innerHTML = reportes.map((item, indice) => {
        const unidad = item.unidadMedida || "unidad";
        const disponible = cantidadDisponibleProduccion(item);
        const sesiones = sesionesDeProduccion(item.idProduccion);
        const todasSesiones = todasSesionesDeProduccion(item.idProduccion);
        const totalesMovimientos = resumenMovimientosHistorial(todasSesiones);
        const reporteId = `reporte-${normalizarAreaProduccion(area)}-${indice}`;
        const usoHtml = todasSesiones.length
            ? [...todasSesiones].reverse().map(sesion => detalleMovimientoHistorial(sesion, unidad)).join("")
            : '<p class="text-[10px] text-slate-500 py-1">Este lote todavia no tiene movimientos de Empaque.</p>';

        const estadoColor = disponible <= 0
            ? "text-rose-300 border-rose-700/50 bg-rose-950/30"
            : disponible < Number(item.totalFisico || 0)
                ? "text-amber-300 border-amber-700/50 bg-amber-950/30"
                : "text-emerald-300 border-emerald-700/50 bg-emerald-950/30";

        return `
            <article class="bg-slate-800 p-4 rounded-xl border border-slate-700/70 shadow-xl text-xs space-y-3">
                <div class="flex justify-between gap-3 border-b border-slate-700 pb-2">
                    <span class="font-mono bg-slate-900 px-2 py-0.5 rounded text-sky-300 font-bold">${item.codigoProduccion}</span>
                    <span class="font-black text-slate-300 uppercase">${item.area}</span>
                </div>
                <div>
                    <h4 class="text-sm font-black text-slate-100 break-words">${item.producto}</h4>
                    <p class="text-[10px] text-slate-400 mt-0.5">${item.cliente} · ${fechaHistorial(item.fecha)}</p>
                </div>
                <div class="grid grid-cols-3 gap-2">
                    <div class="bg-slate-900/70 border border-slate-700 p-2.5 rounded-lg">
                        <span class="block text-[9px] uppercase font-black text-sky-300">Funcional</span>
                        <strong class="text-sm">${numeroHistorial(item.unidadesFuncionales, 2)}</strong>
                    </div>
                    <div class="bg-slate-900/70 border border-slate-700 p-2.5 rounded-lg">
                        <span class="block text-[9px] uppercase font-black text-amber-300">Avería</span>
                        <strong class="text-sm">${numeroHistorial(item.unidadesAveria, 2)}</strong>
                    </div>
                    <div class="bg-slate-900/70 border border-slate-700 p-2.5 rounded-lg">
                        <span class="block text-[9px] uppercase font-black text-slate-400">Unidad</span>
                        <strong class="text-sm">${unidad}</strong>
                    </div>
                </div>
                <div class="border p-3 rounded-lg ${estadoColor}">
                    <div class="flex items-end justify-between gap-3">
                        <span class="text-[9px] uppercase font-black">Disponible para Empaque</span>
                        <strong class="text-lg">${numeroHistorial(disponible, 2)} ${unidad}</strong>
                    </div>
                </div>
                <button type="button" onclick="toggleReporteHistorial('${reporteId}')" class="w-full bg-slate-700 text-slate-100 text-[10px] font-black uppercase py-2.5 rounded-lg border border-slate-600">Ver reporte del lote</button>
                <div id="${reporteId}" class="hidden space-y-3 border-t border-slate-700 pt-3">
                    <div class="grid grid-cols-2 gap-2 text-[10px]">
                        <span>Cliente origen: <strong>${textoSeguroHistorial(item.cliente || "Sin dato")}</strong></span>
                        <span>Total fisico: <strong>${numeroHistorial(item.totalFisico, 2)} ${textoSeguroHistorial(unidad)}</strong></span>
                        <span>Funcional inicial: <strong>${numeroHistorial(item.unidadesFuncionales, 2)} ${textoSeguroHistorial(unidad)}</strong></span>
                        <span>Averia produccion: <strong>${numeroHistorial(item.unidadesAveria, 2)} ${textoSeguroHistorial(unidad)}</strong></span>
                        <span>Disponible actual: <strong>${numeroHistorial(disponible, 2)} ${textoSeguroHistorial(unidad)}</strong></span>
                        <span>Responsable: <strong>${textoSeguroHistorial(item.responsable || "Sin dato")}</strong></span>
                        <span>Usado total: <strong>${numeroHistorial(totalesMovimientos.usado, 2)} ${textoSeguroHistorial(unidad)}</strong></span>
                        <span>Averia en Empaque: <strong>${numeroHistorial(totalesMovimientos.averia, 2)} ${textoSeguroHistorial(unidad)}</strong></span>
                        <span>Desecho en Empaque: <strong>${numeroHistorial(totalesMovimientos.desecho, 2)} ${textoSeguroHistorial(unidad)}</strong></span>
                    </div>
                    ${item.nota ? `<p class="text-[10px] text-slate-400">Nota de produccion: ${textoSeguroHistorial(item.nota)}</p>` : ""}
                    <h4 class="text-[9px] font-black uppercase text-slate-400">Movimientos de Empaque (${todasSesiones.length})</h4>
                    <div class="space-y-2">${usoHtml}</div>
                </div>
                <div class="${isAdmin ? 'grid' : 'hidden'} ${sesiones.length ? 'grid-cols-3' : 'grid-cols-2'} gap-2 pt-1">
                    ${sesiones.length ? `<button type="button" onclick="gerenteRevertirUsoProduccionArea('${item.idProduccion}')" class="bg-amber-500 text-slate-950 text-[10px] font-black py-2.5 rounded-lg">Revertir uso</button>` : ""}
                    <button type="button" onclick="gerenteOcultarProduccionArea('${item.idProduccion}')" class="bg-slate-700 text-white text-[10px] font-bold py-2.5 rounded-lg">Ocultar</button>
                    <button type="button" onclick="gerenteBorrarProduccionArea('${item.idProduccion}')" class="bg-rose-600 text-white text-[10px] font-black py-2.5 rounded-lg">Eliminar</button>
                </div>
            </article>`;
    }).join("");
}
