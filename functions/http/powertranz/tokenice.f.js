// tokenice.f.js
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { findMissingKeys } = require('../../../utils/validation');
const { validateCardBin } = require('../../../utils/card-validation');

// Ruta al archivo PEM relativa al directorio de functions
const PEM_PATH = path.join(__dirname, `../../../keys/private-${process.env.GCLOUD_PROJECT}.pem`);

// API Key para bincodes.com
const BINCODES_API_KEY = process.env.BINCODES_API_KEY || 'YOUR_API_KEY';

// inputs a validar
const fields = ['nameOnCard', 'color', 'number', 'validThru', 'cvv'];

// Función para desencriptar datos con la clave privada
const decryptWithPrivateKey = (encryptedData, privateKeyPath) => {
  try {
    // Leer la clave privada
    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    
    // Desencriptar datos
    // Nota: Ajusta el algoritmo, padding y formato según tus necesidades específicas
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_PADDING,
      },
      Buffer.from(encryptedData, 'base64')
    );
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Error al desencriptar datos:', error);
    throw new Error('No se pudieron desencriptar los datos.');
  }
};

module.exports = onCall(
  {
    // Opcional: configura los parámetros de la función
    // memory: "256MiB",
    // timeoutSeconds: 60,
  },
  async (data, context) => {
    try {
      // Validar que el usuario esté autenticado
      if (!context.auth) {
        throw new Error('No autorizado. Se requiere autenticación.');
      }

      // Obtener el userId del token
      const userId = context.auth.uid || context.auth.token.userId;
      
      if (!userId) {
        throw new Error('No se pudo determinar el ID del usuario.');
      }

      // Validar que exista el campo request en data
      if (!data.request) {
        throw new Error('El campo \'request\' es obligatorio.');
      }

      // Validar existencia del usuario en Firestore
      const userDoc = await admin
        .firestore()
        .collection('users')
        .doc(userId)
        .get();

      if (!userDoc.exists) {
        throw new Error('Usuario no encontrado en la base de datos.');
      }

      const userData = userDoc.data();

      // Validar estado del usuario (isFucked indica si está desactivado)
      if (userData.isFucked === true) {
        throw new Error('Usuario deshabilitado.');
      }

      // Desencriptar los datos de la solicitud
      let decryptedData;
      try {
        decryptedData = decryptWithPrivateKey(data.request, PEM_PATH);
        // Parsear los datos JSON desencriptados
        decryptedData = JSON.parse(decryptedData);
        const body = decryptedData;
        const validateFields = findMissingKeys(body, fields);

        if (validateFields) {
          throw new HttpsError(
            'invalid-argument',
            `Los siguientes campos son requeridos: ${validateFields}`
          );
        }
        
        // Validar el BIN de la tarjeta
        const binValidation = await validateCardBin(body.number, BINCODES_API_KEY);
        
        if (!binValidation.valid) {
          throw new HttpsError(
            'failed-precondition',
            binValidation.message || 'No se pudo validar la tarjeta. Intenta con otra tarjeta.'
          );
        }
        
        // Añadir información del BIN a los datos
        decryptedData.binInfo = {
          binShort: binValidation.binShort,
          binLong: binValidation.binLong,
          binData: binValidation.binData
        };
      } catch (error) {
        throw new Error(
          'Error al procesar datos encriptados: ' + error.message
        );
      }

      // Procesar la solicitud de tokenización con los datos desencriptados
      // TODO: Implementar lógica de tokenización usando decryptedData
      console.log('Datos desencriptados:', decryptedData);

      // Preparar la respuesta
      const response = {
        success: true,
        token: 'token_generado_aquí',
        cardInfo: {
          binShort: decryptedData.binInfo.binShort,
          binLong: decryptedData.binInfo.binLong,
          brand: decryptedData.binInfo.binData && decryptedData.binInfo.binData.card ? decryptedData.binInfo.binData.card : 'Unknown',
          bank: decryptedData.binInfo.binData && decryptedData.binInfo.binData.bank ? decryptedData.binInfo.binData.bank : 'Unknown',
          type: decryptedData.binInfo.binData && decryptedData.binInfo.binData.type ? decryptedData.binInfo.binData.type : 'Unknown',
          last4: decryptedData.number.slice(-4)
        }
      };

      // Respuesta exitosa
      return response;
    } catch (error) {
      // En onCall, lanzar el error es suficiente
      // El SDK de Firebase Functions lo manejará apropiadamente
      console.error('Error en la función de tokenización:', error);
      throw new Error(error.message);
    }
  }
);
