import { supabase } from "../config/supabase.js";

const BUCKET = "imagenologia";
const LIMITE = 5 * 1024 * 1024;
const FORMATOS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
// Foto que ya utiliza la tarjeta original de Quiénes somos mientras no hay foto_ruta.
export const FOTO_EQUIPO_ORIGINAL = "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fst2.depositphotos.com%2F3261171%2F8636%2Fi%2F950%2Fdepositphotos_86366336-stock-photo-professional-vet-examining-a-dog.jpg&f=1&nofb=1&ipt=b9f4f6c5e6346dc2df66d7cc5902d121434c201064960f9b4d321b1f1e60539c&ipo=images";
const ESPACIOS = {
    "inicio.imagen": { nombre: "Portada de Inicio", uso: "Imagen principal de Inicio", carpeta: "inicio", respaldo: "diagnostico-por-imagen.webp" },
    "equipo.imagen": { nombre: "Quiénes somos", uso: "Imagen de presentación de la clínica", carpeta: "equipo", respaldo: "owie.jpg" },
    "sitio.logo": { nombre: "Logotipo", uso: "Encabezado del sitio y del backoffice", carpeta: "sitio", respaldo: "logo-imagenologia-veterinaria.png" }
};

export function urlImagen(ruta) {
    return ruta ? supabase.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl : "";
}

function respaldo(archivo) {
    return new URL(`../../img/${archivo}`, import.meta.url).href;
}

export async function listarEquipoPublico() {
    const { data, error } = await supabase.from("equipo")
        .select("id, nombre, cargo, descripcion, foto_ruta").order("orden").order("id");
    if (error) throw new Error("No se pudieron cargar las fotos del equipo.");
    return data ?? [];
}

export async function leerImagenesSitio(claves) {
    const { data, error } = await supabase.from("contenido_sitio")
        .select("clave, imagen_ruta").in("clave", claves);
    if (error) throw new Error("No se pudieron cargar las imágenes del sitio.");
    return data ?? [];
}

export async function listarImagenes() {
    const [bloques, equipo] = await Promise.all([
        leerImagenesSitio(Object.keys(ESPACIOS)), listarEquipoPublico()
    ]);
    return [
        ...Object.entries(ESPACIOS).map(([clave, espacio]) => {
            const bloque = bloques.find((fila) => fila.clave === clave);
            return { ...espacio, id: clave, tipo: "contenido", ruta: bloque?.imagen_ruta ?? null,
                disponible: Boolean(bloque?.imagen_ruta), respaldo: respaldo(espacio.respaldo) };
        }),
        ...equipo.map((persona) => ({ id: persona.id, tipo: "equipo", nombre: persona.nombre,
            uso: "Foto en Nuestro equipo · Quiénes somos", carpeta: "equipo", ruta: persona.foto_ruta,
            disponible: true, respaldo: FOTO_EQUIPO_ORIGINAL }))
    ];
}

export async function validarArchivoImagen(archivo) {
    if (!archivo || !FORMATOS[archivo.type]) throw new Error("Selecciona una imagen JPEG, PNG o WebP.");
    if (!archivo.size || archivo.size > LIMITE) throw new Error("La imagen debe pesar como máximo 5 MB y no estar vacía.");
    const bytes = new Uint8Array(await archivo.slice(0, 12).arrayBuffer());
    const texto = (inicio, fin) => String.fromCharCode(...bytes.slice(inicio, fin));
    const valido = archivo.type === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : archivo.type === "image/png" ? [137, 80, 78, 71, 13, 10, 26, 10].every((valor, i) => bytes[i] === valor)
            : texto(0, 4) === "RIFF" && texto(8, 12) === "WEBP";
    if (!valido) throw new Error("El archivo no corresponde a una imagen del formato indicado.");
}

export async function guardarImagen(registro, archivo) {
    await validarArchivoImagen(archivo);
    const espacio = registro.tipo === "contenido" ? ESPACIOS[registro.id] : null;
    if ((!espacio && registro.tipo !== "equipo") || !registro.id || !registro.disponible) {
        throw new Error("Esta imagen no está configurada para editarse.");
    }
    const carpeta = espacio?.carpeta ?? "equipo";
    // Una ruta nueva evita imágenes antiguas en caché y conserva el archivo anterior.
    const ruta = `${carpeta}/${crypto.randomUUID()}.${FORMATOS[archivo.type]}`;
    const { error: errorCarga } = await supabase.storage.from(BUCKET).upload(ruta, archivo, {
        contentType: archivo.type, cacheControl: "3600", upsert: false
    });
    if (errorCarga) throw new Error("No se pudo subir la imagen. Revisa tu conexión, el tamaño permitido y los permisos de Storage.");

    const esEquipo = registro.tipo === "equipo";
    const campo = esEquipo ? "foto_ruta" : "imagen_ruta";
    let consulta = supabase.from(esEquipo ? "equipo" : "contenido_sitio")
        .update({ [campo]: ruta }).eq(esEquipo ? "id" : "clave", registro.id);
    consulta = registro.ruta == null ? consulta.is(campo, null) : consulta.eq(campo, registro.ruta);
    const { data, error } = await consulta.select(esEquipo ? "id" : "clave").maybeSingle();
    // Ante una respuesta incierta no se borra el archivo: el guardado pudo completarse.
    if (error) throw new Error("La imagen se subió, pero no se pudo confirmar su guardado. Recarga las imágenes antes de reintentar.");
    if (!data) throw new Error("La imagen cambió en otra sesión o no tienes permiso para editarla. Recarga las imágenes.");
    return { ...registro, ruta };
}
