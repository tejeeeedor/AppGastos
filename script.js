let miGrafica;

window.onload = () => {
    // 1. Registro del Service Worker para poder instalar la App
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log("Service Worker Activo"))
            .catch(err => console.log("Error al registrar SW", err));
    }

    // 2. Blindaje de datos (Persistencia)
    if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().then(persistent => {
            if (persistent) console.log("Datos blindados: El sistema no los borrará.");
        });
    }

    // 3. Configuración de la interfaz (Fecha y Tema)
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fecha').value = hoy;
    
    if (localStorage.getItem('tema') === 'oscuro') {
        document.body.classList.add('dark-mode');
        document.getElementById('btn-mode').innerText = "☀️";
    }

    // 4. Cargar Sistemas y Datos del imperio
    renderizarMetas();
    renderizarCobros();
    mostrarHistorial();
};

// --- LÓGICA PRINCIPAL ---
function calcular() {
    const fecha = document.getElementById('fecha').value;
    const ingresos = parseFloat(document.getElementById('ingresos').value) || 0;
    const gastos = parseFloat(document.getElementById('gastos').value) || 0;
    
    if (ingresos === 0 && gastos === 0) return alert("Introduce datos");

    // --- NUEVA LÓGICA DE PORCENTAJE ---
    let ahorro;
    if (ingresos > 0) {
        // Fórmula: ((Ingresos - Gastos) / Ingresos) * 100
        ahorro = (((ingresos - gastos) / ingresos) * 100).toFixed(1);
    } else {
        // Si no hay ingresos y solo hay gastos, el ahorro es -100%
        ahorro = -100;
    }
    // ----------------------------------

    const historial = JSON.parse(localStorage.getItem('finanzas')) || [];
    historial.push({ fecha, ingresos, gastos, ahorro });
    localStorage.setItem('finanzas', JSON.stringify(historial));

    mostrarHistorial();
    document.getElementById('ingresos').value = "";
    document.getElementById('gastos').value = "";
}

function mostrarHistorial() {
    const historial = JSON.parse(localStorage.getItem('finanzas')) || [];
    const tabla = document.getElementById('lista-registros');
    const filtro = document.getElementById('filtro-fecha');
    const mesSel = filtro ? filtro.value : "todos";

    const datosFiltrados = historial.filter(reg => mesSel === "todos" || reg.fecha.split('-')[1] === mesSel);

    actualizarSelectorMeses(historial); // Para que el selector de meses se mantenga al día
    tabla.innerHTML = "";
    
    let ingresosAcumulados = 0;
    let gastosAcumulados = 0;

    // --- ESTA ES LA LÍNEA QUE FALTABA (La "llave" del bucle) ---
    datosFiltrados.forEach(reg => {
        ingresosAcumulados += parseFloat(reg.ingresos) || 0;
        gastosAcumulados += parseFloat(reg.gastos) || 0;

        // Calculamos el ahorro real del Imperio hasta ese momento
        let porcentajeReal = 0;
        if (ingresosAcumulados > 0) {
            porcentajeReal = (((ingresosAcumulados - gastosAcumulados) / ingresosAcumulados) * 100).toFixed(1);
        } else {
            porcentajeReal = -100;
        }

        const colorAhorro = porcentajeReal >= 0 ? "#2ecc71" : "#e74c3c";

        tabla.innerHTML += `<tr>
            <td>${reg.fecha}</td>
            <td>$${parseFloat(reg.ingresos).toFixed(2)}</td>
            <td>$${parseFloat(reg.gastos).toFixed(2)}</td>
            <td style="color: ${colorAhorro}; font-weight: bold;">${porcentajeReal}%</td>
        </tr>`;
    }); // Aquí se cierra el bucle

    calcularTotales();
    actualizarGrafica(datosFiltrados);
    renderizarMetas();
}

// --- GRÁFICA ---
function actualizarGrafica(datos) {
    const ctx = document.getElementById('graficaGastos').getContext('2d');
    if (miGrafica) miGrafica.destroy();
    miGrafica = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: datos.map(r => r.fecha),
            datasets: [
                { label: 'Ingresos', data: datos.map(r => r.ingresos), backgroundColor: '#2ecc71' },
                { label: 'Gastos', data: datos.map(r => r.gastos), backgroundColor: '#e74c3c' }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// --- TOTALES Y BALANCE ---
function calcularTotales() {
    const balanceTotal = calcularBalanceAcumulado();
    const historial = JSON.parse(localStorage.getItem('finanzas')) || [];
    let ti = 0, tg = 0;
    
    historial.forEach(r => { 
        ti += parseFloat(r.ingresos) || 0; 
        tg += parseFloat(r.gastos) || 0; 
    });

    document.getElementById('total-ingresos').innerText = `$${ti.toFixed(2)}`;
    document.getElementById('total-gastos').innerText = `$${tg.toFixed(2)}`;
    
    const elB = document.getElementById('total-balance');
    if(elB) {
        elB.innerText = `$${balanceTotal.toFixed(2)}`;
        elB.style.color = balanceTotal >= 0 ? "#2ecc71" : "#e74c3c";
    }
}

function calcularBalanceAcumulado() {
    const historial = JSON.parse(localStorage.getItem('finanzas')) || [];
    let ti = 0, tg = 0;
    historial.forEach(r => { 
        ti += parseFloat(r.ingresos) || 0; 
        tg += parseFloat(r.gastos) || 0; 
    });
    return ti - tg;
}

// --- GESTIÓN DE MÚLTIPLES METAS ---
function añadirNuevaMeta() {
    const metas = JSON.parse(localStorage.getItem('metas_multiples')) || [];
    metas.push({ nombre: "Nuevo Objetivo", precio: 0 });
    localStorage.setItem('metas_multiples', JSON.stringify(metas));
    renderizarMetas();
}

function actualizarMeta(index, campo, valor) {
    const metas = JSON.parse(localStorage.getItem('metas_multiples'));
    metas[index][campo] = (campo === 'precio') ? parseFloat(valor) || 0 : valor;
    localStorage.setItem('metas_multiples', JSON.stringify(metas));
    renderizarMetas();
}

function borrarMeta(index) {
    const metas = JSON.parse(localStorage.getItem('metas_multiples'));
    metas.splice(index, 1);
    localStorage.setItem('metas_multiples', JSON.stringify(metas));
    renderizarMetas();
}

function renderizarMetas() {
    const contenedor = document.getElementById('lista-metas-contenedor');
    if (!contenedor) return;
    const metas = JSON.parse(localStorage.getItem('metas_multiples')) || [];
    const balanceTotal = calcularBalanceAcumulado();

    contenedor.innerHTML = "";
    metas.forEach((meta, i) => {
        let porcentaje = (meta.precio > 0) ? Math.min((balanceTotal / meta.precio) * 100, 100) : 0;
        porcentaje = Math.max(porcentaje, 0);

        contenedor.innerHTML += `
            <div class="meta-item" style="border-bottom: 1px dashed #ccc; padding: 10px 0;">
                <input type="text" value="${meta.nombre}" onchange="actualizarMeta(${i}, 'nombre', this.value)" style="width:40%">
                <input type="number" value="${meta.precio}" onchange="actualizarMeta(${i}, 'precio', this.value)" style="width:25%">
                <button onclick="borrarMeta(${i})" style="background:none; color:red; padding:0; width:10%; border:none; cursor:pointer">✖</button>
                <div class="progress-bar-bg" style="margin-top:5px; background:#e0e0e0; border-radius:10px; height:20px; overflow:hidden">
                    <div class="progress-fill" style="width:${porcentaje}%; background:#9b59b6; height:100%; color:white; text-align:center; font-size:12px; line-height:20px">
                        ${Math.floor(porcentaje)}%
                    </div>
                </div>
            </div>`;
    });
}

// --- GESTIÓN DE MÚLTIPLES COBROS ---
// --- GESTIÓN DE REGLAS DE COBRO INTELIGENTES ---
function añadirReglaCobro(tipo) {
    const reglas = JSON.parse(localStorage.getItem('reglas_cobro')) || [];
    if (tipo === 'fecha') {
        reglas.push({ tipo: 'fecha', valor: 1 }); // Día 1 por defecto
    } else {
        reglas.push({ tipo: 'semana', valor: 6 }); // Sábado (6) por defecto
    }
    localStorage.setItem('reglas_cobro', JSON.stringify(reglas));
    renderizarCobros();
}

function actualizarRegla(index, valor) {
    const reglas = JSON.parse(localStorage.getItem('reglas_cobro'));
    reglas[index].valor = parseInt(valor);
    localStorage.setItem('reglas_cobro', JSON.stringify(reglas));
    verificarTodosLosCobros();
}

function borrarRegla(index) {
    const reglas = JSON.parse(localStorage.getItem('reglas_cobro'));
    reglas.splice(index, 1);
    localStorage.setItem('reglas_cobro', JSON.stringify(reglas));
    renderizarCobros();
}

function renderizarCobros() {
    const contenedor = document.getElementById('lista-cobros-contenedor');
    if (!contenedor) return;
    const reglas = JSON.parse(localStorage.getItem('reglas_cobro')) || [];
    contenedor.innerHTML = "";

    const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

    reglas.forEach((regla, i) => {
        let controlHtml = "";
        if (regla.tipo === 'fecha') {
            controlHtml = `<input type="number" min="1" max="31" value="${regla.valor}" onchange="actualizarRegla(${i}, this.value)" style="width:50px"> <span style="font-size:0.8rem">de cada mes</span>`;
        } else {
            controlHtml = `<select onchange="actualizarRegla(${i}, this.value)" style="width:110px">
                ${diasSemana.map((nombre, idx) => `<option value="${idx}" ${regla.valor === idx ? 'selected' : ''}>${nombre}</option>`).join('')}
            </select>`;
        }

        contenedor.innerHTML += `
            <div style="margin-bottom:8px; display:flex; align-items:center; gap:10px; border-bottom:1px solid #eee; padding-bottom:5px">
                <span style="font-size:0.8rem; font-weight:bold">${regla.tipo === 'fecha' ? '📅' : '⏳'}</span>
                ${controlHtml}
                <button onclick="borrarRegla(${i})" style="background:none; color:red; border:none; cursor:pointer; margin-left:auto">✖</button>
            </div>`;
    });
    verificarTodosLosCobros();
}

function verificarTodosLosCobros() {
    const reglas = JSON.parse(localStorage.getItem('reglas_cobro')) || [];
    const hoyDate = new Date();
    const hoyDiaMes = hoyDate.getDate();
    const hoyDiaSemana = hoyDate.getDay(); // 0 (Dom) a 6 (Sáb)
    
    const contenedorAlertas = document.getElementById('alertas-cobro-contenedor');
    if (!contenedorAlertas) return;
    contenedorAlertas.innerHTML = "";

    const hoyEsDiaDeCobro = reglas.some(regla => {
        if (regla.tipo === 'fecha') return Number(regla.valor) === hoyDiaMes;
        if (regla.tipo === 'semana') return Number(regla.valor) === hoyDiaSemana;
        return false;
    });

    if (hoyEsDiaDeCobro) {
        contenedorAlertas.innerHTML = `<div class="alerta-pago-estilo">💰 ¡Hoy el Imperio crece! Tienes un cobro programado.</div>`;
    }
}

// --- UTILIDADES ---
function actualizarSelectorMeses(historial) {
    const selector = document.getElementById('filtro-fecha');
    if (!selector) return;
    const valorActual = selector.value;
    const mesesExistentes = [...new Set(historial.map(reg => reg.fecha.split('-')[1]))].sort();
    selector.innerHTML = '<option value="todos">Todos los tiempos</option>';
    const nombres = {"01":"Ene","02":"Feb","03":"Mar","04":"Abr","05":"May","06":"Jun","07":"Jul","08":"Ago","09":"Sep","10":"Oct","11":"Nov","12":"Dic"};
    mesesExistentes.forEach(m => {
        selector.innerHTML += `<option value="${m}">${nombres[m]}</option>`;
    });
    selector.value = valorActual;
}

function toggleMode() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    const dark = body.classList.contains('dark-mode');
    localStorage.setItem('tema', dark ? 'oscuro' : 'claro');
    document.getElementById('btn-mode').innerText = dark ? "☀️" : "🌙";
}

function exportarCSV() {
    const historial = JSON.parse(localStorage.getItem('finanzas')) || [];
    let csv = "Fecha,Ingresos,Gastos,Ahorro%\n";
    historial.forEach(r => { csv += `${r.fecha},${r.ingresos},${r.gastos},${r.ahorro}\n`; });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "Finanzas_Raul.csv"; a.click();
}

function borrarTodo() { document.getElementById('custom-modal').style.display = 'flex'; }
function cerrarModal() { document.getElementById('custom-modal').style.display = 'none'; }
function confirmarBorrado() { localStorage.removeItem('finanzas'); location.reload(); }
// Detectar si hay una versión nueva y recargar automáticamente
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
    });
}