import pymysql
import base64
from mangum import Mangum
from fastapi import FastAPI, Request, Form, Depends, UploadFile, File
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware
from datetime import date, datetime

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
    "password": "1234567",
    "database": "pointback"
}


# Função para obter conexão com MySQL
def get_db():
    return pymysql.connect(**DB_CONFIG)

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    # if request.session.get("user_logged_in"):
    #     return RedirectResponse(url="/medListar", status_code=303)

    # login_error = request.session.pop("login_error", None)
    # show_login_modal = request.session.pop("show_login_modal", False)
    # nome_usuario = request.session.get("nome_usuario", None)

    return templates.TemplateResponse("index.html", {"request": request})

# @app.post("/login")
# async def login(
#     request: Request,
#     Login: str = Form(...),
#     Senha: str = Form(...),
#     db = Depends(get_db)
# ):
#     try:
#         with db.cursor() as cursor:
#
#             cursor.execute("SELECT * FROM Usuario WHERE Login = %s AND Senha = MD5(%s)", (Login, Senha))
#             user = cursor.fetchone()
#
#             if user:
#                 request.session["user_logged_in"] = True
#                 request.session["nome_usuario"] = user[1]
#                 return RedirectResponse(url="/medListar", status_code=303)
#             else:
#                 request.session["login_error"] = "Usuário ou senha inválidos."
#                 request.session["show_login_modal"] = True
#                 return RedirectResponse(url="/", status_code=303)
#     finally:
#         db.close()

@app.get("/logout")
async def logout(request: Request):
    # Encerra a sessão do usuário e retorna à página inicial.
    # request.session.clear()  # remove todos os dados de sessão
    return RedirectResponse(url="/cadastro", status_code=303)

@app.get("/cadastro", response_class=HTMLResponse)
async def cadastro(request: Request):
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
            cursor.execute(sql, (nome, cpf, dt_nasc_obj, email, senha))

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
