// ===================================
// BARCODE SCANNER MODULE - QuaggaJS (Advanced)
// ===================================

const BarcodeScanner = {
    isInitialized: false,
    isRunning: false,
    onDetectedCallback: null,
    currentDeviceId: null,
    capabilities: {},

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

    init: function (deviceId, callback) {
        this.stop();

        // If no deviceId provided, try to use the current one if set, or auto-select
        const config = this.getConfig(deviceId || this.currentDeviceId);

        Quagga.init(config, (err) => {
            if (err) {
                console.error('Error initializing Quagga:', err);
                if (callback) callback(err);
                return;
            }

            this.isInitialized = true;
            this.currentDeviceId = deviceId; // Update current if successful

            // Register handlers
            this._registerHandler();

            // Get constraints/capabilities of valid track
            this._updateCapabilities();

            if (callback) callback(null);
        });
    },

    listVideoInputDevices: async function () {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            console.warn("enumerateDevices() not supported.");
            return [];
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.filter(device => device.kind === 'videoinput');
    },

    start: function () {
        if (!this.isInitialized) return;
        if (this.isRunning) return;

        Quagga.start();
        this.isRunning = true;

        // Re-apply focus if possible
        this.applyTrackConstraints({ focusMode: 'continuous' });
    },

    stop: function () {
        if (this.isRunning || this.isInitialized) {
            try { Quagga.stop(); } catch (e) { console.warn(e); }
        }
        this.isRunning = false;
        const container = document.querySelector('#barcode-scanner-container');
        if (container) container.innerHTML = '';
    },

    toggleTorch: function (enable) {
        return this.applyTrackConstraints({ torch: !!enable });
    },

    applyTrackConstraints: async function (constraints) {
        const track = Quagga.CameraAccess.getActiveTrack();
        if (!track) return false;

        try {
            await track.applyConstraints({ advanced: [constraints] });
            return true;
        } catch (err) {
            console.warn('Failed to apply constraints:', constraints, err);
            return false;
        }
    },

    _updateCapabilities: function () {
        const track = Quagga.CameraAccess.getActiveTrack();
        if (track && typeof track.getCapabilities === 'function') {
            this.capabilities = track.getCapabilities();
            console.log('Camera capabilities:', this.capabilities);
        } else {
            this.capabilities = {};
        }
    },

    hasTorch: function () {
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
