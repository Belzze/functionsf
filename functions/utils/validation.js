/**
 * Función para validar que un objeto contenga todas las claves requeridas
 * @param {Object} obj - Objeto a validar
 * @param {Array<string>} requiredKeys - Array de claves requeridas
 * @return {string|null} - Devuelve una cadena con las claves faltantes o null si todas existen
 */
const findMissingKeys = (obj, requiredKeys) => {
  if (!obj || typeof obj !== 'object') {
    return 'El objeto a validar no es válido';
  }

  if (!Array.isArray(requiredKeys)) {
    return 'La lista de claves requeridas no es válida';
  }

  const missingKeys = requiredKeys.filter((key) => {
    // Verificar si la propiedad existe y no es undefined, null, o cadena vacía
    return obj[key] === undefined || obj[key] === null || obj[key] === '';
  });

  if (missingKeys.length === 0) {
    return null; // No hay claves faltantes
  }

  return missingKeys.join(', ');
};

module.exports = {
  findMissingKeys,
};
