// 4.2

// Carrega as variáveis de ambiente (do arquivo .env)
require('dotenv').config(); 

// Importa as ferramentas
const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db'); 
const path = require('path'); 
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 

if (!process.env.JWT_SECRET) {
    console.error("ERRO FATAL: JWT_SECRET não está definida no arquivo .env");
    process.exit(1); 
}

// Cria o servidor
const app = express();
const port = process.env.PORT || 3000;

// Configura o servidor para entender JSON
app.use(bodyParser.json());

// =================================================================
// --- SEÇÃO 1: ROTAS PÚBLICAS (Não precisam de Login) ---
// =================================================================

// Servir as páginas HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});
app.get('/admin-hub', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-hub.html'));
});
app.get('/register-student', (req, res) => {
    res.sendFile(path.join(__dirname, 'register-student.html'));
});
app.get('/manage-events', (req, res) => {
    res.sendFile(path.join(__dirname, 'manage-events.html'));
});


// A Rota de Push (vem do dispositivo, não de um usuário logado)
app.post('/push', async (req, res) => {
  // (O código desta rota está 100% correto e permanece o mesmo)
  console.log('Recebido um /push da ControliD:');
  
  const { access_logs } = req.body;
  if (!access_logs || !Array.isArray(access_logs)) {
    console.log('Formato de dados inválido ou sem logs.');
    return res.status(400).send('Formato de dados inválido.');
  }

  console.log(`Recebemos ${access_logs.length} log(s) de acesso.`);
  try {
    for (const log of access_logs) {
      if (log.event === 7) {
        console.log(`Processando log de SUCESSO (Evento 7):`, log);

        // ... (Toda a lógica interna do 'push' permanece 100% igual) ...
        const alunoResult = await db.query('SELECT id FROM alunos WHERE controlid_user_id = $1', [log.user_id]);
        const dispositivoResult = await db.query('SELECT id FROM salas_dispositivos WHERE dispositivo_id = $1', [log.device_id]);

        if (alunoResult.rows.length === 0) {
          console.warn(`AVISO: Aluno com user_id ${log.user_id} não encontrado no banco.`);
          continue; 
        }
        if (dispositivoResult.rows.length === 0) {
          console.warn(`AVISO: Dispositivo com device_id ${log.device_id} não encontrado.`);
          continue; 
        }

        const alunoIdInterno = alunoResult.rows[0].id;
        const dispositivoIdInterno = dispositivoResult.rows[0].id;
        const horarioBatida = new Date(Number(log.time) * 1000); 
        
        let eventoIdInterno = null; 
        const eventoResult = await db.query(
          `SELECT id FROM eventos WHERE sala_id = $1 AND to_timestamp($2) >= inicio AND to_timestamp($2) <= fim LIMIT 1`, 
          [dispositivoIdInterno, log.time] 
        );

        if (eventoResult.rows.length > 0) {
          eventoIdInterno = eventoResult.rows[0].id;
          console.log(`SUCESSO: Evento (aula) ID ${eventoIdInterno} encontrado.`);
        } else {
          console.log(`AVISO: Nenhuma aula (evento) ativa encontrada para esta sala/horário.`);
        }
        
        const presencaAbertaResult = await db.query(
          `SELECT id FROM presencas WHERE aluno_id = $1 AND evento_id IS NOT DISTINCT FROM $2 AND saida IS NULL LIMIT 1`,
          [alunoIdInterno, eventoIdInterno]
        );

        if (presencaAbertaResult.rows.length === 0) {
          console.log(`INFO: Nenhuma entrada aberta encontrada. Registrando ENTRADA.`);
          await db.query(
            `INSERT INTO presencas (aluno_id, entrada, registrado_por_dispositivo, evento_id) VALUES ($1, $2, $3, $4)`, 
            [alunoIdInterno, horarioBatida, dispositivoIdInterno, eventoIdInterno] 
          );
          console.log(`SUCESSO: Presença (ENTRADA) registrada para aluno_id ${alunoIdInterno}.`);
        } else {
          const presencaIdParaFechar = presencaAbertaResult.rows[0].id;
          console.log(`INFO: Entrada aberta (ID: ${presencaIdParaFechar}) encontrada. Registrando SAÍDA.`);
          await db.query(`UPDATE presencas SET saida = $1 WHERE id = $2`, [horarioBatida, presencaIdParaFechar]);
          console.log(`SUCESSO: Presença (SAÍDA) registrada para aluno_id ${alunoIdInterno}.`);
        }
      } else {
        console.log(`Log ignorado (Evento ${log.event}, não é 7).`);
      }
    } 
    res.status(200).send('Logs processados com sucesso.');
  } catch (err) { 
    console.error('ERRO GRAVE ao processar os logs /push:', err.stack);
    res.status(500).send('Erro interno no servidor.');
  }
});

// =================================================================
// --- SEÇÃO 2: MIDDLEWARE DE AUTENTICAÇÃO ("Porteiros") ---
// =================================================================

// 1. Porteiro "checkAuth" (Verifica se o usuário está logado)
const checkAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Acesso negado. Nenhum token enviado.' });
        }
        const token = authHeader.split(' ')[1]; 
        if (!token) {
            return res.status(401).json({ error: 'Token mal formatado.' });
        }
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decodedToken; 
        next(); 
    } catch (error) {
        res.status(401).json({ error: 'Token inválido ou expirado.' });
    }
};

// 2. Porteiro "checkRole" (Verifica se o usuário tem o papel correto)
const checkRole = (...rolesPermitidos) => { 
    return (req, res, next) => {
        const userRole = req.user.role; 

        const isUserAdmin = (userRole === 'admin' || userRole === 'Docente');
        const isAdminAllowed = rolesPermitidos.includes('admin');

        if (isUserAdmin && isAdminAllowed) {
            return next();
        }

        if (userRole === 'aluno' && rolesPermitidos.includes('aluno')) {
            return next();
        }
        
        return res.status(403).json({ error: 'Acesso proibido. Permissão insuficiente.' });
    };
};

// =================================================================
// --- SEÇÃO 3: ROTAS DE LOGIN (Públicas) ---
// =================================================================

// Rota de Login para Admins/Professores
app.post('/api/login/admin', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await db.query('SELECT * FROM admins WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email ou senha inválidos.' });
    }
    const admin = result.rows[0];
    const isMatch = await bcrypt.compare(password, admin.senha_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email ou senha inválidos.' });
    }
    const payload = { userId: admin.id, role: admin.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '3h' });
    res.json({ message: 'Login bem-sucedido!', token: token, role: admin.role, userId: admin.id });
  } catch (err) {
    console.error('ERRO no login de admin:', err.stack);
    res.status(500).send('Erro interno no servidor.');
  }
});

// Rota de Login para Alunos/Pais
app.post('/api/login/aluno', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await db.query('SELECT * FROM alunos WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email ou senha inválidos.' });
    }
    const aluno = result.rows[0];
    const isMatch = await bcrypt.compare(password, aluno.senha_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email ou senha inválidos.' });
    }
    const payload = { userId: aluno.id, role: 'aluno' };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '3h' });
    res.json({ message: 'Login bem-sucedido!', token: token, role: 'aluno', userId: aluno.id });
  } catch (err) {
    console.error('ERRO no login de aluno:', err.stack);
    res.status(500).send('Erro interno no servidor.');
  }
});

// =================================================================
// --- SEÇÃO 4: ROTAS PROTEGIDAS (Exigem Login) ---
// =================================================================

// --- Rotas de Criação (POST) ---

// (Permite 'admin')
app.post('/api/iniciar-aula', checkAuth, checkRole('admin'), async (req, res) => {
});

// (Permite 'admin')
app.post('/api/alunos', checkAuth, checkRole('admin'), async (req, res) => {
});


// --- Rotas de Leitura (GET) ---

// (Permite 'admin')
app.get('/api/turmas', checkAuth, checkRole('admin'), async (req, res) => {
  try {
    const result = await db.query('SELECT id, nome FROM turmas ORDER BY nome');
    res.json(result.rows);
  } catch (err) {
    console.error('ERRO ao buscar turmas:', err.stack);
    res.status(500).send('Erro interno no servidor.');
  }
});

// (Permite 'admin')
app.get('/api/disciplinas', checkAuth, checkRole('admin'), async (req, res) => {
});

// (Permite 'admin')
app.get('/api/salas', checkAuth, checkRole('admin'), async (req, res) => {
});

// (Permite 'admin')
// --- ROTA DE ALUNOS ATUALIZADA COM FILTRO ---
app.get('/api/alunos', checkAuth, checkRole('admin'), async (req, res) => {
  try {
    // 1. Pega o 'turma_id' da URL (ex: /api/alunos?turma_id=1)
    const { turma_id } = req.query; 

    let query = 'SELECT id, nome FROM alunos';
    const params = [];

    if (turma_id) {
      // 2. Se o filtro foi enviado, adiciona o WHERE
      query += ' WHERE turma_id = $1';
      params.push(turma_id);
    }
    
    query += ' ORDER BY nome';
    
    // 3. Executa a consulta (filtrada ou não)
    const result = await db.query(query, params);
    res.json(result.rows);

  } catch (err) {
    console.error('ERRO ao buscar alunos:', err.stack);
    res.status(500).send('Erro interno no servidor.');
  }
});

// (Permite 'admin' OU 'aluno' [para ver o seu próprio])
app.get('/api/relatorio/aluno/:id', checkAuth, async (req, res) => {
});

// (Permite 'admin')
app.get('/api/eventos/recentes', checkAuth, checkRole('admin'), async (req, res) => {
});

// (Permite 'admin')
app.put('/api/eventos/cancelar/:id', checkAuth, checkRole('admin'), async (req, res) => {
});


// --- LIGA O SERVIDOR ---
app.listen(port, () => {
  console.log(`Servidor "Presença Digital" rodando na porta ${port}`);
});