# CONVENCIONES DEL REPOSITORIO — Imagenología Veterinaria

Sitio estático (HTML + CSS, sin build, sin framework). Este documento fija las convenciones observadas en el repo y marca dónde el código actual **no las cumple**.

- **Alcance analizado:** `index.html`, `quienSomos.html`, `servicios.html`, `contacto.html`, `css/estilo_home.css`, `css/estilo_quienSomos.css`, `css/estilo_servicios.css`, `css/estilo_contacto.css`, `.gitattributes`.
- **No analizado:** carpeta `img/` (solo se ven las rutas referenciadas).
- **Leyenda de prioridad:** **P1** = rompe algo o contradice contenido · **P2** = inconsistencia que complica mantener · **P3** = pulido.

---

## 1. Estructura de archivos

```
/
├── index.html
├── quienSomos.html
├── servicios.html
├── contacto.html
├── css/
│   ├── estilo_<pagina>.css
│   └── ...
├── img/
└── .gitattributes        (* text=auto → fin de línea LF)
```

| Regla | Detalle |
|---|---|
| Un HTML por página en la raíz | Enlaces entre páginas **relativos**, sin `/` inicial. |
| Un CSS por página | Nombre: `estilo_<pagina>.css`. |
| Imágenes en `img/` | Nombres en **kebab-case**, descriptivos (`logo-imagenologia-veterinaria.png`, `diagnostico-por-imagen.webp`). Preferir `.webp` para fotos. |
| Sin JS externo por ahora | El único script es inline en `contacto.html`. Si crece, mover a `js/<pagina>.js`. |

### Discrepancias

| P | Dónde | Problema | Corrección |
|---|---|---|---|
| P2 | `quienSomos.html` | Es el único HTML en camelCase; el resto va en minúsculas. | Renombrar a `quienes-somos.html` (actualizar enlaces en las 4 páginas) o fijar camelCase como regla y documentarlo. |
| P2 | `img/owie.jpg` | Nombre no descriptivo; el comentario del HTML aún dice `img/nosotros.jpg`. | Renombrar a `nosotros-equipo.jpg` y eliminar el comentario. |
| P2 | `index.html` (hero), `quienSomos.html` (equipo) | Imágenes remotas (Unsplash y un proxy de DuckDuckGo). Se rompen si el origen cambia. | Descargar a `img/` y referenciar local. Mantener `onerror` solo si hay respaldo local. |

---

## 2. HTML

### 2.1 Esqueleto de página

1. `<!DOCTYPE html>` + `<html lang="es">`.
2. `<head>`: charset, viewport, `<title>`, preconnect de Google Fonts, fuentes (**Montserrat** + **Open Sans**), Font Awesome 6.4.0 (cdnjs), CSS propio.
3. `<header class="navbar">` (idéntico en todas las páginas).
4. Contenido en `<section>` (o `<main>`).
5. `<footer class="footer">` (idéntico en todas las páginas).

### 2.2 Título (`<title>`)

Formato: `Página - Imagenología Veterinaria`. La portada puede usar el lema.

### 2.3 Estructura de sección

```html
<section id="slug-en-español" class="section-padding [section-navy]">
  <div class="container">
    <div class="section-header">
      <span class="section-subtitle">…</span>
      <h2 class="section-title">…</h2>
      <p class="section-description">…</p>
    </div>
    …
  </div>
</section>
```

- Fondos alternados: `section-navy` en secciones pares.
- `id` en minúsculas, kebab-case, **en español** (`inicio`, `testimonios`, `nosotros`, `mision-vision`, `equipo`, `servicios`, `contacto`).

### 2.4 Navegación

- Orden: Inicio · Quiénes somos · Servicios · Contacto · botón **Agendar Cita**.
- El enlace a la **página actual** apunta a su ancla (`#inicio`, `#nosotros`, `#servicios`, `#contacto`); los demás, al archivo.
- Menú móvil con patrón checkbox (`#menu-toggle`) + `<label class="hamburger">`, sin JS.

### 2.5 Enlaces externos

- WhatsApp: `https://wa.me/50377222775` con `target="_blank"`. El botón de cita lleva `?text=` ya codificado (`%20`, `%C3%AD`).
- Teléfono visible: `+503 7722 2775`. Correo: `ecografia@imagenologiaveterinaria.com`.

### 2.6 Estilo de código

- Indentación de **4 espacios**. Atributos con comillas dobles.
- Comentarios en español, en mayúsculas para bloques: `<!-- SECCIÓN TESTIMONIOS -->`.

### 2.7 Jerarquía de encabezados

- **Un solo `<h1>` por página**, el primero visible. Siguientes secciones: `<h2>`; subelementos: `<h3>`/`<h4>`.
- Usar `<main>` envolviendo el contenido entre header y footer.

### Discrepancias

| P | Dónde | Problema | Corrección |
|---|---|---|---|
| **P1** | `servicios.html` | `lang="en"` en una página en español. | `lang="es"`. |
| **P1** | `servicios.html` (footer) | Logo con `href="#inicio"`, pero no existe ese `id` en la página. | `href="index.html"`. |
| **P1** | `servicios.html` ↔ `contacto.html` ↔ `servicios.html` | Contradicción de contenido: contacto dice que el estudio es **a domicilio**; requisitos dice que el afeitado se hace **"en la clínica"**; el hero habla de "cada consulta". | Definir el modelo de servicio y unificar los tres textos. |
| P2 | `servicios.html` | Dos `<h1>`: "Servicios" y "Requisitos del paciente". | El segundo pasa a `<h2 class="section-title">`. |
| P2 | `quienSomos.html` | No tiene `<h1>`; el título de la página es un `<h2>`. | Cambiar "Quiénes Somos" a `<h1 class="section-title">`. |
| P2 | `index.html`, `quienSomos.html`, `servicios.html` | Sin `<main>`; solo `contacto.html` lo usa. | Envolver el contenido en `<main>` en las 4 páginas. |
| P2 | `servicios.html` | Precios dentro de `<h3>$35</h3>`: no es un encabezado. | `<p class="servicio-precio">$35</p>` y darle estilo. |
| P2 | `<title>` de `servicios.html` y `quienSomos.html` | `servicios.html` = "Servicios" (sin marca); `quienSomos.html` = "Nosotros" (el menú dice "Quiénes somos"); `index.html` invierte el orden. | `Servicios - Imagenología Veterinaria`, `Quiénes somos - Imagenología Veterinaria`. |
| P2 | Teléfono en footers | `index`, `quienSomos`, `servicios`: `77222775`; `contacto`: `+503 7722 2775`. | Usar siempre `+503 7722 2775`. |
| P2 | Nav y footer, todas las páginas | "Quienes somos" / "Quienes Somos" sin tilde; "Contactenos" sin tilde y distinto del "Contacto" del menú. | "Quiénes somos" y "Contacto" en ambos lugares. |
| P3 | Logo (4 páginas) | `IMAGENOLOGIA` sin tilde mientras el resto del texto usa "Imagenología". | Decidir: con tilde (`IMAGENOLOGÍA`) o documentar que el logotipo va sin ella. |
| P3 | `servicios.html` | "ultrasonido abdominal" en minúscula; "toracico" sin tilde; "Cardiaco y vascular" con mayúscula interna; "guian" en `quienSomos.html` (→ "guían"). | Capitalizar solo la primera letra del título; revisar ortografía. |
| P3 | `contacto.html` | "Martes: de 8:30 AM - 5:00 PM" (sobra "de"). | Igualar formato con los otros días. |
| P3 | `quienSomos.html` | Bloque `mvv-grid` sin sangrar; comentarios "FOTOS DE PLACEHOLDER!!!!" y "Fila 1" quedaron como notas internas. | Re-indentar y limpiar comentarios. |
| P3 | `servicios.html` | Sin comentarios de sección (el resto sí). | Añadir `<!-- SECCIÓN SERVICIOS -->`, `<!-- REQUISITOS -->`. |
| P3 | Todas | Falta `<meta name="description">` y favicon. | Añadir en cada `<head>`. |
| P3 | Enlaces con `target="_blank"` | Sin `rel="noopener noreferrer"` (el script de contacto sí lo usa en `window.open`). | Añadir `rel`. |
| P3 | Botón hamburguesa | `<label>` sin nombre accesible. | `aria-label="Abrir menú"`. |

---

## 3. CSS

### 3.1 Arquitectura (convención vigente en la práctica)

Cada hoja lleva, en este orden:

1. Cabecera con nombre del archivo e **índice numerado**.
2. Variables (`:root`).
3. Reinicio global y base.
4. Contenedor y utilidades.
5. Botones.
6. Navbar.
7. Bloques propios de la página.
8. Footer.
9. Filtros de escala (responsive).

Los separadores son `/* ===== N. TÍTULO ===== */`.

### 3.2 Variables

- Todas en `:root`, en **español**, formato `--categoria-parte-propósito`:
  `--color-fondo-*`, `--color-borde-*`, `--color-acento-*`, `--color-texto-*`, `--fuente-*`, `--tamano-*`, `--relleno-*`, `--espacio-*`, `--radio-borde-*`, `--transicion-*`.
- **Regla:** ningún color, fuente o radio se escribe a mano si ya existe variable.

### 3.3 Nomenclatura de clases

- **kebab-case**, sin ids para estilos.
- **Componentes base compartidos** (heredados, no renombrar): `navbar`, `nav-link`, `btn*`, `container`, `section-*`, `footer-*`.
- **Bloques nuevos de página:** en español, `bloque-elemento` (`servicio-card`, `servicios-grid`).
- Tarjetas siempre con sufijo `-card`.

### 3.4 Unidades y layout

- `rem` para tamaños y espacios; `clamp()` para valores fluidos; `px` solo para bordes, `letter-spacing` y tamaños fijos de imagen/avatar.
- Grillas con CSS Grid y `minmax(0, …)`; `flex` solo para filas simples.
- Breakpoints estándar (de mayor a menor): `2200`, `1600–2199`, `1100`, `992` (hamburguesa), `768`, `576`, `380`, altura `520` landscape, `hover: none`, `prefers-reduced-motion`.
- Footer de **3 columnas**: `1.5fr 1fr 1.2fr` → 2 columnas a ≤992 → 1 a ≤576.

### Discrepancias

| P | Dónde | Problema | Corrección |
|---|---|---|---|
| **P1** | `estilo_home.css` ↔ `index.html` | El footer define **4 columnas** pero el HTML tiene 3 bloques: queda una columna vacía y el reparto es distinto al resto de páginas. | `grid-template-columns: minmax(0,1.5fr) minmax(0,1fr) minmax(0,1.2fr)`. |
| **P1/P2** | Las 4 hojas | **Base duplicada**: variables, reset, navbar, botones y footer se copian en `estilo_home`, `estilo_quienSomos` y `estilo_servicios`. Cambiar un color implica editar 3 archivos; ya hay derivas (ver abajo). `contacto` en cambio carga `estilo_home.css` + la suya. | Extraer `css/base.css` (secciones 1–5, footer y filtros comunes) y dejar `estilo_<pagina>.css` solo con lo específico. Cada HTML carga `base.css` + su hoja. Es la corrección que más reduce el resto de discrepancias. |
| P2 | `estilo_contacto.css` | Colores y fuentes en **hex/literal** (`#0f1942`, `#1e2d66`, `'Montserrat'`…) pese a existir variables. | Reemplazar por `var(--color-fondo-tarjeta)`, `var(--color-borde-tarjeta)`, `var(--fuente-titulos)`, etc. |
| P2 | `estilo_contacto.css` | `.contacto-whatsapp` reimplementa el botón verde que ya es `.btn.btn-whatsapp`. | Usar las clases del botón en el HTML y borrar la regla. |
| P2 | `estilo_contacto.css` | Sin cabecera ni índice; comentario inicial `/* Contacto */`; espaciado propio (`padding: 4rem 0 3rem`) en lugar de `.section-padding`. | Añadir cabecera/índice y usar `section-padding`. |
| P2 | `estilo_servicios.css` | Sin cabecera ni índice; la numeración salta de 5 a 8; `SERVICIOS` y `requirements` sin número y con estilos de comentario distintos (`/*---- requirements ----*/`). `requirements` repite el `clamp()` de `.section-padding`. | Cabecera + índice, numeración continua, usar `section-padding`. |
| P2 | Nombre de bloque `requirements` / `.lista` / `.sublista` | `requirements` en inglés (bloque nuevo, debería ser español); `lista`/`sublista` demasiado genéricos. | `requisitos`, `requisitos-lista`, `requisitos-sublista`. |
| P2 | Footer-grid | Tres valores distintos: home `…1.2fr` (4 col), servicios `1.5/1/1`, quienSomos y contacto `1.5/1/1.2`. | Unificar en `base.css`. |
| P2 | `estilo_servicios.css` | Falta el breakpoint `768` (`.footer-bottom` en columna) que sí tienen `home` y `quienSomos`. | Se resuelve con `base.css`. |
| P3 | `estilo_home.css`, `estilo_servicios.css` | Regla huérfana `.logo-icon svg` (el logo es `<img>`). `estilo_quienSomos.css` ya no la tiene. | Eliminar. |
| P3 | `estilo_quienSomos.css` | Nota de edición sobrante: `/* Después (3 columnas, coincide con el HTML) */`. | Eliminar. |
| P3 | `.servicio-card:hover`, `.mvv-card:hover` | Usan `--color-fondo-insignia-hero` como color de sombra (nombre semántico incorrecto). | Crear `--color-sombra-tarjeta-hover`. |
| P3 | `.servicios` | El degradado del fondo usa `rgba(3, 11, 48, …)` a mano. | Variable `--color-fondo-pagina-rgb` o variable de overlay. |
| P3 | Hover de tarjetas | `translateY` de -2, -4 y -5 px; `mvv-card` usa transición explícita en vez de `--transicion-estandar`. | Un valor único por componente tipo tarjeta. |
| P3 | `.servicios-grid` | Usa `flex-wrap` mientras el resto de grillas de tarjetas usa Grid. | Pasar a `grid` con `repeat(auto-fit, minmax(16rem,1fr))`. |
| P3 | `.team-grid` | 3 columnas fijas con una sola tarjeta: queda a la izquierda. | `auto-fit` o centrar mientras haya pocas tarjetas. |
| P3 | Variables sin uso | `--color-acento-turquesa`, `.btn-full`, `.section-desc-space(-sm)` en varias hojas. | Mantener solo si se prevé uso; si no, borrar. |
| P3 | Llaves | `.servicios{`, `.logo-icon > img{` sin espacio antes de `{`. | `selector {`. |

---

## 4. JavaScript (solo `contacto.html`)

Convención actual del único script:

- Inline al final del `<body>`, `addEventListener("submit", …)` con `preventDefault()`.
- Variables en español (`datos`, `mensaje`, `evento`), comillas dobles.
- El formulario no envía a servidor: arma un mensaje y abre WhatsApp con `encodeURIComponent`.

| P | Problema | Corrección |
|---|---|---|
| P2 | Usa `var` y `function`. | `const` / `let` y funciones flecha en código nuevo. |
| P2 | El número `50377222775` está duplicado en HTML y JS. | Constante única al inicio del script o `data-whatsapp` en el `<form>`. |
| P3 | Script inline. | Mover a `js/contacto.js` cuando se agregue más lógica. |

---

## 5. Contenido y tono

| Regla | Detalle |
|---|---|
| Idioma | Español, con **tilde completa** en menús, títulos y marca. |
| Trato | **Tuteo** ("tu mascota", "contáctanos", "cuéntanos"). |
| Terminología | "Ecografía" / "ultrasonido" se usan indistintamente; elegir uno como principal y el otro como sinónimo en la descripción. |
| Moneda | `$` + número sin decimales (`$35`). |

| P | Dónde | Problema | Corrección |
|---|---|---|---|
| P2 | `servicios.html` (requisitos) | Usa **usted** ("consulte con nosotros", "Siga las instrucciones", "proporcione"). | Pasar a tuteo: "consúltanos", "sigue", "proporciona". |
| P2 | `index.html` (testimonios), `quienSomos.html` (equipo) | Testimonios, nombres y trayectoria ("más de 15 años") parecen de ejemplo. | Confirmar que son reales/autorizados o marcarlos como provisionales antes de publicar. |

---

## 6. Lista de verificación antes de cada commit

- [ ] `lang="es"`, `<title>` con el formato `Página - Imagenología Veterinaria`.
- [ ] Un solo `<h1>`, contenido dentro de `<main>`.
- [ ] Nav y footer idénticos al resto de páginas (mismos textos, tildes y teléfono).
- [ ] Ningún color, fuente o radio escrito a mano: se usa `var(--…)`.
- [ ] Clases nuevas en kebab-case y en español (salvo componentes base).
- [ ] Imágenes locales en `img/`, nombre kebab-case, `alt` descriptivo (en el equipo, el nombre de la persona, no "Miembro del equipo").
- [ ] Probado en ≤992 px (hamburguesa), ≤576 px y ≥1600 px.
- [ ] Sin comentarios de trabajo pendientes ni notas de edición.

---

## 7. Orden sugerido de corrección

1. **P1:** `lang` de `servicios.html`, enlace `#inicio` roto, footer de 4 columnas en `estilo_home.css`, contradicción domicilio/clínica.
2. **Extraer `css/base.css`** y migrar las 4 páginas (elimina la mayoría de P2 de CSS).
3. Normalizar nav/footer/teléfono/tildes en los 4 HTML.
4. Semántica: `<main>`, un `<h1>`, precios fuera de `<h3>`.
5. Pulido P3.
