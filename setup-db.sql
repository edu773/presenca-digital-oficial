-- === SCRIPT DE SETUP DO BANCO DE DADOS - PRESENÇA DIGITAL ===
-- Este script APAGA TUDO e recria o banco do zero.

-- 1. APAGA TUDO 
DROP TABLE IF EXISTS presencas CASCADE;
DROP TABLE IF EXISTS eventos CASCADE;
DROP TABLE IF EXISTS alunos CASCADE;
DROP TABLE IF EXISTS turmas CASCADE;
DROP TABLE IF EXISTS disciplinas CASCADE;
DROP TABLE IF EXISTS salas_dispositivos CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

-- 2. Recria as tabelas "pai" 
CREATE TABLE admins (
  id serial PRIMARY KEY,
  nome text,
  email text UNIQUE,
  senha_hash text,
  role text NOT NULL DEFAULT 'admin'
);

CREATE TABLE turmas (
  id serial PRIMARY KEY,
  nome text UNIQUE
);

CREATE TABLE disciplinas (
  id serial PRIMARY KEY,
  nome text UNIQUE
);

CREATE TABLE salas_dispositivos (
  id serial PRIMARY KEY,
  nome text,
  dispositivo_id text UNIQUE
);

-- 3. Recria a tabela ALUNOS (com a coluna 'turma_id')
CREATE TABLE alunos (
  id serial PRIMARY KEY,
  nome text,
  matricula text UNIQUE,
  controlid_user_id bigint UNIQUE,
  email text UNIQUE,
  senha_hash text,
  turma_id INT REFERENCES turmas(id)
);

-- 4. Recria as tabelas "filhas"
CREATE TABLE eventos (
  id serial PRIMARY KEY,
  sala_id int REFERENCES salas_dispositivos(id),
  professor_id int REFERENCES admins(id),
  turma_id int REFERENCES turmas(id),
  disciplina_id int REFERENCES disciplinas(id),
  inicio timestamptz,
  fim timestamptz
);

CREATE TABLE presencas (
  id serial PRIMARY KEY,
  evento_id int REFERENCES eventos(id),
  aluno_id int REFERENCES alunos(id),
  entrada timestamptz,
  saida timestamptz,
  registrado_por_dispositivo int REFERENCES salas_dispositivos(id)
);

-- 5. Insere os DADOS DE TESTE INICIAIS
INSERT INTO salas_dispositivos (nome, dispositivo_id) VALUES
('Sala 1', '99'),
('Sala 2', '100'),
('Sala 3', '101');

INSERT INTO turmas (nome) VALUES
('Turma A'),
('Turma B'),
('Turma C');

INSERT INTO disciplinas (nome) VALUES
('Matemática'),
('Geografia'),
('História');