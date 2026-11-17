
# Realidade aumentada e recursos 3D

O navegador detecta capacidades em tempo de execução. Nenhum acesso à câmera acontece ao abrir o jogo.

| Modo | Recursos necessários | Comportamento |
| --- | --- | --- |
| Arena 3D | WebGL 2, ES Modules, import maps | Câmera orbital por toque ou mouse, sem câmera física |
| AR de superfície | HTTPS, WebXR immersive-ar, hit-test | Indicador apenas em superfícies horizontais; toque posiciona tabuleiro de cerca de 65 cm |
| AR de marcadores | HTTPS ou localhost, getUserMedia, WebAssembly | Câmera traseira preferencial, seis padrões ARToolKit e modelos alinhados às cartas |

Android com navegador e aparelho compatíveis pode oferecer WebXR. O suporte varia; o resultado de isSessionSupported é apenas o primeiro teste, e requestSession também pode falhar. No iPhone, a opção de marcadores é oferecida quando o navegador disponibiliza câmera e WebAssembly. Não se presume suporte a WebXR no iOS. Todos os modos precisam de WebGL 2 para renderização.

A experiência retorna à arena 3D quando uma sessão AR termina, uma permissão é negada ou a inicialização falha. As esperas de câmera e rastreamento têm limite. O rastreamento depende de iluminação, foco, movimento e contraste. O modelo é ocultado quando o marcador se perde. Não há promessa de oclusão por objetos reais, reconstrução do ambiente ou persistência espacial entre sessões.

## Superfícies

WebXR fornece acesso à câmera dentro da sessão imersiva, sem abrir um segundo stream. Hit test é solicitado no espaço viewer e convertido para o espaço local do renderer. A normal do plano é filtrada para favorecer superfícies horizontais. O tabuleiro fica fixado ao referencial local escolhido; não utiliza a extensão opcional WebXR Anchors. Se dom-overlay não for oferecido, o modo avisa que é necessário sair de AR para usar os controles HTML.

## Marcadores

Abra /markers, imprima as seis cartas em papel fosco e escala 100%. Preserve a borda preta e a área branca ao redor. O quadrado externo impresso tem 5 cm. O padrão interno ocupa 50% da largura, em concordância com patternRatio = 0.5. scripts/artwork.mjs gera os SVGs e os arquivos .patt de 16 × 16 pixels, três canais e quatro orientações.

O botão principal Abrir câmera e jogar seleciona o melhor modo disponível. A câmera ocupa a tela; vida, mão e ações aparecem sobre a imagem. A identificação do marcador seleciona a carta na interface e exibe uma prévia antes do duelo. Invocar na partida exige que a carta esteja na mão, haja energia e a jogada seja aceita pelo PHP. Durante uma partida, o tabuleiro inteiro fica vinculado ao primeiro marcador visível e mostra todas as instâncias de criaturas de ambos os lados, com atributos e HP autorizados. Invocações, ataques, partículas e derrotas são animados após a resposta do servidor. Se o marcador se perde, o campo é ocultado até o rastreamento retornar.

São padrões visuais, sem qualquer código de autenticação. Reconhecer ou imprimir um marcador não concede uma carta à coleção.

## Recursos e desempenho

- Seis criaturas provisórias originais, construídas com geometrias distintas de Three.js.
- Imagens originais em SVG; não são artes de franquias existentes.
- GLB 2.0 substitui a criatura procedural por meio do painel administrativo. O loader usa cache de promises e clonagem de esqueletos, com fallback procedural quando o modelo falha.
- Upload aceita GLB com recursos incorporados e sem extensionsRequired. Prepare modelos leves, preferencialmente abaixo de 2 MB. Draco e KTX2 requerem configurar seus decodificadores antes de habilitar esses formatos.
- Qualidade automática reduz a resolução após frames lentos; modo econômico limita partículas e pixel ratio. Geometrias, materiais, texturas de rótulos, streams de câmera e sessões são descartados ao sair.
- Meta de 30 FPS; sem garantia até medir em aparelhos reais. Há suporte a prefers-reduced-motion e áudio opcional pela Web Audio API.

## Verificação realizada

A arena 3D foi renderizada no Chrome do computador. Dez testes automatizados verificam ciclo de câmera, cancelamento, permissões, seleção de modo, hit test horizontal e vínculo do tabuleiro ao marcador. Esses testes usam streams e poses simulados e não substituem testes físicos. Os adaptadores AR e os seis pares de padrões foram implementados; a leitura física das cartas, o alinhamento em diferentes câmeras, o posicionamento WebXR e o desempenho em celulares ainda precisam de validação no hardware. Esses itens não são declarados como aprovados.

Referências técnicas: [AR.js marker based](https://ar-js-org.github.io/AR.js-Docs/marker-based/), [Three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html), [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer).
