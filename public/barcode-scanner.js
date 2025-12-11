// ===================================
// BARCODE SCANNER MODULE - QuaggaJS (Advanced)
// ===================================

const BarcodeScanner = {
    isInitialized: false,
    isRunning: false,
    onDetectedCallback: null,
    currentDeviceId: null,
    capabilities: {},
    track: null,

    getConfig: function (deviceId) {
        return {
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: document.querySelector('#barcode-scanner-container'),
                constraints: {
                    width: { min: 640, ideal: 1280, max: 1920 },
                    height: { min: 480, ideal: 720, max: 1080 },
                    aspectRatio: { min: 1, max: 2 },
                    focusMode: "continuous",
                    ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "environment" })
                }
            },
            decoder: {
                readers: ["ean_reader", "ean_8_reader", "code_128_reader", "upc_reader", "code_39_reader"],
                multiple: false
            },
            locator: { patchSize: "medium", halfSample: true },
            numOfWorkers: navigator.hardwareConcurrency || 4,
            frequency: 10,
            locate: true
        };
    },

    // Explicitly ask for generic permission to unblock listDevices
    ensurePermission: async function () {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (err) {
            console.error("Permission denied or not supported:", err);
            return false;
        }
    },

    init: function (deviceId, callback) {
        this.stop();

        const config = this.getConfig(deviceId || this.currentDeviceId);

        Quagga.init(config, (err) => {
            if (err) {
                console.error('Error initializing Quagga:', err);
                if (callback) callback(err);
                return;
            }

            this.isInitialized = true;
            this.currentDeviceId = deviceId;

            // Register handlers
            this._registerHandler();

            // Cache track and caps
            this._updateTrackAndCaps();

            if (callback) callback(null);
        });
    },

    listVideoInputDevices: async function () {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            return [];
        }
        // Assuming ensuring permission is handled by caller or we just try listing
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.filter(device => device.kind === 'videoinput');
    },

    start: function () {
        if (!this.isInitialized) return;
        if (this.isRunning) return;

        Quagga.start();
        this.isRunning = true;

        // Re-grab track if needed
        this._updateTrackAndCaps();

        // Try to force continuous focus
        this.applyTrackConstraints({ focusMode: 'continuous' });
    },

    stop: function () {
        if (this.isRunning || this.isInitialized) {
            try { Quagga.stop(); } catch (e) { console.warn(e); }
        }
        this.isRunning = false;
        const container = document.querySelector('#barcode-scanner-container');
        if (container) container.innerHTML = '';
        this.track = null;
    },

    toggleTorch: async function (enable) {
        return this.applyTrackConstraints({ torch: !!enable });
    },

    // Tap to focus implementation
    focusAt: async function (x, y) {
        if (!this.track) return;

        // This is highly experimental and depends on device support for 'pointsOfInterest'
        // x and y should be normalized coordinates (0.00 to 1.00)

        const constraints = {
            advanced: [{
                pointsOfInterest: {
                    x: x,
                    y: y
                }
            }]
        };

        try {
            // Some devices need to switch to manual focus first, but usually 'continuous' + POI works best if supported
            // Or typically just sending the constraint works.
            await this.track.applyConstraints(constraints);
            console.log(`Focused at ${x.toFixed(2)}, ${y.toFixed(2)}`);

            // Trigger a re-focus in continuous mode if POI isn't supported directly but re-applying helps
            setTimeout(() => {
                this.applyTrackConstraints({ focusMode: 'continuous' });
            }, 1000);

        } catch (err) {
            console.warn("Focus at point not supported:", err);
            // Fallback: just try to re-trigger continuous focus
            this.applyTrackConstraints({ focusMode: 'continuous' });
        }
    },

    applyTrackConstraints: async function (constraints) {
        if (!this.track) this._updateTrackAndCaps();
        if (!this.track) return false;

        try {
            await this.track.applyConstraints({ advanced: [constraints] });
            return true;
        } catch (err) {
            // Try standard constraint if specific advanced one fails (fallback)
            try {
                await this.track.applyConstraints(constraints);
                return true;
            } catch (retryErr) {
                // console.warn('Failed to apply constraints:', constraints);
                return false;
            }
        }
    },

    _updateTrackAndCaps: function () {
        this.track = Quagga.CameraAccess.getActiveTrack();
        if (this.track && typeof this.track.getCapabilities === 'function') {
            this.capabilities = this.track.getCapabilities();
            console.log("Caps:", this.capabilities);
        } else {
            this.capabilities = {};
        }
    },

    hasTorch: function () {
        // Strict check: if 'torch' is in capabilities
        // NOTE: some devices report it but fail. Others don't report it but work. 
        // We stick to the capability check to be safe.
        return !!this.capabilities.torch;
    },

    _registerHandler: function () {
        if (this._onDetectedHandler) Quagga.offDetected(this._onDetectedHandler);
        this._onDetectedHandler = this.onDetected.bind(this);
        Quagga.onDetected(this._onDetectedHandler);
    },

    onDetected: function (result) {
        if (!result || !result.codeResult) return;
        const code = result.codeResult.code;
        if (code.length < 3) return;
        if (this.onDetectedCallback) this.onDetectedCallback(code, result.codeResult.format);
    },

    cleanup: function () {
        this.stop();
        if (this._onDetectedHandler) {
            Quagga.offDetected(this._onDetectedHandler);
            this._onDetectedHandler = null;
        }
        this.isInitialized = false;
        this.currentDeviceId = null;
    }
};
