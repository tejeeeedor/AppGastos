// --- VARIABLES GLOBALES ---
let chartBarras;
let chartTarta;
let categoriaActual = "General";
const PIN_MAESTRO = "7153"; 

// --- CARGA DE SONIDOS ---
const sMoneda = new Audio('moneda.mp3'); 
const sGasto = new Audio('gasto.mp3'); 
const sAlerta = new Audio('alerta.mp3');
[sMoneda, sGasto, sAlerta].forEach(s => s.volume = 1.0);

// --- INICIO DEL SISTEMA ---
window.onload = () => {
    // Seguridad
    if (!sessionStorage.getItem('autorizado')) {
        document.getElementById('pin-screen').style.display = 'flex';
    }

    // Permiso Notificaciones
    if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
    }

    // Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log("Service Worker Activo"))
            .catch(e => console.log("Error SW:", e));
    }

    // Configuración Interfaz
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fecha').value = hoy;
    
    if (localStorage.getItem('tema') === 'oscuro') {
        document.body.classList.add('dark-mode');
        document.getElementById('btn-mode').innerText = "☀️";
    }

    // Cargar Datos
    renderizarMetas();
    renderizarCobros();
    mostrarHistorial();
    verificarNotificacionesCobro();
    renderizarFantasmas();
    despertarFantasmas();
    renderizarEscudos();
};

// --- SEGURIDAD ---
function verificarPIN() {
    const pass = document.getElementById('pin-input').value.trim();
    if (pass === PIN_MAESTRO) {
        document.getElementById('pin-screen').style.display = 'none';
        sessionStorage.setItem('autorizado', 'true');
    } else {
        alert("PIN incorrecto.");
    }
}

// --- DESBLOQUEO DE AUDIO ---
window.addEventListener('click', () => {
    [sMoneda, sGasto, sAlerta].forEach(s => {
        s.play().then(() => { s.pause(); s.currentTime = 0; }).catch(() => {});
    });
}, { once: true });

// --- LÓGICA DE CÁLCULO ---
function seleccionarCategoria(emoji, nombre) {
    categoriaActual = emoji + " " + nombre;
    document.getElementById('categoria-seleccionada').innerText = "Categoría: " + categoriaActual;
}

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
        fecha, ingresos, gastos, 
        ahorro: parseFloat(ahorroNum.toFixed(1)), 
        categoria: categoriaActual 
    });
    localStorage.setItem('finanzas', JSON.stringify(historial));

   // --- EJECUCIÓN SENSORIAL (SONIDO Y ANIMACIÓN) ---
    if (ingresos > 0 && gastos === 0) {
        sMoneda.play();
        // GLORIA: Si hay ingresos puros, llueve confeti
        if (typeof confetti === "function") {
            confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#f1c40f', '#2ecc71'] });
        }
    } else if (gastos > 0) {
        if (ahorroNum < 20) {
            sAlerta.play();
            // DESTRUCCIÓN: Terremoto en pantalla
            document.body.classList.add('efecto-destruccion', 'alerta-roja');
            setTimeout(() => {
                document.body.classList.remove('efecto-destruccion', 'alerta-roja');
            }, 400); // Se detiene a los 0.4 segundos
        } else {
            sGasto.play();
        }
        
        // Comprobamos si el gasto rompe algún escudo
        verificarImpactoEscudo(categoriaActual);
    }

    elIng.value = ""; elGas.value = "";
    mostrarHistorial();
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
        ingresosAcumulados += reg.ingresos;
        gastosAcumulados += reg.gastos;
        const porc = ingresosAcumulados > 0 ? (((ingresosAcumulados - gastosAcumulados) / ingresosAcumulados) * 100).toFixed(1) : -100;
        
        tabla.innerHTML += `<tr>
            <td>${reg.fecha}<br><small>${reg.categoria || ''}</small></td>
            <td>$${reg.ingresos.toFixed(2)}</td>
            <td>$${reg.gastos.toFixed(2)}</td>
            <td style="color:${porc >= 0 ? '#2ecc71' : '#e74c3c'}">${porc}%</td>
        </tr>`;
    });

    actualizarGraficas(datosFiltrados);
    calcularTotales();
    renderizarMetas();
    renderizarEscudos();
}

function actualizarGraficas(datos) {
    const elBarras = document.getElementById('miGrafica');
    const elTarta = document.getElementById('graficaTarta');
    if (!elBarras || !elTarta) return;

    if (chartBarras) chartBarras.destroy();
    chartBarras = new Chart(elBarras.getContext('2d'), {
        type: 'bar',
        data: {
            labels: datos.map(r => r.fecha),
            datasets: [
                { label: 'Ingresos', data: datos.map(r => r.ingresos), backgroundColor: '#2ecc71' },
                { label: 'Gastos', data: datos.map(r => r.gastos), backgroundColor: '#e74c3c' }
            ]
        },
        options: { scales: { y: { ticks: { color: 'white' } }, x: { ticks: { color: 'white' } } } }
    });

    const totalIng = datos.reduce((s, r) => s + r.ingresos, 0);
    const totalGas = datos.reduce((s, r) => s + r.gastos, 0);

    if (chartTarta) chartTarta.destroy();
    chartTarta = new Chart(elTarta.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Ingresos', 'Gastos'],
            datasets: [{ data: [totalIng, totalGas], backgroundColor: ['#2ecc71', '#e74c3c'] }]
        }
    });
}

function calcularTotales() {
    const historial = JSON.parse(localStorage.getItem('finanzas')) || [];
    let ti = 0, tg = 0;
    historial.forEach(r => { ti += r.ingresos; tg += r.gastos; });
    document.getElementById('total-ingresos').innerText = `$${ti.toFixed(2)}`;
    document.getElementById('total-gastos').innerText = `$${tg.toFixed(2)}`;
    const balance = ti - tg;
    const elB = document.getElementById('total-balance');
    elB.innerText = `$${balance.toFixed(2)}`;
    elB.style.color = balance >= 0 ? "#2ecc71" : "#e74c3c";
}

// --- COBROS Y NOTIFICACIONES ---
function añadirReglaCobro(tipo) {
    const reglas = JSON.parse(localStorage.getItem('reglas_cobro')) || [];
    reglas.push({ tipo, valor: 1 });
    localStorage.setItem('reglas_cobro', JSON.stringify(reglas));
    renderizarCobros();
}

function renderizarCobros() {
    const cont = document.getElementById('lista-cobros-contenedor');
    const reglas = JSON.parse(localStorage.getItem('reglas_cobro')) || [];
    cont.innerHTML = "";
    reglas.forEach((r, i) => {
        let input = r.tipo === 'fecha' 
            ? `<input type="number" value="${r.valor}" min="1" max="31" onchange="actualizarRegla(${i}, this.value)" style="width: 50px; background: #34495e; color: white; border: none; border-radius: 5px; text-align: center;">`
            : `<select onchange="actualizarRegla(${i}, this.value)" style="background: #34495e; color: white; border: none; border-radius: 5px; padding: 2px;">
                ${["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((d, k) => `<option value="${k+1}" ${r.valor == k+1 ? 'selected' : ''}>${d}</option>`).join('')}
               </select>`;
        cont.innerHTML += `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; background: rgba(255,255,255,0.05); padding: 5px; border-radius: 8px;">
                <span>${r.tipo === 'fecha' ? 'Día del mes' : 'Día semanal'} ${input}</span>
                <button onclick="borrarRegla(${i})" style="color: #e74c3c; background: none; border: none; cursor: pointer;">✖</button>
            </div>`;
    });
}

function actualizarRegla(i, v) {
    const reglas = JSON.parse(localStorage.getItem('reglas_cobro'));
    reglas[i].valor = parseInt(v);
    localStorage.setItem('reglas_cobro', JSON.stringify(reglas));
    
    // Le pasamos "true" para que fuerce una alerta visible si cambias la regla a hoy
    verificarNotificacionesCobro(true);
}

function borrarRegla(i) {
    const reglas = JSON.parse(localStorage.getItem('reglas_cobro'));
    reglas.splice(i, 1);
    localStorage.setItem('reglas_cobro', JSON.stringify(reglas));
    renderizarCobros();
}

function verificarNotificacionesCobro(forzarAlerta = false) {
    const reglas = JSON.parse(localStorage.getItem('reglas_cobro')) || [];
    const hoy = new Date();
    const diaDelMes = hoy.getDate(); // Hoy es 26
    let diaSemana = hoy.getDay(); 
    if (diaSemana === 0) diaSemana = 7; // Domingo es 7

    let tocaCobrar = false;

    // EL MOTOR LOGICO: Revisa si se cumple UNA condición, o LAS DOS.
    reglas.forEach(r => {
        if (r.tipo === 'fecha' && parseInt(r.valor) === diaDelMes) {
            tocaCobrar = true;
        }
        if (r.tipo === 'semana' && parseInt(r.valor) === diaSemana) {
            tocaCobrar = true;
        }
    });

    // SI HOY ES EL DÍA ELEGIDO:
    if (tocaCobrar) {
        if (Notification.permission === "granted") {
            // 1. Intenta lanzar la notificación nativa del sistema
            new Notification("💰 ¡Día de Cobro!", { 
                body: " Es hora de ingresar.",
                requireInteraction: true 
            });
            sMoneda.currentTime = 0;
            sMoneda.play().catch(() => {}); 
        } else if (forzarAlerta) {
            // 2. EL PLAN B BLINDADO: Si el navegador bloquea lo anterior, sale esta alerta
            alert("💰 ¡DÍA DE COBRO DETECTADO!\n\n(Tu navegador tiene las notificaciones ocultas, pero el Imperio sabe que hoy toca ingresar oro).");
            Notification.requestPermission(); // Vuelve a pedir permiso por si acaso
        }
    }
}

// --- LIMPIEZA TOTAL ---
function borrarTodo() {
    document.getElementById('confirmar-view').style.display = 'block';
    document.getElementById('exito-view').style.display = 'none';
    document.getElementById('custom-modal').style.display = 'flex';
}
function cerrarModal() { document.getElementById('custom-modal').style.display = 'none'; }
function confirmarBorrado() {
    localStorage.clear();
    document.getElementById('confirmar-view').style.display = 'none';
    document.getElementById('exito-view').style.display = 'block';
}

// --- METAS Y OBJETIVOS (RESTAURADO) ---
function renderizarMetas() {
    const cont = document.getElementById('lista-metas-contenedor');
    const metas = JSON.parse(localStorage.getItem('metas_multiples')) || [];
    const ti = (JSON.parse(localStorage.getItem('finanzas')) || []).reduce((s, r) => s + r.ingresos, 0);
    const tg = (JSON.parse(localStorage.getItem('finanzas')) || []).reduce((s, r) => s + r.gastos, 0);
    const balance = ti - tg;
    
    cont.innerHTML = "";
    metas.forEach((m, i) => {
        let p = m.precio > 0 ? Math.min((balance / m.precio) * 100, 100) : 0;
        cont.innerHTML += `
            <div class="meta-item" style="border-bottom: 1px dashed #ccc; padding: 10px 0;">
                <input type="text" value="${m.nombre}" onchange="actualizarMeta(${i}, 'nombre', this.value)" style="width:40%; background: #34495e; color: white; border: none; border-radius: 5px; padding: 5px;">
                <input type="number" value="${m.precio}" onchange="actualizarMeta(${i}, 'precio', this.value)" style="width:25%; background: #34495e; color: white; border: none; border-radius: 5px; padding: 5px;">
                <button onclick="borrarMeta(${i})" style="color:#e74c3c; background:none; border:none; cursor:pointer; font-size: 1.2rem;">✖</button>
                <div style="background:#e0e0e0; border-radius:10px; height:20px; margin-top:5px; overflow:hidden;">
                    <div style="width:${p}%; background:#9b59b6; height:100%; color:white; text-align:center; font-size:12px; line-height:20px;">${Math.floor(p)}%</div>
                </div>
            </div>`;
    });
}

function actualizarMeta(index, campo, valor) {
    const metas = JSON.parse(localStorage.getItem('metas_multiples'));
    metas[index][campo] = (campo === 'precio') ? parseFloat(valor) || 0 : valor;
    localStorage.setItem('metas_multiples', JSON.stringify(metas));
    renderizarMetas();
}

function añadirNuevaMeta() {
    const metas = JSON.parse(localStorage.getItem('metas_multiples')) || [];
    metas.push({ nombre: "Nuevo Objetivo", precio: 100 });
    localStorage.setItem('metas_multiples', JSON.stringify(metas));
    renderizarMetas();
}

function borrarMeta(i) {
    const metas = JSON.parse(localStorage.getItem('metas_multiples'));
    metas.splice(i, 1);
    localStorage.setItem('metas_multiples', JSON.stringify(metas));
    renderizarMetas();
}

// --- OTROS ---
function toggleMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('tema', document.body.classList.contains('dark-mode') ? 'oscuro' : 'claro');
}

function actualizarSelectorMeses(h) {
    const s = document.getElementById('filtro-fecha');
    const meses = [...new Set(h.map(r => r.fecha.split('-')[1]))].sort();
    s.innerHTML = '<option value="todos">Todos</option>';
    meses.forEach(m => s.innerHTML += `<option value="${m}">${m}</option>`);
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

// --- 🧬 CLONACIÓN DEL IMPERIO (BACKUP) ---

// 1. Crear el punto de guardado
function crearBackup() {
    // Recopilamos todos los datos del imperio en un solo objeto
    const datosImperio = {
        finanzas: JSON.parse(localStorage.getItem('finanzas')) || [],
        metas: JSON.parse(localStorage.getItem('metas_multiples')) || [],
        reglas: JSON.parse(localStorage.getItem('reglas_cobro')) || []
    };
    
    // Lo convertimos en un archivo descargable .json
    const blob = new Blob([JSON.stringify(datosImperio)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Backup_historial.json";
    a.click();
    URL.revokeObjectURL(url);
}

// 2. Resucitar el imperio desde un archivo
function restaurarImperio(event) {
    const archivo = event.target.files[0];
    if (!archivo) return;

    const lector = new FileReader();
    lector.onload = function(e) {
        try {
            // Leemos el archivo y lo inyectamos en el cerebro de la app
            const datos = JSON.parse(e.target.result);
            
            if (datos.finanzas) localStorage.setItem('finanzas', JSON.stringify(datos.finanzas));
            if (datos.metas) localStorage.setItem('metas_multiples', JSON.stringify(datos.metas));
            if (datos.reglas) localStorage.setItem('reglas_cobro', JSON.stringify(datos.reglas));
            
            alert("✨ ¡Imperio restaurado con éxito desde las cenizas!");
            window.location.reload(); // Recargamos para ver los cambios
        } catch (error) {
            alert("❌ Error: El pergamino del backup parece estar corrupto.");
        }
    };
    lector.readAsText(archivo);
}

// --- 👻 GASTOS FANTASMA (SUSCRIPCIONES AUTOMÁTICAS) ---

function renderizarFantasmas() {
    const cont = document.getElementById('lista-fantasmas-contenedor');
    if (!cont) return;
    const fantasmas = JSON.parse(localStorage.getItem('gastos_fantasma')) || [];
    cont.innerHTML = "";
    
    fantasmas.forEach((f, i) => {
        cont.innerHTML += `
        <div style="display: flex; justify-content: space-between; background: rgba(142, 68, 173, 0.2); padding: 8px; margin-bottom: 5px; border-radius: 5px; border-left: 2px solid #8e44ad;">
            <span>👻 <b>${f.nombre}</b> ($${f.monto}) - Día ${f.dia}</span>
            <button onclick="borrarFantasma(${i})" style="color: #e74c3c; background: none; border: none; cursor: pointer; font-size: 1.1rem;">✖</button>
        </div>`;
    });
}

function añadirFantasma() {
    const nombre = document.getElementById('fantasma-nombre').value;
    const monto = parseFloat(document.getElementById('fantasma-monto').value);
    const dia = parseInt(document.getElementById('fantasma-dia').value);

    if (!nombre || !monto || !dia) return alert("Faltan datos para invocar al fantasma.");

    const fantasmas = JSON.parse(localStorage.getItem('gastos_fantasma')) || [];
    fantasmas.push({ nombre, monto, dia });
    localStorage.setItem('gastos_fantasma', JSON.stringify(fantasmas));
    
    // Limpiamos las cajas
    document.getElementById('fantasma-nombre').value = "";
    document.getElementById('fantasma-monto').value = "";
    document.getElementById('fantasma-dia').value = "";
    
    renderizarFantasmas();
}

function borrarFantasma(i) {
    const fantasmas = JSON.parse(localStorage.getItem('gastos_fantasma'));
    fantasmas.splice(i, 1);
    localStorage.setItem('gastos_fantasma', JSON.stringify(fantasmas));
    renderizarFantasmas();
}

function despertarFantasmas() {
    const fantasmas = JSON.parse(localStorage.getItem('gastos_fantasma')) || [];
    if (fantasmas.length === 0) return;

    const hoy = new Date();
    const hoyString = hoy.toISOString().split('T')[0];
    const diaActual = hoy.getDate();
    
    // Evitamos que cobre dos veces el mismo día
    const ultimoCheck = localStorage.getItem('fantasmas_procesados');
    if (ultimoCheck === hoyString) return; 

    let historial = JSON.parse(localStorage.getItem('finanzas')) || [];
    let ataqueFantasma = false;

    fantasmas.forEach(f => {
        if (f.dia === diaActual) {
            // El fantasma ataca el tesoro
            historial.push({
                fecha: hoyString,
                ingresos: 0,
                gastos: f.monto,
                ahorro: -100, // Gasto puro sin ingreso es -100%
                categoria: `👻 Suscripción (${f.nombre})`
            });
            ataqueFantasma = true;
        }
    });

    if (ataqueFantasma) {
        localStorage.setItem('finanzas', JSON.stringify(historial));
        mostrarHistorial();
        
        // Avisamos al Dios de la Destrucción
        if (Notification.permission === "granted") {
            new Notification("👻 ¡Ataque Fantasma!", { body: "Tus suscripciones han restado oro automáticamente." });
        }
        sGasto.play().catch(() => {}); // Sonido de gasto
    }

    // Marcamos el día como procesado para que no vuelva a cobrar hasta el mes que viene
    localStorage.setItem('fantasmas_procesados', hoyString);
}

// --- 🛡️ ESCUDOS Y PRESUPUESTOS ---

function renderizarEscudos() {
    const cont = document.getElementById('lista-escudos-contenedor');
    if (!cont) return;
    const escudos = JSON.parse(localStorage.getItem('escudos_categorias')) || [];
    cont.innerHTML = "";
    
    const historial = JSON.parse(localStorage.getItem('finanzas')) || [];
    const mesActual = new Date().toISOString().split('-')[1]; // Mes actual en formato 'MM'
    
    escudos.forEach((e, i) => {
        // Calculamos cuánto hemos gastado de esa categoría este mes
        let gastado = 0;
        historial.forEach(reg => {
            if (reg.categoria === e.categoria && reg.fecha.split('-')[1] === mesActual) {
                gastado += reg.gastos;
            }
        });

        // Calculamos la barra de daño del escudo
        const porcentaje = Math.min((gastado / e.limite) * 100, 100);
        const escudoRoto = gastado > e.limite;
        const color = escudoRoto ? '#e74c3c' : '#3498db'; // Rojo si se rompe, azul si aguanta

        cont.innerHTML += `
        <div style="background: rgba(52, 152, 219, 0.1); padding: 10px; margin-bottom: 8px; border-radius: 5px; border-left: 3px solid ${color};">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>🛡️ <b>${e.categoria}</b>: $${gastado} / $${e.limite}</span>
                <button onclick="borrarEscudo(${i})" style="color: #e74c3c; background: none; border: none; cursor: pointer; font-size:1.1rem;">✖</button>
            </div>
            <div style="background:#444; height:8px; border-radius:4px; margin-top:5px; overflow:hidden;">
                <div style="width:${porcentaje}%; background:${color}; height:100%;"></div>
            </div>
            ${escudoRoto ? '<span style="color:#e74c3c; font-size:0.8rem; font-weight:bold;">⚠️ ¡Escudo Roto! Has superado el límite.</span>' : ''}
        </div>`;
    });
}

function añadirEscudo() {
    const categoria = document.getElementById('escudo-categoria').value;
    const limite = parseFloat(document.getElementById('escudo-limite').value);

    if (!limite) return alert("Indica cuánto oro soporta este escudo.");

    const escudos = JSON.parse(localStorage.getItem('escudos_categorias')) || [];
    
    // Si la categoría ya tiene escudo, lo actualizamos, si no, lo creamos
    const index = escudos.findIndex(e => e.categoria === categoria);
    if (index > -1) escudos[index].limite = limite;
    else escudos.push({ categoria, limite });
    
    localStorage.setItem('escudos_categorias', JSON.stringify(escudos));
    document.getElementById('escudo-limite').value = "";
    renderizarEscudos();
}

function borrarEscudo(i) {
    const escudos = JSON.parse(localStorage.getItem('escudos_categorias'));
    escudos.splice(i, 1);
    localStorage.setItem('escudos_categorias', JSON.stringify(escudos));
    renderizarEscudos();
}

// Función que se activa al registrar un gasto para ver si el escudo aguanta
function verificarImpactoEscudo(categoria) {
    const escudos = JSON.parse(localStorage.getItem('escudos_categorias')) || [];
    const escudo = escudos.find(e => e.categoria === categoria);
    
    if (escudo) {
        const historial = JSON.parse(localStorage.getItem('finanzas')) || [];
        const mesActual = new Date().toISOString().split('-')[1];
        
        let gastado = 0;
        historial.forEach(reg => {
            if (reg.categoria === categoria && reg.fecha.split('-')[1] === mesActual) {
                gastado += reg.gastos;
            }
        });

        // Si el gasto acaba de romper el escudo, suena la alarma
        if (gastado > escudo.limite) {
            sAlerta.play().catch(() => {});
            alert(`🛡️💥 ¡ALERTA SEÑOR RAÚL!\n\nEl escudo de [${categoria}] ha sido DESTRUIDO.\nHas gastado $${gastado} este mes, superando el límite de $${escudo.limite}.`);
        }
    }
}