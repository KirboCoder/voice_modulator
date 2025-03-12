const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');

let pythonProcess;

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false // Simplified for prototype
    }
  });
  win.loadFile('index.html');
}

app.whenReady().then(() => {
  // Start Python backend (adjust path as needed)
  pythonProcess = spawn('python', ['../backend/python/backend.py'], { cwd: __dirname });
  pythonProcess.stdout.on('data', (data) => console.log(`Python: ${data}`));
  pythonProcess.stderr.on('data', (data) => console.error(`Python error: ${data}`));
  createWindow();
});

app.on('window-all-closed', () => {
  if (pythonProcess) pythonProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});