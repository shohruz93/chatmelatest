const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const handler = require('serve-handler');

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 375, // Mobile standard width
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.setMenu(null);

    // Serve the app locally
    const server = http.createServer((request, response) => {
        return handler(request, response, {
            public: path.join(__dirname, 'dist/frontend/browser')
        });
    });

    server.listen(0, () => {
        const port = server.address().port;
        win.loadURL(`http://localhost:${port}`);
    });

    win.on('closed', () => {
        server.close();
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    // Hide menu for all windows (including Firebase popups)
    app.on('browser-window-created', (e, window) => {
        window.setMenu(null);
        window.autoHideMenuBar = true;
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
