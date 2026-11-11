/* =====================================================================
   script.js  —  LÓGICA DEL SISTEMA DE VENTAS (COMPORTAMIENTO)
=====================================================================
   FUNCIÓN DE ESTE ARCHIVO:
   Es el "cerebro" del sistema. Hace que la página FUNCIONE:
     · Guarda y lee productos y ventas en localStorage
     · Dibuja el catálogo (con imágenes) y el carrito
     · Calcula subtotal, IVA y total
     · Permite agregar nuevos productos
     · Cierra la venta, la guarda y abre su registro en OTRA ventana
     · Muestra la lista de ventas y sus detalles (ventas.html)
     · Genera música de fondo y sincroniza las luces con ella

   ¿QUÉ ES localStorage?
   Es un pequeño almacén del navegador donde se guardan datos como texto
   (clave → valor). Los datos NO se pierden al cerrar la página.
   Como solo guarda texto, usamos:
     JSON.stringify(objeto)  →  convierte objetos/arreglos a texto para guardar
     JSON.parse(texto)       →  convierte el texto de vuelta a objetos

   ÍNDICE:
   1. Constantes y utilidades
   2. Capa de datos (localStorage)
   3. Productos por defecto (con imágenes SVG)
   4. Música y luces dinámicas
   5. Página INDEX: catálogo, carrito, nuevo producto, cerrar venta
   6. Página VENTAS: lista y detalle
   7. Arranque (qué se ejecuta según la página)
===================================================================== */

"use strict";   // modo estricto: ayuda a detectar errores de programación


/* =====================================================================
   1. CONSTANTES Y UTILIDADES
===================================================================== */

// Claves con las que se guardan los datos en localStorage
const CLAVE_PRODUCTOS = "ventapro_productos";
const CLAVE_VENTAS    = "ventapro_ventas";
const TASA_IVA        = 0.13;   // 13 % de IVA

// Atajo para buscar un elemento por su id: $("total") = document.getElementById("total")
const $ = (id) => document.getElementById(id);

// Da formato de dinero: 1234.5 → "Bs. 1,234.50"
function dinero(numero) {
  return "Bs. " + Number(numero).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Evita que texto escrito por el usuario se interprete como código HTML (seguridad XSS)
function escapar(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

// Muestra un mensaje emergente que desaparece solo a los 3 segundos
function aviso(mensaje, tipo = "") {
  const contenedor = $("toasts");
  if (!contenedor) return;
  const t = document.createElement("div");
  t.className = "toast " + tipo;
  t.textContent = mensaje;
  contenedor.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}


/* =====================================================================
   2. CAPA DE DATOS (localStorage)
   Todas las lecturas/escrituras pasan por estas funciones, así el resto
   del código no necesita conocer los detalles del almacenamiento.
===================================================================== */

// Lee un arreglo guardado. Si no existe o está dañado, devuelve [].
function leer(clave) {
  try {
    return JSON.parse(localStorage.getItem(clave)) || [];
  } catch (e) {
    return [];
  }
}

// Guarda un arreglo como texto JSON
function guardar(clave, datos) {
  try {
    localStorage.setItem(clave, JSON.stringify(datos));
  } catch (e) {
    // Si el almacenamiento se llena (imágenes muy grandes) se avisa al usuario
    aviso("No se pudo guardar: almacenamiento lleno", "error");
  }
}

const obtenerProductos = () => leer(CLAVE_PRODUCTOS);
const obtenerVentas    = () => leer(CLAVE_VENTAS);


/* =====================================================================
   3. PRODUCTOS POR DEFECTO
   Como el demo debe funcionar sin internet ni archivos de imagen,
   cada producto lleva una imagen SVG creada por código (un degradado
   de color con un emoji). Un SVG convertido en "data URI" se puede usar
   directamente en <img src="...">.
===================================================================== */

function crearImagenSVG(emoji, color1, color2) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
       <defs>
         <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
           <stop offset="0" stop-color="${color1}"/>
           <stop offset="1" stop-color="${color2}"/>
         </linearGradient>
       </defs>
       <rect width="400" height="300" fill="url(#g)"/>
       <circle cx="330" cy="50" r="90" fill="rgba(255,255,255,0.12)"/>
       <text x="200" y="185" font-size="120" text-anchor="middle">${emoji}</text>
     </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

// Se ejecuta solo la primera vez (cuando localStorage aún está vacío)
function cargarProductosIniciales() {
  if (obtenerProductos().length > 0) return;

  const iniciales = [
    { nombre: "Laptop Pro 15\"",        precio: 5200, stock: 8,  categoria: "Tecnología", imagen: crearImagenSVG("💻", "#4f46e5", "#06b6d4") },
    { nombre: "Smartphone X",           precio: 3100, stock: 15, categoria: "Tecnología", imagen: crearImagenSVG("📱", "#db2777", "#7c3aed") },
    { nombre: "Auriculares Wireless",   precio: 450,  stock: 25, categoria: "Audio",      imagen: crearImagenSVG("🎧", "#0ea5e9", "#6366f1") },
    { nombre: "Cámara Digital",         precio: 2400, stock: 6,  categoria: "Fotografía", imagen: crearImagenSVG("📷", "#f59e0b", "#ef4444") },
    { nombre: "Reloj Inteligente",      precio: 890,  stock: 12, categoria: "Accesorios", imagen: crearImagenSVG("⌚", "#10b981", "#0ea5e9") },
    { nombre: "Teclado Mecánico",       precio: 380,  stock: 20, categoria: "Accesorios", imagen: crearImagenSVG("⌨️", "#8b5cf6", "#ec4899") },
    { nombre: "Parlante Bluetooth",     precio: 320,  stock: 18, categoria: "Audio",      imagen: crearImagenSVG("🔊", "#ef4444", "#f97316") },
    { nombre: "Monitor 27\" 4K",        precio: 2100, stock: 5,  categoria: "Tecnología", imagen: crearImagenSVG("🖥️", "#14b8a6", "#3b82f6") }
  ].map((p, i) => ({ ...p, id: "p" + Date.now() + i }));   // cada producto recibe un id único

  guardar(CLAVE_PRODUCTOS, iniciales);
}


/* =====================================================================
   4. MÚSICA Y LUCES DINÁMICAS
   La música se GENERA por código con la Web Audio API (no se necesita
   ningún archivo .mp3). Se toca una progresión de acordes (La menor,
   Fa, Do, Sol) con un arpegio suave, un bajo y un "pad" de fondo.
   Por cada nota se llama a pulsoDeLuces() para cambiar el color de las luces.
   NOTA: los navegadores bloquean el audio hasta que el usuario hace clic,
   por eso la música se inicia con el botón "▶ Música".
===================================================================== */

let audioCtx = null;        // contexto de audio (el "motor" de sonido)
let volumenMaestro = null;  // control de volumen general
let temporizador = null;    // intervalo que toca las notas
let sonando = false;
let paso = 0;               // contador de notas tocadas
let tonoActual = 260;       // valor del tono (hue) de las luces

// Acordes en notas MIDI (números que representan teclas del piano)
const ACORDES = [
    [69, 64, 69]
];

// Convierte una nota MIDI a frecuencia en Hz (fórmula estándar)
const midiAHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Toca una nota: crea un oscilador (genera la onda) y un envolvente de volumen
function tocarNota(frecuencia, duracion, tipo, volumen) {
  const ahora = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const ganancia = audioCtx.createGain();

  osc.type = tipo;                       // forma de onda: "sine", "triangle"...
  osc.frequency.value = frecuencia;

  // Envolvente: sube rápido (ataque) y baja suavemente (relajación)
  ganancia.gain.setValueAtTime(0.0001, ahora);
  ganancia.gain.exponentialRampToValueAtTime(volumen, ahora + 0.03);
  ganancia.gain.exponentialRampToValueAtTime(0.0001, ahora + duracion);

  osc.connect(ganancia);
  ganancia.connect(volumenMaestro);
  osc.start(ahora);
  osc.stop(ahora + duracion + 0.05);
}

// Cada "tic" del temporizador toca una nota del arpegio
function siguienteNota() {
  const acorde = ACORDES[Math.floor(paso / 8) % ACORDES.length];  // cambia de acorde cada 8 notas
  const posicion = paso % 8;

  // Patrón de arpegio sube y baja: 0,1,2,1,0,1,2,1 sobre las notas del acorde
  const patron = [0, 1, 2, 1, 0, 1, 2, 1];
  const nota = acorde[patron[posicion]] + 12;     // +12 = una octava más aguda
  tocarNota(midiAHz(nota), 0.9, "triangle", 0.18);

  // Al inicio de cada acorde: bajo profundo + pad envolvente
  if (posicion === 0) {
    tocarNota(midiAHz(acorde[0] - 12), 2.2, "sine", 0.3);
    acorde.forEach((n) => tocarNota(midiAHz(n), 3.5, "sine", 0.07));
  }

  pulsoDeLuces();
  paso++;
}

// Cambia el tono de las luces y da un "destello" breve
function pulsoDeLuces() {
  tonoActual = (tonoActual + 14) % 360;
  document.documentElement.style.setProperty("--hue", tonoActual);  // variable CSS --hue
  document.body.classList.add("pulso");
  setTimeout(() => document.body.classList.remove("pulso"), 200);
}

function iniciarMusica() {
  // El AudioContext se crea la primera vez (requiere un gesto del usuario)
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    volumenMaestro = audioCtx.createGain();
    volumenMaestro.gain.value = $("volumen").value / 100;
    volumenMaestro.connect(audioCtx.destination);
  }
  audioCtx.resume();
  temporizador = setInterval(siguienteNota, 280);   // una nota cada 280 ms (~107 bpm en corcheas)
  sonando = true;
  $("iconoMusica").textContent = "⏸";
}

function pausarMusica() {
  clearInterval(temporizador);
  sonando = false;
  $("iconoMusica").textContent = "▶";
}

function configurarMusica() {
  $("btnMusica").addEventListener("click", () => (sonando ? pausarMusica() : iniciarMusica()));
  $("volumen").addEventListener("input", (e) => {
    if (volumenMaestro) volumenMaestro.gain.value = e.target.value / 100;
  });
}


/* =====================================================================
   5. PÁGINA INDEX: CATÁLOGO, CARRITO, NUEVO PRODUCTO, CERRAR VENTA
===================================================================== */

// El carrito vive en memoria: lista de { id, cantidad }. Se vacía al cerrar la venta.
let carrito = [];

/* ---------- 5.1 Catálogo ---------- */

// Dibuja las tarjetas de producto aplicando búsqueda y filtro de categoría
function dibujarCatalogo() {
  const productos = obtenerProductos();
  const texto = $("buscador").value.trim().toLowerCase();
  const categoria = $("filtroCategoria").value;

  const filtrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(texto) &&
    (categoria === "todas" || p.categoria === categoria)
  );

  $("contadorProductos").textContent = filtrados.length + " productos";

  if (filtrados.length === 0) {
    $("listaProductos").innerHTML = '<p class="vacio">No se encontraron productos.</p>';
    return;
  }

  // Cada producto se convierte en un bloque HTML (tarjeta) con su imagen
  $("listaProductos").innerHTML = filtrados.map((p) => {
    const enCarrito = (carrito.find((c) => c.id === p.id) || { cantidad: 0 }).cantidad;
    const disponible = p.stock - enCarrito;   // stock real menos lo ya agregado al carrito
    return `
      <article class="tarjeta">
        <img class="tarjeta-img" src="${p.imagen}" alt="${escapar(p.nombre)}" loading="lazy">
        <div class="tarjeta-cuerpo">
          <span class="tarjeta-cat">${escapar(p.categoria)}</span>
          <span class="tarjeta-nombre">${escapar(p.nombre)}</span>
          <span class="tarjeta-stock ${disponible <= 3 ? "bajo" : ""}">Stock: ${disponible}</span>
          <span class="tarjeta-precio">${dinero(p.precio)}</span>
          <button class="btn btn-primario" data-agregar="${p.id}" ${disponible <= 0 ? "disabled" : ""}>
            ${disponible <= 0 ? "Sin stock" : "+ Agregar"}
          </button>
        </div>
      </article>`;
  }).join("");
}

// Llena el <select> de filtro y el <datalist> del formulario con las categorías existentes
function actualizarCategorias() {
  const categorias = [...new Set(obtenerProductos().map((p) => p.categoria))].sort();
  const seleccion = $("filtroCategoria").value;

  $("filtroCategoria").innerHTML =
    '<option value="todas">Todas las categorías</option>' +
    categorias.map((c) => `<option value="${escapar(c)}">${escapar(c)}</option>`).join("");
  $("filtroCategoria").value = categorias.includes(seleccion) ? seleccion : "todas";

  $("listaCategorias").innerHTML = categorias.map((c) => `<option value="${escapar(c)}">`).join("");
}

/* ---------- 5.2 Carrito ---------- */

function agregarAlCarrito(id) {
  const producto = obtenerProductos().find((p) => p.id === id);
  if (!producto) return;

  const item = carrito.find((c) => c.id === id);
  const cantidadActual = item ? item.cantidad : 0;

  if (cantidadActual >= producto.stock) {
    aviso("No hay más stock disponible", "error");
    return;
  }
  if (item) item.cantidad++;
  else carrito.push({ id, cantidad: 1 });

  dibujarCarrito();
  dibujarCatalogo();
}

// Suma o resta 1 a la cantidad de un item. Si llega a 0, se elimina.
function cambiarCantidad(id, delta) {
  const item = carrito.find((c) => c.id === id);
  const producto = obtenerProductos().find((p) => p.id === id);
  if (!item || !producto) return;

  const nueva = item.cantidad + delta;
  if (nueva > producto.stock) { aviso("Stock insuficiente", "error"); return; }

  item.cantidad = nueva;
  if (item.cantidad <= 0) carrito = carrito.filter((c) => c.id !== id);

  dibujarCarrito();
  dibujarCatalogo();
}

// Calcula los totales de la venta actual
function calcularTotales() {
  const productos = obtenerProductos();
  // El precio del producto incluye IVA: se desglosa el subtotal
  const total = carrito.reduce((suma, item) => {
    const p = productos.find((x) => x.id === item.id);
    return suma + (p ? p.precio * item.cantidad : 0);
  }, 0);
  const subtotal = total / (1 + TASA_IVA);
  return { subtotal, iva: total - subtotal, total };
}

function dibujarCarrito() {
  const productos = obtenerProductos();

  if (carrito.length === 0) {
    $("itemsCarrito").innerHTML = '<p class="vacio">Agrega productos para iniciar la venta.</p>';
  } else {
    $("itemsCarrito").innerHTML = carrito.map((item) => {
      const p = productos.find((x) => x.id === item.id);
      if (!p) return "";
      return `
        <div class="item">
          <img src="${p.imagen}" alt="">
          <div class="item-info">
            <strong>${escapar(p.nombre)}</strong>
            <span>${dinero(p.precio)} c/u</span>
          </div>
          <div class="cantidad">
            <button data-menos="${p.id}">−</button>
            <span>${item.cantidad}</span>
            <button data-mas="${p.id}">+</button>
          </div>
        </div>`;
    }).join("");
  }

  const t = calcularTotales();
  $("subtotal").textContent = dinero(t.subtotal);
  $("iva").textContent      = dinero(t.iva);
  $("total").textContent    = dinero(t.total);
}

/* ---------- 5.3 Cerrar venta ---------- */

function cerrarVenta() {
  if (carrito.length === 0) { aviso("El carrito está vacío", "error"); return; }

  const cliente = $("cliente").value.trim();
  if (!cliente) { aviso("Escribe el nombre del cliente", "error"); $("cliente").focus(); return; }

  const productos = obtenerProductos();
  const totales = calcularTotales();

  // Se arma el objeto de la venta. Se guarda una "copia" de nombre y precio
  // para que el historial no cambie aunque luego se edite el producto.
  const venta = {
    id: "V-" + String(obtenerVentas().length + 1).padStart(4, "0"),  // V-0001, V-0002...
    fecha: new Date().toISOString(),
    cliente,
    pago: $("pago").value,
    items: carrito.map((item) => {
      const p = productos.find((x) => x.id === item.id);
      return { idProducto: p.id, nombre: p.nombre, precio: p.precio, cantidad: item.cantidad };
    }),
    subtotal: totales.subtotal,
    iva: totales.iva,
    total: totales.total
  };

  // 1) Descontar el stock vendido
  carrito.forEach((item) => {
    const p = productos.find((x) => x.id === item.id);
    p.stock -= item.cantidad;
  });
  guardar(CLAVE_PRODUCTOS, productos);

  // 2) Guardar la venta en el historial
  const ventas = obtenerVentas();
  ventas.push(venta);
  guardar(CLAVE_VENTAS, ventas);

  // 3) Abrir el registro en OTRA ventana, ya con esta venta seleccionada (?venta=ID)
  const ventana = window.open("ventas.html?venta=" + venta.id, "ventanaVentas");
  if (!ventana) aviso("Permite las ventanas emergentes para ver el registro", "error");

  // 4) Limpiar la pantalla para una nueva venta
  carrito = [];
  $("cliente").value = "";
  dibujarCarrito();
  dibujarCatalogo();
  aviso("Venta " + venta.id + " registrada ✔", "ok");
}

/* ---------- 5.4 Nuevo producto ---------- */

let imagenNueva = "";   // aquí se guarda la imagen elegida (como texto base64)

// Reduce la imagen subida a máx. 400px y la comprime a JPEG.
// Así ocupa poco espacio en localStorage (que solo permite ~5 MB).
function procesarImagen(archivo) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onerror = rechazar;
    lector.onload = () => {
      const img = new Image();
      img.onerror = rechazar;
      img.onload = () => {
        const escala = Math.min(1, 400 / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width  = img.width * escala;
        canvas.height = img.height * escala;
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolver(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = lector.result;
    };
    lector.readAsDataURL(archivo);
  });
}

function mostrarVistaPrevia(src) {
  $("vistaPrevia").src = src;
  $("vistaPrevia").classList.toggle("oculto", !src);
}

function abrirModal()  { $("modalProducto").classList.remove("oculto"); }
function cerrarModal() {
  $("modalProducto").classList.add("oculto");
  $("formProducto").reset();
  imagenNueva = "";
  mostrarVistaPrevia("");
}

function guardarProducto(evento) {
  evento.preventDefault();   // evita que el formulario recargue la página

  const nombre = $("pNombre").value.trim();
  const categoria = $("pCategoria").value.trim();

  // Prioridad de imagen: archivo subido → URL → imagen automática con la inicial
  let imagen = imagenNueva || $("pImagenUrl").value.trim();
  if (!imagen) imagen = crearImagenSVG(nombre.charAt(0).toUpperCase() || "?", "#6366f1", "#ec4899");

  const productos = obtenerProductos();
  productos.push({
    id: "p" + Date.now(),
    nombre,
    precio: parseFloat($("pPrecio").value),
    stock: parseInt($("pStock").value, 10),
    categoria,
    imagen
  });
  guardar(CLAVE_PRODUCTOS, productos);

  cerrarModal();
  actualizarCategorias();
  dibujarCatalogo();
  aviso("Producto agregado ✔", "ok");
}

/* ---------- 5.5 Eventos de la página index ---------- */

function iniciarIndex() {
  cargarProductosIniciales();
  configurarMusica();
  actualizarCategorias();
  dibujarCatalogo();
  dibujarCarrito();

  // Filtros
  $("buscador").addEventListener("input", dibujarCatalogo);
  $("filtroCategoria").addEventListener("change", dibujarCatalogo);

  // Delegación de eventos: un solo "oyente" en el contenedor detecta clics
  // en cualquier botón "Agregar" (incluso los creados dinámicamente).
  $("listaProductos").addEventListener("click", (e) => {
    const id = e.target.dataset.agregar;
    if (id) agregarAlCarrito(id);
  });
  $("itemsCarrito").addEventListener("click", (e) => {
    if (e.target.dataset.mas)   cambiarCantidad(e.target.dataset.mas, 1);
    if (e.target.dataset.menos) cambiarCantidad(e.target.dataset.menos, -1);
  });

  $("btnVaciar").addEventListener("click", () => { carrito = []; dibujarCarrito(); dibujarCatalogo(); });
  $("btnCerrarVenta").addEventListener("click", cerrarVenta);
  $("btnVerVentas").addEventListener("click", () => window.open("ventas.html", "ventanaVentas"));

  // Modal de nuevo producto
  $("btnNuevoProducto").addEventListener("click", abrirModal);
  $("btnCancelarProducto").addEventListener("click", cerrarModal);
  $("formProducto").addEventListener("submit", guardarProducto);
  $("modalProducto").addEventListener("click", (e) => { if (e.target === $("modalProducto")) cerrarModal(); });

  // Vista previa al elegir archivo o pegar URL
  $("pImagen").addEventListener("change", async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;
    try {
      imagenNueva = await procesarImagen(archivo);
      mostrarVistaPrevia(imagenNueva);
    } catch (err) {
      aviso("No se pudo leer la imagen", "error");
    }
  });
  $("pImagenUrl").addEventListener("input", (e) => {
    if (!imagenNueva) mostrarVistaPrevia(e.target.value.trim());
  });
}


/* =====================================================================
   6. PÁGINA VENTAS: LISTA Y DETALLE
===================================================================== */

let ventaSeleccionada = null;   // id de la venta que se está mostrando

// Formatea la fecha ISO a texto legible en español
function fechaLegible(iso) {
  return new Date(iso).toLocaleString("es-BO", { dateStyle: "medium", timeStyle: "short" });
}

function dibujarListaVentas() {
  const ventas = obtenerVentas().slice().reverse();   // la más reciente primero
  const texto = $("buscadorVentas").value.trim().toLowerCase();

  const filtradas = ventas.filter((v) =>
    v.cliente.toLowerCase().includes(texto) || v.id.toLowerCase().includes(texto)
  );

  // Resumen superior (sobre TODAS las ventas, no solo las filtradas)
  const todas = obtenerVentas();
  $("contadorVentas").textContent = filtradas.length + " ventas";
  $("resCantidad").textContent = todas.length;
  $("resMonto").textContent = dinero(todas.reduce((s, v) => s + v.total, 0));

  if (filtradas.length === 0) {
    $("listaVentas").innerHTML = '<p class="vacio">Aún no hay ventas registradas.</p>';
    return;
  }

  $("listaVentas").innerHTML = filtradas.map((v) => `
    <div class="venta-fila ${v.id === ventaSeleccionada ? "activa" : ""}" data-venta="${v.id}">
      <div>
        <strong>${v.id} · ${escapar(v.cliente)}</strong>
        <small>${fechaLegible(v.fecha)} · ${v.items.length} producto(s)</small>
      </div>
      <span class="venta-monto">${dinero(v.total)}</span>
    </div>`).join("");
}

// Muestra el recibo completo de una venta (con imágenes de cada producto)
function mostrarDetalle(id) {
  const venta = obtenerVentas().find((v) => v.id === id);
  if (!venta) return;
  ventaSeleccionada = id;

  const productos = obtenerProductos();

  const filas = venta.items.map((it) => {
    // La imagen se busca en el catálogo actual; si el producto fue borrado, no se muestra
    const prod = productos.find((p) => p.id === it.idProducto);
    const img = prod ? `<img src="${prod.imagen}" alt="">` : "";
    return `
      <tr>
        <td>${img}${escapar(it.nombre)}</td>
        <td class="der">${dinero(it.precio)}</td>
        <td class="der">${it.cantidad}</td>
        <td class="der"><strong>${dinero(it.precio * it.cantidad)}</strong></td>
      </tr>`;
  }).join("");

  $("detalleVenta").innerHTML = `
    <div class="cab-recibo">
      <div>
        <h3>Venta ${venta.id}</h3>
        <div class="meta">
          📅 ${fechaLegible(venta.fecha)}<br>
          👤 Cliente: <strong>${escapar(venta.cliente)}</strong><br>
          💳 Pago: ${escapar(venta.pago)}
        </div>
      </div>
      <div><span class="sello-ok">✔ Completada</span></div>
    </div>

    <table>
      <thead>
        <tr><th>Producto</th><th class="der">Precio</th><th class="der">Cant.</th><th class="der">Importe</th></tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>

    <div class="totales">
      <div><span>Subtotal</span><strong>${dinero(venta.subtotal)}</strong></div>
      <div><span>IVA (13%)</span><strong>${dinero(venta.iva)}</strong></div>
      <div class="total-final"><span>TOTAL</span><strong>${dinero(venta.total)}</strong></div>
    </div>`;

  dibujarListaVentas();   // actualiza cuál fila aparece resaltada
}

function iniciarVentas() {
  dibujarListaVentas();

  // Si la URL trae ?venta=V-0001 (viene de "Cerrar venta"), se abre su detalle
  const id = new URLSearchParams(window.location.search).get("venta");
  if (id) mostrarDetalle(id);
  else {
    const ventas = obtenerVentas();
    if (ventas.length) mostrarDetalle(ventas[ventas.length - 1].id);  // si no, la última
  }

  $("listaVentas").addEventListener("click", (e) => {
    const fila = e.target.closest("[data-venta]");   // closest: sube hasta encontrar la fila
    if (fila) mostrarDetalle(fila.dataset.venta);
  });
  $("buscadorVentas").addEventListener("input", dibujarListaVentas);
  $("btnImprimir").addEventListener("click", () => window.print());

  $("btnBorrarTodo").addEventListener("click", () => {
    if (confirm("¿Seguro que deseas borrar todo el historial de ventas?")) {
      localStorage.removeItem(CLAVE_VENTAS);
      ventaSeleccionada = null;
      $("detalleVenta").innerHTML = '<p class="vacio">Selecciona una venta de la lista para ver sus detalles.</p>';
      dibujarListaVentas();
    }
  });

  // El evento "storage" se dispara cuando OTRA ventana modifica localStorage.
  // Así, esta ventana se actualiza sola cuando se cierra una venta en index.
  window.addEventListener("storage", (e) => {
    if (e.key === CLAVE_VENTAS) {
      dibujarListaVentas();
      const ventas = obtenerVentas();
      if (ventas.length) mostrarDetalle(ventas[ventas.length - 1].id);
    }
  });
}


/* =====================================================================
   7. ARRANQUE
   Se ejecuta cuando el HTML terminó de cargar. Según el atributo
   data-pagina del <body>, se inicia la parte que corresponde.
===================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  const pagina = document.body.dataset.pagina;
  if (pagina === "index")  iniciarIndex();
  if (pagina === "ventas") iniciarVentas();
});
