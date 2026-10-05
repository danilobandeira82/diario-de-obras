# Ligar a nuvem do Diário de Obras (Google Drive)

Feito **uma vez só**, pela diretoria, **num computador**. Leva uns 10 minutos.
É grátis: usa o espaço do Google Drive da conta (15 GB numa conta Google comum).

> Use uma conta Google **da construtora** (não a pessoal de alguém), porque os diários e as fotos vão ficar no Drive dessa conta.

## 1. Criar o servidor

1. Entre em **https://script.google.com** com a conta Google da construtora.
2. Clique em **Novo projeto**.
3. Apague todo o texto que aparece e **cole o conteúdo do arquivo `Codigo.gs`**
   (abra https://github.com/danilobandeira82/diario-de-obras/blob/main/servidor/Codigo.gs, clique no botão de copiar ⧉ no alto do arquivo).
4. Na linha `const CODIGO = 'TROQUE-ESTE-CODIGO';`, troque `TROQUE-ESTE-CODIGO` pelo **código da empresa**
   — uma senha que só a equipe vai saber. Ex.: `const CODIGO = 'Obras#2026-Cascavel';`
5. Clique no nome "Projeto sem título" lá em cima e chame de **Diário de Obras**.
6. Clique no disquete (**Salvar**).

## 2. Publicar

1. Clique em **Implantar** (canto superior direito) → **Nova implantação**.
2. Na engrenagem ⚙ ao lado de "Selecionar tipo", escolha **App da Web**.
3. Preencha:
   - **Executar como:** *Eu* (a conta da construtora)
   - **Quem pode acessar:** *Qualquer pessoa*
4. Clique em **Implantar**.
5. O Google pede autorização: **Autorizar acesso** → escolha a conta →
   aparece "O Google não verificou este app" → clique em **Avançado** → **Acessar Diário de Obras (não seguro)** → **Permitir**.
   (É normal: o "app" é o seu próprio script, só mexe no seu Drive.)
6. Copie o **URL do app da Web** (termina em `/exec`).

## 3. Conectar o app

1. Abra o Diário de Obras → ⚙ **Configurações** → **Nuvem da construtora**.
2. Cole o endereço, digite o código da empresa e o seu nome → **Conectar**.
3. Toque em **Convite p/ engenheiro** e mande o link por WhatsApp para cada engenheiro.
   Ele abre o link, digita o nome e pronto — no celular e no computador.

## Onde ficam os dados

No Drive da conta, pasta **Diário de Obras (dados)**:

- **Obras — fotos e documentos / _nome da obra_ / Fotos** — as fotos, com data no nome do arquivo;
- **Obras — fotos e documentos / _nome da obra_ / Documentos** — ART, contrato etc.;
- **registros (não mexer)** — os diários em si. O app lê daqui; não apague nem renomeie.

## Se precisar trocar o código da empresa

Mude a linha `CODIGO` no script → **Implantar → Gerenciar implantações → ✏ editar → Versão: Nova versão → Implantar**.
O endereço continua o mesmo. Depois, em cada aparelho: Configurações → Desconectar → conectar de novo com o código novo
(ou mande um convite novo).

## Pastas duplicadas no Drive?

Versões antigas do servidor (1 a 3) podiam criar pastas repetidas ("registros (não mexer)", "Obras — fotos e documentos",
pastas de obra). A versão 4 não cria mais e, ao receber "Baixar tudo de novo" de um aparelho, junta o que ficou
espalhado. Não apague as duplicatas antes disso; depois, pode deixar como está ou mover o conteúdo à mão.

## Atualizar o servidor no futuro

Mesmo caminho: cole o `Codigo.gs` novo, mantenha a sua linha `CODIGO`,
**Implantar → Gerenciar implantações → ✏ → Nova versão → Implantar**. Não crie uma implantação nova (o endereço mudaria).
