module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    'ecmaVersion': 2018,
  },
  extends: [
    'eslint:recommended',
    'google',
  ],
  rules: {
    'no-restricted-globals': ['error', 'name', 'length'],
    'prefer-arrow-callback': 'error',
    'quotes': ['error', 'single', {'allowTemplateLiterals': true}],
    // Reglas adicionales para hacer ESLint más permisivo con el estilo (similar a Prettier)
    'indent': 'off', // Desactivar regla de indentación
    'object-curly-spacing': 'off', // Permitir cualquier espaciado en llaves de objetos
    'no-unused-vars': 'warn', // Cambiar variables no usadas de error a advertencia
    'comma-dangle': 'off', // Permitir o no comas finales
    'max-len': 'off', // Desactivar límite de longitud de línea
    'no-trailing-spaces': 'off', // Permitir espacios al final de línea
  },
  overrides: [
    {
      files: ['**/*.spec.*'],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
  globals: {},
};
