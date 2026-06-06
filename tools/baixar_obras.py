#!/usr/bin/env python3
"""
baixar_obras.py — Downloader e indexador de obras de Chico Xavier
=================================================================
Tenta baixar o texto das obras do oconsolador.com.br e outras fontes
públicas, e cria um índice JSON para busca em texto completo no site.

Dependências obrigatórias:
    pip install requests beautifulsoup4

Dependência opcional (suporte a PDF):
    pip install pdfplumber

Uso:
    # Baixa todas as obras da base local
    python3 tools/baixar_obras.py

    # Testa com os 5 primeiros livros
    python3 tools/baixar_obras.py --limite 5

    # Força re-download de tudo
    python3 tools/baixar_obras.py --forcar

    # Tenta uma URL específica para um livro (debug)
    python3 tools/baixar_obras.py --url https://... --titulo "Nosso Lar"

Resultado:
    data/textos/<id>-<slug>.json   — texto e capítulos de cada livro
    data/textos/_manifest.json     — índice com status de cada obra

Fontes tentadas (em ordem):
  1. oconsolador.com.br  — biblioteca virtual (pode bloquear bots)
  2. febnet.org.br        — site da FEB
  3. URL já cadastrada    — campo "url" em chico_xavier_data.js

Aviso legal:
  Use apenas para obras de distribuição livre/gratuita.
  Respeite os Termos de Uso dos sites e o intervalo entre requisições.
"""

import argparse
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urljoin

# ── Dependências opcionais ────────────────────────────────────────────────────

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Instale: pip install requests beautifulsoup4")
    sys.exit(1)

try:
    import pdfplumber
    import io as _io
    HAS_PDF = True
except ImportError:
    HAS_PDF = False


# ── Configuração ──────────────────────────────────────────────────────────────

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
}

BASE_OCONSOLADOR = "https://www.oconsolador.com.br"
LISTA_URL = f"{BASE_OCONSOLADOR}/linkfixo/bibliotecavirtual/chicoxavier/listacronologica.html"

ROOT       = Path(__file__).parent.parent
SAIDA      = ROOT / "data" / "textos"
DADOS_JS   = ROOT / "data" / "chico_xavier_data.js"
INTERVALO  = 2.5  # segundos entre requisições — respeite o servidor!
MIN_PALAVRAS = 100  # descarta textos muito curtos (cabeçalhos, erros de parsing)


# ── Utilitários ───────────────────────────────────────────────────────────────

def slugify(s: str) -> str:
    """Converte título em slug para nome de arquivo."""
    trocas = str.maketrans("áàãâäéèêëíìîïóòõôöúùûüç", "aaaaaaeeeeiiiiooooouuuuc")
    s = s.lower().strip().translate(trocas)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")[:60]


def get(url: str, session: requests.Session, tentativas: int = 3) -> "requests.Response | None":
    for i in range(tentativas):
        try:
            r = session.get(url, headers=HEADERS, timeout=25)
            if r.status_code == 200:
                return r
            print(f"    HTTP {r.status_code}: {url}")
            return None
        except requests.exceptions.RequestException as e:
            if i < tentativas - 1:
                time.sleep(2 ** i)
            else:
                print(f"    Erro de rede: {e}")
    return None


def limpar_texto(soup: BeautifulSoup) -> str:
    for tag in soup.find_all(["script", "style", "nav", "header", "footer",
                               "form", "iframe", "aside", "figure"]):
        tag.decompose()
    texto = soup.get_text(separator="\n")
    linhas = [l.strip() for l in texto.splitlines()]
    linhas = [l for l in linhas if l and len(l) > 3]
    return "\n".join(linhas)


def extrair_capitulos(texto: str, titulo_livro: str) -> list:
    """
    Detecta capítulos por padrões comuns em literatura espírita.
    Retorna lista de {'num', 'titulo', 'texto'}.
    """
    pad = re.compile(
        r"^\s*(cap[ií]tulo\s+[\w\d]+|cap\.\s*\d+|parte\s+[\w\d]+|"
        r"[IVXLCDM]+\s*[—\-\.]\s*\w|[\d]{1,2}\s*[—\-]\s*\w)",
        re.IGNORECASE
    )
    linhas = texto.splitlines()
    caps = []
    atual = {"num": 0, "titulo": titulo_livro, "linhas": []}

    for linha in linhas:
        if pad.match(linha) and len(linha) < 120:
            if len(" ".join(atual["linhas"]).split()) > 10:
                caps.append({
                    "num":    atual["num"],
                    "titulo": atual["titulo"],
                    "texto":  " ".join(atual["linhas"]).strip(),
                })
            atual = {"num": len(caps) + 1, "titulo": linha.strip(), "linhas": []}
        else:
            atual["linhas"].append(linha)

    if atual["linhas"]:
        caps.append({
            "num":    atual["num"],
            "titulo": atual["titulo"],
            "texto":  " ".join(atual["linhas"]).strip(),
        })

    # Se não encontrou capítulos, retorna texto inteiro
    if len(caps) <= 1:
        return [{"num": 0, "titulo": titulo_livro, "texto": texto.strip()}]
    return caps


# ── Processadores ─────────────────────────────────────────────────────────────

def processar_html(r: "requests.Response", titulo: str) -> "dict | None":
    soup = BeautifulSoup(r.text, "html.parser")
    texto = limpar_texto(soup)
    palavras = len(texto.split())
    if palavras < MIN_PALAVRAS:
        return None
    caps = extrair_capitulos(texto, titulo)
    return {
        "texto_completo": texto,
        "capitulos":      caps,
        "palavras":       palavras,
        "paginas":        None,
    }


def processar_pdf(r: "requests.Response", titulo: str) -> "dict | None":
    if not HAS_PDF:
        print("    PDF encontrado mas pdfplumber não instalado. (pip install pdfplumber)")
        return None
    try:
        paginas_texto = []
        with pdfplumber.open(_io.BytesIO(r.content)) as pdf:
            for pg in pdf.pages:
                t = pg.extract_text()
                if t:
                    paginas_texto.append(t.strip())
        texto = "\n\n".join(paginas_texto)
        palavras = len(texto.split())
        if palavras < MIN_PALAVRAS:
            return None
        caps = extrair_capitulos(texto, titulo)
        return {
            "texto_completo": texto,
            "capitulos":      caps,
            "palavras":       palavras,
            "paginas":        len(paginas_texto),
        }
    except Exception as e:
        print(f"    Erro ao parsear PDF: {e}")
        return None


def baixar(url: str, titulo: str, session: requests.Session) -> "dict | None":
    r = get(url, session)
    if not r:
        return None
    ct = r.headers.get("Content-Type", "")
    if "pdf" in ct.lower() or url.lower().endswith(".pdf"):
        resultado = processar_pdf(r, titulo)
    else:
        resultado = processar_html(r, titulo)
    if resultado:
        resultado["fonte"] = url
    return resultado


# ── Leitura dos dados locais ──────────────────────────────────────────────────

def carregar_obras() -> list:
    if not DADOS_JS.exists():
        print(f"Não encontrei {DADOS_JS}")
        print("Execute este script a partir da raiz do projeto.")
        sys.exit(1)
    conteudo = DADOS_JS.read_text(encoding="utf-8")
    m = re.search(r"window\.CHICO_XAVIER_DATA\s*=\s*(\[[\s\S]*?\]);", conteudo)
    if not m:
        print("Formato inesperado em chico_xavier_data.js")
        sys.exit(1)
    return json.loads(m.group(1))


# ── Scraper do Oconsolador ────────────────────────────────────────────────────

def mapear_oconsolador(session: requests.Session) -> dict:
    """
    Tenta obter o mapa título→URL a partir da lista cronológica.
    Retorna dicionário {titulo_lower: url}.
    """
    print("Consultando lista do Oconsolador…")
    r = get(LISTA_URL, session)
    if not r:
        print("  Não foi possível acessar o Oconsolador (403 ou sem rede).")
        return {}
    soup = BeautifulSoup(r.text, "html.parser")
    mapa = {}
    for a in soup.find_all("a", href=True):
        titulo = a.get_text(strip=True)
        if len(titulo) < 3:
            continue
        href = a["href"]
        if "chicoxavier" in href or "bibliotecavirtual" in href:
            url = urljoin(BASE_OCONSOLADOR, href)
            mapa[titulo.lower()] = url
    print(f"  {len(mapa)} livros mapeados na lista online.")
    return mapa


def gerar_urls(obra: dict, mapa_online: dict) -> list:
    """Gera lista de URLs candidatas para uma obra, do mais ao menos provável."""
    titulo = obra.get("titulo", "")
    slug   = slugify(titulo)
    urls   = []

    # 1. URL já cadastrada na base
    if obra.get("url"):
        urls.append(obra["url"])

    # 2. URL encontrada no scrape do Oconsolador
    chave = titulo.lower()
    if chave in mapa_online:
        urls.append(mapa_online[chave])

    # 3. Tentativas heurísticas no Oconsolador
    urls += [
        f"{BASE_OCONSOLADOR}/linkfixo/bibliotecavirtual/chicoxavier/{slug}.html",
        f"{BASE_OCONSOLADOR}/linkfixo/bibliotecavirtual/chicoxavier/{slug}/index.html",
        f"{BASE_OCONSOLADOR}/linkfixo/bibliotecavirtual/chicoxavier/{slug}/{slug}.html",
    ]

    # 4. FEB (PDFs)
    urls += [
        f"https://www.febnet.org.br/ba/file/downlivros/{slug}.pdf",
        f"https://www.febnet.org.br/ba/file/downlivros/{titulo.replace(' ','_')}.pdf",
    ]

    # Remove duplicatas mantendo ordem
    visto = set()
    return [u for u in urls if not (u in visto or visto.add(u))]


# ── Principal ─────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--limite", type=int, default=0,
                        help="Processa apenas N obras (0 = todas)")
    parser.add_argument("--forcar",  action="store_true",
                        help="Baixa novamente mesmo se arquivo já existe")
    parser.add_argument("--verbose", action="store_true",
                        help="Mostra URLs tentadas")
    parser.add_argument("--url",    metavar="URL",
                        help="URL específica para testar (use com --titulo)")
    parser.add_argument("--titulo", metavar="TÍTULO",
                        help="Título ao usar --url")
    args = parser.parse_args()

    SAIDA.mkdir(parents=True, exist_ok=True)

    session = requests.Session()
    session.headers.update(HEADERS)

    # ── Modo teste de URL única ──
    if args.url:
        titulo = args.titulo or "Teste"
        print(f"Testando URL: {args.url}")
        resultado = baixar(args.url, titulo, session)
        if resultado:
            print(f"✓ {resultado['palavras']:,} palavras extraídas")
            print(resultado["texto_completo"][:500])
        else:
            print("✗ Não foi possível extrair texto.")
        return

    # ── Modo normal ──
    obras = carregar_obras()
    print(f"Base local: {len(obras)} obras")

    mapa_online = mapear_oconsolador(session)

    if args.limite:
        obras = obras[:args.limite]
        print(f"Modo teste: {args.limite} obra(s)")

    resultados   = {"ok": 0, "falhou": 0, "pulou": 0}
    manifest     = []

    for obra in obras:
        oid    = obra.get("id", 0)
        titulo = obra.get("titulo", "?")
        slug   = slugify(titulo)
        arquivo = SAIDA / f"{oid:03d}-{slug}.json"

        if arquivo.exists() and not args.forcar:
            resultados["pulou"] += 1
            manifest.append({"id": oid, "titulo": titulo,
                              "arquivo": arquivo.name, "status": "cached"})
            continue

        print(f"\n[{oid:3d}] {titulo}")
        urls = gerar_urls(obra, mapa_online)
        dado = None

        for url in urls:
            if args.verbose:
                print(f"     → {url}")
            dado = baixar(url, titulo, session)
            if dado:
                print(f"     ✓ {dado['palavras']:,} palavras | {len(dado['capitulos'])} seção(ões)")
                break
            time.sleep(0.8)

        if dado:
            dado.update({"id": oid, "titulo": titulo})
            arquivo.write_text(
                json.dumps(dado, ensure_ascii=False, indent=2),
                encoding="utf-8"
            )
            manifest.append({"id": oid, "titulo": titulo, "arquivo": arquivo.name,
                              "status": "ok", "palavras": dado["palavras"]})
            resultados["ok"] += 1
        else:
            print(f"     ✗ não disponível online")
            manifest.append({"id": oid, "titulo": titulo,
                              "arquivo": None, "status": "falhou"})
            resultados["falhou"] += 1

        time.sleep(INTERVALO)

    # Salva manifesto
    (SAIDA / "_manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    print("\n" + "=" * 56)
    print(f"  ✓ Baixados:    {resultados['ok']}")
    print(f"  ✗ Indisponíveis: {resultados['falhou']}")
    print(f"  ↩ Já existiam: {resultados['pulou']}")
    print(f"  Arquivos em:   {SAIDA.relative_to(ROOT)}/")
    print("=" * 56)

    if resultados["ok"] == 0 and resultados["falhou"] > 0:
        print()
        print("Dica: se todos falharam, os sites podem estar bloqueando bots.")
        print("Opções:")
        print("  1. Abra o livro no browser, salve como HTML e coloque em:")
        print("     data/textos/html/<id>-<slug>.html")
        print("  2. Baixe os PDFs manualmente e rode:")
        print("     python3 tools/baixar_obras.py --url arquivo.pdf --titulo 'Título'")
        print("  3. Use --verbose para ver quais URLs foram tentadas.")


if __name__ == "__main__":
    main()
