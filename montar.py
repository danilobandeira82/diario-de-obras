#!/usr/bin/env python3
"""Monta o app em docs/ (e na raiz) a partir de src/.  Uso:  python3 montar.py"""
import pathlib, shutil, zipfile
raiz = pathlib.Path(__file__).parent
src, dist = raiz / 'src', raiz / 'docs'   # o GitHub Pages publica a pasta docs/
dist.mkdir(exist_ok=True)
ler = lambda n: (src / n).read_text(encoding='utf-8')
js = '\n'.join(ler(n) for n in ['base.js', 'dados.js', 'app.js', 'rdo.js', 'acoes.js', 'extras.js', 'relatorios.js', 'inicio.js'])
html = f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Diário de Obras</title>
<meta name="description" content="Relatório diário de obra que funciona sem internet. Os dados ficam no aparelho.">
<meta name="theme-color" content="#1d3550">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Diário">
<link rel="manifest" href="manifest.json">
<link rel="icon" href="icone.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icone.svg">
<style>
{ler('estilo.css')}
</style>
</head>
<body>
<div id="app"></div>
<noscript>Ative o JavaScript para usar o Diário de Obras.</noscript>
<script>
{js}
</script>
</body>
</html>
"""
(dist / 'index.html').write_text(html, encoding='utf-8')
for n in ['sw.js', 'manifest.json', 'icone.svg']: shutil.copy(src / n, dist / n)
(dist / '.nojekyll').write_text('')
# cópia também na raiz: o site funciona com o Pages apontando para a raiz ou para docs/
(raiz / 'index.html').write_text(html, encoding='utf-8')
for n in ['sw.js', 'manifest.json', 'icone.svg']: shutil.copy(src / n, raiz / n)
# versão de arquivo único para mandar por zip
(raiz / 'DIARIO-DE-OBRAS.html').write_text(html, encoding='utf-8')
print(f"docs/index.html  {len(html)//1024} KB")
