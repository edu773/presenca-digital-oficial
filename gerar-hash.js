// Arquivo: gerar-hash.js
// (Pode apagar este arquivo depois que terminarmos)

const bcrypt = require('bcryptjs');

const senhaLimpa = 'admin123';
const saltRounds = 10; // O padrão

console.log(`Gerando hash para a senha: "${senhaLimpa}"...`);

bcrypt.hash(senhaLimpa, saltRounds, (err, hash) => {
    if (err) {
        console.error("Erro ao gerar o hash:", err);
        return;
    }

    console.log("--- SEU NOVO HASH (copie a linha abaixo) ---");
    console.log(hash);
    console.log("--- COPIE A LINHA ACIMA ---");
});