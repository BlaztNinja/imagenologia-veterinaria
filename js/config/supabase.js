import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm";

const SUPABASE_URL = "https://ituezaeezarpeqvzgtax.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_LpzIisY7Mxc0DHBNR52lYw_4jfooirU";

let cliente;

export function obtenerSupabase() {
    if (!SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_")) {
        throw new Error("Configura la Publishable key en js/config/supabase.js.");
    }

    cliente ??= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    return cliente;
}
