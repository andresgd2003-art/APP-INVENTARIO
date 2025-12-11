// ===================================
// BARCODE SCANNER MODULE - File Upload / Static Image
// ===================================

const BarcodeScanner = {
    isProcessing: false,

    /**
     * Procesa una imagen estática (URL o Base64) para encontrar códigos de barras.
     * @param {string} src - URL de la imagen o Data URI.
     * @param {function} callback - Callback (err, code).
     */
    processImage: function (src, callback) {
        if (this.isProcessing) return;
        this.isProcessing = true;

        const config = {
            inputStream: {
                size: 1280, // Alta resolución para fotos
                singleChannel: false
            },
            locator: {
                patchSize: "large", // Mejor para fotos de alta res
                halfSample: false // No reducir la muestra, usar full res
            },
            decoder: {
                readers: [
                    "ean_reader",
                    "ean_8_reader",
                    "code_128_reader",
                    "upc_reader",
                    "code_39_reader"
                ],
                multiple: false
            },
            locate: true,
            src: src
        };

        Quagga.decodeSingle(config, (result) => {
            this.isProcessing = false;

            if (result && result.codeResult && result.codeResult.code) {
                console.log("Código detectado:", result.codeResult.code);
                callback(null, result.codeResult.code);
            } else {
                console.warn("No se detectó código");
                callback("No se encontró ningún código. Intenta acercar la imagen o mejorar la luz.", null);
            }
        });
    },

    // Utilities to handle file input
    handleFileSelect: function (event, callback) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.processImage(e.target.result, callback);
        };
        reader.readAsDataURL(file);
    }
};
