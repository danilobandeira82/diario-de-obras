# Diário de Obras

Relatório diário de obra (RDO) que funciona **sem internet**. Os dados ficam no aparelho de quem usa — celular, tablet ou computador. Nada é enviado para servidor nenhum.

## O que faz

- **Um dia = uma página.** Expediente e clima, mão de obra, serviços, equipamentos, fotos, ocorrências, segurança, materiais, visitas, observações e assinaturas, em blocos.
- **Começar copiando o dia anterior** — traz equipe, equipamentos e os serviços que ficaram em andamento.
- **Equipe padrão da obra** — as funções já aparecem prontas; o engenheiro só ajusta a quantidade com − e +.
- **Escolher em vez de digitar** — frente de serviço, tipo de ocorrência, tema do DDS, motivo da visita, clima por ícone.
- **Nada é obrigatório.** Cada bloco pode ser marcado como "nada hoje". Ao concluir, o app mostra o que ficou em branco e deixa fechar assim mesmo.
- **Assinatura no dedo** do responsável técnico e, opcionalmente, da fiscalização.
- **Clima automático** pelo nome da cidade (usa internet só ao tocar no botão; fonte: Open-Meteo).
- **Calendário colorido** — fechado, sem expediente, rascunho, dia sem lançamento.
- **Resumo da obra** — dias sem lançamento, efetivo médio, dias de chuva, ocorrências, impacto no prazo.
- **PDF em folha A4** com logo da construtora — um dia por folha, fotos na folha seguinte (até 6 por folha, sem recorte).
- **Planilha Excel (.xlsx)** com abas Diários, Serviços, Mão de obra, Ocorrências e Fotos.
- **Cópia de segurança** em um arquivo `.json` com tudo (textos, fotos, assinaturas, documentos) e restauração em qualquer aparelho.
- **Seções configuráveis por obra** — desligue o que a obra não precisa.

## Onde ficam os dados

No banco interno do navegador (IndexedDB) do aparelho. Isso significa:

- funciona offline e não tem mensalidade;
- **cada aparelho é um diário separado** — combine um aparelho por obra;
- limpar os dados do navegador apaga o diário — **salve a cópia de segurança toda semana** (Configurações → Salvar cópia).

## Publicar no GitHub Pages

1. Suba este repositório no GitHub.
2. *Settings → Pages → Build and deployment*: **Deploy from a branch**, branch `main`, pasta **`/docs`**.
3. O endereço fica `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.

> **Mantenha sempre o mesmo endereço.** O navegador amarra os dados ao endereço do site; se ele mudar, os diários deixam de aparecer (continuam guardados no endereço antigo).

No celular: abrir o endereço → *Adicionar à tela de início*. Abre em tela cheia e funciona sem internet.

## Usar sem site

O arquivo `DIARIO-DE-OBRAS.html` é o app inteiro num arquivo só. Extraia do zip e abra no Google Chrome ou Microsoft Edge.

## Desenvolvimento

O código fica em `src/`. Para gerar `docs/` e o arquivo único:

```bash
python3 montar.py
```

| Arquivo | Conteúdo |
|---|---|
| `src/estilo.css` | visual |
| `src/base.js` | utilitários, ícones e banco local |
| `src/dados.js` | listas (funções, equipamentos, frentes, ocorrências…) |
| `src/app.js` | navegação, início, obra, calendário, resumo, cadastro, configurações |
| `src/rdo.js` | a tela do dia |
| `src/acoes.js` | tratamento de cliques e digitação |
| `src/extras.js` | clima automático, assinatura, cópia de segurança, obra de exemplo |
| `src/relatorios.js` | PDF (semana, mês, ano; com ou sem fotos) e Excel |
