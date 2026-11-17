
# Checklist de validação

Registre aparelho, SO, navegador/versão, URL e resultado para cada rodada.

## Partida e interface

- [x] API pública retorna seis criaturas originais com atributos e habilidades.
- [x] Registrar, autenticar e criar visitante; senha com hash e sessão regenerada.
- [x] Iniciar duelo com cinco cartas e 4.000 PV.
- [x] API aceita uma invocação por turno e desconta energia.
- [x] API rejeita carta ausente, alvo inválido, ataque repetido e versão antiga.
- [x] Fim de turno executa IA e devolve controle ao jogador.
- [x] Partida salva pode ser retomada; histórico e estatísticas são persistidos.
- [x] Simulação completa termina em vitória ou derrota, sem registrar resultado duas vezes.
- [x] Outro jogador não consegue ler partida, editar deck ou acessar administração.
- [x] CSRF ausente e JSON inválido recebem erro padronizado.
- [x] Arena e criaturas 3D renderizam no Chrome desktop.
- [x] Interface permite iniciar partida no Chrome desktop e mostra mão/energia do servidor.
- [ ] Verificar visualmente invocação, ataque, dano, partículas, derrota e vitória em sequência.
- [ ] Verificar mouse, toque, teclado, foco dos diálogos e leitor de tela.
- [ ] Testar 320, 375, 390, 768 e 1440 px; confirmar ausência de rolagem horizontal no documento.
- [ ] Testar orientação vertical/horizontal, áreas seguras e retorno do segundo plano.
- [ ] Testar duas abas: a segunda deve sincronizar ao receber 409.
- [ ] Desconectar durante uma ação; confirmar retomada sem repetir dano.
- [ ] Administrador: criar, editar/desativar carta, enviar PNG/GLB/PATT, abrir jogadores e partidas.

## Câmera e marcadores — pendente em dispositivos reais

- [ ] HTTPS válido no aparelho, sem contornar avisos de certificado.
- [ ] Abrir configurações; verificar modos habilitados conforme capacidades reais.
- [ ] Confirmar que a câmera só é solicitada após ação explícita.
- [ ] Negar permissão; continuar a partida em 3D sem carregamento permanente.
- [ ] Testar preferência pela câmera traseira e orientação de retrato/paisagem.
- [ ] Imprimir as seis cartas; reconhecer cada padrão individualmente.
- [ ] Confirmar seleção correta, nome, ATK, DEF, HP e modelo original.
- [ ] Perder e recuperar o marcador; verificar visibilidade e alinhamento.
- [ ] Distinguir prévia de carta de criatura invocada na partida.
- [ ] Executar combate no modo marcador e acompanhar valores confirmados pelo PHP.
- [ ] Trocar para 3D; confirmar encerramento de todos os tracks de câmera.
- [ ] Repetir em Android/Chrome e iPhone/Safari.

## WebXR — pendente em Android compatível

- [ ] Solicitar sessão immersive-ar com hit-test.
- [ ] Apontar para mesa; aparecer indicador em superfície horizontal.
- [ ] Tocar no indicador; tabuleiro permanecer estável ao mover o telefone.
- [ ] Invocar criatura, atacar e atualizar HUD em dom-overlay.
- [ ] Sair da sessão; retornar a 3D e continuar a partida salva.
- [ ] Navegador sem dom-overlay informar a limitação dos controles.

## Desempenho — pendente em celulares

- [ ] Medir FPS com seis criaturas, efeitos e câmera por 10 minutos.
- [ ] Comparar automático/econômico/alta e acompanhar temperatura.
- [ ] Carregar um GLB válido, um ausente e um inválido; confirmar fallback.
- [ ] Alternar modos dez vezes; observar memória e liberação da câmera.
