// SUSTITUIR CON TU URL DE APPS SCRIPT PUBLICADA
        const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbwq6uE7f06g_z9L-R-Z17I9qnpuGlH3lYIVGIBmf4nNVG19kaGgT9ICOSgvZvudavhdeg/exec"; 
        const GERENTE_PASSWORD = "PRODUCCION2026";

        let isAdmin = false;
        let frutasCatalog = [];
        let pedidosPendientes = [];
        let pedidosParciales = []; 
        let historialCompleto = [];
        let inventarioBodega = [];
        let bodegaNuevoMode = false;
        
        let isRetomadoMode = false; 
        let timerInterval = null;
        let startTime = null;
        let elapsedTimeInSeconds = 0;

        window.addEventListener('DOMContentLoaded', () => { fetchDataFromCloud(); switchView('home'); });

        function fetchDataFromCloud() {
            document.getElementById('global-status').innerText = "â³ Sincronizando...";
            const cacheBust = GOOGLE_SHEETS_URL.includes('?') ? `&t=${Date.now()}` : `?t=${Date.now()}`;
            fetch(`${GOOGLE_SHEETS_URL}${cacheBust}`, { redirect: "follow" })
            .then(res => res.json())
            .then(data => {
                frutasCatalog = data.frutas || [];
                pedidosPendientes = data.pedidosPendientes || [];
                pedidosParciales = data.pedidosParciales || [];
                historialCompleto = data.historial || [];
                inventarioBodega = data.inventarioBodega || [];
                
                renderFrutasSelect(); 
                renderParcialesSelect(); 
                renderEmpaqueSelect(); 
                renderBodegaSelect();
                renderBodegaInventory();
                renderMobileHistory(); 
                renderGerenteLoteSelect();
                
                const historialSinMetricas = historialCompleto.some(p => typeof p.pesoProcesado === "undefined" || typeof p.cajasProcesadas === "undefined");
                if (historialSinMetricas) {
                    document.getElementById('global-status').innerText = "Script sin metricas V2";
                    document.getElementById('global-status').className = "text-[10px] text-amber-400 font-medium italic";
                    return;
                }

                document.getElementById('global-status').innerText = "âœ… Sincronizado";
                document.getElementById('global-status').className = "text-[10px] text-emerald-400 font-medium italic";
            })
            .catch(err => {
                console.error("Error de conexiÃ³n GET:", err);
                document.getElementById('global-status').innerText = "âŒ Error conexiÃ³n";
                document.getElementById('global-status').className = "text-[10px] text-rose-400 font-medium italic";
            });
        }

        function switchView(viewName) {
            document.querySelectorAll('.app-view').forEach(v => v.classList.add('hidden'));
            document.getElementById(`view-${viewName}`).classList.remove('hidden');
        }
        function resetFrutasForm() {
            document.getElementById('f-nombre').value = "";
            document.getElementById('f-proveedor').value = "";
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

        function postFrutas(payload, successMessage) {
            document.getElementById('global-status').innerText = "Guardando...";
            fetch(GOOGLE_SHEETS_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(resData => {
                if(resData && resData.status === "error") {
                    alert("Error: " + resData.message);
                } else {
                    alert(successMessage);
                    resetFrutasForm();
                    fetchDataFromCloud();
                    switchView('historial');
                }
            })
            .catch(err => { console.error(err); alert("Error de red al guardar."); });
        }

        function iniciarLoteFrutas() {
            const nombre = document.getElementById('f-nombre').value.trim();
            const proveedorIniciales = document.getElementById('f-proveedor').value.trim().toUpperCase();
            const pesoEntrada = Number(document.getElementById('f-peso-in').value);
            if (!nombre) { alert("Ingrese el lote o nombre del pedido."); return; }
            if (!proveedorIniciales) { alert("Ingrese las iniciales del proveedor."); return; }
            if (!pesoEntrada || pesoEntrada <= 0) { alert("Ingrese un peso de entrada mayor a cero."); return; }

            postFrutas({
                action: "iniciarLoteFrutas",
                nombrePedido: nombre,
                proveedorIniciales: proveedorIniciales,
                frutaTipo: document.getElementById('f-fruta').value,
                pesoEntrada: pesoEntrada,
                fecha: new Date().toLocaleDateString('es-ES')
            }, "Lote iniciado y guardado.");
        }

        function pausarLoteFrutas() {
            const idPedido = document.getElementById('f-pedido-parcial-select').value;
            if (!idPedido) { alert("Seleccione un lote."); return; }
            const motivo = prompt("Motivo de pausa:");
            if (!motivo) { alert("Ingrese el motivo de pausa."); return; }
            postFrutas({ action: "pausarLoteFrutas", idPedido: idPedido, motivoPausa: motivo }, "Lote pausado.");
        }

        function retomarLoteFrutas() {
            const idPedido = document.getElementById('f-pedido-parcial-select').value;
            if (!idPedido) { alert("Seleccione un lote."); return; }
            postFrutas({ action: "retomarLoteFrutas", idPedido: idPedido }, "Lote retomado.");
        }

        function finalizarLoteFrutas() {
            const idPedido = document.getElementById('f-pedido-parcial-select').value;
            const lote = pedidosParciales.find(p => p.id === idPedido);
            const pesoFinal = Number(document.getElementById('f-peso-dinamico-input').value);
            const pesoAveria = Number(document.getElementById('f-peso-averia').value || 0);
            const pesoDesecho = Number(document.getElementById('f-peso-desecho').value || 0);
            if (!lote) { alert("Seleccione un lote."); return; }
            if (!pesoFinal || pesoFinal <= 0) { alert("Ingrese el peso neto final."); return; }
            if (pesoFinal > Number(lote.pesoEntrada)) { alert("El peso final no puede superar el peso de entrada."); return; }
            if (pesoAveria < 0 || pesoDesecho < 0) { alert("Averia y desecho no pueden ser negativos."); return; }
            postFrutas({
                action: "finalizarLoteFrutas",
                idPedido: idPedido,
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
                    <div><span class="text-slate-400">Entrada:</span> <span class="font-bold">${lote.pesoEntrada} lb</span></div>
                    <div><span class="text-slate-400">Proveedor:</span> <span class="font-bold">${lote.proveedorIniciales || '-'}</span></div>`;
                info.classList.remove('hidden');
            } else {
                info.classList.add('hidden');
            }
        }

        function renderEmpaqueSelect() {
            const select = document.getElementById('e-pedido-select');
            select.innerHTML = '<option value="">-- Seleccionar Lote --</option>';
            pedidosPendientes.filter(p => p.visibleApp === "SI" && p.estadoEmpaqueGlobal !== "Empacado Total").forEach(p => { 
                select.innerHTML += `<option value="${p.id}">${p.id} - ${p.nombre} (${p.fruta})</option>`; 
            });
        }

        function actualizarInfoEmpaque() {
            const idPed = document.getElementById('e-pedido-select').value;
            const box = document.getElementById('e-info-box');
            if(!idPed) { box.classList.add('hidden'); return; }
            
            const lote = pedidosPendientes.find(p => p.id === idPed);
            if(lote) {
                document.getElementById('e-info-status').innerText = lote.estadoFrutas;
                box.classList.remove('hidden');
            }
        }

        function submitEmpaque() {
            const idPed = document.getElementById('e-pedido-select').value;
            const lote = pedidosPendientes.find(p => p.id === idPed);
            const cajas = document.getElementById('e-cajas').value;
            
            if(!lote || !cajas) { alert("âš ï¸ Seleccione un lote y asigne una cantidad de cajas."); return; }

            const payload = {
                action: "registroEmpaque",
                idPedido: idPed,
                nombrePedido: lote.nombre,
                frutaTipo: lote.fruta,
                fechaEmpaque: new Date().toLocaleDateString('es-ES'),
                cajas: cajas,
                estadoEmpaque: document.getElementById('e-estado-cierre').value
            };
            
            document.getElementById('global-status').innerText = "â³ Guardando Empaque...";
            
            fetch(GOOGLE_SHEETS_URL, { 
                method: "POST", 
                headers: { "Content-Type": "text/plain;charset=utf-8" }, 
                body: JSON.stringify(payload) 
            })
            .then(res => res.json())
            .then(resData => { 
                if(resData && resData.status === "error") {
                    alert("âŒ " + resData.message);
                } else {
                    alert("âœ… Â¡Empaque registrado exitosamente!"); 
                    document.getElementById('e-cajas').value = "";
                    document.getElementById('e-pedido-select').value = "";
                    document.getElementById('e-info-box').classList.add('hidden');
                    fetchDataFromCloud(); 
                    switchView('historial'); 
                }
            })
            .catch(err => { console.error(err); alert("âŒ Error al guardar empaque."); });
        }

        function setBodegaMode(mode) {
            bodegaNuevoMode = mode;
            document.getElementById('b-existing-fields').classList.toggle('hidden', mode);
            document.getElementById('b-new-fields').classList.toggle('hidden', !mode);
            document.getElementById('b-tipo-movimiento').value = mode ? "Entrada" : document.getElementById('b-tipo-movimiento').value;
            document.getElementById('b-tipo-movimiento').disabled = mode;
            document.getElementById('b-mode-new-btn').className = mode
                ? "flex-1 py-2 rounded-lg font-bold bg-cyan-600 text-white"
                : "flex-1 py-2 rounded-lg font-bold bg-slate-700 text-slate-300";
            document.getElementById('b-mode-existing-btn').className = !mode
                ? "flex-1 py-2 rounded-lg font-bold bg-cyan-600 text-white"
                : "flex-1 py-2 rounded-lg font-bold bg-slate-700 text-slate-300";
        }

        function renderBodegaSelect() {
            const select = document.getElementById('b-item-select');
            select.innerHTML = '<option value="">-- Seleccionar producto --</option>';
            inventarioBodega
                .filter(i => i.visibleApp !== "NO")
                .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)))
                .forEach(i => {
                    select.innerHTML += `<option value="${i.id}">${i.nombre} (${i.stock} ${i.unidad || ''})</option>`;
                });
            actualizarInfoBodega();
        }

        function actualizarInfoBodega() {
            const id = document.getElementById('b-item-select').value;
            const box = document.getElementById('b-stock-box');
            const item = inventarioBodega.find(i => i.id === id);
            if (!item) { box.classList.add('hidden'); return; }
            document.getElementById('b-stock-actual').innerText = `${item.stock} ${item.unidad || ''}`;
            box.classList.remove('hidden');
        }

        function renderBodegaInventory() {
            const container = document.getElementById('b-inventory-list');
            const activos = inventarioBodega.filter(i => i.visibleApp !== "NO");
            container.innerHTML = "";
            if (activos.length === 0) {
                container.innerHTML = `<p class="text-center text-slate-500 py-3">No hay inventario registrado.</p>`;
                return;
            }

            activos
                .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)))
                .forEach(i => {
                    container.innerHTML += `
                        <div class="flex justify-between gap-3 bg-slate-900/70 border border-slate-700 rounded-xl p-3">
                            <div>
                                <span class="block font-black text-slate-100">${i.nombre}</span>
                                <span class="block text-[10px] text-slate-500">${i.categoria || 'Sin tipo de insumo'}</span>
                            </div>
                            <div class="text-right">
                                <span class="block font-black text-cyan-300">${i.stock}</span>
                                <span class="block text-[10px] text-slate-400">${i.unidad || ''}</span>
                            </div>
                        </div>`;
                });
        }

        function resetBodegaForm() {
            document.getElementById('b-cantidad').value = "";
            document.getElementById('b-nota').value = "";
            document.getElementById('b-nombre-nuevo').value = "";
            document.getElementById('b-categoria-nueva').value = "";
            document.getElementById('b-unidad-nueva').value = "";
            document.getElementById('b-item-select').value = "";
            actualizarInfoBodega();
            setBodegaMode(false);
        }

        function submitBodega() {
            const cantidad = Number(document.getElementById('b-cantidad').value);
            const tipoMovimiento = document.getElementById('b-tipo-movimiento').value;
            const itemSeleccionado = inventarioBodega.find(i => i.id === document.getElementById('b-item-select').value);
            const nombreNuevo = document.getElementById('b-nombre-nuevo').value.trim();

            if (!cantidad || cantidad <= 0) { alert("Ingrese una cantidad mayor a cero."); return; }
            if (!bodegaNuevoMode && !itemSeleccionado) { alert("Seleccione un producto existente."); return; }
            if (bodegaNuevoMode && !nombreNuevo) { alert("Ingrese el nombre del producto nuevo."); return; }
            if (bodegaNuevoMode && tipoMovimiento === "Salida") { alert("Para una salida debe seleccionar un producto existente."); return; }

            const payload = {
                action: "registroBodega",
                tipoMovimiento: tipoMovimiento,
                idItem: itemSeleccionado ? itemSeleccionado.id : "",
                nombreItem: bodegaNuevoMode ? nombreNuevo : itemSeleccionado.nombre,
                categoria: bodegaNuevoMode ? document.getElementById('b-categoria-nueva').value.trim() : itemSeleccionado.categoria,
                unidad: bodegaNuevoMode ? document.getElementById('b-unidad-nueva').value.trim() : itemSeleccionado.unidad,
                cantidad: cantidad,
                responsable: document.getElementById('b-responsable').value.trim(),
                nota: document.getElementById('b-nota').value.trim(),
                fecha: new Date().toLocaleString('es-ES')
            };

            document.getElementById('global-status').innerText = "Guardando movimiento...";
            fetch(GOOGLE_SHEETS_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(resData => {
                if (resData && resData.status === "error") {
                    alert("âŒ " + resData.message);
                } else {
                    alert("Movimiento de bodega guardado.");
                    resetBodegaForm();
                    fetchDataFromCloud();
                }
            })
            .catch(err => { console.error(err); alert("Error al guardar movimiento de bodega."); });
        }

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
                            <span class="block text-[9px] uppercase font-black tracking-wider ${frutaEstilos.text} mb-1">ðŸ“ Frutas</span>
                            <span class="font-bold ${frutaEstilos.lightText}">${p.estadoFrutas}</span>
                        </div>
                        <div class="${empaqueEstilos.bg} border ${empaqueEstilos.border} p-2.5 rounded-xl text-center">
                            <span class="block text-[9px] uppercase font-black tracking-wider ${empaqueEstilos.text} mb-1">ðŸ“¦ Empaque</span>
                            <span class="font-bold ${empaqueEstilos.lightText}">${p.estadoEmpaqueGlobal}</span>
                        </div>
                    </div>`;
                container.appendChild(card);
            });
        }

        function promptAdmin() {
            if (isAdmin) {
                isAdmin = false;
                document.getElementById('g-box-catalogo').classList.add('hidden');
                document.getElementById('g-box-gestion-ordenes').classList.add('hidden');
                document.getElementById('chrono-display').classList.add('hidden'); 
                document.getElementById('admin-toggle-btn').innerText = "ðŸ”‘ Gerente";
                document.getElementById('admin-toggle-btn').classList.replace('bg-rose-600', 'bg-slate-700');
            } else {
                let pass = prompt("Ingrese contraseÃ±a de Gerente:");
                if (pass === GERENTE_PASSWORD) {
                    isAdmin = true;
                    document.getElementById('g-box-catalogo').classList.remove('hidden');
                    document.getElementById('g-box-gestion-ordenes').classList.remove('hidden');
                    
                    if (timerInterval && startTime) {
                        document.getElementById('chrono-display').classList.remove('hidden');
                    }
                    
                    document.getElementById('admin-toggle-btn').innerText = "ðŸ”’ Cerrar";
                    document.getElementById('admin-toggle-btn').classList.replace('bg-slate-700', 'bg-rose-600');
                    renderCatalog();
                } else { alert("ContraseÃ±a incorrecta."); }
            }
        }

        function renderCatalog() {
            const list = document.getElementById('catalog-list'); list.innerHTML = "";
            frutasCatalog.forEach((f, i) => { list.innerHTML += `<li class="flex justify-between bg-slate-900 p-2 rounded"><span>${f}</span> <button onclick="removeFruta(${i})" class="text-rose-500 font-bold">X</button></li>`; });
        }

        function addFrutaCatalog() {
            const val = document.getElementById('new-fruta-input').value;
            if (val) { frutasCatalog.push(val); document.getElementById('new-fruta-input').value = ""; saveCatalogToCloud(); }
        }

        function removeFruta(index) { frutasCatalog.splice(index, 1); saveCatalogToCloud(); }

        function saveCatalogToCloud() {
            fetch(GOOGLE_SHEETS_URL, { 
                method: "POST", 
                headers: { "Content-Type": "text/plain;charset=utf-8" }, 
                body: JSON.stringify({ action: "updateOptions", options: frutasCatalog }) 
            }).then(() => { renderCatalog(); renderFrutasSelect(); });
        }

        function renderFrutasSelect() { 
            const sel = document.getElementById('f-fruta'); sel.innerHTML = ''; 
            frutasCatalog.forEach(f => sel.innerHTML += `<option value="${f}">${f}</option>`); 
        }

        function renderParcialesSelect() { 
            const sel = document.getElementById('f-pedido-parcial-select'); 
            sel.innerHTML = '<option value="">- Seleccione -</option>'; 
            pedidosParciales.filter(p=>p.visibleApp==="SI").forEach(p => sel.innerHTML += `<option value="${p.id}">${p.id} - ${p.nombre} (${p.estadoFrutas})</option>`); 
        }

        function renderGerenteLoteSelect() { 
            const sel = document.getElementById('g-lote-select'); sel.innerHTML = '<option value=""></option>'; 
            historialCompleto.forEach(p => sel.innerHTML += `<option value="${p.id}">${p.id} - ${p.nombre}</option>`); 
        }

        function gerenteOcultarLoteApp() { 
            if(confirm("Â¿Ocultar este lote de la App? (SeguirÃ¡ en el Excel)")) {
                fetch(GOOGLE_SHEETS_URL, {
                    method:"POST", 
                    headers: { "Content-Type": "text/plain;charset=utf-8" }, 
                    body:JSON.stringify({action:"ocultarLoteManual", idPedido:document.getElementById('g-lote-select').value})
                }).then(()=>fetchDataFromCloud()); 
            }
        }

        function gerenteBorrarLoteTotal() { 
            if(confirm("Â¡Peligro! Â¿Borrar este lote de todas las pestaÃ±as de la base de datos?")) {
                fetch(GOOGLE_SHEETS_URL, {
                    method:"POST", 
                    headers: { "Content-Type": "text/plain;charset=utf-8" }, 
                    body:JSON.stringify({action:"deleteLote", idPedido:document.getElementById('g-lote-select').value})
                }).then(()=>fetchDataFromCloud()); 
            }
        }

