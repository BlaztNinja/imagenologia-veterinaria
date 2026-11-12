# Imagenología Veterinaria

Sitio del Desafío Práctico II de Desarrollo Web I en la ESEN. GitHub Pages sirve el HTML, CSS y JavaScript. El navegador se conecta a Supabase para consultar datos, iniciar sesión y acceder a las imágenes.

## Configuración del cliente

1. Copia la **Publishable key** de Supabase desde **Settings → API Keys**. Empieza por `sb_publishable_`.
2. Pégala en `SUPABASE_PUBLISHABLE_KEY` en [js/config/supabase.js](js/config/supabase.js). La URL del proyecto ya está definida. La clave publicable se entrega al navegador. Guarda la contraseña de PostgreSQL, las claves secretas y las credenciales de prueba fuera del repositorio.
3. Sirve el proyecto por HTTP para probar los módulos ES en local. Por ejemplo, si tienes Python instalado, ejecuta `python -m http.server 8000` desde la raíz y abre `http://localhost:8000/`.

La [guía de Supabase](supabase/README.md) documenta el esquema, la carga inicial, Storage y las políticas RLS.

## Inicio y acceso

1. Abre `index.html` en una ventana privada. Comprueba que aparezcan la portada, los testimonios y el contacto del pie de página desde Supabase.
2. Entra a **Iniciar sesión** y elige **Continuar como visitante** para volver a Inicio sin registrarte.
3. Inicia sesión con la cuenta de prueba de cliente. Debes volver a Inicio y ver **Cerrar sesión**.
4. Cierra sesión y entra con la cuenta admin. Debes ver **En desarrollo** y poder usar **Volver al inicio**.

## Prueba de conexión

Con la clave configurada, abre una página de la raíz del sitio, como `index.html`, en una ventana privada. Pega en la consola del navegador:

```js
const { listarServiciosPublicos } = await import("./js/datos/servicios.js");
console.table(await listarServiciosPublicos());
```

Deberías ver los servicios activos. Con los datos iniciales son tres. Si obtienes un error, revisa la URL del proyecto, la clave publicable y los permisos de lectura de la tabla `servicios`.

## Estructura para las próximas funciones

- `js/config/supabase.js` crea un cliente compartido para la API, Auth y Storage. Las páginas del mismo sitio usan ese cliente para compartir la sesión.
- `js/datos/` contiene las consultas. `servicios.js` incluye la primera consulta de lectura. Los próximos módulos podrán agrupar contenido, autenticación, equipo, contacto y solicitudes por entidad.
- Los módulos de interfaz vivirán en `js/<pagina>.js` y se cargarán con `<script type="module">`. Importarán las operaciones de datos y mostrarán los estados de carga, vacío, éxito y error.
- `admin/` será el punto de entrada del backoffice. Las pantallas usarán el cliente compartido y consultarán el perfil para decidir qué interfaz mostrar. Las políticas RLS aplican los permisos en Supabase.

Usa rutas relativas para conservar el prefijo del repositorio en GitHub Pages. Por ejemplo, `./js/servicios.js` desde una página pública y `../js/config/supabase.js` desde un módulo en la raíz de `admin/`.

## Orden de integración

1. Conectar el catálogo y el resto de páginas públicas a Supabase.
2. Implementar el registro y el envío de solicitudes desde `contacto.html`.
3. Crear el backoffice para contenido, equipo, servicios, imágenes y revisión de solicitudes. El equipo será la entidad para demostrar el CRUD completo.
