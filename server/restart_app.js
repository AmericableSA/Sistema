const { execSync, spawn } = require('child_process');

try {
    console.log("Searching for process on port 3001...");
    // PowerShell command to get PID for port 3001
    const pidInfo = execSync('netstat -ano | findstr :3001').toString();
    console.log("Ports found:", pidInfo);

    const lines = pidInfo.split('\n');
    const pids = new Set();

    lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(pid) && pid !== '0') {
            pids.add(pid);
        }
    });

    if (pids.size > 0) {
        console.log(`Killing PIDs: ${Array.from(pids).join(', ')}`);
        pids.forEach(pid => {
            try {
                execSync(`taskkill /PID ${pid} /F`);
                console.log(`✅ Killed PID ${pid}`);
            } catch (kErr) {
                console.log(`⚠️ Could not kill ${pid}: ${kErr.message}`);
            }
        });
    } else {
        console.log("No active process found on 3001.");
    }

} catch (e) {
    console.log("Netstat search failed or no process found (good).");
}

console.log("Starting new server instance...");
const server = spawn('node', ['server/index.js'], {
    detached: true,
    stdio: 'ignore'
});
server.unref(); // Allow script to exit while server keeps running
console.log("🚀 Server output redirected to background.");
process.exit(0);
