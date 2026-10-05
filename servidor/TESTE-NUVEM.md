# Roteiro de teste da nuvem (Google Drive de verdade)

Serve para conferir, num computador com acesso à conta Google da construtora, que a sincronização
funciona de ponta a ponta. Pode ser feito por uma pessoa ou colado como tarefa para o Claude (Cowork)
com o navegador conectado.

Dados necessários: o **código da empresa** (o mesmo da linha `CODIGO` do script) e o endereço do app:
`https://danilobandeira82.github.io/diario-de-obras/`.

## 0. Servidor atualizado?

1. Abra `https://script.google.com`, projeto **Diário de Obras**. Confira que a linha de versão é
   `const VERSAO_SERVIDOR = 5;`. Se for menor, cole o `Codigo.gs` novo (mantendo a linha `CODIGO`),
   salve e faça **Implantar → Gerenciar implantações → ✏ → Nova versão → Implantar**.
2. Abra o endereço `/exec` do app da Web no navegador. Deve aparecer um texto JSON com
   `"versao":5` e `"Servidor do Diário de Obras funcionando."`. Se aparecer uma página de login do Google
   ou "você precisa de acesso", a implantação não está como **Qualquer pessoa**.
3. No app, em cada aparelho: ⚙ Configurações → Nuvem da construtora → **Testar conexão**. Todas as linhas
   devem começar com ✔. Anote os tempos (ms) e o número de registros. Depois toque em **Baixar tudo de novo**
   (o servidor aproveita para arrumar o que versões antigas tenham espalhado em pastas duplicadas no Drive).

## 1. Aparelho A (uma janela normal do navegador)

1. Abra o app. Deve aparecer a tela **Entrar no Diário de Obras**. Digite o código e o nome `Teste A` → **Entrar**.
   - Esperado: faixa verde **☁ Tudo salvo na nuvem** na tela inicial.
   - Erro "Código da empresa errado" → o código digitado não bate com o do script.
2. Toque em **Cadastrar obra e começar**. Nome: `Obra Teste Nuvem`, início hoje, prazo 100 → **Cadastrar obra**.
3. No calendário, toque no dia de hoje. Marque Manhã = Bom, Tarde = Chuva, Pedreiro = 3.
   Adicione uma foto (qualquer imagem). Espere o canto do cabeçalho mostrar **Salvo na nuvem ✓**.
4. No Google Drive (`drive.google.com`), confira: pasta **Diário de Obras (dados)** →
   **Obras — fotos e documentos → Obra Teste Nuvem [...] → Fotos** tem a foto;
   **registros (não mexer)** tem arquivos `obras__...json`, `rdos__...json` e `indice dos registros (não mexer).json`.

## 2. Aparelho B (janela anônima do navegador = outro aparelho)

1. Abra o app numa **janela anônima**. Entre com o código e o nome `Teste B`.
2. Esperado em até 30 s: a obra **Obra Teste Nuvem** aparece, o dia de hoje está preenchido
   (Bom / Chuva / 3 pedreiros) e a foto aparece na aba Fotos.
3. Em B, mude Pedreiro para 5. Espere **Salvo na nuvem ✓**.
4. Volte para A e espere até 2 minutos (o app consulta o servidor a cada minuto; pode também tocar em
   ⚙ Configurações → **Sincronizar agora**). Esperado: Pedreiro = 5 em A.
5. Em B, ⚙ Configurações → Nuvem da construtora → **Última sincronização** mostra data e hora de agora.

## 3. Sem internet

1. Em A, desligue a internet (modo avião ou desconecte o Wi-Fi). Abra o dia de hoje e marque Servente = 4.
   Esperado no cabeçalho: **Sem internet · salvo no aparelho**.
2. Religue a internet. Em até 1 minuto: **Salvo na nuvem ✓**. Em B (espere até 2 minutos ou **Sincronizar agora**): Servente = 4
   **e Pedreiro continua 5** (as alterações de A e de B são juntadas campo a campo).

## 4. PDF e exclusão

1. Em B, aba **Relatórios** → período "Obra inteira" → **Salvar PDF**. Deve baixar um PDF com capa + 1 folha do dia + 1 folha de fotos.
2. Em A, aba **Obra** → **Excluir obra** → **Excluir tudo**. Em B (até 2 minutos ou **Sincronizar agora**): a obra sumiu.
3. No Drive, em **registros (não mexer) → lixeira**, devem existir cópias `obras__...` e `rdos__...` com data e hora no nome.
   A foto continua em **Fotos** (fotos nunca são apagadas do Drive).

## Resultado

Se todos os passos deram o esperado, a nuvem está funcionando. Caso contrário, anote o passo que falhou,
o texto exato de qualquer mensagem do app e, em ⚙ Configurações → Nuvem da construtora, transcreva a faixa de
status, "Última sincronização", o resultado de **Testar conexão** e as linhas de **Últimas conversas com o servidor**.
