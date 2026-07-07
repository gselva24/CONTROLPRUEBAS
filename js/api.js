function fetchDataFromCloud() {
            document.getElementById('global-status').innerText = "⏳ Sincronizando...";
            const baseUrl = typeof appApiUrl === "function" ? appApiUrl() : GOOGLE_SHEETS_URL;
            const cacheBust = baseUrl.includes('?') ? `&t=${Date.now()}` : `?t=${Date.now()}`;
            fetch(`${baseUrl}${cacheBust}`, { redirect: "follow" })
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
                produccionesAreas = data.produccionesAreas || [];
                
                if (typeof renderFrutasSelect === "function") renderFrutasSelect();
                if (typeof renderParcialesSelect === "function") renderParcialesSelect();
                if (typeof renderPlanchas === "function") renderPlanchas();
                if (typeof renderTamales === "function") renderTamales();
                if (typeof renderEmpaqueSelect === "function") renderEmpaqueSelect();
                if (typeof renderBodegaSelect === "function") renderBodegaSelect();
                if (typeof renderBodegaInventory === "function") renderBodegaInventory();
                if (typeof renderClientesSelect === "function") renderClientesSelect();
                if (typeof renderProductosPedidoSelect === "function") renderProductosPedidoSelect();
                if (typeof renderProductosAdmin === "function") renderProductosAdmin();
                if (typeof renderPedidosResumen === "function") renderPedidosResumen();
                if (typeof renderPedidosCards === "function") renderPedidosCards();
                if (typeof renderClientesList === "function") renderClientesList();
                if (typeof renderMobileHistory === "function") renderMobileHistory();
                
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

