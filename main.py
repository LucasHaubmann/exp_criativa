import pymysql
import base64
from mangum import Mangum
from fastapi import FastAPI, Request, Form, Depends, UploadFile, File
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware
from datetime import date, datetime
import bcrypt
import hashlib

app = FastAPI()

# Configuração de sessão (chave secreta para cookies de sessão)
app.add_middleware(SessionMiddleware, secret_key="123456")

# Configuração de arquivos estáticos
app.mount("/static", StaticFiles(directory="static"), name="static")

# Configuração de templates Jinja2
templates = Jinja2Templates(directory="templates")

# Configuração do banco de dados
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "6540",
    "database": "pointback"
}


# função para conectar com MySQL
def get_db():
    return pymysql.connect(**DB_CONFIG)


def is_user_logged_in(request: Request) -> bool:
    return "user_id" in request.session


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/logout")
async def logout(request: Request):
    # limpa a sessao
    request.session.clear()
    # encerra a sessão e retorna para a pagina inicial
    return RedirectResponse(url="/cadastro", status_code=303)

@app.get("/cadastro", response_class=HTMLResponse)
async def cadastro(request: Request):
    if "user_id" in request.session:
        return RedirectResponse(url="/", status_code=303)
    return templates.TemplateResponse("telaCadastroLogin.html", {"request": request})

@app.post("/cadastro", name="cadastro")
async def cadastrar_usuario(
    request: Request,
    nome: str = Form(...),
    cpf: str = Form(...),
    dataNascimento: str = Form(...),
    email: str = Form(...),
    senha: str = Form(...),
    db = Depends(get_db)
):
    try:
        dt_nasc_obj = datetime.strptime(dataNascimento, "%d/%m/%Y").date()
    except ValueError:
        request.session["nao_autenticado"] = True
        request.session["mensagem_header"] = "Cadastro"
        request.session["mensagem"] = "Erro: Formato de data inválido."
        return RedirectResponse(url="/", status_code=303)
    try:
        with db.cursor() as cursor:
            #verifica se ja existe conta com mesmo cpf
            cursor.execute("SELECT ID FROM usuarios WHERE cpf = %s", (cpf,))
            if cursor.fetchone():
                request.session["nao_autenticado"] = True
                request.session["mensagem_header"] = "Cadastro"
                request.session["mensagem"] = "Erro: Este CPF já está em uso!"
                return RedirectResponse(url="/", status_code=303)

            # insere o usuario no banco de dados
            sql = "INSERT INTO usuarios (nome, cpf, dt_Nasc, email, senha) VALUES (%s, %s, %s, %s, %s)"
            senha_bytes = senha.encode('utf-8')  # Converte a senha para bytes
            salt = bcrypt.gensalt()  #gera salt aleatório
            senha_hash = bcrypt.hashpw(senha_bytes, salt)  # Gera o hash da senha
            cursor.execute(sql, (nome, cpf, dt_nasc_obj, email, senha_hash))

            db.commit()

            request.session["nao_autenticado"] = True
            request.session["mensagem_header"] = "Cadastro"
            request.session["mensagem"] = "Registro cadastrado com sucesso! Você já pode realizar login."
            return RedirectResponse(url="/", status_code=303)

    except Exception as e:
        request.session["nao_autenticado"] = True
        request.session["mensagem_header"] = "Cadastro"
        request.session["mensagem"] = f"Erro ao cadastrar: {str(e)}"
        print(f"Erro ao cadastrar: {str(e)}")
        return RedirectResponse(url="/", status_code=303)

    finally:
        db.close()


@app.post("/login")
async def login(
    request: Request,
    loginEmail: str = Form(...),
    senhaLogin: str = Form(...),
    db=Depends(get_db)
):
    try:
        with db.cursor() as cursor:
            # pega a senha em hash no bd
            cursor.execute("SELECT id, senha FROM usuarios WHERE email = %s", (loginEmail,))
            result = cursor.fetchone()
            if result:
                user_id, senha_hash = result
                # verifica se a senha fornecida corresponde ao hash armazenado
                if bcrypt.checkpw(senhaLogin.encode('utf-8'), senha_hash.encode('utf-8')):
                    # inicia a sessao
                    request.session["user_id"] = user_id
                    return RedirectResponse(url="/", status_code=303)
            # credenciais invalidas
            return RedirectResponse(url="/cadastro", status_code=303)
    finally:
        db.close()


@app.get("/inventario", response_class=HTMLResponse)
async def inventario(request: Request):

    return templates.TemplateResponse("inventario.html", {"request": request})


@app.get("/cadastro_produto", response_class=HTMLResponse)
async def cadastro_produto(request: Request):
    return templates.TemplateResponse("cadastro_produto.html", {"request": request})


@app.get("/tela_produto", response_class=HTMLResponse)
async def tela_produto(request: Request):
    return templates.TemplateResponse("tela_produto.html", {"request": request})

@app.post("/reset_session")
async def reset_session(request: Request):
    request.session.pop("mensagem_header", None)
    request.session.pop("mensagem", None)
    return {"status": "ok"}

Mangum(app)
