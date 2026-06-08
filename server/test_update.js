import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    console.log('Testing Supabase PUT');
    const affId = "5"; // string id to test implicit cast
    const status = "contactado";
    const { data, error } = await supabase
        .from('afiliados_interesados')
        .update({ crm_status: status })
        .eq('id', affId)
        .select();

    if (error) console.error('Error:', error.message);
    else console.log('Success:', data);
}
test();
