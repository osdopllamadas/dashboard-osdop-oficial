import fetch from 'node-fetch';

async function test() {
    try {
        console.log('Fetching list');
        const resList = await fetch('http://localhost:3001/api/affiliations', {
            headers: { 'Authorization': 'Bearer test' }
        });
        console.log('List status:', resList.status);
        if (resList.status === 200) {
            const data = await resList.json();
            console.log('List length:', data.length);
        } else {
            console.log(await resList.text());
        }

        console.log('Fetching stats');
        const resStats = await fetch('http://localhost:3001/api/affiliations/stats', {
            headers: { 'Authorization': 'Bearer test' }
        });
        console.log('Stats status:', resStats.status);
    } catch (e) {
        console.error(e);
    }
}
test();
