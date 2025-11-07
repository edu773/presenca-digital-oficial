\#  Presença Digital 



Este é o repositório do projeto "Presença Digital", um sistema full-stack de gerenciamento de presença biométrica.



O sistema é composto por um backend Node.js (Express), um banco de dados PostgreSQL e um frontend em HTML/CSS/JS puro.





\##  Como Rodar (Ambiente de Desenvolvimento)



Siga estes passos para rodar o projeto localmente.



\### 1. Pré-requisitos



\* \[Node.js](https://nodejs.org/) (que inclui o `npm`)

\* \[PostgreSQL](https://www.postgresql.org/download/) (banco de dados)



\### 2. Configuração do Banco de Dados



1\.  Verifique se o seu serviço do PostgreSQL está rodando.

2\.  Abra o `pgAdmin 4` (ou seu cliente SQL preferido).

3\.  Crie um novo banco de dados (ex: `presenca\_db`).

4\.  Abra a "Query Tool" para este novo banco e rode o script SQL que está no arquivo `setup-db.sql` para criar todas as tabelas.



\### 3. Configuração do Backend (Servidor)



1\.  \*\*Clone o repositório\*\* (ou baixe os arquivos).

2\.  \*\*Instale as dependências:\*\*

&nbsp;   ```bash

&nbsp;   npm install

&nbsp;   ```

3\.  \*\*Configure as Variáveis de Ambiente:\*\*

&nbsp;   \* Crie uma cópia do arquivo `.env.example` e renomeie-a para `.env`.

&nbsp;   \* Abra o novo `.env` e preencha suas credenciais do PostgreSQL (usuário, senha, nome do banco) na linha `DATABASE\_URL`.

&nbsp;   \* (Opcional) Mude a `JWT\_SECRET` para uma string aleatória de sua preferência.



\### 4. Rodando o Projeto



1\.  \*\*Ligue o servidor:\*\*

&nbsp;   ```bash

&nbsp;   node index.js

&nbsp;   ```

2\.  O terminal deve mostrar: `Servidor "Presença Digital" rodando na porta 3000`.

3\.  \*\*Acesse o aplicativo:\*\*

&nbsp;   \* Abra seu navegador e acesse: `http://localhost:3000/login`



---



\##  Como Usar (Primeiro Login)



O banco de dados começa \*sem\* usuários. Você precisa se registrar.



\* \*\*Primeiro Admin:\*\*

&nbsp;   1.  O script de setup (infelizmente) não cria um admin. Você precisará criar seu primeiro "admin" manualmente no `pgAdmin`.

&nbsp;   2.  Use o `node gerar-hash.js` (script temporário) para criar um hash para uma senha (ex: "admin123").

&nbsp;   3.  Rode este SQL no `pgAdmin`:

&nbsp;       ```sql

&nbsp;       INSERT INTO admins (nome, email, senha\_hash, role) 

&nbsp;       VALUES ('Admin', 'admin@teste.com', 'SEU\_HASH\_AQUI', 'admin');

&nbsp;       ```

\* \*\*Primeiro Aluno:\*\*

&nbsp;   1.  Faça login como o Admin que você acabou de criar.

&nbsp;   2.  Navegue para o "Menu do Administrador".

&nbsp;   3.  Clique em "Registrar Novo Aluno" e cadastre seu primeiro aluno pelo app web.

