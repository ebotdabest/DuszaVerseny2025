// Shared Debug Console Logic
(function () {
    // Console state
    const STORAGE_KEY = 'debug_console_logs';
    const MAX_LOGS = 100;
    let isMinimized = false;
    let logs = [];

    // Initialize console when DOM is ready
    document.addEventListener('DOMContentLoaded', function () {
        createConsoleUI();
        restoreLogs();

        // Expose global functions
        window.debugLog = debugLog;
        window.clearConsole = clearConsole;
        window.toggleConsole = toggleConsole;
        window.testConnection = testConnection;
        window.copyConsoleToClipboard = copyConsoleToClipboard;
        window.restoreLogs = restoreLogs;

        debugLog('Console initialized', 'info');
    });

    function createConsoleUI() {
        // Check if console already exists (e.g. in HTML)
        if (document.getElementById('debugConsole')) return;

        const consoleDiv = document.createElement('div');
        consoleDiv.id = 'debugConsole';
        consoleDiv.className = 'debug-console';

        consoleDiv.innerHTML = `
            <div class="debug-header" id="debugHeader">
                <span>🐛 Debug</span>
                <div class="debug-controls">
                    <button onclick="copyConsoleToClipboard()" class="debug-btn" title="Copy to Clipboard">📋</button>
                    <button onclick="clearConsole()" class="debug-btn" title="Clear Console">🗑️</button>
                    <button onclick="testConnection()" class="debug-btn" title="Test Connection">Test C#</button>
                    <button onclick="toggleConsole()" class="debug-toggle" title="Minimize">_</button>
                </div>
            </div>
            <div id="debugOutput" class="debug-output"></div>
        `;

        document.body.appendChild(consoleDiv);

        // Drag functionality
        const header = document.getElementById('debugHeader');
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        header.addEventListener("mousedown", dragStart);
        document.addEventListener("mousemove", drag);
        document.addEventListener("mouseup", dragEnd);

        function dragStart(e) {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            if (e.target === header || e.target.parentNode === header || e.target.parentNode.parentNode === header) {
                isDragging = true;
            }
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                xOffset = currentX;
                yOffset = currentY;
                setTranslate(currentX, currentY, consoleDiv);
            }
        }

        function setTranslate(xPos, yPos, el) {
            el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0) translateY(-50%)`;
        }

        function dragEnd(e) {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
        }
    }

    function debugLog(message, type = 'info') {
        const output = document.getElementById('debugOutput');
        if (!output) return;

        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
            timestamp,
            message,
            type
        };

        // Save to storage
        saveLog(logEntry);

        // Render
        renderLog(logEntry, output);

        // Also log to browser console
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    function renderLog(log, container) {
        const line = document.createElement('div');
        line.className = `debug-line ${log.type}`;
        line.textContent = `[${log.timestamp}] ${log.message}`;
        container.appendChild(line);
        container.scrollTop = container.scrollHeight;
    }

    function saveLog(log) {
        try {
            logs.push(log);
            if (logs.length > MAX_LOGS) {
                logs = logs.slice(logs.length - MAX_LOGS);
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
        } catch (e) {
            console.error('Failed to save log', e);
        }
    }

    function restoreLogs() {
        const output = document.getElementById('debugOutput');
        if (!output) return;

        try {
            logs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            logs.forEach(log => renderLog(log, output));
            // Add a separator
            if (logs.length > 0) {
                renderLog({
                    timestamp: new Date().toLocaleTimeString(),
                    message: '--- Page Reloaded ---',
                    type: 'info'
                }, output);
            }
        } catch (e) {
            console.error('Failed to restore logs', e);
            logs = [];
        }
    }

    function clearConsole() {
        const output = document.getElementById('debugOutput');
        if (output) output.innerHTML = '';
        logs = [];
        localStorage.removeItem(STORAGE_KEY);
        debugLog('Console cleared', 'info');
    }

    function toggleConsole() {
        const consoleEl = document.getElementById('debugConsole');
        if (consoleEl) {
            consoleEl.classList.toggle('minimized');
            isMinimized = consoleEl.classList.contains('minimized');
        }
    }

    async function testConnection() {
        debugLog('Testing connection to C#...', 'info');
        try {
            if (!window.HybridWebView) {
                debugLog('HybridWebView not available!', 'error');
                return;
            }
            debugLog('HybridWebView object found.', 'success');
        } catch (error) {
            debugLog(`Connection test failed: ${error.message}`, 'error');
        }
    }

    function copyConsoleToClipboard() {
        if (!logs || logs.length === 0) {
            alert('No logs to copy!');
            return;
        }

        const text = logs.map(log => `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`).join('\n');

        navigator.clipboard.writeText(text).then(() => {
            debugLog('Logs copied to clipboard!', 'success');
        }).catch(err => {
            debugLog('Failed to copy logs: ' + err, 'error');
            // Fallback
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                debugLog('Logs copied to clipboard (fallback)!', 'success');
            } catch (err) {
                debugLog('Fallback copy failed: ' + err, 'error');
            }
            document.body.removeChild(textArea);
        });
    }
})();
