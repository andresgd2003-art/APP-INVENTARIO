// ===================================
// BARCODE SCANNER MODULE - QuaggaJS (Optimized)
// ===================================

const BarcodeScanner = {
    isInitialized: false,
    isRunning: false,
    onDetectedCallback: null,
    quaggaState: null, // Store internal state

    // Basic Config Template
    getConfig: function () {
        return {
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: document.querySelector('#barcode-scanner-container'),
                constraints: {
                    width: { min: 640, ideal: 1280, max: 1920 },
                    height: { min: 480, ideal: 720, max: 1080 },
                    facingMode: "environment",
                    aspectRatio: { min: 1, max: 2 },
                    focusMode: "continuous" // Try to force continuous focus
                }
            },
            decoder: {
                readers: [
                    "ean_reader",
                    "ean_8_reader",
                    "code_128_reader",
                    "upc_reader",
                    "upc_e_reader",
                    "code_39_reader"
                ],
                multiple: false
            },
            locator: {
                patchSize: "medium",
                halfSample: true
            },
            numOfWorkers: navigator.hardwareConcurrency || 4,
            frequency: 10,
            locate: true
        };
    },

    init: function (callback) {
        // Always ensuring clean state before init
        this.stop();

        const config = this.getConfig();

        Quagga.init(config, (err) => {
            if (err) {
                console.error('Error initializing Quagga:', err);
                if (callback) callback(err);
                return;
            }

            this.isInitialized = true;
            console.log('Quagga initialized successfully');

            // Re-register detection handler every init to be safe
            this._registerHandler();

            if (callback) callback(null);
        });
    },

    _registerHandler: function () {
        if (this._onDetectedHandler) {
            Quagga.offDetected(this._onDetectedHandler);
        }
        this._onDetectedHandler = this.onDetected.bind(this);
        Quagga.onDetected(this._onDetectedHandler);
    },

    start: function () {
        if (!this.isInitialized) {
            console.error('Scanner not initialized. Call init() first.');
            return;
        }

        if (this.isRunning) {
            console.log('Scanner already running');
            return;
        }

        Quagga.start();
        this.isRunning = true;
        console.log('Scanner started');

        // Attempt to apply focus track constraints after start
        this.applyFocus();
    },

    stop: function () {
        if (this.isRunning || this.isInitialized) {
            try {
                Quagga.stop();
                console.log('Scanner stopped');
            } catch (e) {
                console.warn('Error stopping Quagga (may not be running):', e);
            }
        }

        // Clean up internal state
        this.isRunning = false;

        // Clear the container to remove the frozen video frame
        const container = document.querySelector('#barcode-scanner-container');
        if (container) {
            container.innerHTML = '';
        }
    },

    // Try to force focus capabilities
    applyFocus: function () {
        try {
            const track = Quagga.CameraAccess.getActiveTrack();
            if (track && typeof track.getCapabilities === 'function') {
                const capabilities = track.getCapabilities();

                // Check if focusMode is supported
                if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
                    track.applyConstraints({
                        advanced: [{ focusMode: 'continuous' }]
                    }).catch(err => console.log('Focus constraint failed:', err));
                }
            }
        } catch (e) {
            console.log('Could not apply focus settings:', e);
        }
    },

    _onDetectedHandler: null, // Internal reference for removing listener

    onDetected: function (result) {
        if (!result || !result.codeResult) {
            return;
        }

        const code = result.codeResult.code;
        const format = result.codeResult.format;

        // Basic validation: Ignore very short codes often due to noise
        if (code.length < 3) return;

        console.log(`Barcode detected: ${code} (${format})`);

        if (this.onDetectedCallback) {
            this.onDetectedCallback(code, format);
        }
    },

    cleanup: function () {
        this.stop();
        if (this._onDetectedHandler) {
            Quagga.offDetected(this._onDetectedHandler);
            this._onDetectedHandler = null;
        }
        this.isInitialized = false;
    }
};
