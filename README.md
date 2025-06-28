# Search-GPT WebUI

Uma interface de usuário web bonita e moderna para interagir com um modelo de linguagem grande (LLM) compatível com a API OpenAI, como o `search-gpt` rodando localmente.

## Funcionalidades

*   **Interface de Chat Moderna:** Design limpo e responsivo com tema escuro padrão e opção de tema claro.
*   **Histórico de Conversas:** Suas conversas são salvas localmente no navegador e podem ser recarregadas.
    *   Pré-visualização das conversas na barra lateral.
    *   Opção para deletar conversas individualmente.
*   **Configurações da API:**
    *   Configure sua Chave de API OpenAI (opcional, se seu endpoint local não exigir).
    *   Ajuste os parâmetros `temperature` e `max_tokens` para as chamadas da API.
    *   As configurações são salvas localmente.
*   **Renderização de Markdown:** Respostas do bot com formatação básica de Markdown (negrito, itálico, blocos de código, código inline) são renderizadas corretamente.
*   **Responsividade:** Funciona em desktops, tablets e dispositivos móveis.
*   **Input de Mensagem Inteligente:**
    *   Textarea que se ajusta automaticamente à altura do conteúdo.
    *   Envie mensagens com Enter (Shift+Enter para nova linha).

## Configuração e Uso

1.  **Pré-requisitos:**
    *   Um servidor compatível com a API OpenAI rodando. Por padrão, a UI tentará se conectar a `http://127.0.0.1:51337/v1/chat/completions`.
    *   Um navegador web moderno (Chrome, Firefox, Edge, Safari).

2.  **Como Rodar:**
    *   Clone ou baixe os arquivos `index.html`, `style.css`, e `script.js` para uma mesma pasta no seu computador.
    *   Abra o arquivo `index.html` diretamente no seu navegador.

3.  **Usando a Interface:**
    *   **Chat:** Digite sua mensagem na caixa de texto na parte inferior e pressione Enter ou clique no botão de enviar (➤).
    *   **Nova Conversa:** Clique em "Nova Conversa +" na barra lateral para iniciar um novo chat.
    *   **Histórico:** Suas conversas anteriores aparecerão listadas na barra lateral. Clique em uma para carregá-la. Use o ícone de lixeira (🗑️) para deletar uma conversa.
    *   **Configurações da API:**
        *   Ajuste os valores de `Temperature` e `Max Tokens` conforme desejado.
        *   Se o seu endpoint de API requer uma chave, insira-a no campo "API Key".
    *   **Tema:** Clique no ícone de lua (🌙) ou sol (☀️) no canto superior direito para alternar entre os temas escuro e claro.
    *   **Sidebar (Mobile):** Em telas menores, a barra lateral pode ser aberta/fechada usando o ícone de menu (☰).

## Estrutura dos Arquivos

*   `index.html`: A estrutura principal da página web.
*   `style.css`: Contém todos os estilos para a interface, incluindo o tema escuro, claro e responsividade.
*   `script.js`: Toda a lógica da aplicação, incluindo:
    *   Comunicação com a API.
    *   Manipulação do DOM para exibir mensagens.
    *   Gerenciamento do histórico de conversas e configurações (usando `localStorage`).
    *   Controles da interface (temas, sidebar, etc.).

## Endpoint da API

A interface está configurada para usar o seguinte endpoint por padrão:
`http://127.0.0.1:51337/v1/chat/completions`

Se o seu modelo `search-gpt` ou similar estiver rodando em uma URL ou porta diferente, você precisará ajustar a constante `API_ENDPOINT` no início do arquivo `script.js`.

## Possíveis Melhorias Futuras

*   Implementação de streaming de respostas (Server-Sent Events) para respostas mais rápidas e dinâmicas.
*   Suporte a mais formatações Markdown (listas, tabelas, etc.) e syntax highlighting para blocos de código (ex: usando bibliotecas como `highlight.js` ou `Marked.js`).
*   Opção para exportar/importar histórico de conversas.
*   Mais opções de configuração da API diretamente na UI.
*   Internacionalização.

---

Desenvolvido por Jules.
