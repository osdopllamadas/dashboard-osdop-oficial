import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    console.log('Testing select *');
    const { data, error } = await supabase.from('afiliados_interesados').select('*');
    if (error) console.error('Error 1:', error.message);
    else console.log('Success 1:', data.length);

    console.log('Testing with eq');
    const { data: d2, error: e2 } = await supabase.from('afiliados_interesados').select('*').eq('crm_status', 'pendiente');
    if (e2) console.error('Error 2:', e2.message);
    else console.log('Success 2:', d2.length);
}
test();
