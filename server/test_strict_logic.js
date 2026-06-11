require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testLogic() {
    console.log('Fetching consultas generales...');
    const { data, error } = await supabase.from('consultas generales').select('*').limit(50);
    
    if (error) {
        console.error('Supabase error:', error);
        return;
    }
    
    console.log(`\n=== STRICT LOGIC TEST (${data.length} records) ===\n`);
    
    let originalExitosas = 0;
    let strictExitosas = 0;

    data.forEach(d => {
        const estado = (d['estado de la llamada'] || '').toLowerCase();
        const motivoFin = (d['motivo de finalizacion'] || '').toLowerCase();
        
        const noTransferida = estado !== 'derivada' && !motivoFin.includes('transferid');
        const noCortada = !motivoFin.includes('corte') && !motivoFin.includes('colgó');
        const esExitosa = estado === 'exitosa' || motivoFin.includes('resuelt') || motivoFin.includes('satisfech');
        
        let estadoEstricto = d['estado de la llamada'];
        
        if (estado === 'exitosa') {
            originalExitosas++;
            if (!noTransferida || !noCortada || !esExitosa) {
                if (!noTransferida) estadoEstricto = 'Derivada';
                else if (!noCortada) estadoEstricto = 'Fallida (Corte)';
                else estadoEstricto = 'Fallida';
            } else {
                strictExitosas++;
            }
        }
        
        // Print if it was modified
        if (estadoEstricto !== d['estado de la llamada']) {
            console.log(`[MODIFIED] Motivo Fin: "${d['motivo de finalizacion']}"`);
            console.log(`   Original: ${d['estado de la llamada']} -> New: ${estadoEstricto}\n`);
        }
    });

    console.log('--- SUMMARY ---');
    console.log(`Original Exitosas: ${originalExitosas}`);
    console.log(`Strict Exitosas: ${strictExitosas}`);
}

testLogic();
