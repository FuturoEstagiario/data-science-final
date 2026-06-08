import os
import sqlite3
import requests
import pandas as pd
from bs4 import BeautifulSoup

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH  = os.path.join(BASE_DIR, 'data', 'smartphones.csv')
DB_PATH   = os.path.join(BASE_DIR, 'data', 'smartphones.db')

EXCHANGE_URL = 'https://open.er-api.com/v6/latest/EUR'
WIKI_URL     = 'https://en.wikipedia.org/wiki/List_of_best-selling_mobile_phones'
HEADERS      = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}


def extrair_csv(log=print):
    log('[CSV] Lendo smartphones.csv...')
    df = pd.read_csv(CSV_PATH)
    log(f'[CSV] {len(df)} registos carregados | Colunas: {list(df.columns)}')
    return df


def extrair_taxa_cambio(log=print):
    log('[API] Buscando taxa EUR -> BRL em open.er-api.com...')
    try:
        r = requests.get(EXCHANGE_URL, headers=HEADERS, timeout=10)
        r.raise_for_status()
        taxa = r.json()['rates']['BRL']
        log(f'[API] Taxa obtida: 1 EUR = R$ {taxa:.4f}')
        return taxa
    except Exception as e:
        log(f'[API] Falha: {e} — usando fallback R$ 5.90.')
        return 5.90


def extrair_wikipedia(log=print):
    log('[WEB] Raspando Wikipedia — telefones mais vendidos...')
    try:
        r = requests.get(WIKI_URL, headers=HEADERS, timeout=15)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, 'html.parser')
        tabela = soup.find('table', {'class': 'wikitable'})
        if not tabela:
            log('[WEB] Tabela não encontrada.')
            return pd.DataFrame()
        dados = []
        for tr in tabela.find_all('tr')[1:]:
            cols = [td.get_text(strip=True) for td in tr.find_all(['th', 'td'])]
            if len(cols) >= 2:
                dados.append({'Fabricante': cols[0], 'Modelo_Wiki': cols[1]})
        df = pd.DataFrame(dados)
        log(f'[WEB] {len(df)} registos extraídos da Wikipedia.')
        return df
    except Exception as e:
        log(f'[WEB] Erro: {e}')
        return pd.DataFrame()


def salvar_sqlite(df, log=print):
    log('[DB] Salvando dados transformados no SQLite...')
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    df.to_sql('smartphones', conn, if_exists='replace', index=False)
    conn.close()
    log(f'[DB] {len(df)} registos gravados em smartphones.db.')


def extrair_sqlite(log=print):
    log('[DB] Lendo dados do SQLite (3ª fonte)...')
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql('SELECT * FROM smartphones', conn)
    conn.close()
    log(f'[DB] {len(df)} registos carregados do banco de dados.')
    return df
