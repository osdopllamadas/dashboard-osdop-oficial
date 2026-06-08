import fetch from 'node-fetch';

async function test() {
    try {
        console.log('Testing PUT');
        const res = await fetch('http://localhost:3001/api/affiliations/5/status', {
            method: 'PUT',
            headers: { 
                'Authorization': 'Bearer test',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'contactado' })
        });
        console.log('PUT status:', res.status);
        console.log('Response:', await res.text());
    } catch (e) {
        console.error(e);
    }
}
test();
