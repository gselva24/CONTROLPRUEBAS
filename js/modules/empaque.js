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
            
            if(!lote || !cajas) { alert("⚠️ Seleccione un lote y asigne una cantidad de cajas."); return; }

            const payload = {
                action: "registroEmpaque",
                idPedido: idPed,
                nombrePedido: lote.nombre,
                frutaTipo: lote.fruta,
                fechaEmpaque: new Date().toLocaleDateString('es-ES'),
                cajas: cajas,
                estadoEmpaque: document.getElementById('e-estado-cierre').value
            };
            
            document.getElementById('global-status').innerText = "⏳ Guardando Empaque...";
            
            fetch(GOOGLE_SHEETS_URL, { 
                method: "POST", 
                headers: { "Content-Type": "text/plain;charset=utf-8" }, 
                body: JSON.stringify(payload) 
            })
            .then(res => res.json())
            .then(resData => { 
                if(resData && resData.status === "error") {
                    alert("❌ " + resData.message);
                } else {
                    alert("✅ ¡Empaque registrado exitosamente!"); 
                    document.getElementById('e-cajas').value = "";
                    document.getElementById('e-pedido-select').value = "";
                    document.getElementById('e-info-box').classList.add('hidden');
                    fetchDataFromCloud(); 
                    switchView('historial'); 
                }
            })
            .catch(err => { console.error(err); alert("❌ Error al guardar empaque."); });
        }

