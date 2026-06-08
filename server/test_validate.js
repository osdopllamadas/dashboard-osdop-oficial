import fetch from 'node-fetch';

async function test() {
    try {
        console.log('Fetching auth validate on 3005');
        const res = await fetch('http://localhost:3005/api/auth/validate', {
            headers: { 'Authorization': 'Bearer test' }
        });
        console.log('Validate status:', res.status);
    } catch (e) {
        console.error(e);
    }
}
test();
