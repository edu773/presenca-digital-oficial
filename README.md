# Presença Digital - API REST & Frontend

Um sistema full-stack para gerenciamento de presenças escolares e acadêmicas, com suporte à integração direta com hardwares de controle de acesso (catracas/relógios de ponto).

## Visão Geral
Este projeto é composto por um backend Node.js (Express), um banco de dados PostgreSQL e um frontend em HTML/CSS/JS puro. Ele gerencia a autenticação de usuários, controle de turmas e processa webhooks em tempo real enviados por dispositivos IoT para registrar presenças automaticamente.

## Tecnologias Utilizadas
* **Ambiente:** Node.js
* **Framework Web:** Express.js
* **Banco de Dados:** PostgreSQL
* **Frontend:** HTML, CSS, JavaScript (Puro)
* **Segurança:** Autenticação via tokens JWT e hash de senhas com bcryptjs.
* **Testes de API:** Insomnia / Postman

## Principais Funcionalidades
* **Controle de Acesso Baseado em Regras (RBAC):** Middlewares customizados para garantir que rotas administrativas sejam acessadas apenas por usuários autorizados.
* **Integração de Hardware (Webhook):** Rota `/push` preparada para receber logs assíncronos de dispositivos externos (ex: ControliD).
* **Segurança de Dados:** Criptografia de ponta a ponta para credenciais e proteção de rotas privadas.

## Como Executar e Testar Localmente

### 1. Configuração do Banco de Dados
1. Abra o `pgAdmin 4` (ou seu cliente SQL).
2. Crie um novo banco de dados (ex: `presenca_db`).
3. Abra a "Query Tool" e rode o script do arquivo `setup-db.sql` para criar todas as tabelas.

### 2. Configuração do Backend
1. Clone o repositório e instale as dependências com `npm install`.
2. Crie uma cópia do arquivo `.env.example`, renomeie para `.env` e preencha a `DATABASE_URL` com as credenciais do seu PostgreSQL, além de definir uma `JWT_SECRET`.
3. Inicie o servidor com `node index.js`. (O servidor rodará na porta 3000).

### 3. Primeiro Acesso (Criação do Admin)
O banco de dados inicia sem usuários. Para acessar o painel:
1. Rode o script `node gerar-hash.js` no terminal para gerar o hash de uma senha segura.
2. Execute o seguinte comando SQL no pgAdmin para criar o primeiro administrador:
   `INSERT INTO admins (nome, email, senha_hash, role) VALUES ('Admin', 'admin@teste.com', 'SEU_HASH_AQUI', 'admin');`
3. Acesse `http://localhost:3000/login` no navegador ou utilize o Insomnia para testar os endpoints da API fazendo login na rota `/api/login/admin`.