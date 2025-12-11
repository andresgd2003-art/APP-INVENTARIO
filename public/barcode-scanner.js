// ===================================
// BARCODE SCANNER MODULE - QuaggaJS
// ===================================

const BarcodeScanner = {
    isInitialized: false,
    isRunning: false,
    onDetectedCallback: null,

    // Configuración de QuaggaJS
    config: {
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#barcode-scanner-container'),
            constraints: {
                width: { min: 640, ideal: 1280, max: 1920 },
                height: { min: 480, ideal: 720, max: 1080 },
                facingMode: "environment", // Cámara trasera en móviles
                aspectRatio: { ideal: 16 / 9 }
            }
        },
        decoder: {
            readers: [
                "ean_reader",      // EAN-13, EAN-8
                "ean_8_reader",    // EAN-8
                "code_128_reader", // CODE 128
                "code_39_reader",  // CODE 39
                "upc_reader",      // UPC-A, UPC-E
                "upc_e_reader"     // UPC-E
            ],
            multiple: false // Solo detectar un código a la vez
        },
        locator: {
            patchSize: "medium",
            halfSample: true
        },
        numOfWorkers: navigator.hardwareConcurrency || 4,
        frequency: 10, // Intentos por segundo
        locate: true
    },

    // Inicializar scanner
    init: function (callback) {
        if (this.isInitialized) {
            console.log('Scanner already initialized');
            if (callback) callback(null);
            return;
        }

        this.onDetectedCallback = callback;

        Quagga.init(this.config, (err) => {
            if (err) {
                console.error('Error initializing Quagga:', err);
                if (callback) callback(err);
                return;
            }

            this.isInitialized = true;
            console.log('Quagga initialized successfully');

            // Configurar evento de detección
            Quagga.onDetected(this.onDetected.bind(this));

            if (callback) callback(null);
        });
    },

    // Iniciar escaneo
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
    },

    // Detener escaneo
    stop: function () {
        if (!this.isRunning) {
            return;
        }

        Quagga.stop();
        this.isRunning = false;
        console.log('Scanner stopped');
    },

    // Callback cuando se detecta un código
    onDetected: function (result) {
        if (!result || !result.codeResult) {
            return;
        }

        const code = result.codeResult.code;
        const format = result.codeResult.format;

        console.log(`Barcode detected: ${code} (${format})`);

        // Llamar al callback externo si existe
        if (this.onDetectedCallback) {
            this.onDetectedCallback(code, format);
        }
    },

    // Limpiar recursos
    cleanup: function () {
        if (this.isRunning) {
            this.stop();
        }

        if (this.isInitialized) {
            Quagga.offDetected();
            this.isInitialized = false;
        }
    }
};
