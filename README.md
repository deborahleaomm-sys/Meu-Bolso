# MeuBolso — React + Vite + TypeScript

## Como executar
1. Abra a pasta do projeto no VS Code.
2. No terminal, execute `npm install`.
3. Execute `npm run dev`.
4. Abra o endereço local exibido pelo Vite.

## Arquivos para substituir
- `src/App.tsx`
- `src/App.css`
- `src/index.css`
- `src/main.tsx`

O projeto utiliza React, TypeScript e CSS puro, sem bibliotecas extras de interface.

## Funcionalidades incluídas
- Cadastro e login de demonstração.
- Dashboard com saldo, receitas e despesas.
- Cadastro e exclusão de movimentações.
- Planejamento com limites por categoria.
- Criação de metas e registro de depósitos simulados.
- Cadastro de contas, marcação como pagas e exclusão.
- Relatórios e gráficos de categorias.
- Conteúdos de educação financeira.
- Configurações, reinicialização dos dados e saída da conta.
- Persistência local no navegador usando `localStorage`.

## Importante sobre segurança
Esta é uma versão front-end demonstrativa. As contas e senhas ficam armazenadas no `localStorage` do navegador e **não devem ser usadas com dados financeiros reais ou em produção**. Para publicar o aplicativo, implemente autenticação e banco de dados em um backend seguro (por exemplo, Firebase Authentication + Firestore), regras de acesso por usuário, validação no servidor e recuperação segura de senha. O app não se conecta a bancos e não realiza pagamentos.
