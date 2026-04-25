// --- VARIABLES GLOBALES ---
let chartBarras;
let chartTarta;
const PIN_MAESTRO = "7153"; 

// --- SEGURIDAD ---
function verificarPIN() {
    const pass = document.getElementById('pin-input').value.trim(); // .trim() quita espacios por si acaso
    if (pass === "7153") { // Usamos comillas para que sea texto contra texto
        document.getElementById('pin-screen').style.display = 'none';
        sessionStorage.setItem('autorizado', 'true');
        console.log("Acceso concedido al Imperio");
    } else {
        alert("PIN incorrecto, acceso denegado.");
        document.getElementById('pin-input').value = ""; // Limpiamos para intentar otra vez
    }
}

// --- CARGA INICIAL DEL SISTEMA ---
window.onload = () => {
    // 1. Verificar Seguridad
    if (!sessionStorage.getItem('autorizado')) {
        document.getElementById('pin-screen').style.display = 'flex';
    }

    // 2. Registro del Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log("Service Worker Activo"))
            .catch(err => console.log("Error al registrar SW", err));
    }

    // 3. Blindaje de datos
    if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().then(persistent => {
            if (persistent) console.log("Datos blindados.");
        });
    }

    // 4. Configuración de Interfaz
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fecha').value = hoy;
    
    if (localStorage.getItem('tema') === 'oscuro') {
        document.body.classList.add('dark-mode');
        document.getElementById('btn-mode').innerText = "☀️";
    }

    // 5. Cargar Datos
    renderizarMetas();
    renderizarCobros();
    mostrarHistorial();
};

// --- LÓGICA DE CÁLCULO ---
function calcular() {
    const fecha = document.getElementById('fecha').value;
    const ingresos = parseFloat(document.getElementById('ingresos').value) || 0;
    const gastos = parseFloat(document.getElementById('gastos').value) || 0;
    
    if (ingresos === 0 && gastos === 0) return alert("Introduce datos");

    let ahorro = ingresos > 0 ? (((ingresos - gastos) / ingresos) * 100).toFixed(1) : -100;

    const historial = JSON.parse(localStorage.getItem('finanzas')) || [];
    historial.push({ fecha, ingresos, gastos, ahorro: parseFloat(ahorro) });
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

    actualizarSelectorMeses(historial);
    tabla.innerHTML = "";
    
    let ingresosAcumulados = 0;
    let gastosAcumulados = 0;

    datosFiltrados.forEach(reg => {
        ingresosAcumulados += parseFloat(reg.ingresos) || 0;
        gastosAcumulados += parseFloat(reg.gastos) || 0;

        let porcentajeReal = ingresosAcumulados > 0 ? (((ingresosAcumulados - gastosAcumulados) / ingresosAcumulados) * 100).toFixed(1) : -100;
        const colorAhorro = porcentajeReal >= 0 ? "#2ecc71" : "#e74c3c";

        // Busca esta línea en tu mostrarHistorial y cámbiala:
tabla.innerHTML += `<tr>
    <td>${reg.fecha} <br> <small style="color:#aaa">${reg.categoria || ''}</small></td>
    <td>$${parseFloat(reg.ingresos).toFixed(2)}</td>
    <td>$${parseFloat(reg.gastos).toFixed(2)}</td>
    <td style="color: ${colorAhorro}; font-weight: bold;">${porcentajeReal}%</td>
</tr>`;
    });

    calcularTotales();
    actualizarGrafica(datosFiltrados);
    renderizarMetas();
}

// --- MOTOR DE GRÁFICAS ---
function actualizarGrafica(datos) {
    // 2. BUSCAMOS LOS CANVAS POR ID
    const elBarras = document.getElementById('miGrafica');
    const elTarta = document.getElementById('graficaTarta');

    // Si no existen en el HTML, salimos para no dar error
    if (!elBarras || !elTarta) return;

    // --- GRÁFICA DE BARRAS ---
    const ctxBarras = elBarras.getContext('2d');
    if (chartBarras) chartBarras.destroy(); // Usamos la variable global nueva

    chartBarras = new Chart(ctxBarras, {
        type: 'bar',
        data: {
            labels: datos.map(reg => reg.fecha),
            datasets: [
                { label: 'Ingresos', data: datos.map(reg => reg.ingresos), backgroundColor: '#2ecc71' },
                { label: 'Gastos', data: datos.map(reg => reg.gastos), backgroundColor: '#e74c3c' }
            ]
        },
        options: {
            scales: { y: { beginAtZero: true, ticks: { color: 'white' } }, x: { ticks: { color: 'white' } } },
            plugins: { legend: { labels: { color: 'white' } } }
        }
    });

    // --- GRÁFICA DE TARTA ---
    const totalIng = datos.reduce((s, r) => s + (parseFloat(r.ingresos) || 0), 0);
    const totalGas = datos.reduce((s, r) => s + (parseFloat(r.gastos) || 0), 0);

    const ctxTarta = elTarta.getContext('2d');
    if (chartTarta) chartTarta.destroy(); // Usamos la variable global nueva

    chartTarta = new Chart(ctxTarta, {
        type: 'doughnut',
        data: {
            labels: ['Ingresos', 'Gastos'],
            datasets: [{
                data: [totalIng, totalGas],
                backgroundColor: ['#2ecc71', '#e74c3c'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom', labels: { color: 'white' } } }
        }
    });
}

// --- GESTIÓN DE TOTALES ---
function calcularTotales() {
    const historial = JSON.parse(localStorage.getItem('finanzas')) || [];
    let ti = 0, tg = 0;
    historial.forEach(r => { 
        ti += parseFloat(r.ingresos) || 0; 
        tg += parseFloat(r.gastos) || 0; 
    });
    document.getElementById('total-ingresos').innerText = `$${ti.toFixed(2)}`;
    document.getElementById('total-gastos').innerText = `$${tg.toFixed(2)}`;
    const balance = ti - tg;
    const elB = document.getElementById('total-balance');
    if(elB) {
        elB.innerText = `$${balance.toFixed(2)}`;
        elB.style.color = balance >= 0 ? "#2ecc71" : "#e74c3c";
    }
}

// --- METAS Y OBJETIVOS ---
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
    let ti = 0, tg = 0;
    (JSON.parse(localStorage.getItem('finanzas')) || []).forEach(r => { ti += r.ingresos; tg += r.gastos; });
    const balanceTotal = ti - tg;

    contenedor.innerHTML = "";
    metas.forEach((meta, i) => {
        let porcentaje = (meta.precio > 0) ? Math.min((balanceTotal / meta.precio) * 100, 100) : 0;
        contenedor.innerHTML += `
            <div class="meta-item" style="border-bottom: 1px dashed #ccc; padding: 10px 0;">
                <input type="text" value="${meta.nombre}" onchange="actualizarMeta(${i}, 'nombre', this.value)" style="width:40%">
                <input type="number" value="${meta.precio}" onchange="actualizarMeta(${i}, 'precio', this.value)" style="width:25%">
                <button onclick="borrarMeta(${i})" style="color:red; background:none; border:none; cursor:pointer">✖</button>
                <div style="background:#e0e0e0; border-radius:10px; height:20px; margin-top:5px">
                    <div style="width:${porcentaje}%; background:#9b59b6; height:100%; border-radius:10px; color:white; text-align:center; font-size:12px;">${Math.floor(porcentaje)}%</div>
                </div>
            </div>`;
    });
}

// --- COBROS Y REGLAS ---
function añadirReglaCobro(tipo) {
    const reglas = JSON.parse(localStorage.getItem('reglas_cobro')) || [];
    reglas.push({ tipo, valor: (tipo === 'fecha' ? 1 : 1) });
    localStorage.setItem('reglas_cobro', JSON.stringify(reglas));
    renderizarCobros();
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
    reglas.forEach((regla, i) => {
        contenedor.innerHTML += `<div style="display:flex; gap:10px; margin-bottom:5px;">
            <span>${regla.tipo === 'fecha' ? 'Día ' + regla.valor : 'Semana'}</span>
            <button onclick="borrarRegla(${i})" style="color:red; background:none; border:none;">✖</button>
        </div>`;
    });
}

// --- UTILIDADES ---
function actualizarSelectorMeses(historial) {
    const selector = document.getElementById('filtro-fecha');
    if (!selector) return;
    const meses = [...new Set(historial.map(reg => reg.fecha.split('-')[1]))].sort();
    selector.innerHTML = '<option value="todos">Todos</option>';
    meses.forEach(m => selector.innerHTML += `<option value="${m}">${m}</option>`);
}

function toggleMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('tema', document.body.classList.contains('dark-mode') ? 'oscuro' : 'claro');
}

function exportarCSV() {
    const historial = JSON.parse(localStorage.getItem('finanzas')) || [];
    let csv = "Fecha,Ingresos,Gastos\n";
    historial.forEach(r => csv += `${r.fecha},${r.ingresos},${r.gastos}\n`);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "Imperio.csv"; a.click();
}

// Auto-actualización PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());
}

let categoriaActual = "General"; // Por defecto

function seleccionarCategoria(emoji, nombre) {
    categoriaActual = emoji + " " + nombre;
    document.getElementById('categoria-seleccionada').innerText = "Categoría: " + categoriaActual;
    
    // Opcional: darle un efecto visual al botón seleccionado
    console.log("Categoría elegida: " + categoriaActual);
}

// Modifica tu función calcular() para que guarde la categoría
// 1. Definimos los sonidos fuera de la función para que se carguen al abrir la app
// 1. Cargamos los sonidos (Wikimedia no falla)
const sMoneda = new Audio('moneda.mp3'); // Usa tu propio sonido o uno de confianza
const sGasto = new Audio('gasto.mp3'); 
const sAlerta = new Audio('alerta.mp3');

[sMoneda, sGasto, sAlerta].forEach(s => s.volume = 1.0);

// 2. EL DESBLOQUEADOR: Esto obliga al navegador a dar permiso en cuanto toques la app
window.addEventListener('click', () => {
    [sMoneda, sGasto, sAlerta].forEach(s => {
        s.play().then(() => {
            s.pause();
            s.currentTime = 0;
        }).catch(() => {});
    });
    console.log("🔊 Sistema de audio desbloqueado por el Dios de la Destrucción");
}, { once: true });

function calcular() {
    const elIng = document.getElementById('ingresos');
    const elGas = document.getElementById('gastos');
    const elFec = document.getElementById('fecha');

    const ingresos = parseFloat(elIng.value) || 0;
    const gastos = parseFloat(elGas.value) || 0;
    const fecha = elFec.value;

    if (ingresos === 0 && gastos === 0) return alert("Introduce datos");

    let ahorroNum = ingresos > 0 ? (((ingresos - gastos) / ingresos) * 100) : -100;
    
    const historial = JSON.parse(localStorage.getItem('finanzas')) || [];
    historial.push({ 
        fecha, 
        ingresos, 
        gastos, 
        ahorro: parseFloat(ahorroNum.toFixed(1)),
        categoria: (typeof categoriaActual !== 'undefined') ? categoriaActual : "General" 
    });
    localStorage.setItem('finanzas', JSON.stringify(historial));

    // --- EJECUCIÓN DE SONIDO FORZADA ---
    if (ingresos > 0 && gastos === 0) {
        sMoneda.play();
    } else if (gastos > 0) {
        if (ahorroNum < 20) {
            sAlerta.play();
        } else {
            sGasto.play();
        }
    }

    elIng.value = "";
    elGas.value = "";
    if (typeof categoriaActual !== 'undefined') categoriaActual = "General";
    mostrarHistorial();
}

// Escuchar el progreso desde el Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'PWA_INSTALL_PROGRESS') {
            const porcentaje = event.data.percent;
            const pantalla = document.getElementById('pantalla-carga');
            const barra = document.getElementById('barra-progreso');
            const texto = document.getElementById('texto-progreso');

            // Mostrar la pantalla de carga si hay progreso
            if (porcentaje > 0 && porcentaje < 100) {
                pantalla.style.display = 'flex';
            }

            // Actualizar barra y texto
            barra.style.width = porcentaje + '%';
            texto.innerText = Math.round(porcentaje) + '%';

            // Ocultar al terminar
            if (porcentaje >= 100) {
                setTimeout(() => {
                    pantalla.style.fadeOut = "slow";
                    pantalla.style.display = 'none';
                }, 1000);
            }
        }
    });
}