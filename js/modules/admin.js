function promptAdmin() {
            if (isAdmin) {
                isAdmin = false;
                document.getElementById('g-box-catalogo').classList.add('hidden');
                document.getElementById('chrono-display').classList.add('hidden'); 
                document.getElementById('admin-toggle-btn').innerText = "🔑 Gerente";
                document.getElementById('admin-toggle-btn').classList.replace('bg-rose-600', 'bg-slate-700');
                if (typeof actualizarVistaPedidosGerente === "function") actualizarVistaPedidosGerente();
                if (typeof renderPedidosCards === "function") renderPedidosCards();
                if (typeof renderMobileHistory === "function") renderMobileHistory();
            } else {
                let pass = prompt("Ingrese contraseña de Gerente:");
                if (pass === GERENTE_PASSWORD) {
                    isAdmin = true;
                    document.getElementById('g-box-catalogo').classList.remove('hidden');
                    
                    if (timerInterval && startTime) {
                        document.getElementById('chrono-display').classList.remove('hidden');
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
            }).then(() => {
                renderCatalog();
                renderFrutasSelect();
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

