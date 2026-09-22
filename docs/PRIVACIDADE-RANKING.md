# Privacidade do ranking de apoiadores — V48.3.8

Este documento registra o procedimento interno simplificado para o ranking. Ele não substitui avaliação jurídica quando um caso concreto exigir.

## 1. Finalidade e minimização

O ranking reconhece apoiadores da comunidade por meio de **identificador de exibição + valor acumulado**. O projeto não precisa de CPF, documento civil, telefone, endereço, e-mail do doador ou dados bancários para essa finalidade e não deve criar esses campos apenas para verificar o ranking.

O valor recebido em `donation.name` é tratado como **identificador de exibição autodeclarado e não autenticado**. Não deve ser descrito como nome verificado, identidade civil ou chave única de pessoa natural.


## 2. Expectativa contextual e base do tratamento

O ranking é documentado sob o **legítimo interesse** de reconhecer apoiadores e manter uma funcionalidade comunitária, com minimização de dados e possibilidade de ocultação pública.

A expectativa contextual é reforçada pelas próprias funcionalidades das plataformas de contribuição: o Pixie oferece ranking público de apoiadores como recurso nativo e o LivePix oferece alertas/integrações voltados à exibição de contribuições em transmissões. Isso não deve ser descrito como uma autorização irrestrita dos terceiros nem como consentimento específico ao ranking deste site. A concordância do usuário com os termos de LivePix/Pixie rege o tratamento realizado por essas plataformas; o tratamento do projeto continua sujeito à própria Política de Privacidade.

Salvaguardas consideradas no balanceamento:

- somente identificador de exibição e valor acumulado são necessários à exibição pública;
- o projeto não verifica nem tenta descobrir identidade civil por trás do identificador;
- não há enriquecimento do identificador com outras bases;
- existe canal de contato e possibilidade de exibição pública como **Anônimo**;
- o identificador não é aceito como prova de titularidade de registros internos.

## 3. Limitação de identidade

- pessoas diferentes podem informar exatamente o mesmo identificador;
- uma mesma pessoa pode usar identificadores diferentes;
- alguém pode informar texto associado a terceiro ou tentar se passar por outra pessoa;
- o Worker agrega contribuições que possuem o mesmo texto, mas essa soma é apenas uma regra do ranking e **não comprova que pertencem à mesma pessoa**;
- o projeto não deve enriquecer esse texto com outras bases para tentar descobrir identidade civil.

## 4. Contestação da exibição pública

Quando alguém relatar que um identificador a expõe, aparenta personificação ou não deveria permanecer público:

1. registrar a solicitação recebida em `contato@kamylisumire.com` com o mínimo de contexto necessário;
2. avaliar se a contestação é plausível e se há abuso evidente do canal;
3. quando adequado, adicionar o identificador a `RANKING_PRIVATE_NAMES`;
4. confirmar que a API pública passa a responder **Anônimo** para esse identificador;
5. não alterar valor, posição ou totais internos apenas para efetuar a ocultação pública.

A ocultação preventiva é uma medida de privacidade/moderação. **Ela não reconhece o solicitante como autor da contribuição nem como titular de todos os registros agregados sob aquele texto.**

## 5. Pedidos sobre registros internos

Conhecer, usar ou alegar ser a pessoa associada ao identificador exibido **não é autenticação suficiente** para receber dados internos, corrigir totais ou excluir registros. Como o modelo agrega por texto e não mantém uma identidade verificada, remover todo o identificador pode afetar contribuições de pessoas diferentes.

Para pedidos formais de acesso, correção ou eliminação:

1. nunca entregar ou alterar dados internos apenas pela coincidência do identificador;
2. pedir somente informações adicionais proporcionais que estejam disponíveis e possam ajudar a relacionar o solicitante ao tratamento concreto;
3. não solicitar documento civil por padrão e não criar coleta permanente de documentos para essa finalidade;
4. quando não for possível estabelecer associação segura a uma única pessoa, registrar essa limitação e não divulgar dados de terceiros;
5. a possibilidade de exibição pública como **Anônimo** permanece separada desse processo e pode ser aplicada como medida preventiva.

## 6. Retenção e cache

- `localStorage`: cache do Top 5 com validade máxima de 30 minutos; enquanto o site executa, há remoção programada e revalidação em retomada/foco/visibilidade; expirado, é removido e nunca usado como fallback;
- totais mensais: acompanham o período corrente;
- totais históricos agregados: podem existir enquanto o ranking histórico estiver ativo;
- a saída pública aplica `RANKING_PRIVATE_NAMES` sem apagar automaticamente os totais internos.

## 7. Linguagem pública obrigatória

Preferir:

- “identificador de exibição”;
- “nome, apelido ou pseudônimo informado na contribuição”;
- “identificador não verificado como identidade civil”;
- “exibição como Anônimo”.

Evitar:

- “nome verificado do doador”;
- “dono do nome”;
- “essa pessoa realizou a doação” quando a única evidência for `donation.name`;
- prometer exclusão de todos os registros apenas mediante indicação do identificador exibido.
