function renderMobileHistory() {
            const container = document.getElementById('cards-container'); 
            container.innerHTML = "";
            const filtrado = historialCompleto.filter(i => i.visibleApp === "SI");
            if (filtrado.length === 0) { container.innerHTML = `<p class="text-center text-xs text-slate-500 py-4">No hay lotes activos.</p>`; return; }
            
            [...filtrado].reverse().forEach(p => {
                let frutaEstilos = (p.estadoFrutas === "Proceso Completo" || p.estadoFrutas === "Finalizado")
                    ? { bg: "bg-emerald-950/40", border: "border-emerald-700/50", text: "text-emerald-400", lightText: "text-emerald-200" }
                    : { bg: "bg-amber-950/40", border: "border-amber-700/50", text: "text-amber-400", lightText: "text-amber-200" };

                let empaqueEstilos = p.estadoEmpaqueGlobal === "Empacado Total"
                    ? { bg: "bg-emerald-950/40", border: "border-emerald-700/50", text: "text-emerald-400", lightText: "text-emerald-200" }
                    : (p.estadoEmpaqueGlobal === "Empacado Parcial"
                        ? { bg: "bg-amber-950/40", border: "border-amber-700/50", text: "text-amber-400", lightText: "text-amber-200" }
                        : { bg: "bg-slate-900/60", border: "border-slate-700/50", text: "text-slate-400", lightText: "text-slate-300" });

                const card = document.createElement('div');
                card.className = "bg-slate-800 p-4 rounded-xl border border-slate-700/70 shadow-xl text-xs space-y-3";
                const pesoProcesado = Number(p.pesoProcesado || 0).toLocaleString('es-GT', { maximumFractionDigits: 2 });
                const cajasProcesadas = Number(p.cajasProcesadas || 0).toLocaleString('es-GT', { maximumFractionDigits: 0 });
                card.innerHTML = `
                    <div class="flex justify-between border-b border-slate-700 pb-2">
                        <span class="font-mono bg-slate-900 px-2 py-0.5 rounded text-amber-400 font-bold tracking-wider">${p.id}</span>
                        <span class="font-black text-slate-300 uppercase tracking-wide">${p.fruta}</span>
                    </div>
                    <div>
                        <h4 class="text-sm font-black text-slate-100">${p.nombre}</h4>
                        <p class="text-[10px] text-slate-400 mt-0.5">Fecha: ${p.fecha}</p>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div class="bg-slate-900/70 border border-slate-700 p-2.5 rounded-xl">
                            <span class="block text-[9px] uppercase font-black tracking-wider text-indigo-300 mb-1">Libras procesadas</span>
                            <span class="block text-lg font-black text-slate-100">${pesoProcesado}</span>
                            <span class="block text-[9px] text-slate-500">lb</span>
                        </div>
                        <div class="bg-slate-900/70 border border-slate-700 p-2.5 rounded-xl">
                            <span class="block text-[9px] uppercase font-black tracking-wider text-amber-300 mb-1">Cajas procesadas</span>
                            <span class="block text-lg font-black text-slate-100">${cajasProcesadas}</span>
                            <span class="block text-[9px] text-slate-500">cajas</span>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3 pt-1">
                        <div class="${frutaEstilos.bg} border ${frutaEstilos.border} p-2.5 rounded-xl text-center">
                            <span class="block text-[9px] uppercase font-black tracking-wider ${frutaEstilos.text} mb-1">🍓 Frutas</span>
                            <span class="font-bold ${frutaEstilos.lightText}">${p.estadoFrutas}</span>
                        </div>
                        <div class="${empaqueEstilos.bg} border ${empaqueEstilos.border} p-2.5 rounded-xl text-center">
                            <span class="block text-[9px] uppercase font-black tracking-wider ${empaqueEstilos.text} mb-1">📦 Empaque</span>
                            <span class="font-bold ${empaqueEstilos.lightText}">${p.estadoEmpaqueGlobal}</span>
                        </div>
                    </div>`;
                container.appendChild(card);
            });
        }

