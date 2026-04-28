// --- VARIABLES GLOBALES ---
let chartBarras;
let chartTarta;
let categoriaActual = "General";
const PIN_MAESTRO = "7153"; 

const firebaseConfig = {
  apiKey: "AIzaSyApZjbaaXPgl2m4Gz49eOnc6HYUTUjgNhM",
  authDomain: "finazometro.firebaseapp.com",
  projectId: "finazometro",
  storageBucket: "finazometro.firebasestorage.app",
  messagingSenderId: "300034397384",
  appId: "1:300034397384:web:22237c0d2926c24e8c81fd",
  measurementId: "G-SB80DXP9Y4"
};

// Inicializamos la conexión
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Función de prueba (La borraremos luego)
function probarConexion() {
    db.collection("imperio").doc("mensajes").set({
        texto: "¡Se ha establecido la conexión!",
        fecha: new Date().toISOString()
    }).then(() => {
        alert("☁️ ¡CONEXIÓN ESTABLECIDA CON LA NUBE!");
    }).catch((error) => {
        alert("❌ Error al conectar: " + error);
    });
}


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
    renderizarFantasmas();
    despertarFantasmas();
    renderizarEscudos();

    // --- 🌩️ RADAR DE SINCRONIZACIÓN TOTAL ---

    // 1. Vigilar Finanzas
    db.collection("imperio").doc("finanzas").onSnapshot((doc) => {
        if (doc.exists) {
            localStorage.setItem('finanzas', JSON.stringify(doc.data().registros));
            mostrarHistorial();
        }
    });

    // 2. Vigilar Objetivos (Metas)
    db.collection("imperio").doc("metas").onSnapshot((doc) => {
        if (doc.exists) {
            localStorage.setItem('metas_multiples', JSON.stringify(doc.data().lista));
            renderizarMetas();
        }
    });

    // 3. Vigilar Gastos Fantasma
    db.collection("imperio").doc("fantasmas").onSnapshot((doc) => {
        if (doc.exists) {
            localStorage.setItem('fantasmas_oscuros', JSON.stringify(doc.data().lista));
            renderizarFantasmas();
        }
    });

    // 4. Vigilar Escudos
    db.collection("imperio").doc("escudos").onSnapshot((doc) => {
        if (doc.exists) {
            localStorage.setItem('escudos_categorias', JSON.stringify(doc.data().lista));
            renderizarEscudos();
        }
    });

    // 5. Vigilar Días de Cobro
    db.collection("imperio").doc("cobros").onSnapshot((doc) => {
        if (doc.exists) {
            localStorage.setItem('reglas_cobro', JSON.stringify(doc.data().lista));
            renderizarCobros();
        }
    });

};


// --- SEGURIDAD ---
function verificarPIN() {
    const pass = document.getElementById('pin-input').value.trim();
    if (pass === PIN_MAESTRO) {
        document.getElementById('pin-screen').style.display = 'none';
        sessionStorage.setItem('autorizado', 'true');
        
        // El móvil ya ha detectado tu toque en el botón "Entrar", ahora sí deja lanzar notificaciones
        verificarNotificacionesCobro(); 
    } else {
        alert("PIN incorrecto.");
    }
}

// --- DESBLOQUEO DE AUDIO ---
// --- DESBLOQUEO DE AUDIO Y NOTIFICACIONES MÓVILES ---
window.addEventListener('click', () => {
    [sMoneda, sGasto, sAlerta].forEach(s => {
        s.play().then(() => { s.pause(); s.currentTime = 0; }).catch(() => {});
    });
    console.log("🔊 Audio desbloqueado");
    
    // Lanzamos la notificación al primer toque de la pantalla
    if (sessionStorage.getItem('autorizado')) {
        verificarNotificacionesCobro();
    }
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
    
    // --- 💥 ENVÍO A LA NUBE IMPERIAL (FIREBASE) ---
    // (Esta línea sustituye al antiguo localStorage.setItem)
    db.collection("imperio").doc("finanzas").set({ registros: historial });

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
        
        let porcAhorro = "-100.0";
        let porcGasto = "100.0";
        
        // Calculamos las dos caras de la moneda si hay ingresos
        if (ingresosAcumulados > 0) {
            porcAhorro = (((ingresosAcumulados - gastosAcumulados) / ingresosAcumulados) * 100).toFixed(1);
            porcGasto = ((gastosAcumulados / ingresosAcumulados) * 100).toFixed(1);
        }

        const colorAhorro = porcAhorro >= 0 ? '#2ecc71' : '#e74c3c'; // Verde si hay ahorro, rojo si debes dinero
        
        tabla.innerHTML += `<tr>
            <td>${reg.fecha}<br><small style="color:#aaa;">${reg.categoria || ''}</small></td>
            <td>$${reg.ingresos.toFixed(2)}</td>
            <td>$${reg.gastos.toFixed(2)}</td>
            <td style="text-align: right; line-height: 1.2;">
                <span style="color:${colorAhorro}; font-weight:bold;">${porcAhorro}% 🟢</span><br>
                <span style="color:#e74c3c; font-size: 0.85em;">${porcGasto}% 🔴</span>
            </td>
        </tr>`;
    });

    actualizarGraficas(datosFiltrados);
    calcularTotales();
    renderizarMetas();
    renderizarEscudos(); // Actualizamos las barreras defensivas
}

function actualizarGraficas(datos) {
    const elBarras = document.getElementById('miGrafica');
    const elTarta = document.getElementById('graficaTarta');
    if (!elBarras || !elTarta) return;

    // 1. Detectar el color según el modo (Claro u Oscuro) para que no se camufle
    const esOscuro = document.body.classList.contains('dark-mode');
    const colorTexto = esOscuro ? '#ffffff' : '#333333'; // Blanco en oscuro, gris oscuro en claro
    const colorLineas = esOscuro ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

    // --- GRÁFICA DE BARRAS ---
    if (chartBarras) chartBarras.destroy();
    chartBarras = new Chart(elBarras.getContext('2d'), {
        type: 'bar',
        data: {
            labels: datos.map(r => r.fecha), // Fechas en el eje X (Abajo)
            datasets: [
                { label: 'Ingresos', data: datos.map(r => r.ingresos), backgroundColor: '#2ecc71' },
                { label: 'Gastos', data: datos.map(r => r.gastos), backgroundColor: '#e74c3c' }
            ]
        },
        options: { 
            responsive: true,
            scales: { 
                y: { 
                    beginAtZero: true, // Las cantidades empiezan en 0
                    ticks: { color: colorTexto, font: { weight: 'bold' } }, // Cantidades a la izquierda
                    grid: { color: colorLineas } // Líneas de fondo
                }, 
                x: { 
                    ticks: { color: colorTexto, font: { weight: 'bold' } }, // Fechas abajo
                    grid: { color: colorLineas }
                } 
            },
            plugins: {
                legend: { labels: { color: colorTexto } }
            }
        }
    });

    // --- GRÁFICA DE TARTA ---
    const totalIng = datos.reduce((s, r) => s + r.ingresos, 0);
    const totalGas = datos.reduce((s, r) => s + r.gastos, 0);

    if (chartTarta) chartTarta.destroy();
    chartTarta = new Chart(elTarta.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Ingresos', 'Gastos'],
            datasets: [{ data: [totalIng, totalGas], backgroundColor: ['#2ecc71', '#e74c3c'], borderWidth: 0 }]
        },
        options: {
            plugins: { legend: { labels: { color: colorTexto } } }
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
    db.collection("imperio").doc("cobros").set({ lista: reglas }); // ☁️ A LA NUBE
    
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
    db.collection("imperio").doc("cobros").set({ lista: reglas }); // ☁️ A LA NUBE
    
    verificarNotificacionesCobro(true);
}

function borrarRegla(i) {
    const reglas = JSON.parse(localStorage.getItem('reglas_cobro'));
    reglas.splice(i, 1);
    
    localStorage.setItem('reglas_cobro', JSON.stringify(reglas));
    db.collection("imperio").doc("cobros").set({ lista: reglas }); // ☁️ A LA NUBE
    
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

// --- SISTEMA DE AUTODESTRUCCIÓN (MODAL) ---
function borrarTodo() {
    document.getElementById('confirmar-view').style.display = 'block';
    document.getElementById('exito-view').style.display = 'none';
    document.getElementById('custom-modal').style.display = 'flex';
}

function cerrarModal() { 
    document.getElementById('custom-modal').style.display = 'none'; 
}

async function confirmarBorrado() {
    // 1. Mostramos el mensaje de "Cenizas"
    document.getElementById('confirmar-view').style.display = 'none';
    document.getElementById('exito-view').style.display = 'block';

    // 2. 🌩️ BOMBA A LA NUBE (Con Confirmación)
    try {
        if (typeof db !== 'undefined') {
            // AWAIT obliga al móvil a esperar a que Google confirme la destrucción
            await db.collection("imperio").doc("finanzas").set({ registros: [] });
            await db.collection("imperio").doc("metas").set({ lista: [] });
            await db.collection("imperio").doc("fantasmas").set({ lista: [] });
            await db.collection("imperio").doc("escudos").set({ lista: [] });
            await db.collection("imperio").doc("cobros").set({ lista: [] });
        }
    } catch(e) {
        console.log("Nube inaccesible en este momento.");
    }

    // 3. 📱 BOMBA LOCAL
    localStorage.clear();
    
    // 4. DESTRUCCIÓN VISUAL INMEDIATA (Por si Mimo bloquea el recargo de página)
    document.getElementById('lista-registros').innerHTML = "";
    if (document.getElementById('lista-metas-contenedor')) document.getElementById('lista-metas-contenedor').innerHTML = "";
    if (document.getElementById('lista-fantasmas-contenedor')) document.getElementById('lista-fantasmas-contenedor').innerHTML = "";
    if (document.getElementById('lista-escudos-contenedor')) document.getElementById('lista-escudos-contenedor').innerHTML = "";
    document.getElementById('tot-ingresos').innerText = "0.00";
    document.getElementById('tot-gastos').innerText = "0.00";
    document.getElementById('tot-balance').innerText = "0.00";
    if (chartBarras) chartBarras.destroy();
    if (chartTarta) chartTarta.destroy();

    // 5. Recarga final como golpe de gracia
    setTimeout(function() {
        window.location.reload();
    }, 1500);
}

// --- METAS Y OBJETIVOS (RESTAURADO) ---
function renderizarMetas() {
    const cont = document.getElementById('lista-metas-contenedor');
    const metas = JSON.parse(localStorage.getItem('metas_multiples')) || [];
    
    // Calculamos el tesoro total actual
    const ti = (JSON.parse(localStorage.getItem('finanzas')) || []).reduce((s, r) => s + r.ingresos, 0);
    const tg = (JSON.parse(localStorage.getItem('finanzas')) || []).reduce((s, r) => s + r.gastos, 0);
    const balance = ti - tg;
    
    cont.innerHTML = "";
    metas.forEach((m, i) => {
        // 1. Barra de Progreso (Morada): ¿Cuánto nos falta para poder pagarlo?
        let progreso = m.precio > 0 && balance > 0 ? Math.min((balance / m.precio) * 100, 100) : 0;
        
        // 2. Simulador de Daño (Rojo): ¿Qué porcentaje del tesoro perderemos si lo compramos?
        let dañoPorcentaje = 0;
        let textoDaño = "";
        
        if (balance > 0) {
            dañoPorcentaje = ((m.precio / balance) * 100).toFixed(1);
            textoDaño = `Daño al tesoro: -${dañoPorcentaje}% 🔴`;
        } else {
            textoDaño = `Sin fondos suficientes 🔴`;
        }

        cont.innerHTML += `
            <div class="meta-item" style="border-bottom: 1px dashed #ccc; padding: 10px 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <input type="text" value="${m.nombre}" onchange="actualizarMeta(${i}, 'nombre', this.value)" style="width:40%; background: #34495e; color: white; border: none; border-radius: 5px; padding: 5px;">
                    <input type="number" value="${m.precio}" onchange="actualizarMeta(${i}, 'precio', this.value)" style="width:25%; background: #34495e; color: white; border: none; border-radius: 5px; padding: 5px;">
                    <button onclick="borrarMeta(${i})" style="color:#e74c3c; background:none; border:none; cursor:pointer; font-size: 1.2rem;">✖</button>
                </div>
                
                <div style="background:#e0e0e0; border-radius:10px; height:20px; overflow:hidden;">
                    <div style="width:${progreso}%; background:#9b59b6; height:100%; color:white; text-align:center; font-size:12px; line-height:20px;">
                        ${Math.floor(progreso)}%
                    </div>
                </div>
                
                <div style="text-align: right; margin-top: 5px; font-size: 0.85rem; font-weight: bold; color: #e74c3c;">
                    ${textoDaño}
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
    mostrarHistorial(); 
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

// --- GASTOS FANTASMA SINCRONIZADOS ---
function añadirFantasma() {
    const nombre = document.getElementById('fantasma-nombre').value;
    const monto = parseFloat(document.getElementById('fantasma-monto') ? document.getElementById('fantasma-monto').value : document.getElementById('fantasma-precio').value);
    const dia = parseInt(document.getElementById('fantasma-dia').value);

    if (!nombre || !monto || !dia) return alert("Faltan datos para invocar al fantasma.");

    // Unificamos el nombre a "fantasmas_oscuros" para que Local y Nube sean uno solo
    const fantasmas = JSON.parse(localStorage.getItem('fantasmas_oscuros')) || [];
    fantasmas.push({ nombre, precio: monto, dia });
    
    // Guardamos en Local y disparamos a la Nube
    localStorage.setItem('fantasmas_oscuros', JSON.stringify(fantasmas));
    db.collection("imperio").doc("fantasmas").set({ lista: fantasmas });
    
    // Limpiamos las cajas
    document.getElementById('fantasma-nombre').value = "";
    if(document.getElementById('fantasma-monto')) document.getElementById('fantasma-monto').value = "";
    if(document.getElementById('fantasma-precio')) document.getElementById('fantasma-precio').value = "";
    document.getElementById('fantasma-dia').value = "";
    
    renderizarFantasmas();
}

function borrarFantasma(i) {
    const fantasmas = JSON.parse(localStorage.getItem('fantasmas_oscuros'));
    fantasmas.splice(i, 1);
    localStorage.setItem('fantasmas_oscuros', JSON.stringify(fantasmas));
    db.collection("imperio").doc("fantasmas").set({ lista: fantasmas });
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
    
    // ⏳ MAGIA TEMPORAL: Extraemos "Año-Mes" (Ejemplo: "2026-04")
    const mesActual = new Date().toISOString().substring(0, 7); 
    
    escudos.forEach((e, i) => {
        // Calculamos el daño solo de este mes y de este año
        let gastado = 0;
        historial.forEach(reg => {
            if (reg.categoria === e.categoria && reg.fecha.substring(0, 7) === mesActual) {
                gastado += reg.gastos;
            }
        });

        // Calculamos la barra de daño del escudo
        const porcentaje = Math.min((gastado / e.limite) * 100, 100);
        const escudoRoto = gastado > e.limite;
        const color = escudoRoto ? '#e74c3c' : '#3498db';

        cont.innerHTML += `
        <div style="background: rgba(52, 152, 219, 0.1); padding: 10px; margin-bottom: 8px; border-radius: 5px; border-left: 3px solid ${color};">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>🛡️ <b>${e.categoria}</b>: $${gastado} / $${e.limite} <small style="color:#aaa">(Este mes)</small></span>
                <button onclick="borrarEscudo(${i})" style="color: #e74c3c; background: none; border: none; cursor: pointer; font-size:1.1rem;">✖</button>
            </div>
            <div style="background:#444; height:8px; border-radius:4px; margin-top:5px; overflow:hidden;">
                <div style="width:${porcentaje}%; background:${color}; height:100%;"></div>
            </div>
            ${escudoRoto ? '<span style="color:#e74c3c; font-size:0.8rem; font-weight:bold;">⚠️ ¡Escudo Roto! Límite mensual superado.</span>' : ''}
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

    // Al final de añadirEscudo y borrarEscudo:
const escudosActualizados = JSON.parse(localStorage.getItem('escudos_categorias'));
db.collection("imperio").doc("escudos").set({ lista: escudosActualizados });
}

function borrarEscudo(i) {
    const escudos = JSON.parse(localStorage.getItem('escudos_categorias'));
    escudos.splice(i, 1);
    localStorage.setItem('escudos_categorias', JSON.stringify(escudos));
    renderizarEscudos();
// Al final de añadirEscudo y borrarEscudo:
const escudosActualizados = JSON.parse(localStorage.getItem('escudos_categorias'));
db.collection("imperio").doc("escudos").set({ lista: escudosActualizados });

}

// Función que se activa al registrar un gasto para ver si el escudo aguanta
function verificarImpactoEscudo(categoria) {
    const escudos = JSON.parse(localStorage.getItem('escudos_categorias')) || [];
    const escudo = escudos.find(e => e.categoria === categoria);
    
    if (escudo) {
        const historial = JSON.parse(localStorage.getItem('finanzas')) || [];
        const mesActual = new Date().toISOString().substring(0, 7);
        
        let gastado = 0;
        historial.forEach(reg => {
            if (reg.categoria === categoria && reg.fecha.substring(0, 7) === mesActual) {
                gastado += reg.gastos;
            }
        });

        if (gastado > escudo.limite) {
            sAlerta.play().catch(() => {});
            alert(`🛡️💥 ¡ALERTA SEÑOR RAÚL!\n\nEl escudo de [${categoria}] ha sido DESTRUIDO.\nHas gastado $${gastado} en lo que va de mes, superando el límite de $${escudo.limite}.`);
        }
    }
}