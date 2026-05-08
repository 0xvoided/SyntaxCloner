const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');
const readline = require('readline');

const ACCOUNTS_FILE = './accounts.json';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function showBanner() {
    console.clear();
    console.log("\x1b[35m%s\x1b[0m", `
    ███████╗██╗   ██╗███╗   ██╗████████╗ █████╗ ██╗  ██╗███████╗██████╗ ██████╗  ██████╗ ██████╗ 
    ██╔════╝╚██╗ ██╔╝████╗  ██║╚══██╔══╝██╔══██╗╚██╗██╔╝██╔════╝██╔══██╗██╔══██╗██╔═══██╗██╔══██╗
    ███████╗ ╚████╔╝ ██╔██╗ ██║   ██║   ███████║ ╚███╔╝ █████╗  ██████╔╝██████╔╝██║   ██║██████╔╝
    ╚════██║  ╚██╔╝  ██║╚██╗██║   ██║   ██╔══██║ ██╔██╗ ██╔════╝██╔══██╗██╔══██╗██║   ██║██╔══██╗
    ███████║   ██║   ██║ ╚████║   ██║   ██║  ██║██╔╝ ██╗███████╗██║  ██║██║  ██║╚██████╔╝██║  ██║
    ╚══════╝   ╚═╝   ╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝
    `);
    console.log("\x1b[36m%s\x1b[0m", "            Created by: syntax error\n");
}

function loadAccounts() {
    if (!fs.existsSync(ACCOUNTS_FILE)) return [];
    try { return JSON.parse(fs.readFileSync(ACCOUNTS_FILE)); } catch { return []; }
}

function saveAccount(name, token) {
    const accounts = loadAccounts();
    accounts.push({ name, token });
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
}

async function fetchAndSave(client, channelId) {
    try {
        const channel = await client.channels.fetch(channelId, { force: true }).catch(() => null);
        if (!channel) return;

        let allMessages = [];
        let lastId;
        const targetName = channel.recipient ? channel.recipient.username : (channel.name || channelId);

        console.log(`\n\x1b[33m[!] Deep Cloning: ${targetName}...\x1b[0m`);

        while (true) {
            const options = { limit: 100 };
            if (lastId) options.before = lastId;

            const messages = await channel.messages.fetch(options).catch(() => null);
            if (!messages || messages.size === 0) break;

            messages.forEach(m => {
                const date = new Date(m.createdAt);
                const timestamp = date.toLocaleString('ar-EG', {
                    day: 'numeric', month: 'numeric', year: 'numeric',
                    hour: 'numeric', minute: 'numeric', second: 'numeric',
                    hour12: true
                }).replace(/\//g, '‏/').replace(/,/g, '،');

                let line = `[${timestamp}] ${m.author.username}: ${m.content || ""}`;
                if (m.attachments && m.attachments.size > 0) {
                    m.attachments.forEach(a => line += `\n[Attachment]: ${a.url}`);
                }
                allMessages.push(line);
            });

            lastId = messages.last()?.id;
            process.stdout.write(`\r\x1b[32m[+] Messages: ${allMessages.length}\x1b[0m`);
            
            await new Promise(res => setTimeout(res, 300));
            if (!lastId) break;
        }

        if (!fs.existsSync('./logs')) fs.mkdirSync('./logs');
        const logContent = allMessages.reverse().join('\n');
        fs.writeFileSync(`./logs/${targetName}.txt`, logContent, 'utf8');
        console.log(`\n\x1b[32m[✔] Success: ${targetName}.txt\x1b[0m`);
    } catch (e) {
        console.log(`\n\x1b[31m[✘] Error fetching ${channelId}\x1b[0m`);
    }
}

async function startApp() {
    showBanner();
    const accounts = loadAccounts();

    console.log("1. Saved Accounts");
    console.log("2. New Account");
    
    rl.question("\nOption: ", async (opt) => {
        let token;
        if (opt === '1' && accounts.length > 0) {
            accounts.forEach((acc, i) => console.log(`${i + 1}. ${acc.name}`));
            const choice = await new Promise(res => rl.question("ID: ", res));
            token = accounts[parseInt(choice) - 1]?.token;
        } else {
            const name = await new Promise(res => rl.question("Label: ", res));
            token = await new Promise(res => rl.question("Token: ", res));
            saveAccount(name, token);
        }

        if (!token) return rl.close();

        const client = new Client({ checkUpdate: false });
        
        client.on('ready', async () => {
            console.log(`\x1b[32m[✔] Active: ${client.user.tag}\x1b[0m\n`);
            console.log("\x1b[33m[!] Fetching all private channels...\x1b[0m");

            let targets = new Map();

            const dms = await client.channels.fetch().catch(() => client.channels.cache);
            
            dms.forEach(c => {
                if (c.type === 'DM' && c.recipient) {
                    targets.set(c.recipient.id, { id: c.id, tag: c.recipient.tag });
                }
            });

            client.relationships.friendCache.forEach(f => {
                if (f && f.id && !targets.has(f.id)) {
                    targets.set(f.id, { id: f.id, tag: f.tag });
                }
            });

            const targetList = Array.from(targets.values());

            console.log("\x1b[32m[✔] Found " + targetList.length + " total targets.\x1b[0m\n");
            console.log("0. CLONE ALL");
            targetList.forEach((t, i) => console.log(`${i + 1}. ${t.tag}`));

            rl.question("\nTarget: ", async (choice) => {
                const idx = parseInt(choice);
                if (idx === 0) {
                    for (const t of targetList) {
                        await fetchAndSave(client, t.id);
                        await new Promise(res => setTimeout(res, 1000));
                    }
                } else if (targetList[idx - 1]) {
                    await fetchAndSave(client, targetList[idx - 1].id);
                }
                console.log("\n\x1b[36m[!] Done. syntax error\x1b[0m");
                client.destroy();
                rl.close();
            });
        });

        client.login(token).catch(() => {
            console.log("Failed");
            rl.close();
        });
    });
}

startApp();