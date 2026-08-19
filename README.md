# Presença Digital - API REST

Uma API RESTful robusta desenvolvida para gerenciamento de presenças escolares e acadêmicas, com suporte à integração direta com hardwares de controle de acesso (catracas/relógios de ponto).

## Visão Geral
Este projeto atua como o motor back-end de um sistema de gestão educacional. Ele gerencia a autenticação de usuários (professores e alunos), controle de turmas, disciplinas e processa webhooks em tempo real enviados por dispositivos IoT para registrar entradas e saídas automaticamente.

## Tecnologias Utilizadas
* **Ambiente:** Node.js
* **Framework Web:** Express.js
* **Banco de Dados:** PostgreSQL
* **Segurança:** Autenticação via tokens JWT (JSON Web Tokens) e hash de senhas com bcryptjs.
* **Testes de API:** Insomnia / Postman

## Principais Funcionalidades
* **Controle de Acesso Baseado em Regras (RBAC):** Middlewares customizados (`checkAuth`, `checkRole`) para garantir que rotas administrativas sejam acessadas apenas por usuários autorizados.
* **Integração de Hardware (Webhook):** Rota `/push` preparada para receber e interpretar logs assíncronos de dispositivos externos (ex: ControliD).
* **Segurança de Dados:** Criptografia de ponta a ponta para credenciais e proteção de rotas privadas.

## Como Testar a API (via Insomnia)
Para testar as rotas da API em seu ambiente local utilizando o Insomnia:

1. **Inicie o servidor:** Rode `node index.js` (ou `npm start`). O servidor rodará na porta 3000.
2. **Autenticação (Login):** 
   - Faça um `POST` para `/api/login/admin` enviando `email` e `password` no formato JSON.
   - Copie o `token` JWT retornado na resposta.
3. **Rotas Protegidas:**
   - Para testar rotas como `POST /api/iniciar-aula` ou `GET /api/alunos`, vá na aba "Auth" do Insomnia, selecione "Bearer Token" e cole o token JWT.
   - Envie o JSON com os dados necessários no corpo (Body) da requisição.