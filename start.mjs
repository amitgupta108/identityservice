import consoleStamp from 'console-stamp';
consoleStamp(console, { format: ':date(HH:MM:ss.l)' });

process.on('uncaughtException', (error) => {
    console.error('FATAL: Uncaught Exception ' + error.stack);
    //setTimeout(() => process.exit(1), 5000); 
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise, reason ' + error.stack);
});

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

async function startServers() {
    //const { WSServer } = await import('./serverapps/socketws.mjs',);
    //(new WSServer()).start();
    const { startserver } = await import('./serverapps/httpsserver.mjs',);
    startserver();

}

await startServers();

async function shutdown(signal) {
    setTimeout(() => {
        console.error("Forced shutdown due to timeout.");
        process.exit(1);
    }, 5000);

    const { stopserver } = await import('./serverapps/httpsserver.mjs',);
    stopserver();
    console.log("HTTP server closed.");
    process.exit(0);
}