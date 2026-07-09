function promptAdmin() {
            if (isAdmin) {
                isAdmin = false;
                const catalogBox = document.getElementById('g-box-catalogo');
                const chrono = document.getElementById('chrono-display');
                if (catalogBox) catalogBox.classList.add('hidden');
                if (chrono) chrono.classList.add('hidden');
                document.getElementById('admin-toggle-btn').innerText = "🔑 Gerente";
                document.getElementById('admin-toggle-btn').classList.replace('bg-rose-600', 'bg-slate-700');
                if (typeof actualizarVistaPedidosGerente === "function") actualizarVistaPedidosGerente();
                if (typeof renderPedidosCards === "function") renderPedidosCards();
                if (typeof renderMobileHistory === "function") renderMobileHistory();
            } else {
                let pass = prompt("Ingrese contraseña de Gerente:");
                if (pass === GERENTE_PASSWORD) {
                    isAdmin = true;
                    const catalogBox = document.getElementById('g-box-catalogo');
                    const chrono = document.getElementById('chrono-display');
                    if (catalogBox) catalogBox.classList.remove('hidden');
                    
                    if (chrono && timerInterval && startTime) {
                        chrono.classList.remove('hidden');
                    }
                    
                    document.getElementById('admin-toggle-btn').innerText = "🔒 Cerrar";
                    document.getElementById('admin-toggle-btn').classList.replace('bg-slate-700', 'bg-rose-600');
                    renderCatalog();
                    if (typeof actualizarVistaPedidosGerente === "function") actualizarVistaPedidosGerente();
                    if (typeof renderPedidosCards === "function") renderPedidosCards();
                    if (typeof renderMobileHistory === "function") renderMobileHistory();
                } else { alert("Contraseña incorrecta."); }
            }
        }

        function renderCatalog() {
            const list = document.getElementById('catalog-list');
            if (!list) return;
            list.innerHTML = "";
            frutasCatalog.forEach((f, i) => { list.innerHTML += `<li class="flex justify-between bg-slate-900 p-2 rounded"><span>${f}</span> <button onclick="removeFruta(${i})" class="text-rose-500 font-bold">X</button></li>`; });
        }

        function addFrutaCatalog() {
            const input = document.getElementById('new-fruta-input');
            if (!input) return;
            const val = input.value;
            if (val) { frutasCatalog.push(val); input.value = ""; saveCatalogToCloud(); }
        }

        function removeFruta(index) { frutasCatalog.splice(index, 1); saveCatalogToCloud(); }

        function saveCatalogToCloud() {
            fetch(GOOGLE_SHEETS_URL, { 
                method: "POST", 
                headers: { "Content-Type": "text/plain;charset=utf-8" }, 
                body: JSON.stringify({ action: "updateOptions", options: frutasCatalog }) 
            }).then(() => {
                renderCatalog();
                if (typeof renderFrutasSelect === "function") renderFrutasSelect();
                if (typeof renderProductosAdmin === "function") renderProductosAdmin();
            });
        }

        function gerenteOcultarLoteApp(idPedido) {
            if (!isAdmin) { alert("Active modo gerente."); return; }
            if (!idPedido) return;
            if(confirm("¿Ocultar este lote de la App? (Seguirá en el Excel)")) {
                fetch(GOOGLE_SHEETS_URL, {
                    method:"POST", 
                    headers: { "Content-Type": "text/plain;charset=utf-8" }, 
                    body:JSON.stringify({action:"ocultarLoteManual", idPedido:idPedido})
                }).then(()=>fetchDataFromCloud()); 
            }
        }

        function gerenteBorrarLoteTotal(idPedido) {
            if (!isAdmin) { alert("Active modo gerente."); return; }
            if (!idPedido) return;
            if(confirm("¡Peligro! ¿Borrar este lote de todas las pestañas de la base de datos?")) {
                fetch(GOOGLE_SHEETS_URL, {
                    method:"POST", 
                    headers: { "Content-Type": "text/plain;charset=utf-8" }, 
                    body:JSON.stringify({action:"deleteLote", idPedido:idPedido})
                }).then(()=>fetchDataFromCloud()); 
            }
        }

        function gerenteOcultarProduccionArea(idProduccion) {
            if (!isAdmin) { alert("Active modo gerente."); return; }
            if (!idProduccion) return;
            if (!confirm("¿Ocultar este lote de producción de la App? (Seguirá en Google Sheets)")) return;
            fetch(GOOGLE_SHEETS_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ action: "ocultarProduccionArea", idProduccion })
            })
            .then(res => res.json())
            .then(resData => {
                if (resData && resData.status === "error") {
                    alert("Error: " + resData.message);
                    return;
                }
                fetchDataFromCloud();
            })
            .catch(err => { console.error(err); alert("Error al ocultar el lote de producción."); });
        }

        function gerenteBorrarProduccionArea(idProduccion) {
            if (!isAdmin) { alert("Active modo gerente."); return; }
            if (!idProduccion) return;
            if (!confirm("¿Eliminar este lote de producción de Google Sheets? Solo se permitirá si no tiene uso en Empaque.")) return;
            fetch(GOOGLE_SHEETS_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ action: "eliminarProduccionArea", idProduccion })
            })
            .then(res => res.json())
            .then(resData => {
                if (resData && resData.status === "error") {
                    alert("Error: " + resData.message);
                    return;
                }
                fetchDataFromCloud();
            })
            .catch(err => { console.error(err); alert("Error al eliminar el lote de producción."); });
        }

        function gerenteRevertirUsoProduccionArea(idProduccion) {
            if (!isAdmin) { alert("Active modo gerente."); return; }
            if (!idProduccion) return;
            const motivo = prompt("Motivo de reversión del uso de este lote:");
            if (!motivo) { alert("Ingrese el motivo de reversión."); return; }
            fetch(GOOGLE_SHEETS_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({
                    action: "revertirUsoProduccionArea",
                    idProduccion,
                    motivo,
                    responsable: "Gerente"
                })
            })
            .then(res => res.json())
            .then(resData => {
                if (resData && resData.status === "error") {
                    alert("Error: " + resData.message);
                    return;
                }
                const cantidad = Number(resData.cantidadReincorporada || 0).toLocaleString("es-GT", { maximumFractionDigits: 2 });
                alert(`Uso revertido. Se reincorporaron ${cantidad} ${resData.unidad || "unidad"}.`);
                loadedDataViews = {};
                fetchDataFromCloud({ force: true });
            })
            .catch(err => { console.error(err); alert("Error al revertir el uso del lote."); });
        }
