DROP DATABASE IF EXISTS pointback;
CREATE DATABASE pointback;
USE pointback;

CREATE TABLE produto (
  ID INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(100) NOT NULL,
  categoria VARCHAR(100) NOT NULL,
  modelo VARCHAR(100) NOT NULL,
  marca VARCHAR(100) DEFAULT NULL,
  descricao TEXT DEFAULT NULL,
  pontos INT DEFAULT NULL,
  preco DECIMAL(10, 2) DEFAULT NULL,
  imagem LONGBLOB
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE usuario (
  ID INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(50) NOT NULL,
  cpf VARCHAR(14) NOT NULL UNIQUE,
  dt_Nasc DATE DEFAULT NULL,
  email VARCHAR(50) NOT NULL UNIQUE,
  senha CHAR(60) DEFAULT NULL,
  pontos INT DEFAULT 0,
  tipo VARCHAR(50) NOT NULL,
  foto MEDIUMBLOB DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE pedido (
  ID INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  id_comprador INT NOT NULL,
  valor DECIMAL(10, 2) DEFAULT NULL,
  valor_Pontos INT DEFAULT NULL,
  dt_Pedido DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (id_comprador) REFERENCES usuario(ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE produto_pedido (
  ID INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  id_pedido INT NOT NULL,
  id_produto INT NOT NULL,
  quantidade INT NOT NULL,

  FOREIGN KEY (id_pedido) REFERENCES pedido(ID),
  FOREIGN KEY (id_produto) REFERENCES produto(ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE carrinho (
  ID INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  id_comprador INT NOT NULL,

  FOREIGN KEY (id_comprador) REFERENCES usuario(ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE produto_carrinho (
  id_carrinho INT NOT NULL,
  id_produto  INT NOT NULL,
  quantidade INT NOT NULL,

  PRIMARY KEY (id_carrinho, id_produto),
  FOREIGN KEY (id_carrinho) REFERENCES carrinho(id),
  FOREIGN KEY (id_produto)  REFERENCES produto(ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

select * from  `usuario`;