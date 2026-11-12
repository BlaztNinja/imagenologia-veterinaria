import { createClient } from
    "https://esm.sh/@supabase/supabase-js@2.57.4";

const SUPABASE_URL = "https://TU-PROYECTO.supabase.co";
const SUPABASE_PUBLIC_KEY = "TU-CLAVE-PUBLICA";

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLIC_KEY
);

//porfa no dejen esto como esta ahorita lol