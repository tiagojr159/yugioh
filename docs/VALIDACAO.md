# Validação da entrega

- PHP 8.3.36: 30 testes de regras, autenticação, decks, autorização, persistência, auditoria e limites aprovados.
- AR: 10 testes aprovados com streams e poses simulados, cobrindo câmera traseira, ausência de microfone, cancelamento, permissão negada, seleção Android/iPhone, hit test horizontal e tabuleiro vinculado ao marcador.
- APIs no banco MariaDB local: 48 verificações HTTP aprovadas, incluindo CSRF, isolamento de jogadores, IA, retomada, recursos e bloqueio de instalação indevida.
- Instalação/administração em banco isolado: 15 verificações HTTP aprovadas, incluindo primeiro administrador, bloqueio de reinstalação, upload real de PNG, rejeição de PHP/GLB/PATT inválidos e criação administrativa de carta.
- Instalador também aprovado em execução PHP isolada, sem apagar dados da aplicação.
- Arena 3D e início de partida conferidos visualmente no Chrome desktop.
- Marcadores gerados em concordância com o formato oficial AR.js: 16 × 16, BGR (canais iguais em escala de cinza), quatro rotações anti-horárias e região interna de 50%.

## Verificações pendentes em hardware/servidor

Não foram executados testes físicos de câmera, leitura das seis cartas, posicionamento WebXR, estabilidade, FPS ou responsividade em Android/iPhone reais. Não foi feito upload para ki6.com.br. O banco MySQL 8 e o build Docker estão preparados, mas a execução de banco disponível neste computador é MariaDB 10.4; os testes isolados usam SQLite.

O instalador e o pacote evitam a necessidade de Composer/Node no servidor. O assistente exige um banco vazio já criado, PHP 8.2+, credenciais configuradas em .env e o código exclusivo de instalação incluído no pacote.

Consulte TESTES-MANUAIS.md para a rodada de validação depois do upload.