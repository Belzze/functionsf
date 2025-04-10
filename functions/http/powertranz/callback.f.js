const { onRequest } = require('firebase-functions/v2/https');

module.exports = onRequest(
  {
    // Opcional: configura los parámetros de la función
    // memory: "256MiB",
    // timeoutSeconds: 60,
  },
  (req, res) => {
    // Lógica de tu función aquí
  }
);
