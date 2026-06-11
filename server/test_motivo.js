import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    const { data, error } = await supabase.from('consultas generales').select('*').limit(5);
    console.log("consultas generales data:");
    console.dir(data, {depth: null});
}
test();
