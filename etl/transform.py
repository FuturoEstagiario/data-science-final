import re
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_validate
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.pipeline import Pipeline

# Regex reutilizados do padrão atividade4
_REGEX_RAM     = re.compile(r'(\d+)/\d+GB')
_REGEX_ESPACOS = re.compile(r'\s+')


def limpar_dados(df, taxa_brl, df_wiki=None, log=print):
    log('[TRANSFORM] Iniciando limpeza...')
    df = df.copy()

    # Corrigir nulos de RAM via regex no campo Smartphone (ex: "8/256GB")
    mask_nulos = df['RAM'].isnull()
    extraidos = df.loc[mask_nulos, 'Smartphone'].str.extract(_REGEX_RAM, expand=False)
    df.loc[mask_nulos, 'RAM'] = pd.to_numeric(extraidos, errors='coerce')
    corrigidos_regex = mask_nulos.sum() - df['RAM'].isnull().sum()
    df['RAM'] = df['RAM'].fillna(df['RAM'].median())
    log(f'[TRANSFORM] RAM: {mask_nulos.sum()} nulos -> {corrigidos_regex} via regex, restantes pela mediana.')

    # Converter preço EUR → BRL
    df['Preco_BRL'] = (df['Final Price'] * taxa_brl).round(2)
    log(f'[TRANSFORM] Preços convertidos: R$ {df["Preco_BRL"].min():.2f} a R$ {df["Preco_BRL"].max():.2f}')

    # Categorizar faixa de preço
    df['Categoria'] = pd.cut(
        df['Preco_BRL'],
        bins=[0, 1500, 4000, float('inf')],
        labels=['Budget', 'Mid-range', 'Premium']
    ).astype(str)
    log(f'[TRANSFORM] Categorias: {df["Categoria"].value_counts().to_dict()}')

    # Cruzar com dados da Wikipedia: marcar marcas top-vendedoras
    if df_wiki is not None and not df_wiki.empty:
        marcas_wiki = set(df_wiki['Fabricante'].str.strip().str.lower())
        df['Top_Vendedor'] = df['Brand'].str.strip().str.lower().isin(marcas_wiki).astype(int)
        log(f'[TRANSFORM] {df["Top_Vendedor"].sum()} phones de marcas top-vendedoras (Wikipedia).')
    else:
        df['Top_Vendedor'] = 0

    # Normalizar espaços em strings (regex — padrão atividade4)
    for col in ['Brand', 'Model', 'Color']:
        df[col] = df[col].astype(str).apply(lambda x: _REGEX_ESPACOS.sub(' ', x).strip())

    log('[TRANSFORM] Limpeza concluída.')
    return df


def treinar_modelo(df, log=print):
    log('[ML] Treinando Random Forest (padrão aula8)...')
    df = df.copy()

    le = LabelEncoder()
    df['Brand_enc'] = le.fit_transform(df['Brand'].astype(str))
    df['Free_enc']  = (df['Free'] == 'Yes').astype(int)

    X = df[['RAM', 'Storage', 'Brand_enc', 'Free_enc']].to_numpy(dtype=float)
    y = df['Categoria'].astype(str).to_numpy()

    # Guardar índices para recuperar linhas de teste no relatório
    idx = np.arange(len(df))
    X_train, X_test, y_train, y_test, _, idx_test = train_test_split(
        X, y, idx, test_size=0.3, random_state=42
    )

    # Pipeline StandardScaler + RandomForest (padrão aula8/exercicio8.py)
    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('rf', RandomForestClassifier(n_estimators=100, random_state=42))
    ])

    cv = cross_validate(pipeline, X, y, cv=5, scoring={'accuracy': 'accuracy'})
    acc_cv = round(cv['test_accuracy'].mean(), 4)
    log(f'[ML] Acurácia cross-validation 5-fold: {acc_cv:.2%}')

    pipeline.fit(X_train, y_train)
    previsoes = pipeline.predict(X_test)
    acc_teste = round(sum(p == r for p, r in zip(previsoes, y_test)) / len(y_test), 4)
    log(f'[ML] Acurácia no conjunto de teste: {acc_teste:.2%}')

    return {
        'acc_cv':    acc_cv,
        'acc_teste': acc_teste,
        'y_test':    y_test,
        'previsoes': previsoes,
        'df_test':   df.iloc[idx_test].reset_index(drop=True),
    }
