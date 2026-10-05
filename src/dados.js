/* =====================================================================
 * LISTAS — tudo que dá para escolher em vez de digitar
 * ===================================================================== */
const FUNCOES = ['Engenheiro civil','Técnico em segurança','Mestre de obras','Contramestre','Encarregado',
  'Almoxarife','Apontador','Topógrafo','Ajudante de topógrafo','Pedreiro','Meio oficial','Servente',
  'Carpinteiro','Armador','Encarregado de armação','Eletricista','Ajudante de elétrica','Encanador',
  'Ajudante de encanador','Pintor','Ajudante de pintor','Gesseiro','Azulejista','Granitina',
  'Instalador de esquadrias','Montador de andaime','Ajudante de concreto','Soldador','Impermeabilizador',
  'Operador de retroescavadeira','Operador Bobcat','Operador de bomba','Operador de munck',
  'Operador de guindaste','Operador de máq. de fundação','Motorista','Vigia','Zelador'];

const EQUIPE_PADRAO = ['Mestre de obras','Pedreiro','Servente','Carpinteiro','Armador','Eletricista','Encanador'];

const EQUIPAMENTOS = ['Betoneira','Vibrador de imersão','Serra circular','Policorte','Martelete',
  'Furadeira/parafusadeira','Andaime (conjunto)','Guincho de coluna','Elevador cremalheira','Grua',
  'Bomba de concreto','Caminhão munck','Caminhão basculante','Retroescavadeira','Escavadeira','Bobcat',
  'Rolo compactador','Compactador (sapo)','Gerador','Empilhadeira','Máquina de fundação'];

const EQUIP_PADRAO = ['Betoneira','Vibrador de imersão','Serra circular','Andaime (conjunto)'];

const FRENTES = ['Canteiro e serviços preliminares','Demolição','Terraplenagem','Fundação','Estrutura',
  'Alvenaria','Cobertura','Impermeabilização','Instalações elétricas','Instalações hidrossanitárias',
  'Incêndio','Climatização','Esquadrias','Revestimento','Forro','Piso','Pintura','Louças e metais',
  'Área externa','Limpeza','Outro'];

const STATUS_ATIV = [['iniciada','Iniciada'],['andamento','Em andamento'],['concluida','Concluída'],['parada','Parada']];

const OCORRENCIAS = ['Chuva','Falta de material','Falta de mão de obra','Equipamento quebrado',
  'Projeto indefinido','Alteração de projeto','Interferência','Retrabalho','Impedimento do contratante',
  'Acidente','Atraso de fornecedor','Outro'];

const TEMAS_DDS = ['Uso de EPI','Trabalho em altura','Ordem e limpeza','Ferramentas','Riscos elétricos',
  'Escavações','Andaimes','Movimentação de cargas','Prevenção de incêndio','Primeiros socorros','Outro'];

const MOTIVOS_PARADA = ['Sábado','Domingo','Feriado','Chuva','Falta de material','Falta de frente',
  'Determinação da fiscalização','Paralisação contratual','Outro'];

const MOTIVOS_VISITA = ['Fiscalização','Medição','Reunião','Vistoria','Entrega de material','Laboratório','Outro'];

const CLIMA = [['bom','Bom','sol'],['nublado','Nublado','nuvem'],['chuva','Chuva','chuva'],['impraticavel','Impraticável','tempestade']];

const TIPOS_DOC = ['Contrato','ART/RRT','Alvará','Projeto','Cronograma','Ordem de serviço','Outro'];
const DOCS_EXIGIDOS = ['Contrato','ART/RRT'];

/* Seções do diário. Cada obra liga/desliga as suas. */
const SECOES = [
  ['clima',        'Expediente e clima',   'sol'],
  ['maoDeObra',    'Mão de obra',          'pessoas'],
  ['atividades',   'Serviços do dia',      'lista'],
  ['equipamentos', 'Equipamentos',         'caminhao'],
  ['fotos',        'Fotos',                'camera'],
  ['ocorrencias',  'Ocorrências',          'alerta'],
  ['seguranca',    'Segurança',            'capacete'],
  ['materiais',    'Materiais recebidos',  'caixa'],
  ['visitas',      'Visitas e fiscalização','visita'],
  ['observacoes',  'Observações',          'texto'],
  ['assinaturas',  'Assinaturas',          'caneta']
];
const SECOES_PADRAO = { clima:true, maoDeObra:true, atividades:true, equipamentos:true, fotos:true,
  ocorrencias:true, seguranca:true, materiais:false, visitas:false, observacoes:true, assinaturas:true };
