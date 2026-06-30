function fetchDataFromCloud() {
            document.getElementById('global-status').innerText = "⏳ Sincronizando...";
            const cacheBust = GOOGLE_SHEETS_URL.includes('?') ? `&t=${Date.now()}` : `?t=${Date.now()}`;
            fetch(`${GOOGLE_SHEETS_URL}${cacheBust}`, { redirect: "follow" })
            .then(res => res.json())
            .then(data => {
                frutasCatalog = data.frutas || [];
                pedidosPendientes = data.pedidosPendientes || [];
                pedidosParciales = data.pedidosParciales || [];
                historialCompleto = data.historial || [];
                inventarioBodega = data.inventarioBodega || [];
                clientesCatalog = data.clientes || [];
                productosCatalog = data.productos || [];
                productosClienteCatalog = data.productosCliente || [];
                pedidosCliente = data.pedidosCliente || [];
                detallePedidosCliente = data.detallePedidosCliente || [];
                asignacionesPedido = data.asignacionesPedido || [];
                empaqueSesiones = data.empaqueSesiones || [];
                
                renderFrutasSelect(); 
                renderParcialesSelect(); 
                renderEmpaqueSelect(); 
                renderBodegaSelect();
                renderBodegaInventory();
                renderClientesSelect();
                renderProductosPedidoSelect();
                renderProductosAdmin();
                renderPedidosResumen();
                renderPedidosCards();
                renderClientesList();
                renderMobileHistory(); 
                
                const historialSinMetricas = historialCompleto.some(p => typeof p.pesoProcesado === "undefined" || typeof p.cajasProcesadas === "undefined");
                if (historialSinMetricas) {
                    document.getElementById('global-status').innerText = "Script sin metricas V2";
                    document.getElementById('global-status').className = "text-[10px] text-amber-400 font-medium italic";
                    return;
                }

                document.getElementById('global-status').innerText = "✅ Sincronizado";
                document.getElementById('global-status').className = "text-[10px] text-emerald-400 font-medium italic";
            })
            .catch(err => {
                console.error("Error de conexión GET:", err);
                document.getElementById('global-status').innerText = "❌ Error conexión";
                document.getElementById('global-status').className = "text-[10px] text-rose-400 font-medium italic";
            });
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

