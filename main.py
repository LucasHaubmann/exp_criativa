import pymysql
import base64
from mangum import Mangum
from fastapi import FastAPI, Request, Form, Depends, UploadFile, File, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse, Response, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware
from datetime import date, datetime
import bcrypt
import hashlib
import traceback

app = FastAPI()

app.add_middleware(SessionMiddleware, secret_key="123456")

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")
templates.env.filters['b64encode'] = lambda b: base64.b64encode(b).decode('utf-8') if b else ''

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
    user_id = request.session.get("user_id")
    if not user_id:
        return None

    db = get_db()
    try:
        with db.cursor() as cursor:
            cursor.execute(
                "SELECT nome, cpf, dt_Nasc, email, pontos, tipo, foto FROM usuario WHERE ID = %s",
                (user_id,)
            )
            row = cursor.fetchone()
            if row:
                print(f"✅ Foto carregada do banco: {'sim' if row[6] else 'não'}")
                user = {
                    "id": user_id,
                    "nome": row[0],
                    "cpf": row[1],
                    "dt_nasc": row[2],
                    "email": row[3],
                    "pontos": row[4],
                    "admin": row[5] == 'admin',
                    "foto": row[6]
                }
                return user
            else:
                print("⚠️ Usuário não encontrado no banco.")
    finally:
        db.close()
    return None

@app.get("/", response_class=HTMLResponse)
async def index(request: Request, db=Depends(get_db)):
    user = get_user_from_session(request)

    try:
        with db.cursor() as cursor:
            cursor.execute("""
                SELECT id, modelo, preco, pontos, imagem
                FROM produto
            """)
            result = cursor.fetchall()
            produtos = [
                {
                    "id": row[0],
                    "nome": row[1],
                    "preco": row[2],
                    "pontos": row[3],
                    "imagem_url": f"/imagem/{row[0]}"
                }
                for row in result
            ] if result else []
    except Exception as e:
        print(f"Erro ao buscar produtos: {e}")
        produtos = []

    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "user": user,
            "produtos": produtos
        }
    )
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

            with open("static/imagens/default-profile.png", "rb") as f:
                default_foto = f.read()

        # ✅ PRIMEIRO gera o hash!
            senha_bytes = senha.encode('utf-8')  # Converte a senha para bytes
            salt = bcrypt.gensalt()             # Gera salt aleatório
            senha_hash = bcrypt.hashpw(senha_bytes, salt)  # Gera o hash da senha

            sql = "INSERT INTO usuario (nome, cpf, dt_Nasc, email, senha, tipo, foto) VALUES (%s, %s, %s, %s, %s, %s, %s)"
            cursor.execute(sql, (nome, cpf, dt_nasc_obj, email, senha_hash, "usuario", default_foto))

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
async def inventario(request: Request, db=Depends(get_db)):
    try:
        with db.cursor() as cursor:
            cursor.execute("""
                SELECT id, modelo, preco, pontos, imagem
                FROM produto
            """)
            result = cursor.fetchall()
            produtos = [
                {
                    "id": row[0],
                    "nome": row[1],  # modelo -> nome para facilitar no HTML
                    "preco": row[2],
                    "pontos": row[3],
                    "imagem_url": f"/imagem/{row[0]}" 
                }
                for row in result
            ]

        return templates.TemplateResponse(
            "inventario.html",
            {
                "request": request,
                "produtos": produtos
            }
        )
    except Exception as e:
        print(f"Erro ao buscar produtos: {e}")
        return RedirectResponse(url="/", status_code=303)
    finally:
        db.close()

@app.post("/carrinho/retirar")
def retirar_produto_carrinho(
    request: Request,
    id_produto: int = Form(...),
    quantidade: int = Form(...),  
    db=Depends(get_db),
):
    user = get_user_from_session(request)
    if not user:
        return RedirectResponse("/login", status_code=303)

    usuario_id = user["id"]

    cursor = db.cursor()

    cursor.execute("SELECT ID FROM carrinho WHERE id_comprador = %s", (usuario_id,))
    carrinho = cursor.fetchone()

    if not carrinho:
        cursor.close()
        return RedirectResponse("/carrinho", status_code=303) 

    carrinho_id = carrinho[0]


    cursor.execute(
        "SELECT quantidade FROM produto_carrinho WHERE id_carrinho = %s AND id_produto = %s",
        (carrinho_id, id_produto)
    )
    item = cursor.fetchone()

    if not item:
        cursor.close()
        return RedirectResponse("/carrinho", status_code=303) 

    quantidade_atual = item[0]

    if quantidade_atual <= quantidade:
       
        cursor.execute(
            "DELETE FROM produto_carrinho WHERE id_carrinho = %s AND id_produto = %s",
            (carrinho_id, id_produto)
        )
    else:
      
        nova_quantidade = quantidade_atual - quantidade
        cursor.execute(
            "UPDATE produto_carrinho SET quantidade = %s WHERE id_carrinho = %s AND id_produto = %s",
            (nova_quantidade, carrinho_id, id_produto)
        )

    db.commit()
    cursor.close()

    return RedirectResponse("/carrinho", status_code=303)



@app.post("/carrinho/adicionar")
def adicionar_carrinho(
    request: Request,
    id_produto: int = Form(...),
    quantidade: int = Form(...),
    db=Depends(get_db),
):
    user = get_user_from_session(request)
    if not user:
        return RedirectResponse("/login", status_code=303)
    usuario_id = user["id"] 

    cursor = db.cursor()

    cursor.execute(
        "SELECT ID FROM carrinho WHERE id_comprador = %s", (usuario_id,)
    )
    carrinho = cursor.fetchone()

    if not carrinho:
        cursor.execute(
            "INSERT INTO carrinho (id_comprador) VALUES (%s)", (usuario_id,)
        )
        db.commit()
        cursor.execute("SELECT LAST_INSERT_ID()")
        carrinho_id = cursor.fetchone()[0]
    else:
        carrinho_id = carrinho[0]

    cursor.execute(
        "SELECT quantidade FROM produto_carrinho WHERE id_carrinho = %s AND id_produto = %s",
        (carrinho_id, id_produto)
    )
    item = cursor.fetchone()

    if item:
        nova_qtd = item[0] + quantidade
        cursor.execute(
            "UPDATE produto_carrinho SET quantidade = %s WHERE id_carrinho = %s AND id_produto = %s",
            (nova_qtd, carrinho_id, id_produto)
        )
    else:
        cursor.execute(
            "INSERT INTO produto_carrinho (id_carrinho, id_produto, quantidade) VALUES (%s, %s, %s)",
            (carrinho_id, id_produto, quantidade)
        )

    db.commit()
    cursor.close()

    return RedirectResponse("/carrinho", status_code=303)


def limpar_carrinho(user_id: int, db):
    with db.cursor() as cursor:
        # Pega o ID do carrinho do usuário
        cursor.execute("SELECT ID FROM carrinho WHERE id_comprador = %s", (user_id,))
        carrinho = cursor.fetchone()

        if carrinho:
            id_carrinho = carrinho[0]

            # Apaga os produtos vinculados ao carrinho
            cursor.execute("DELETE FROM produto_carrinho WHERE id_carrinho = %s", (id_carrinho,))

            # Apaga o carrinho
            cursor.execute("DELETE FROM carrinho WHERE ID = %s", (id_carrinho,))

            db.commit()

@app.get("/carrinho", response_class=HTMLResponse)
async def ver_carrinho(request: Request):
    user = get_user_from_session(request)

    if not user:
        return RedirectResponse(url="/cadastro", status_code=303)

    produtos = []

    try:
        db = get_db()
        with db.cursor(pymysql.cursors.DictCursor) as cursor:
            cursor.execute("SELECT ID FROM carrinho WHERE id_comprador = %s", (user["id"],))
            carrinho = cursor.fetchone()

            if carrinho:
                id_carrinho = carrinho["ID"]

                cursor.execute("""
                    SELECT 
                        p.ID, p.nome, p.modelo, p.marca, p.categoria, 
                        p.pontos, p.preco, pc.quantidade
                    FROM produto_carrinho pc
                    JOIN produto p ON pc.id_produto = p.ID
                    WHERE pc.id_carrinho = %s
                """, (id_carrinho,))
                produtos = cursor.fetchall()

                for produto in produtos:
                    produto["imagem_url"] = f"/imagem/{produto['ID']}"

    finally:
        db.close()

    total_pontos = sum(p["pontos"] * p["quantidade"] for p in produtos if p["pontos"])
    total_dinheiro = sum(p["preco"] * p["quantidade"] for p in produtos if p["preco"])

    return templates.TemplateResponse("carrinho.html", {
        "request": request,
        "user": user,
        "produtos": produtos,
        "total_pontos": total_pontos,
        "total_dinheiro": total_dinheiro
    })



@app.post("/pagar/pontos", response_class=HTMLResponse)
async def pontos(request: Request, pontos_gastos: int = Form(...)):
    usuario = get_user_from_session(request)
    return templates.TemplateResponse("compra_pontos.html", {
        "request": request,
        "pontos_gastos": pontos_gastos,
        "pontos_usuario": usuario["pontos"]
    })


@app.post("/confirmar_pagamento_pontos")
async def confirmar_pagamento_pontos(
    request: Request,
    pontos_gastos: int = Form(...),
    db=Depends(get_db)
):
    try:
        user = get_user_from_session(request)
        if not user:
            return JSONResponse(status_code=401, content={"status": "erro", "mensagem": "Usuário não autenticado"})

        with db.cursor() as cursor:
            cursor.execute(
                "UPDATE usuario SET pontos = pontos - %s WHERE id = %s AND pontos >= %s",
                (pontos_gastos, user["id"], pontos_gastos)
            )

            db.commit()
            limpar_carrinho(user["id"], db)
        return JSONResponse(content={"status": "sucesso", "mensagem": "Pontos descontados com sucesso!"})

    except Exception as e:
        print(f"Erro ao descontar pontos: {e}")
        return JSONResponse(status_code=500, content={"status": "erro", "mensagem": "Erro no servidor"})


@app.post("/pagar/dinheiro", response_class=HTMLResponse)
async def dinheiro(
    request: Request,
    total_dinheiro: float = Form(...),
    pontos_gerados: int = Form(...)
):
    return templates.TemplateResponse("compra_dinheiro.html", {
        "request": request,
        "total_dinheiro": total_dinheiro,
        "pontos_gerados": pontos_gerados
    })


@app.post("/registrar_pagamento")
async def registrar_pagamento(
    request: Request,
    pontos_gerados: int = Form(...),
    db=Depends(get_db)
):
    try:
        user = get_user_from_session(request)
        if not user:
            return JSONResponse(status_code=401, content={"status": "erro", "mensagem": "Usuário não autenticado"})

        with db.cursor() as cursor:
            cursor.execute(
                "UPDATE usuario SET pontos = pontos + %s WHERE ID = %s",
                (pontos_gerados, user["id"])
            )
            db.commit()
            limpar_carrinho(user["id"], db)
        return JSONResponse(content={"status": "sucesso", "mensagem": "Pagamento efetuado com sucesso!"})
    except Exception as e:
        print(f"Erro ao registrar pagamento: {e}")
        return JSONResponse(status_code=500, content={"status": "erro", "mensagem": "Erro no servidor"})


@app.get("/imagem/{produto_id}")
async def imagem_produto(produto_id: int, db=Depends(get_db)):
    try:
        with db.cursor() as cursor:
            cursor.execute("SELECT imagem FROM produto WHERE id = %s", (produto_id,))
            result = cursor.fetchone()
            if result and result[0]:
                return Response(content=result[0], media_type="image/jpeg")
            else:
                return Response(status_code=404)
    finally:
        db.close()

@app.get("/atendimento", response_class=HTMLResponse)
async def atendimento(request: Request):
    return templates.TemplateResponse("atendimento.html", {"request": request})

@app.get("/cadastro_produto", response_class=HTMLResponse)
async def cadastro_produto(request: Request):
    return templates.TemplateResponse("cadastro_produto.html", {"request": request})

@app.post("/cadastro_produto")
async def post_cadastro_produto(
    request: Request,
    categoria: str = Form(...),
    nome: str = Form(...),
    modelo: str = Form(...),
    marca: str = Form(...),
    descricao: str = Form(...),
    preco: float = Form(...),
    pontos: int = Form(...),
    imagem: UploadFile = File(...),
    db=Depends(get_db)
):
    print("a")
    try:
        imagem_bytes = await imagem.read()

        with db.cursor() as cursor:
            query = """
               INSERT INTO produto (nome, categoria, modelo, marca, descricao, preco, pontos, imagem)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(query, (nome, categoria, modelo, marca, descricao, preco, pontos, imagem_bytes))
            db.commit()

        return RedirectResponse(url="/inventario", status_code=303)

    except Exception as e:
        print("Erro ao salvar produto:", e)
        traceback.print_exc()
        return RedirectResponse(url="/cadastro_produto", status_code=303)
    finally:
        db.close()


@app.get("/tela_produto/{produto_id}", response_class=HTMLResponse)
async def tela_produto(request: Request, produto_id: int, db=Depends(get_db)):
    user = get_user_from_session(request)

    produto = None
    try:
        with db.cursor() as cursor:
            cursor.execute("""
                SELECT id, categoria, modelo, marca, descricao, pontos, preco, imagem
                FROM produto
                WHERE id = %s
            """, (produto_id,))
            row = cursor.fetchone()
            if row:
                produto = {
                    "id": row[0],
                    "categoria": row[1],
                    "nome": row[2],
                    "marca": row[3],
                    "descricao": row[4],
                    "pontos": row[5],
                    "preco": row[6],
                    "imagem_url": f"/imagem/{row[0]}"
                }
    except Exception as e:
        print("Erro ao buscar produto:", e)

    if not produto:
        return templates.TemplateResponse(
            "index.html",  # ou uma página de erro personalizada
            {"request": request, "mensagem": "Produto não encontrado"}
        )

    return templates.TemplateResponse(
        "tela_produto.html",
        {
            "request": request,
            "user": user,
            "produto": produto
        }
    )

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
    foto: UploadFile = File(None),
    db = Depends(get_db)
):
    user_id = request.session.get("user_id")
    print("➡️ Recebendo dados no /editar_usuario")

    if not user_id:
        print("❌ Usuário não autenticado.")
        raise HTTPException(status_code=401, detail="Usuário não autenticado.")

    try:
        dt_nasc_obj = datetime.strptime(dataNascimento, "%d/%m/%Y").date()
    except ValueError:
        print("❌ Data de nascimento inválida.")
        return RedirectResponse(url="/perfil", status_code=303)

    try:
        with db.cursor() as cursor:
            print("➡️ Atualizando usuário com ou sem foto...")
            if foto and foto.filename:
                print(f"✅ Foto recebida: {foto.filename}")
                foto_bytes = await foto.read()
                print(f"✅ Tamanho da foto recebida: {len(foto_bytes)} bytes")

                sql = """
                    UPDATE usuario
                    SET nome = %s,
                        dt_Nasc = %s,
                        email = %s,
                        foto = %s
                    WHERE ID = %s
                """
                cursor.execute(sql, (nome, dt_nasc_obj, email, foto_bytes, user_id))
            else:
                print("⚠️ Nenhuma foto enviada.")
                sql = """
                    UPDATE usuario
                    SET nome = %s,
                        dt_Nasc = %s,
                        email = %s
                    WHERE ID = %s
                """
                cursor.execute(sql, (nome, dt_nasc_obj, email, user_id))

            db.commit()
            print("✅ Atualização feita com sucesso no banco.")
        return RedirectResponse(url="/perfil", status_code=303)
    except Exception as e:
        print(f"❌ Erro ao atualizar: {str(e)}")
        return RedirectResponse(url="/perfil", status_code=303)
    finally:
        db.close()

@app.get("/tela_compra", response_class=HTMLResponse)
async def tela_compra(request: Request):
    return templates.TemplateResponse("tela_compra.html", {"request": request})



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
