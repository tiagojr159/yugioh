# Chamada de voz nas partidas multiplayer

O Yugioh segue o desenho usado no Navestar: um daemon WebSocket PHP opcional acorda o outro jogador, enquanto os estados de chamada e os sinais WebRTC ficam persistidos no MySQL. Se o socket cair, o jogo continua pela API e pelo polling. O servidor nao grava nem retransmite o audio.

## Banco de dados

Envie os arquivos novos e aplique as migracoes 003 e 004. No terminal, execute `php bin/console.php migrate`. No phpMyAdmin, importe `database/migrations/003_voice_calls.sql` e `database/migrations/004_multiplayer_voice.sql` no banco do jogo.

## Configurar o socket

No `.env` do servidor, configure uma chave aleatoria persistente, uma porta livre e a URL WSS do proxy reverso:

- `VOICE_SOCKET_SECRET`: segredo com pelo menos 32 caracteres. Gere com `php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"`.
- `VOICE_SOCKET_PORT`: porta local do daemon, por exemplo `8091`.
- `VOICE_WS_URL`: URL publica `wss://` encaminhada pelo proxy reverso para `127.0.0.1:8091`.

O proxy precisa terminar TLS e encaminhar o upgrade WebSocket. O script PHP atende conexoes sem TLS. A origem do navegador e validada contra o host configurado em `APP_URL`. Guarde o segredo apenas no `.env`, que ja esta no `.gitignore`.

## Iniciar o processo

Para desenvolvimento, execute `php bin/voice-socket.php` na raiz do projeto. No servidor, use o mesmo supervisor de processos que mantem o socket do Navestar ativo. O daemon precisa continuar rodando depois que o terminal for fechado. Se estiver indisponivel, as chamadas ainda sinalizam pelo MySQL, com mais atraso.

Depois de publicar o daemon, entre em uma partida multiplayer em dois aparelhos. O botao de telefone inicia a chamada; o outro jogador pode atender ou recusar. Durante a chamada, os botoes controlam silenciar e encerrar. O navegador pede permissao de microfone ao iniciar ou atender.

WebRTC usa STUN por padrao. Redes restritivas podem precisar de TURN para completar chamadas entre redes diferentes.