// Arquivo: db.js (Otimizado)

const { Pool } = require('pg');

// A variável 'process.env.DATABASE_URL' injetada
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Exporta a função de consulta
module.exports = {
  query: (text, params) => pool.query(text, params),
};