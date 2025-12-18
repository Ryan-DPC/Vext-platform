// using global fetch
async function main() {
    try {
        const res = await fetch('https://api.github.com/repos/Ryan-DPC/Stick-Fighter/releases'); // List all
        if (!res.ok) {
            console.log('Error:', res.status);
            return;
        }
        const data = await res.json();
        console.log('Release:', data.tag_name);
        console.log('Assets:', data.assets.map(a => ({ name: a.name, url: a.browser_download_url })));
    } catch (e) {
        console.error(e);
    }
}
main();
