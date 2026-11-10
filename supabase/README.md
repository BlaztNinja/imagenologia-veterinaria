# Configuración de Supabase

Esta guía parte del sitio del Desafío I. Los dos archivos SQL se ejecutan una vez, en orden, desde **SQL Editor** de un proyecto de Supabase preparado para Imagenología Veterinaria. Ambos usan transacciones. Si una sentencia falla, revisa el error antes de volver a ejecutar el archivo.

## 1. Qué sale del sitio actual

| Archivo | Datos que se migran |
| --- | --- |
| `index.html` | Título, descripción, tarjeta de resultados, subtítulo bajo «Resultados Inmediatos» y tres testimonios. |
| `quienSomos.html` | Presentación, misión, visión, valores y el perfil de Juan Antonio Duarte. |
| `servicios.html` | Ultrasonido abdominal (USD 35), ecografía gestacional (USD 25), ultrasonido de urgencia (USD 25), detalles y requisitos. La página actual no lista radiografías. |
| `contacto.html` | Teléfono, correo y tres horarios. El formulario actual abre WhatsApp con nombre, teléfono, correo y motivo. En la integración, añadiremos un selector de servicio y enviaremos esos datos a Supabase. |
| Footer | Descripción y lema. Teléfono, correo y horarios se podrán leer de la misma fila que usa Contacto. |

El HTML agrupa vejiga llena, afeitado e historial clínico como indicaciones generales. El script las asocia a los tres servicios y conserva el ayuno de 8 a 12 horas únicamente en el abdominal. La indicación para los otros dos es consultar. Revisa estas asociaciones con la persona encargada antes de publicar.

La portada actual usa una foto externa. Para que el contenido inicial pueda alojarse en el bucket con archivos del repo, el script apunta a `img/diagnostico-por-imagen.webp` como sustituto. `img/owie.jpg` es la imagen de la sección Quiénes Somos. La foto individual del integrante es provisional en el HTML y se deja vacía en la base hasta tener la definitiva.

## 2. Crear el esquema y cargar los datos

1. En Supabase, crea el proyecto o abre el proyecto dedicado a la materia. Verifica que la Data API esté habilitada y exponga `public`. El esquema `privado` se queda fuera de los esquemas expuestos.
2. Ejecuta [esquema.sql](esquema.sql) en SQL Editor. Crea siete tablas, restricciones, índices, el trigger de alta de perfiles y las políticas RLS. Confirma que aparezcan las tablas en Table Editor.
3. En **Storage**, crea un bucket público con ID `imagenologia`. Si configuras restricciones, usa JPEG, PNG y WebP y, por ejemplo, un límite de 5 MB por archivo. Crea las carpetas y sube los archivos en estas rutas exactas.

   | Archivo local | Ruta del objeto dentro del bucket |
   | --- | --- |
   | `img/diagnostico-por-imagen.webp` | `inicio/diagnostico-por-imagen.webp` |
   | `img/owie.jpg` | `equipo/owie.jpg` |
   | `img/logo-imagenologia-veterinaria.png` | `sitio/logo-imagenologia-veterinaria.png` |

4. Ejecuta [datos_iniciales.sql](datos_iniciales.sql). Comprueba que hay tres servicios, doce requisitos, un integrante y una fila de contacto. Abre la URL pública de la portada en una ventana privada. Cuando tengas la foto definitiva, súbela a `equipo/` y copia la ruta relativa en `equipo.foto_ruta` del integrante.

La base guarda rutas relativas. El navegador podrá construir la URL pública a partir del bucket y la ruta. La política de Storage permite que un administrador cargue, reemplace y borre objetos en las tres carpetas. Las imágenes de ese bucket se sirven públicamente por URL.

### Cómo se relacionan las tablas

- `contenido_sitio` guarda un bloque por clave, con texto o ruta de imagen. La clave es el identificador que usará JavaScript para localizar cada bloque.
- `equipo` guarda un integrante por fila. Es la entidad para demostrar el CRUD completo. `orden` permite controlar la posición de la tarjeta.
- `servicios` guarda el precio en USD y los detalles como lista. `requisitos_servicio.servicio_id` permite asociar varios requisitos a un servicio. Al desactivar un servicio, sus requisitos también dejan de aparecer en consultas públicas.
- `datos_contacto` tiene ID fijo `1` para compartir la misma información entre Contacto y el footer.
- `solicitudes` relaciona el servicio elegido y el usuario autenticado. Se conserva el historial de solicitudes. Un servicio que ya tiene solicitudes se puede ocultar mediante `activo = false`. La clave foránea impide su eliminación física.
- `perfiles.id` coincide con el UUID de Supabase Auth. Al crear una cuenta, el trigger crea el perfil como `usuario`. Los perfiles de las cuentas que ya existían también se inicializan como `usuario`.

## 3. Configurar Auth y verificar los permisos

Habilita el proveedor de correo y contraseña y el registro por correo. Mantén desactivado el inicio anónimo. Para probar permisos ahora, crea dos cuentas de prueba confirmadas en **Authentication → Users**. Copia el UUID de la cuenta encargada y ejecuta en SQL Editor:

```sql
update public.perfiles
set rol = 'admin'
where id = 'PEGA_AQUI_EL_UUID'::uuid
returning id, rol;
```

La consulta debe devolver una fila con rol `admin`. La segunda cuenta conserva `usuario`. El navegador usará la clave publicable y, al iniciar sesión, el token de la cuenta. La asignación de roles se hace desde el panel. Guarda las credenciales de prueba para Moodle.

| Acción | Visitante | Usuario | Admin |
| --- | --- | --- | --- |
| Leer contenido, equipo y contacto | Sí | Sí | Sí |
| Ver servicios inactivos y sus requisitos | No | No | Sí |
| Crear solicitud para un servicio activo | No | Sí | Sí |
| Leer solicitudes o cambiar su estado | No | No | Sí |
| Editar contenido o gestionar equipo, servicios e imágenes | No | No | Sí |
| Cambiar el rol propio desde el sitio | No | No | No |

### Prueba rápida desde SQL Editor

Las consultas normales del editor se ejecutan con privilegios del panel. Para probar las políticas, simula el rol del navegador dentro de una transacción. Ejecuta el bloque primero como está y luego cambia el rol a `authenticated` y la cadena JSON a `{"sub":"UUID_REAL_DE_LA_CUENTA","role":"authenticated","is_anonymous":false}`. Repite para las dos cuentas.

```sql
begin;
-- Crea temporalmente un caso que solo el admin debería poder leer.
update public.servicios set activo = false where nombre = 'Ultrasonido de urgencia';

set local role anon;
select set_config('request.jwt.claims', '{}', true);

select nombre, activo from public.servicios order by orden;
select count(*) as requisitos_visibles from public.requisitos_servicio;

rollback;
```

El visitante y el usuario deben ver dos servicios y ocho requisitos. El admin debe ver tres servicios y doce requisitos. El `rollback` revierte la desactivación.

### Pruebas de escritura y Storage

Con la Data API, usa la clave publicable y el token de la cuenta que estés probando. Para un visitante, usa solo la clave publicable. Ejecuta cada caso con datos ficticios y registra el resultado. Una actualización filtrada por RLS puede afectar cero filas sin devolver error. Comprueba el resultado leyendo la fila con la cuenta admin.

1. Intenta insertar en `solicitudes` enviando solo `servicio_id`, `nombre`, `telefono`, `correo` y `motivo`. Prueba con visitante, usuario y admin. Las cuentas autenticadas pueden enviar para un servicio activo y la fila debe guardarse con el UUID de la sesión y estado `nueva`. Usa una inserción sin solicitar la representación de la fila, porque el usuario común carece de permiso de lectura. Prueba también un ID de servicio inactivo y un correo inválido. Ambos deben rechazarse.
2. Intenta enviar `estado = 'atendida'` o el UUID de otra persona al crear una solicitud. Deben rechazarse por permisos de columna. Consulta y marca una solicitud como `atendida` con el admin. Repite la lectura y actualización con el usuario común y verifica que no puede ver la fila ni cambiarla.
3. Intenta actualizar `perfiles.rol` de la cuenta común con su propio token. Debe rechazarse. Con admin, crea, lee, actualiza y elimina un integrante ficticio. Repite las operaciones de escritura con el usuario y comprueba que no cambian los datos.
4. Desde la API de Storage, intenta cargar un archivo en `equipo/prueba.webp` con el usuario y el admin. Solo el admin debe poder cargarlo, reemplazarlo y borrarlo. Tras cargarlo, abre su URL pública en una ventana privada. Elimina el archivo de prueba con el admin.
5. Revisa **Database Advisors** y verifica que las siete tablas del sitio tengan RLS habilitada. Al conectar el sitio, vuelve a probar el registro, inicio y cierre de sesión con el formulario real.

Los permisos de tabla y columna definen qué operaciones puede pedir cada cliente. Las políticas RLS definen a qué filas se aplican. La función `privado.es_admin()` consulta el perfil propio permitido por RLS, y el trigger de registro es la pieza con permisos elevados para crear el perfil inicial. El acceso al backoffice se defenderá con estas reglas aunque alguien navegue directamente a `admin/`.

Referencias oficiales

- [Supabase Auth y perfiles](https://supabase.com/docs/guides/auth/managing-user-data)
- [Permisos de la Data API](https://supabase.com/docs/guides/api/securing-your-api)
- [Políticas RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Políticas de Storage](https://supabase.com/docs/guides/storage/security/access-control)
