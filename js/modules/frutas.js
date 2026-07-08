function resetFrutasForm() {
            document.getElementById('f-nombre').value = "";
            document.getElementById('f-proveedor').value = "";
            document.getElementById('f-responsable').value = "";
            document.getElementById('f-peso-in').value = "";
            document.getElementById('f-peso-dinamico-input').value = "";
            document.getElementById('f-peso-averia').value = "";
            document.getElementById('f-peso-desecho').value = "";
            document.getElementById('f-nota-final').value = "";
            document.getElementById('f-pedido-parcial-select').value = "";
            document.getElementById('f-lote-info').classList.add('hidden');
            document.getElementById('f-step-2').classList.add('hidden');
            setFrutasMode(false);
        }

function iniciarLoteFrutas() {
            const nombre = document.getElementById('f-nombre').value.trim();
            const proveedorIniciales = document.getElementById('f-proveedor').value.trim().toUpperCase();
            const responsable = document.getElementById('f-responsable').value.trim();
            const pesoEntrada = Number(document.getElementById('f-peso-in').value);
            if (!nombre) { alert("Ingrese el lote o nombre del pedido."); return; }
            if (!proveedorIniciales) { alert("Ingrese las iniciales del proveedor."); return; }
            if (!responsable) { alert("Ingrese el responsable."); return; }
            if (!pesoEntrada || pesoEntrada <= 0) { alert("Ingrese un peso de entrada mayor a cero."); return; }

            postFrutas({
                action: "iniciarLoteFrutas",
                nombrePedido: nombre,
                proveedorIniciales: proveedorIniciales,
                responsable: responsable,
                frutaTipo: document.getElementById('f-fruta').value,
                pesoEntrada: pesoEntrada,
                fecha: new Date().toLocaleDateString('es-ES')
            }, "Lote iniciado y guardado.");
        }

        function pausarLoteFrutas() {
            const idPedido = document.getElementById('f-pedido-parcial-select').value;
            const responsable = document.getElementById('f-responsable').value.trim();
            if (!idPedido) { alert("Seleccione un lote."); return; }
            if (!responsable) { alert("Ingrese el responsable."); return; }
            const motivo = prompt("Motivo de pausa:");
            if (!motivo) { alert("Ingrese el motivo de pausa."); return; }
            postFrutas({ action: "pausarLoteFrutas", idPedido: idPedido, responsable: responsable, motivoPausa: motivo }, "Lote pausado.");
        }

        function retomarLoteFrutas() {
            const idPedido = document.getElementById('f-pedido-parcial-select').value;
            const responsable = document.getElementById('f-responsable').value.trim();
            if (!idPedido) { alert("Seleccione un lote."); return; }
            if (!responsable) { alert("Ingrese el responsable."); return; }
            postFrutas({ action: "retomarLoteFrutas", idPedido: idPedido, responsable: responsable }, "Lote retomado.");
        }

        function finalizarLoteFrutas() {
            const idPedido = document.getElementById('f-pedido-parcial-select').value;
            const lote = pedidosParciales.find(p => p.id === idPedido);
            const responsable = document.getElementById('f-responsable').value.trim();
            const pesoFinal = Number(document.getElementById('f-peso-dinamico-input').value);
            const pesoAveria = Number(document.getElementById('f-peso-averia').value || 0);
            const pesoDesecho = Number(document.getElementById('f-peso-desecho').value || 0);
            if (!lote) { alert("Seleccione un lote."); return; }
            if (!responsable) { alert("Ingrese el responsable."); return; }
            if (!pesoFinal || pesoFinal <= 0) { alert("Ingrese el peso neto final."); return; }
            if (pesoFinal > Number(lote.pesoEntrada)) { alert("El peso final no puede superar el peso de entrada."); return; }
            if (pesoAveria < 0 || pesoDesecho < 0) { alert("Averia y desecho no pueden ser negativos."); return; }
            postFrutas({
                action: "finalizarLoteFrutas",
                idPedido: idPedido,
                responsable: responsable,
                pesoFinal: pesoFinal,
                pesoAveria: pesoAveria,
                pesoDesecho: pesoDesecho,
                notaFinal: document.getElementById('f-nota-final').value.trim()
            }, "Lote finalizado.");
        }

        function setFrutasMode(mode) {
            isRetomadoMode = mode;
            const gestionando = Boolean(mode);
            document.getElementById('f-grupo-manual-inputs').classList.toggle('hidden', gestionando);
            document.getElementById('f-container-retomar').classList.toggle('hidden', !gestionando);
            document.getElementById('f-iniciar-actions').classList.toggle('hidden', gestionando);
            document.getElementById('f-peso-in').disabled = gestionando;
            document.getElementById('f-peso-in').classList.toggle('opacity-50', gestionando);
            document.getElementById('f-step-2').classList.toggle('hidden', !gestionando);
            document.getElementById('mode-new-btn').className = gestionando
                ? "flex-1 py-2 rounded-lg font-bold bg-slate-700 text-slate-300"
                : "flex-1 py-2 rounded-lg font-bold bg-indigo-600 text-white";
            document.getElementById('mode-resume-btn').className = gestionando
                ? "flex-1 py-2 rounded-lg font-bold bg-indigo-600 text-white"
                : "flex-1 py-2 rounded-lg font-bold bg-slate-700 text-slate-300";
            actualizarAccionesFrutas(null);
        }

        function actualizarAccionesFrutas(lote) {
            const btnPausar = document.getElementById('btn-pausar-lote');
            const btnRetomar = document.getElementById('btn-retomar-lote');
            btnPausar.classList.add('hidden');
            btnRetomar.classList.add('hidden');
            if (!lote) return;
            if (lote.estadoFrutas === "En proceso") btnPausar.classList.remove('hidden');
            if (lote.estadoFrutas === "Pausado") btnRetomar.classList.remove('hidden');
        }

        function autoFillRetomado() {
            const val = document.getElementById('f-pedido-parcial-select').value;
            const lote = pedidosParciales.find(p => p.id === val);
            const info = document.getElementById('f-lote-info');
            actualizarAccionesFrutas(lote);
            if(lote) {
                document.getElementById('f-nombre').value = lote.nombre;
                document.getElementById('f-fruta').value = lote.fruta;
                document.getElementById('f-peso-in').value = lote.pesoEntrada;
                info.innerHTML = `
                    <div><span class="text-slate-400">Estado:</span> <span class="font-black text-amber-300">${lote.estadoFrutas}</span></div>
                    <div><span class="text-slate-400">Fruta / producto:</span> <span class="font-bold">${lote.fruta || '-'}</span></div>
                    <div><span class="text-slate-400">Entrada:</span> <span class="font-bold">${lote.pesoEntrada} lb</span></div>
                    <div><span class="text-slate-400">Proveedor:</span> <span class="font-bold">${lote.proveedorIniciales || '-'}</span></div>`;
                info.classList.remove('hidden');
            } else {
                info.classList.add('hidden');
            }
        }

function renderFrutasSelect() {
    const sel = document.getElementById('f-fruta');
    sel.innerHTML = '';
    frutasCatalog.forEach(f => sel.innerHTML += `<option value="${f}">${f}</option>`);
}

function renderParcialesSelect() {
    const sel = document.getElementById('f-pedido-parcial-select');
    sel.innerHTML = '<option value="">- Seleccione -</option>';
    pedidosParciales
        .filter(p => p.visibleApp === "SI")
        .forEach(p => sel.innerHTML += `<option value="${p.id}">${p.id} - ${p.fruta || 'Sin producto'} - ${p.nombre} (${p.estadoFrutas})</option>`);
}

