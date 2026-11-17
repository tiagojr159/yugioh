# ARCANA — AR Card Battle

A prioridade é jogar pela câmera do celular, em Android e iPhone. O botão principal abre a câmera em tela cheia e escolhe WebXR por superfície ou rastreamento por marcadores.

Jogo original de cartas com criaturas 3D, combate por turnos contra IA no servidor e dois adaptadores de realidade aumentada. Interface em português brasileiro. Backend PHP 8.2+, PDO e schema para MySQL 8; frontend ES Modules, Three.js e AR.js, sem serviços pagos obrigatórios.

## Executar neste computador

O XAMPP encontrado usa PHP 7.4.33 e MariaDB 10.4.27. Ele não foi atualizado. Foi preparado um PHP 8.3.36 isolado em `.tools/php` e uma instância MariaDB exclusiva deste projeto em `storage/mysql`, porta 3307, vinculada a 127.0.0.1. O `.env` local contém uma conta de banco própria com senha aleatória; as credenciais não são versionadas.

Na pasta `C:\xampp\htdocs\yugioh`:

```powershell
npm start
```

Abra **http://localhost:8080**. O comando inicia a instância local quando necessário, aplica migrations/seeders idempotentes e inicia o PHP 8.3. Ctrl+C encerra os processos iniciados por esse comando. Se a porta estiver em uso por outra cópia do jogo, abra a URL existente. O Apache antigo do XAMPP não deve servir o projeto em PHP 7.4.

Clique em **Iniciar duelo** para jogar como visitante ou use **Entrar** para cadastrar uma conta. Cada nova conta recebe três cópias de cada uma das seis cartas e um deck inicial com duas cópias de cada. Nenhuma senha pública ou conta administrativa padrão é incluída.

## Enviar para seu servidor HTTPS

O ZIP em `dist/arcana-servidor.zip` já contém as dependências, um `.env.example` de produção com código de instalação exclusivo e um instalador por navegador. Consulte [as instruções para ki6.com.br/yugioh](docs/INSTALAR-NO-SERVIDOR.md). Não é preciso executar Node/Composer na hospedagem.

## Instalação padrão — PHP 8.2+ e MySQL 8

Pré-requisitos: PHP 8.2+, extensões `pdo_mysql`, `json`, `mbstring` e `fileinfo`, MySQL 8 com InnoDB, Composer 2 e Node.js 22+. `pdo_sqlite` é usado na suíte automatizada isolada e na alternativa de desenvolvimento.

```sh
composer install
npm ci
npm run build
npm run assets
```

Copie `.env.example` para `.env` e configure as variáveis `DB_*`. Use uma conta com privilégios apenas no banco do jogo. `create-db` requer permissão de criação; se a conta não tiver essa permissão, crie o banco com seu administrador e prossiga.

```sh
php bin/console.php create-db
php bin/console.php migrate
php bin/console.php seed
php -S localhost:8080 -t public public/router.php
```

No runtime portátil deste computador, substitua `php` por `.\.tools\php\php.exe` e `composer` por `.\.tools\php\php.exe .\.tools\composer.phar`. `scripts/setup-portable.mjs` baixa PHP Windows e Composer dos sites oficiais e verifica os hashes publicados, sem alterar o XAMPP.

`npm run build` copia dependências para `public/assets/vendor`, sem CDN em tempo de execução. `npm run assets` gera as seis ilustrações originais e os seis pares de marcadores SVG/PATT. Esses recursos autorais já estão incluídos.

### PHP e MySQL 8 com Docker

Há uma configuração para PHP 8.3/Apache e MySQL 8.0. Copie `.env.docker.example` para `.env.docker` e preencha `DB_PASSWORD` e `DB_ROOT_PASSWORD` com senhas aleatórias distintas. A aplicação fica em 127.0.0.1:8080; o banco permanece na rede interna do Compose.

```sh
docker compose --env-file .env.docker up --build -d
docker compose --env-file .env.docker logs app
docker compose --env-file .env.docker down
```

Os volumes mantêm banco, uploads, sessões e logs. O build Docker foi preparado, mas não foi executado neste computador. A validação local usou PHP 8.3 com MariaDB 10.4 e testes isolados em SQLite; não se declara uma execução já validada em MySQL 8.

### Alternativa sem MySQL para desenvolvimento

Defina `DB_DRIVER=sqlite` e `DB_SQLITE_PATH=storage/game.sqlite`, habilite `pdo_sqlite` e rode `migrate` e `seed`. É um adaptador opcional para desenvolvimento e testes. A configuração padrão e o schema de referência usam MySQL 8.

## Jogabilidade

- 4.000 PV por jogador, cinco cartas iniciais e deck próprio.
- Uma invocação por turno, campo de até três criaturas e custo de energia.
- Três de energia inicial, aumentando até dez; energia renovada no turno.
- Um ataque por criatura em cada turno, inclusive no turno da invocação.
- ATK menos DEF do alvo, mínimo de 100. O excedente atinge o jogador. Campo vazio permite ataque direto.
- Seis habilidades: brasas, escudo, perfuração, regeneração, geada e roubo de vida.
- A IA escolhe invocação e ataques durante `end-turn`, inteiramente no PHP.
- Deck vazio causa fadiga crescente. Limite de 80 turnos: vence quem tiver mais PV; empate favorece a IA.
- Resultado, experiência e dano efetivo são salvos no perfil.
- Decks de 12 a 30 cartas, até três cópias de cada carta possuída; até 12 decks por conta.

O navegador envia identificadores e a versão da partida. ATK, HP, custos, dano e validade das ações são determinados pelo servidor. Uma transação, bloqueio da linha no MySQL e comparação de versão impedem a repetição de jogadas. Um erro 409 exige sincronização. Ações não são repetidas automaticamente após falha de rede.

## Arquitetura e persistência

- `app/Core`: configuração, PDO, roteamento, request e erros JSON.
- `Controllers`: tradução HTTP, sem cálculo de combate.
- `Services`: autenticação, decks, regras, IA, dano independente e uploads.
- `Repositories` e `Models`: persistência, hidratação e representação pública.
- `database/schema.sql`, `migrations/`, `seeders/`: instalação e dados iniciais.
- `resources/views`: arena, cartas para impressão e administração.
- `public/assets/js/ar`: câmera, WebXR, superfícies, marcadores e criaturas.
- `public/assets/js/game` e `ui`: partida, animações, controles e HUD.

As 13 tabelas funcionais solicitadas estão presentes, além de `migrations`. `battles` guarda o estado completo e um snapshot das cartas; `battle_actions` audita cada evento; `battle_turns` registra turnos; `battle_monsters` e `battle_players` refletem o campo atual. O snapshot impede que edições administrativas alterem partidas iniciadas. A mão e as compras da IA são ocultadas nas respostas e no histórico público. Os decks são embaralhados apenas no servidor.

`BattleEngine` funciona sem HTTP/banco; `BattleService` coordena transações e persistência. Esses limites permitem acrescentar outro controlador de adversário. PvP, matchmaking e conexões em tempo real não fazem parte desta versão.

## API REST

Respostas seguem `{ok:true,data:...}` ou `{ok:false,error:{message:...}}`. `GET /api/session` estabelece a sessão e retorna CSRF. Envie o cookie e `X-CSRF-Token` nas mutações. CORS de terceiros não é habilitado.

| Método | Rota | Uso |
| --- | --- | --- |
| GET | `/api/session` | Sessão, CSRF e partida ativa |
| POST | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/guest` | Autenticação |
| GET | `/api/cards`, `/api/cards/{id}` | Catálogo público |
| GET, POST | `/api/decks` | Listar/criar decks |
| PUT | `/api/decks/{id}` | Editar deck próprio |
| POST | `/api/battles` | Iniciar ou retomar; `deck_id` |
| GET | `/api/battles/{id}` | Estado autorizado |
| POST | `/api/battles/{id}/summon` | `version`, `card_id` |
| POST | `/api/battles/{id}/attack` | `version`, `attacker_id`, `target_id` ou null |
| POST | `/api/battles/{id}/end-turn` | `version` |
| POST | `/api/battles/{id}/surrender` | `version` |
| GET | `/api/battles/{id}/history` | Últimos 100 eventos visíveis |
| GET | `/api/players/me`, `/api/players/me/statistics`, `/api/players/me/collection` | Perfil |
| GET, POST, PUT | `/api/admin/cards` e `/api/admin/cards/{id}` | Administrar cartas |
| POST | `/api/admin/uploads` | Multipart, campo `file` |
| GET | `/api/admin/overview` | Últimos 100 jogadores e partidas |

## Administração

Cadastre uma conta normal e promova-a pelo terminal:

```sh
php bin/console.php admin seu-email@exemplo.com
```

Abra `/admin` usando essa conta. O painel permite criar/editar cartas e criaturas, atributos, habilidades, cor, ativação, imagem, GLB e marcador; lista jogadores e partidas. As habilidades disponíveis são as seis regras implementadas. O texto pode ser editado, sem executar código arbitrário do administrador.

Uploads aceitam PNG/JPEG/WebP até 4096 px, GLB 2.0 autocontido e PATT com 3072 valores válidos. Limite de 10 MB, MIME/conteúdo verificados e nomes aleatórios. SVG enviado não é aceito; os SVGs originais são recursos confiáveis do projeto. A impressão usa os seis marcadores originais. Para carta administrativa com padrão próprio, forneça sua arte imprimível correspondente. Novas cartas entram no estoque das contas criadas posteriormente; não há distribuição retroativa automática.

## Câmera, celulares e HTTPS

Veja [compatibilidade AR](docs/AR-COMPATIBILIDADE.md) e [checklist manual](docs/TESTES-MANUAIS.md).

No computador, teste 3D com mouse e os diálogos. No celular, publique em uma origem HTTPS válida e abra no navegador do aparelho. `localhost` no celular se refere ao celular, não ao PC; um IP local em HTTP normalmente não libera câmera/WebXR. Use servidor/reverse proxy com certificado válido ou um túnel HTTPS de sua preferência. Não contorne avisos de certificado.

Em produção, aponte o document root exclusivamente para `public/`, use PHP 8.2+, `APP_DEBUG=false`, `SESSION_SECURE=true`, HTTPS e uma conta MySQL limitada ao banco do jogo. Nunca publique `.env`, `.tools`, `storage` ou o repositório inteiro como arquivos estáticos. O `.htaccess` da raiz permite instalação em subpasta no Apache, mas `public/` é o document root recomendado.

Não há publicação em hospedagem externa nesta entrega. O host precisa executar PHP e acessar MySQL; hospedagem exclusivamente estática não executa este backend.

## Segurança

PDO preparado, escape de conteúdo, validação de entradas, hash de senha, sessão HttpOnly/SameSite e regeneração no login, CSRF, autorização por proprietário/perfil, CSP, uploads restritos e combate no servidor. Erros internos são registrados em `storage/logs/app.log` e retornam referência sem stack trace ou senha. Limites por IP: 15 mutações de autenticação/minuto e 90 outras ações/minuto. Permita escrita apenas em `storage` e `public/uploads`. O limitador por arquivo serve uma instância; múltiplos servidores precisam compartilhar sessões/limites ou substituir esse adaptador.

## Testes e estado da validação

```sh
php tests/run.php
npm run check
npm run test:ar
php tests/Installation/run.php
npm run test:install
# Com o servidor em execução:
npm run test:api
```

A suíte PHP usa um SQLite novo em `tests/.runtime`, sem apagar o banco da aplicação. Cobre dano, habilidades, turno, invocação, vitória/derrota, fadiga, autenticação, cartas, decks, permissões, auditoria, versões e persistência. O teste HTTP cria visitantes e partidas no banco do servidor indicado por `TEST_URL`, padrão `http://localhost:8080/`. Use uma instalação de teste; ele não apaga dados existentes.

Foram executados testes PHP no runtime 8.3, verificação de sintaxe JavaScript e ciclo HTTP sobre MariaDB local. A arena 3D foi conferida visualmente no Chrome, e a interface iniciou uma partida com mão/energia do backend. Dez testes de AR com streams/poses simulados cobrem a câmera, cancelamento, permissões, seleção de modo e ancoragem do tabuleiro. Eles não substituem a validação física: câmera, seis marcadores, WebXR e responsividade/desempenho em aparelhos reais permanecem pendentes. O checklist distingue resultados automatizados de verificações manuais.

## Recursos e licenças

Código e seis ilustrações/criaturas originais sob MIT. Three.js e AR.js mantêm suas licenças, copiadas para `public/assets/vendor` no build. `resources/ar/camera_para.dat` é a calibração do projeto AR.js. Não são usados personagens, artes ou marcas de franquias. As criaturas são modelos procedurais provisórios; a substituição por GLB já está preparada.