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

function sesionesDeLote(idLote) {
    return empaqueSesiones.filter(s =>
        s.idLoteFruta === idLote &&
        normalizarTextoFront(s.estadoRegistro || "Activa") !== "revertida"
    );
}

function renderMobileHistory() {
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
            </div>
            <div class="${isAdmin ? 'grid' : 'hidden'} grid-cols-2 gap-2 pt-1">
                <button type="button" onclick="gerenteOcultarLoteApp('${p.id}')" class="bg-slate-700 text-white text-[10px] font-bold py-2.5 rounded-lg">Ocultar</button>
                <button type="button" onclick="gerenteBorrarLoteTotal('${p.id}')" class="bg-rose-600 text-white text-[10px] font-black py-2.5 rounded-lg">Eliminar</button>
            </div>`;
        container.appendChild(card);
    });
}
