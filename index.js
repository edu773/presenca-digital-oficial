// 4.3


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


// A Rota de Push (do dispositivo)
app.post('/push', async (req, res) => {
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

// As Rotas de Login (também são públicas)
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
// --- SEÇÃO 3: ROTAS PROTEGIDAS (Exigem Login) ---
// (Tudo daqui para baixo está "trancado")
// =================================================================

// --- Rotas de Criação (POST) ---

// (Permite 'admin')
app.post('/api/iniciar-aula', checkAuth, checkRole('admin'), async (req, res) => {
  console.log('Recebida requisição para /api/iniciar-aula');
  try {
    const { sala_id, turma_id, disciplina_id } = req.body;
    const professor_id_do_token = req.user.userId;

    if (!sala_id || !turma_id || !disciplina_id) {
        return res.status(400).json({ error: 'Dados incompletos.' });
    }
    const result = await db.query(
        `INSERT INTO eventos (professor_id, sala_id, turma_id, disciplina_id, inicio, fim)
         VALUES ($1, $2, $3, $4, NOW(), NOW() + interval '2 hours')
         RETURNING *`, 
        [professor_id_do_token, sala_id, turma_id, disciplina_id] 
    );
    const novoEvento = result.rows[0];
    console.log(`SUCESSO: Aula criada pelo Professor ID: ${professor_id_do_token}`);
    res.status(201).json(novoEvento); 
  } catch (err) {
      console.error('ERRO ao criar novo evento /api/iniciar-aula:', err.stack);
      if (err.code === '23503') { 
        return res.status(400).json({ error: 'Erro de integridade de IDs.' });
      }
      res.status(500).send('Erro interno no servidor.');
  }
});

// (Permite 'admin')
app.post('/api/alunos', checkAuth, checkRole('admin'), async (req, res) => {
  console.log('Recebida requisição para POST /api/alunos (Registrar Aluno)');
  try {
    const { nome, matricula, email, password, turma_id } = req.body;

    if (!nome || !matricula || !email || !password || !turma_id) {
      return res.status(400).json({ error: 'Todos os campos (nome, matricula, email, password, turma_id) são obrigatórios.' });
    }

    const saltRounds = 10;
    const senha_hash = await bcrypt.hash(password, saltRounds);

    const result = await db.query(
      `INSERT INTO alunos (nome, matricula, email, senha_hash, turma_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nome, matricula, email, turma_id`, 
      [nome, matricula, email, senha_hash, turma_id]
    );

    const novoAluno = result.rows[0];
    console.log('SUCESSO: Novo aluno registrado:', novoAluno);
    res.status(201).json(novoAluno);

  } catch (err) {
    if (err.code === '23503') { 
        console.warn('Falha no registro: A Turma ID não existe.', err.detail);
        return res.status(400).json({ error: 'A Turma ID selecionada não é válida.' });
    }
    if (err.code === '23505') {
      console.warn('Falha no registro: Email ou Matrícula já existem.', err.detail);
      return res.status(409).json({ error: 'Email ou Matrícula já cadastrado.' }); 
    }
    
    console.error('ERRO ao registrar novo aluno:', err.stack);
    res.status(500).send('Erro interno no servidor.');
  }
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
  try {
    const result = await db.query('SELECT id, nome FROM disciplinas ORDER BY nome');
    res.json(result.rows);
  } catch (err) {
    console.error('ERRO ao buscar disciplinas:', err.stack);
    res.status(500).send('Erro interno no servidor.');
  }
});

// (Permite 'admin')
app.get('/api/salas', checkAuth, checkRole('admin'), async (req, res) => {
  try {
    const result = await db.query('SELECT id, nome FROM salas_dispositivos ORDER BY nome');
    res.json(result.rows);
  } catch (err)
 {
    console.error('ERRO ao buscar salas:', err.stack);
    res.status(500).send('Erro interno no servidor.');
  }
});

// (Permite 'admin')
// (Rota de Alunos ATUALIZADA com filtro)
app.get('/api/alunos', checkAuth, checkRole('admin'), async (req, res) => {
  try {
    const { turma_id } = req.query; 

    let query = 'SELECT id, nome FROM alunos';
    const params = [];

    if (turma_id) {
      query += ' WHERE turma_id = $1';
      params.push(turma_id);
    }
    
    query += ' ORDER BY nome';
    
    const result = await db.query(query, params);
    res.json(result.rows);

  } catch (err) {
    console.error('ERRO ao buscar alunos:', err.stack);
    res.status(500).send('Erro interno no servidor.');
  }
});

// (Permite 'admin' OU 'aluno' [para ver o seu próprio])
app.get('/api/relatorio/aluno/:id', checkAuth, async (req, res) => {
  try {
    const alunoIdDaUrl = req.params.id; 
    const usuarioLogado = req.user;   

    const isAdmin = (usuarioLogado.role === 'admin' || usuarioLogado.role === 'Docente');
    const isAlunoVendoProprio = (usuarioLogado.role === 'aluno' && usuarioLogado.userId == alunoIdDaUrl);
    
    if (!isAdmin && !isAlunoVendoProprio) {
        console.warn(`ALERTA DE SEGURANÇA: Usuário ${usuarioLogado.userId} (aluno) tentou ver o relatório do aluno ${alunoIdDaUrl}.`);
        return res.status(403).json({ error: 'Acesso proibido. Você só pode ver o seu próprio relatório.' });
    }
    
    const query = `
        SELECT 
            d.nome AS disciplina, 
            COUNT(p.id) AS total_de_presencas
        FROM 
            presencas p
        JOIN 
            eventos e ON p.evento_id = e.id
        JOIN 
            disciplinas d ON e.disciplina_id = d.id
        WHERE 
            p.aluno_id = $1
        GROUP BY 
            d.nome
        ORDER BY
            d.nome;
    `;
    const result = await db.query(query, [alunoIdDaUrl]);
    res.json(result.rows); 

  } catch (err) {
    console.error(`ERRO ao buscar relatório para aluno ${req.params.id}:`, err.stack);
    res.status(500).send('Erro interno no servidor.');
  }
});

// (Permite 'admin')
app.get('/api/eventos/recentes', checkAuth, checkRole('admin'), async (req, res) => {
  try {
    const query = `
      SELECT 
        e.id, 
        e.inicio, 
        e.fim,
        a.nome AS professor,
        d.nome AS disciplina,
        t.nome AS turma,
        s.nome AS sala
      FROM eventos e
      JOIN admins a ON e.professor_id = a.id
      JOIN disciplinas d ON e.disciplina_id = d.id
      JOIN turmas t ON e.turma_id = t.id
      JOIN salas_dispositivos s ON e.sala_id = s.id
      WHERE 
        e.fim > (NOW() - interval '2 hours') 
      ORDER BY 
        e.inicio DESC;
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('ERRO ao buscar eventos recentes:', err.stack);
    res.status(500).send('Erro interno no servidor.');
  }
});

// (Permite 'admin')
app.put('/api/eventos/cancelar/:id', checkAuth, checkRole('admin'), async (req, res) => {
  try {
    const eventoId = req.params.id;
    
    const result = await db.query(
      `UPDATE eventos 
       SET fim = NOW() 
       WHERE id = $1 
       RETURNING *`,
      [eventoId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Evento não encontrado.' });
    }

    console.log(`SUCESSO: Evento (aula) ID ${eventoId} foi encerrado.`);
    res.status(200).json(result.rows[0]); // Retorna o evento atualizado

  } catch (err) {
    console.error(`ERRO ao cancelar evento ${req.params.id}:`, err.stack);
    res.status(500).send('Erro interno no servidor.');
  }
});


// --- LIGA O SERVIDOR ---
app.listen(port, () => {
  console.log(`Servidor "Presença Digital" rodando na porta ${port}`);
  console.log(`Endpoint de login (admin) ouvindo em: POST http://localhost:${port}/api/login/admin`);
  console.log(`Endpoint de login (aluno) ouvindo em: POST http://localhost:${port}/api/login/aluno`);
  console.log(`Endpoint de criar aula (protegido) ouvindo em: POST http://localhost:${port}/api/iniciar-aula`);
});