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
                    alert("❌ " + resData.message);
                } else {
                    alert("Movimiento de bodega guardado.");
                    resetBodegaForm();
                    fetchDataFromCloud();
                }
            })
            .catch(err => { console.error(err); alert("Error al guardar movimiento de bodega."); });
        }

