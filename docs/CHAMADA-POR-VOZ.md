# Chamada de voz nas partidas multiplayer

O Yugioh segue o desenho usado no Navestar: um daemon WebSocket PHP opcional acorda o outro jogador, enquanto os estados de chamada e os sinais WebRTC ficam persistidos no MySQL. Se o socket cair, o jogo continua pela API e pelo polling. O servidor nao grava nem retransmite o audio.

## Banco de dados

Envie os arquivos novos. No primeiro acesso ao multiplayer, o jogo aplica automaticamente as migrations 002, 003 e 004 no banco configurado em `.env`; o usuario MySQL precisa ter permissao para criar tabelas e adicionar colunas. Como alternativa, execute `php bin/console.php migrate` ou importe os arquivos SQL 002, 003 e 004 em ordem pelo phpMyAdmin, uma unica vez cada.

## Configurar o socket

No `.env` do servidor, configure uma chave aleatoria persistente, uma porta livre e a URL WSS do proxy reverso:

- `VOICE_SOCKET_SECRET`: segredo com pelo menos 32 caracteres. Gere com `php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"`.
- `VOICE_SOCKET_PORT`: porta local do daemon, por exemplo `8091`.
- `VOICE_WS_URL`: URL publica `wss://` encaminhada pelo proxy reverso para `127.0.0.1:8091`.

O proxy precisa terminar TLS e encaminhar o upgrade WebSocket. O script PHP atende conexoes sem TLS. A origem do navegador e validada contra o host configurado em `APP_URL`. Guarde o segredo apenas no `.env`, que ja esta no `.gitignore`.

## Iniciar o processo

Para desenvolvimento, execute `php bin/voice-socket.php` na raiz do projeto. No servidor, use o mesmo supervisor de processos que mantem o socket do Navestar ativo. O daemon precisa continuar rodando depois que o terminal for fechado. Se estiver indisponivel, as chamadas ainda sinalizam pelo MySQL, com mais atraso.

## Usar o canal nos celulares

O telefone controla somente a participacao local: um toque ativa microfone e escuta; outro toque desativa a voz naquele celular. O segundo jogador toca no proprio telefone para entrar no mesmo canal, sem modal para atender. Ativacoes simultaneas usam a mesma chamada. O anfitriao pode ativar a voz ainda na sala de espera. Silenciar o microfone e um controle separado.

A API e o MySQL mantem a sinalizacao mesmo sem WebSocket. Ao voltar do WhatsApp, a sincronizacao e retomada. O indicador so diz conectado depois de o WebRTC estabelecer a conexao.

## Redes diferentes e TURN

STUN sozinho pode nao atravessar CGNAT ou redes restritivas. Para completar essas conexoes, configure no `.env` as credenciais de um servidor TURN:

```dotenv
VOICE_TURN_URLS=turn:seu-servidor:3478?transport=udp,turns:seu-servidor:5349?transport=tcp
VOICE_TURN_USERNAME=seu-usuario
VOICE_TURN_PASSWORD=sua-senha
```

As credenciais devem corresponder a um servico TURN real. As variaveis ja sao lidas pela API; nao e necessario alterar o codigo. O botao nao instala um servidor TURN na hospedagem. O WebSocket tambem nao retransmite audio.

Validacao automatica: `npm run test:multiplayer`. O teste cobre duas sessoes HTTP, turnos e tabuleiro sincronizados, entrada simultanea no canal e candidatos ICE sem consumir o limite das jogadas. O teste de audio bidirecional e de rastreamento de uma mesa deve ser feito nos aparelhos fisicos, no Safari e no Chrome, inclusive em redes diferentes.
