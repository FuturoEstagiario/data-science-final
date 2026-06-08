# SmartAnalytics — Análise de Mercado de Smartphones

Projeto final de Data Science. Pipeline ETL completo em Python para análise do mercado global de smartphones, com interface Tkinter, Machine Learning e dashboard interativo.

## Funcionalidades

- **Extração** de 4 fontes: CSV (Kaggle), API REST de câmbio (EUR→BRL ao vivo), Web Scraping da Wikipedia e banco SQLite
- **Transformação** com regex, pandas, conversão de moeda e classificação por Random Forest
- **Carga** em Excel (3 abas + gráfico), PDF, HTML estático e dashboard interativo
- **Dashboard** em HTML/CSS/JS com 6 gráficos Chart.js, filtros reativos e paginação
- **Interface** Tkinter com log em tempo real e threading para não travar a UI

## Estrutura

```
data-science-final/
├── data/               # smartphones.csv + smartphones.db (SQLite)
├── etl/                # extract.py · transform.py · load.py
├── output/             # relatorio.xlsx · relatorio.pdf · relatorio.html
├── view/               # Dashboard: index.html · css/ · js/
└── main.py             # Interface Tkinter — ponto de entrada
```

## Como Usar

### 1. Instalar dependências

```bash
pip install pandas requests beautifulsoup4 scikit-learn openpyxl reportlab
```

### 2. Executar

```bash
python main.py
```

Clique em **Executar ETL Completo**. O pipeline roda automaticamente:

```
CSV → API Câmbio → Wikipedia → Limpeza → SQLite → ML → Excel + PDF + HTML + Dashboard
```

### 3. Abrir resultados

Após o ETL, os 4 botões são habilitados:

| Botão | Arquivo |
|---|---|
| Abrir Excel | `output/relatorio.xlsx` |
| Abrir PDF | `output/relatorio.pdf` |
| Abrir HTML | `output/relatorio.html` |
| Dashboard | `view/index.html` |

## Dados

- **499 smartphones** de 18 marcas (Samsung, Apple, Xiaomi, Motorola…)
- Preços convertidos de EUR para BRL com taxa ao vivo
- **Budget** ≤ R$ 1.500 · **Mid-range** R$ 1.501–4.000 · **Premium** > R$ 4.000
- Acurácia do modelo ML: **78,75% (CV)** · **82% (teste)**

## Stack

| Camada | Tecnologia |
|---|---|
| Extração | `requests`, `BeautifulSoup4`, `sqlite3`, `pandas` |
| Transformação | `re`, `pandas`, `scikit-learn` |
| Carga | `openpyxl`, `reportlab`, `json` |
| Interface | `tkinter`, `threading` |
| Dashboard | HTML5, CSS3, Vanilla JS, Chart.js 4.4 |

## Detalhamento Técnico

Consulte [`07/06-2026.md`](07/06-2026.md) para documentação completa do pipeline, arquitetura, paleta de cores e resultados.
