import pymysql
import base64
from mangum import Mangum
from fastapi import FastAPI, Request, Form, Depends, UploadFile, File, HTTPException
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
    "password": "1234567",
    "database": "pointback"
}


# função para conectar com MySQL
def get_db():
    return pymysql.connect(**DB_CONFIG)


def is_user_logged_in(request: Request) -> bool:
    return "user_id" in request.session


def get_user_from_session(request: Request):
    # retorna o usuario se encontrado, com base no user_id fornecido
    user_id = request.session.get("user_id")
    if not user_id:
        return None

    db = get_db()
    try:
        with db.cursor() as cursor:
            cursor.execute(
                "SELECT nome, cpf, dt_Nasc, email, pontos, tipo FROM usuario WHERE ID = %s",
                (user_id,)
            )
            row = cursor.fetchone()
            if row:
                user = {
                    "id": user_id,
                    "nome": row[0],
                    "cpf": row[1],
                    "dt_nasc": row[2],
                    "email": row[3],
                    "pontos": row[4],
                    "admin": row[5] == 'admin'
                }
                return user
    finally:
        db.close()
    return None



@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    user = get_user_from_session(request)
    return templates.TemplateResponse("index.html", {"request": request, "user": user})
@app.get("/logout")
async def logout(request: Request):
    # limpa a sessao
    request.session.clear()
    # encerra a sessão e retorna para a pagina inicial
    return RedirectResponse(url="/cadastro", status_code=303)

@app.get("/cadastro", response_class=HTMLResponse)
async def cadastro(request: Request):
    print(request.session)
    if request.session.get("user_id"):
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
            cursor.execute("SELECT ID FROM usuario WHERE cpf = %s", (cpf,))
            if cursor.fetchone():
                request.session["nao_autenticado"] = True
                request.session["mensagem_header"] = "Cadastro"
                request.session["mensagem"] = "Erro: Este CPF já está em uso!"
                return RedirectResponse(url="/", status_code=303)

            # insere o usuario no banco de dados
            sql = "INSERT INTO usuario (nome, cpf, dt_Nasc, email, senha, tipo) VALUES (%s, %s, %s, %s, %s, %s)"
            senha_bytes = senha.encode('utf-8')  # Converte a senha para bytes
            salt = bcrypt.gensalt()  #gera salt aleatório
            senha_hash = bcrypt.hashpw(senha_bytes, salt)  # Gera o hash da senha
            cursor.execute(sql, (nome, cpf, dt_nasc_obj, email, senha_hash, "usuario"))

            db.commit()

            request.session["nao_autenticado"] = True
            request.session["mensagem_header"] = "Cadastro"
            request.session["mensagem"] = "Registro cadastrado com sucesso! Você já pode realizar login."

            cursor.execute("SELECT id FROM usuario WHERE email = %s", (email,))
            result = cursor.fetchone()

            request.session["user_id"] = result
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
            cursor.execute("SELECT id, senha FROM usuario WHERE email = %s", (loginEmail,))
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
    user = get_user_from_session(request)
    return templates.TemplateResponse("tela_produto.html", {"request": request, "user": user})

@app.post("/reset_session")
async def reset_session(request: Request):
    request.session.pop("mensagem_header", None)
    request.session.pop("mensagem", None)
    return {"status": "ok"}

@app.get("/perfil", response_class=HTMLResponse)
async def perfil(request: Request):
    if "user_id" in request.session:
        user = get_user_from_session(request)
        return templates.TemplateResponse("perfil.html",  {"request": request, "user": user})
    return RedirectResponse(url="/", status_code=303)

@app.post("/editar_usuario")
async def editar_usuario(
    request: Request,
    nome: str = Form(...),
    dataNascimento: str = Form(...),
    email: str = Form(...),
    db=Depends(get_db)
):
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Usuário não autenticado.")

    try:
        dt_nasc_obj = datetime.strptime(dataNascimento, "%d/%m/%Y").date()
    except ValueError:
        request.session["nao_autenticado"] = True
        request.session["mensagem_header"] = "Editar Perfil"
        request.session["mensagem"] = "Erro: Formato de data inválido."
        return RedirectResponse(url="/", status_code=303)

    try:
        with db.cursor() as cursor:
            sql = """
                UPDATE usuario
                SET nome = %s,
                    dt_Nasc = %s,
                    email = %s
                WHERE ID = %s
            """
            cursor.execute(sql, (nome, dt_nasc_obj, email, user_id))
            db.commit()

            request.session["mensagem_header"] = "Editar Perfil"
            request.session["mensagem"] = "Perfil atualizado com sucesso!"
            return RedirectResponse(url="/", status_code=303)

    except Exception as e:
        request.session["mensagem_header"] = "Editar Perfil"
        request.session["mensagem"] = f"Erro ao atualizar: {str(e)}"
        print(f"Erro ao atualizar: {str(e)}")
        return RedirectResponse(url="/", status_code=303)

    finally:
        db.close()


# rotas adm
@app.get("/adm/usuarios", response_class=HTMLResponse)
async def adm_usuarios(request: Request, db=Depends(get_db)):
    if "user_id" in request.session:
        user = get_user_from_session(request)
        print(user)
        if user['admin'] == True:
            try:
                with db.cursor() as cursor:
                    cursor.execute("""
                        SELECT id, nome, cpf, dt_nasc, email, pontos, tipo
                        FROM usuario
                    """)
                    result = cursor.fetchall()
                    usersList = [
                        {
                            "id": row[0],
                            "nome": row[1],
                            "cpf": row[2],
                            "dt_nasc": row[3],
                            "email": row[4],
                            "pontos": row[5],
                            "tipo": row[6],
                        }
                        for row in result
                    ]

                return templates.TemplateResponse(
                    "adm_usuarios.html",
                    {
                        "request": request,
                        "user": user,
                        "usersList": usersList
                    }
                )
            except Exception as e:
                print(f"Erro ao buscar usuários: {e}")
                return RedirectResponse(url="/", status_code=303)
            finally:
                db.close()

        return RedirectResponse(url="/", status_code=303)
    return RedirectResponse(url="/", status_code=303)

@app.post("/adm/editar_usuario")
async def adm_editar_usuario(
    id: int = Form(...),
    nome: str = Form(...),
    cpf: str = Form(...),
    dataNascimento: str = Form(...),
    email: str = Form(...),
    pontos: int = Form(...),
    tipo: str = Form(...),
    db=Depends(get_db)
):
    try:
        dt_nasc_obj = datetime.strptime(dataNascimento, "%d/%m/%Y").date()

        with db.cursor() as cursor:
            cursor.execute("""
                UPDATE usuario
                SET nome = %s,
                    cpf = %s,
                    dt_Nasc = %s,
                    email = %s,
                    pontos = %s,
                    tipo = %s
                WHERE id = %s
            """, (nome, cpf, dt_nasc_obj, email, pontos, tipo, id))
            
            db.commit()
        return RedirectResponse(url="/adm/usuarios", status_code=303)

    except Exception as e:
        print(f"Erro ao editar usuário: {e}")
        raise HTTPException(status_code=500, detail="Erro ao editar usuário.")
    finally:
        db.close()

@app.post("/adm/excluir_usuario")
async def adm_excluir_usuario(
    id: int = Form(...),
    db=Depends(get_db)
):
    try:
        with db.cursor() as cursor:
            cursor.execute("DELETE FROM usuario WHERE id = %s", (id,))
            db.commit()
        return RedirectResponse(url="/adm/usuarios", status_code=303)

    except Exception as e:
        print(f"Erro ao excluir usuário: {e}")
        raise HTTPException(status_code=500, detail="Erro ao excluir usuário.")
    finally:
        db.close()

Mangum(app)
