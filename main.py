import os
import sys
import threading
import tkinter as tk
from tkinter import ttk, scrolledtext

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

OUTPUT_DIR  = os.path.join(BASE_DIR, 'output')
EXCEL_PATH  = os.path.join(OUTPUT_DIR, 'relatorio.xlsx')
PDF_PATH    = os.path.join(OUTPUT_DIR, 'relatorio.pdf')
HTML_PATH   = os.path.join(OUTPUT_DIR, 'relatorio.html')
DASHBOARD_PATH = os.path.join(BASE_DIR, 'view', 'index.html')


class App:
    def __init__(self, root):
        self.root = root
        root.title('Análise de Mercado — Smartphones')
        root.geometry('730x570')
        root.resizable(False, False)
        root.configure(bg='#f0f0f0')

        # Título
        tk.Label(
            root,
            text='📱 Análise de Mercado — Smartphones',
            font=('Helvetica', 14, 'bold'),
            bg='#f0f0f0', fg='#003366'
        ).pack(pady=12)

        # Botão executar
        self.btn_executar = tk.Button(
            root,
            text='▶   Executar ETL Completo',
            command=self.executar,
            bg='#2F5496', fg='white',
            font=('Helvetica', 11, 'bold'),
            padx=24, pady=8,
            relief='flat', cursor='hand2',
            activebackground='#1e3a6e', activeforeground='white'
        )
        self.btn_executar.pack(pady=4)

        # Barra de progresso
        self.progress = ttk.Progressbar(root, mode='indeterminate', length=660)
        self.progress.pack(pady=4)

        # Log
        tk.Label(root, text='Log de execução:', anchor='w',
                 bg='#f0f0f0', font=('Helvetica', 9)).pack(fill='x', padx=35)

        self.log_text = scrolledtext.ScrolledText(
            root, height=19, width=90,
            state='disabled',
            bg='#1e1e1e', fg='#d4d4d4',
            font=('Consolas', 9),
            insertbackground='white'
        )
        self.log_text.pack(padx=35, pady=4)

        # Botões de output
        frame = tk.Frame(root, bg='#f0f0f0')
        frame.pack(pady=6)

        cfg = dict(font=('Helvetica', 10), padx=14, pady=6,
                   relief='flat', cursor='hand2', state='disabled')

        self.btn_excel = tk.Button(frame, text='📊 Abrir Excel',
                                    bg='#217346', fg='white',
                                    activebackground='#155724',
                                    command=lambda: os.startfile(EXCEL_PATH), **cfg)
        self.btn_excel.pack(side='left', padx=6)

        self.btn_pdf = tk.Button(frame, text='📄 Abrir PDF',
                                  bg='#c62828', fg='white',
                                  activebackground='#7f0000',
                                  command=lambda: os.startfile(PDF_PATH), **cfg)
        self.btn_pdf.pack(side='left', padx=6)

        self.btn_html = tk.Button(frame, text='🌐 Abrir HTML',
                                   bg='#0277bd', fg='white',
                                   activebackground='#01579b',
                                   command=lambda: os.startfile(HTML_PATH), **cfg)
        self.btn_html.pack(side='left', padx=6)

        self.btn_dash = tk.Button(frame, text='📈 Dashboard',
                                   bg='#4f46e5', fg='white',
                                   activebackground='#3730a3',
                                   command=lambda: os.startfile(DASHBOARD_PATH), **cfg)
        self.btn_dash.pack(side='left', padx=6)

    # ──────────────────────────────────────────────────────────
    def log(self, msg):
        self.log_text.configure(state='normal')
        self.log_text.insert(tk.END, msg + '\n')
        self.log_text.see(tk.END)
        self.log_text.configure(state='disabled')
        self.root.update_idletasks()

    def executar(self):
        self.btn_executar.configure(state='disabled')
        self.log_text.configure(state='normal')
        self.log_text.delete('1.0', tk.END)
        self.log_text.configure(state='disabled')
        self.progress.start()
        threading.Thread(target=self._pipeline, daemon=True).start()

    def _pipeline(self):
        try:
            from etl.extract import (extrair_csv, extrair_taxa_cambio,
                                      extrair_wikipedia, salvar_sqlite, extrair_sqlite)
            from etl.transform import limpar_dados, treinar_modelo
            from etl.load import exportar_excel, exportar_pdf, exportar_html, exportar_dashboard_data

            self.log('=' * 54)
            self.log('   ANÁLISE DE MERCADO — SMARTPHONES')
            self.log('=' * 54)

            # ── EXTRACT ──────────────────────────────────────
            df_csv = extrair_csv(self.log)
            taxa   = extrair_taxa_cambio(self.log)
            df_wiki = extrair_wikipedia(self.log)

            # ── TRANSFORM ────────────────────────────────────
            df = limpar_dados(df_csv, taxa, df_wiki, self.log)

            # ── LOAD → SQLite → re-extract (3ª fonte DB) ─────
            salvar_sqlite(df, self.log)
            df_final = extrair_sqlite(self.log)

            # ── ML ───────────────────────────────────────────
            resultados = treinar_modelo(df_final, self.log)

            # ── OUTPUTS ──────────────────────────────────────
            exportar_excel(df_final, resultados, self.log)
            exportar_pdf(df_final, resultados, taxa, self.log)
            exportar_html(df_final, self.log)
            exportar_dashboard_data(df_final, resultados, taxa, self.log)

            self.log('')
            self.log('✅  ETL concluído com sucesso!')
            self.root.after(0, self._habilitar_botoes)

        except Exception as e:
            import traceback
            self.log(f'\n❌ Erro: {e}')
            self.log(traceback.format_exc())
        finally:
            self.root.after(0, self._finalizar)

    def _habilitar_botoes(self):
        for btn in (self.btn_excel, self.btn_pdf, self.btn_html, self.btn_dash):
            btn.configure(state='normal')

    def _finalizar(self):
        self.progress.stop()
        self.btn_executar.configure(state='normal')


if __name__ == '__main__':
    root = tk.Tk()
    App(root)
    root.mainloop()
