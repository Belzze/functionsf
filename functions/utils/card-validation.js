/**
 * Utilidades para validación de tarjetas de crédito/débito
 */
const admin = require('firebase-admin');
const axios = require('axios');

const apiKey = process.env.BIN_CODES_API_KEY;
/**
 * Extrae el BIN (corto y largo) del número de tarjeta
 * @param {string} cardNumber - Número de tarjeta
 * @return {Object} Objeto con binShort y binLong
 */
const extractBins = (cardNumber) => {
  // Eliminar espacios y caracteres no numéricos
  const cleanNumber = cardNumber.replace(/\D/g, '');
  
  // Extraer los primeros 6 y 8 dígitos
  const binShort = cleanNumber.substring(0, 6);
  const binLong = cleanNumber.substring(0, 8);
  
  return { binShort, binLong };
};

/**
 * Verifica si un BIN existe en la colección binCodes de Firestore
 * @param {string} bin - BIN a verificar (8 dígitos preferiblemente)
 * @return {Promise<Object|null>} Información del BIN o null si no existe
 */
const checkBinInFirestore = async (bin) => {
  try {
    const binRef = admin.firestore().collection('binCodes').where('bin', '==', bin);
    const snapshot = await binRef.get();
    
    if (snapshot.empty) {
      return null;
    }
    
    return snapshot.docs[0].data();
  } catch (error) {
    console.error('Error al consultar BIN en Firestore:', error);
    return null;
  }
};

/**
 * Consulta información de un BIN en la API externa
 * @param {string} bin - BIN a consultar (6 dígitos)
 * @param {string} apiKey - Clave API para bincodes.com
 * @return {Promise<Object|null>} Información del BIN o null si hay error
 */
const fetchBinFromAPI = async (bin) => {
  try {
    const response = await axios.get(`https://api.bincodes.com/bin/?format=json&api_key=${apiKey}&bin=${bin}`);
    
    // Verificar si la respuesta es válida
    if (response.data && response.data.valid === 'true') {
      return {
        bin: bin,
        brand: response.data.card,
        country: response.data.countrycode,
        level: response.data.level,
        issuer: response.data.bank,
        countryCode: response.data.country_code,
        product: response.data.level,
        type: response.data.type,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
    }
    
    
    return null;
  } catch (error) {
    console.error('Error al consultar API de BIN:', error);
    return null;
  }
};

/**
 * Guarda información de un BIN en Firestore
 * @param {Object} binData - Datos del BIN a guardar
 * @return {Promise<boolean>} true si se guardó correctamente
 */
const saveBinToFirestore = async (binData) => {
  try {
    await admin.firestore().collection('binCodes').add(binData);
    return true;
  } catch (error) {
    console.error('Error al guardar BIN en Firestore:', error);
    return false;
  }
};

/**
 * Valida el BIN de una tarjeta (verifica en Firestore primero, luego en API)
 * @param {string} cardNumber - Número de tarjeta completo
 * @param {string} apiKey - Clave API para bincodes.com
 * @return {Promise<Object>} Resultado de la validación
 */
const validateCardBin = async (cardNumber, apiKey) => {
  try {
    const { binShort, binLong } = extractBins(cardNumber);
    
    // Verificar primero con el BIN de 8 dígitos
    let binData = await checkBinInFirestore(binLong);
  
    
    // Si no existe en Firestore, consultar API externa
    if (!binData) {
      binData = await fetchBinFromAPI(binShort);
      
      // Si la API devuelve datos válidos, guardarlos en Firestore
      if (binData) {
        await saveBinToFirestore(binData);
      } else {
        return {
          valid: false,
          message: 'BIN no reconocido, tarjeta no soportada',
        };
      }
    }
    
    return {
      binData
    };
  } catch (error) {
    console.error('Error al validar BIN de tarjeta:', error);
    return {
      valid: false,
      message: 'Error al validar BIN de tarjeta: ' + error.message,
    };
  }
};

module.exports = {
  validateCardBin
}; 
