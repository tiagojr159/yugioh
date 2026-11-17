# Instalar em https://ki6.com.br/yugioh/

O pacote `arcana-servidor.zip` já inclui o backend, a interface, o Three.js, o rastreador AR.js, as seis criaturas e os marcadores. Não é necessário instalar Node.js ou Composer na hospedagem.

## 1. Enviar os arquivos

Extraia o ZIP e envie seu conteúdo para a pasta que atende `https://ki6.com.br/yugioh/`. O arquivo `index.php` deve ficar diretamente nessa pasta, junto com `app/`, `public/` e as demais pastas.

Inclua os arquivos ocultos `.htaccess` da raiz, `public/.htaccess`, `public/uploads/.htaccess` e `.env.example`. O gerenciador de arquivos/FTP pode esconder nomes iniciados por ponto. A hospedagem deve executar PHP 8.2 ou superior, ter MySQL 8 e permitir as regras de reescrita do Apache. Se o servidor usar Nginx, configure o equivalente ao .htaccess e impeça o acesso externo às pastas privadas.

## 2. Configurar o banco

No painel da hospedagem, crie um banco vazio e um usuário com permissões nesse banco. Copie `.env.example` para um arquivo chamado exatamente `.env` e preencha:

- `DB_HOST`: endereço do MySQL informado pela hospedagem, frequentemente localhost.
- `DB_PORT`: normalmente 3306.
- `DB_DATABASE`: nome completo do banco, incluindo eventual prefixo do painel.
- `DB_USERNAME`: nome completo do usuário do banco.
- `DB_PASSWORD`: senha desse usuário.

Mantenha `APP_URL=https://ki6.com.br/yugioh`, `APP_ENV=production`, `APP_DEBUG=false` e `SESSION_SECURE=true`. Preserve o valor aleatório de `INSTALL_TOKEN` que veio no pacote: ele autoriza somente a instalação inicial. Não publique nem envie esse valor a terceiros.

Permita ao PHP escrever em `storage/` (logs, sessões, limites) e `public/uploads/`. Os outros diretórios não precisam de escrita. Use as permissões recomendadas pelo provedor, sem liberar escrita pública irrestrita.

## 3. Instalar pelo navegador

Abra **https://ki6.com.br/yugioh/install**.

1. Cole o valor de `INSTALL_TOKEN` do seu `.env` no campo Código de instalação.
2. Escolha nome, e-mail e senha para sua conta administrativa. A senha precisa ter pelo menos 12 caracteres.
3. Clique em **Criar tabelas e começar**.

O assistente cria as tabelas, as seis cartas, o deck inicial e seu primeiro administrador. Ele não apaga nem substitui dados existentes. Depois de existir um jogador, a reinstalação pelo navegador fica bloqueada. Guarde suas credenciais; não há senha administrativa padrão.

Se aparecer um erro interno, consulte `storage/logs/app.log` pelo painel da hospedagem e a referência retornada. Não compartilhe o `.env` nem senhas. Se a página informar PHP antigo, selecione PHP 8.2+ no painel do provedor.

## 4. Abrir a câmera no Android e no iPhone

Abra **https://ki6.com.br/yugioh/** no próprio navegador do celular e toque em **Abrir câmera e jogar**. Autorize o uso da câmera.

- **Android com WebXR compatível:** mova lentamente o celular sobre uma mesa e toque no círculo para posicionar o tabuleiro. Toque em **Começar duelo nesta mesa**.
- **iPhone e Android com modo marcador:** abra **https://ki6.com.br/yugioh/markers** em um computador ou outro aparelho, ou imprima as cartas em papel fosco. Aponte a câmera do celular para uma carta inteira, incluindo a borda preta. A criatura aparece sobre ela. Toque em **Começar duelo nesta mesa** para ver o campo completo acompanhar o marcador.

No modo marcador é necessário um marcador real visível. O aplicativo não afirma detectar superfícies no iPhone quando o navegador não disponibiliza WebXR. A câmera de um celular não consegue ler a carta exibida na própria tela desse mesmo aparelho: use papel ou outra tela.

Selecione uma carta na mão e toque em **Invocar**. **Atacar** abre a seleção de atacante e alvo. **Encerrar turno** executa a IA no servidor. HP, energia e regras são autorizados pelo PHP e permanecem salvos. Ao perder o marcador, o campo é ocultado até ele voltar. **Fechar câmera** encerra o vídeo e retorna à arena de compatibilidade.

## 5. Conferir antes de divulgar

- Login e instalação concluídos sem erro.
- As seis cartas e o deck inicial aparecem.
- O navegador pede a câmera somente ao tocar no botão.
- O Android/iPhone reconhece cada marcador e mantém o modelo alinhado.
- Invocação, ataque, dano e troca de turno funcionam dentro da câmera.
- Sair de AR libera a câmera; reabrir permite retomar a partida.
- A imagem não apresenta espelhamento incorreto, desvio de orientação ou alinhamento no aparelho testado.

O código e os testes automatizados estão incluídos no projeto local. O uso físico de câmera, leitura das seis cartas e WebXR ainda precisa ser conferido em aparelhos reais depois do upload. Não foi realizada publicação nesse domínio durante o desenvolvimento.

O painel administrativo fica em **https://ki6.com.br/yugioh/admin**. Use a conta criada no instalador para editar cartas, atributos, imagens e modelos GLB.