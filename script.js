document.addEventListener('DOMContentLoaded', () => {
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const chatMessages = document.getElementById('chat-messages');
    const newChatButton = document.getElementById('new-chat-button');
    const chatHistoryList = document.getElementById('chat-history-list');
    const apiKeyInput = document.getElementById('api-key');
    const temperatureInput = document.getElementById('temperature');
    const temperatureValueDisplay = document.getElementById('temp-value');
    const maxTokensInput = document.getElementById('max-tokens');
    const maxTokensValueDisplay = document.getElementById('max-tokens-value');
    const themeToggleButton = document.getElementById('theme-toggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarToggleButton = document.getElementById('sidebar-toggle');

    const API_ENDPOINT = 'http://127.0.0.1:51337/v1/chat/completions'; // Ajuste se o endpoint for diferente

    let currentChatId = null;
    let chatHistory = {}; // { 'chatId1': [{role: 'user', content: '...'}, {role: 'assistant', content: '...'}], ... }

    // --- Theme Manager ---
    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        themeToggleButton.textContent = theme === 'dark' ? '☀️' : '🌙';
    };

    const currentTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(currentTheme);

    themeToggleButton.addEventListener('click', () => {
        const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    });

    // --- Sidebar Toggle ---
    sidebarToggleButton.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        // Optional: Add overlay to body when sidebar is open on mobile
        document.body.classList.toggle('sidebar-open-overlay', sidebar.classList.contains('open'));
    });
    
    // Close sidebar if clicking outside on mobile
    document.addEventListener('click', (event) => {
        if (sidebar.classList.contains('open') && !sidebar.contains(event.target) && !sidebarToggleButton.contains(event.target)) {
            sidebar.classList.remove('open');
            document.body.classList.remove('sidebar-open-overlay');
        }
    });


    // --- Load and Save Settings ---
    const loadSettings = () => {
        apiKeyInput.value = localStorage.getItem('apiKey') || '';
        temperatureInput.value = localStorage.getItem('temperature') || 0.7;
        temperatureValueDisplay.textContent = temperatureInput.value;
        maxTokensInput.value = localStorage.getItem('maxTokens') || 512;
        if (maxTokensValueDisplay) maxTokensValueDisplay.textContent = maxTokensInput.value; // Ensure this element exists if used

        // Load chat history
        const storedHistory = localStorage.getItem('chatHistory');
        if (storedHistory) {
            chatHistory = JSON.parse(storedHistory);
        }
        renderChatHistoryList(); // Always render, even if empty

        // Load last active chat or start new
        const lastChatId = localStorage.getItem('currentChatId');
        if (lastChatId && chatHistory[lastChatId] && chatHistory[lastChatId].length > 0) { // Ensure chat has content
            loadChat(lastChatId);
        } else {
            startNewChat(); // This will also handle if lastChatId was invalid or empty
        }
    };

    const saveSettings = () => {
        localStorage.setItem('apiKey', apiKeyInput.value);
        localStorage.setItem('temperature', temperatureInput.value);
        localStorage.setItem('maxTokens', maxTokensInput.value);
        // Only save valid chat history
        const validChatHistory = {};
        for (const id in chatHistory) {
            if (chatHistory[id] && chatHistory[id].length > 0) {
                validChatHistory[id] = chatHistory[id];
            }
        }
        localStorage.setItem('chatHistory', JSON.stringify(validChatHistory));
        if (currentChatId && chatHistory[currentChatId] && chatHistory[currentChatId].length > 0) {
            localStorage.setItem('currentChatId', currentChatId);
        } else {
            localStorage.removeItem('currentChatId');
        }
    };

    temperatureInput.addEventListener('input', () => {
        temperatureValueDisplay.textContent = temperatureInput.value;
        saveSettings(); // Save settings when they change
    });
    maxTokensInput.addEventListener('input', () => {
        if (maxTokensValueDisplay) maxTokensValueDisplay.textContent = maxTokensInput.value;
        saveSettings(); // Save settings when they change
    });
    apiKeyInput.addEventListener('change', saveSettings);


    // --- Chat Functionality ---
    const addMessageToChat = (role, content, messageId = null) => {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', role === 'user' ? 'user-message' : 'bot-message');
        if (messageId) {
            messageDiv.dataset.messageId = messageId;
        }
        
        // Enhanced Markdown processing
        let htmlContent = content;
        // Code blocks (```language\ncode``` or ```code```)
        htmlContent = htmlContent.replace(/```(\w*)\n([\s\S]*?)```|```([\s\S]*?)```/g, (match, lang, code1, code2) => {
            const code = code1 || code2;
            const language = lang || 'plaintext';
            // Basic syntax highlighting for JS, Python, HTML, CSS as an example (can be expanded)
            // For more robust solution, consider a library like highlight.js or Prism.js
            let highlightedCode = code.replace(/</g, "&lt;").replace(/>/g, "&gt;"); // Basic HTML entity escaping
            return `<pre><code class="language-${language}">${highlightedCode}</code></pre>`;
        });
        // Inline code (`code`)
        htmlContent = htmlContent.replace(/`([^`]+)`/g, '<code>$1</code>');
        // Bold (**text**)
        htmlContent = htmlContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Italics (*text*)
        htmlContent = htmlContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // Newlines to <br> (should be last to avoid interfering with <pre>)
        // Apply this only outside of <pre> tags if possible, or rely on CSS white-space for <pre>
        if (!htmlContent.includes('<pre>')) { // Simple check, might need improvement
            htmlContent = htmlContent.replace(/\n/g, '<br>');
        }


        messageDiv.innerHTML = htmlContent.startsWith('<pre>') ? htmlContent : `<p>${htmlContent}</p>`;
        
        const existingStreamingMessage = chatMessages.querySelector('.message.streaming');
        if (existingStreamingMessage && role === 'assistant' && messageId && existingStreamingMessage.dataset.messageId === messageId) {
            existingStreamingMessage.innerHTML = messageDiv.innerHTML; // Update content of existing streaming message
            existingStreamingMessage.classList.remove('streaming');
            chatMessages.scrollTop = chatMessages.scrollHeight;
            return existingStreamingMessage;
        } else if (role === 'assistant' && messageId) { // This is a new message or a non-streaming update
            const existingMessageById = chatMessages.querySelector(`.message[data-message-id='${messageId}']`);
            if (existingMessageById) {
                existingMessageById.innerHTML = messageDiv.innerHTML;
                chatMessages.scrollTop = chatMessages.scrollHeight;
                return existingMessageById;
            }
        }
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to bottom
        return messageDiv;
    };

    const streamMessageContent = (messageDiv, newContentChunk) => {
        // Assuming the content is plain text and we append.
        // For complex HTML, this might need more sophisticated handling.
        // A simple approach: replace <br> with \n for internal accumulation, then convert back for display.
        let currentText = messageDiv.querySelector('p') ? messageDiv.querySelector('p').innerHTML.replace(/<br\s*\/?>/gi, '\n') : '';
        currentText += newContentChunk;
        messageDiv.innerHTML = `<p>${currentText.replace(/\n/g, '<br>')}</p>`;
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };


    const sendMessage = async () => {
        const messageText = messageInput.value.trim();
        if (!messageText) return;

        addMessageToChat('user', messageText);
        updateChatHistory('user', messageText);
        messageInput.value = '';
        messageInput.style.height = 'auto'; // Reset height after sending

        // Add a placeholder for bot's response with a unique ID
        const botMessageId = `bot_${new Date().getTime()}`;
        const botMessageDiv = addMessageToChat('assistant', '<em>Pensando...</em>', botMessageId);
        botMessageDiv.classList.add('streaming'); // Add streaming class to placeholder

        try {
            const headers = {
                'Content-Type': 'application/json',
            };
            const apiKey = apiKeyInput.value.trim();
            if (apiKey) {
                headers['Authorization'] = `Bearer ${apiKey}`;
            }

            // Construct messages array for API from current chat history
            // Ensure we are using the correct, up-to-date history for the current chat
            const messagesForApi = (chatHistory[currentChatId] || [])
                 .filter(msg => msg.role === 'user' || msg.role === 'assistant')
                 .map(msg => ({ role: msg.role, content: msg.content }));
            
            // The last message in messagesForApi is the user's current prompt.

            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    model: "search-gpt", 
                    messages: messagesForApi, 
                    temperature: parseFloat(temperatureInput.value),
                    max_tokens: parseInt(maxTokensInput.value),
                    stream: false, // Set to false for now, can be true if API supports SSE and we implement reader
                }),
            });

            if (!response.ok) {
                let errorDetail = 'Erro desconhecido na API.';
                try {
                    const errorData = await response.json();
                    errorDetail = errorData.detail || errorData.message || JSON.stringify(errorData);
                } catch (e) {
                    errorDetail = await response.text() || errorDetail;
                }
                throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorDetail}`);
            }
            
            // Non-streaming response handling
            const data = await response.json();
            let botResponse = '';
            if (data.choices && data.choices.length > 0 && data.choices[0].message) {
                botResponse = data.choices[0].message.content;
            } else {
                botResponse = "Não recebi uma resposta válida ou completa.";
            }

            // Update the placeholder with the final response
            addMessageToChat('assistant', botResponse, botMessageId); // This will replace the placeholder

            updateChatHistory('assistant', botResponse);
            saveSettings();

        } catch (error) {
            console.error('Error sending message:', error);
            // Update placeholder with error message
            const errorMsgElement = chatMessages.querySelector(`.message[data-message-id='${botMessageId}']`);
            if (errorMsgElement) {
                errorMsgElement.innerHTML = `<p>Erro: ${error.message}</p>`;
                errorMsgElement.classList.remove('streaming');
                errorMsgElement.style.color = 'red';
            } else { // Fallback if placeholder somehow isn't found
                addMessageToChat('assistant', `Erro: ${error.message}`);
            }
        }
    };

    sendButton.addEventListener('click', sendMessage);
        if (isStreaming && role === 'assistant') {
            messageDiv.classList.add('streaming');
        }

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to bottom
        return messageDiv;
    };

    const sendMessage = async () => {
        const messageText = messageInput.value.trim();
        if (!messageText) return;

        addMessageToChat('user', messageText);
        updateChatHistory('user', messageText);
        messageInput.value = '';
        messageInput.style.height = 'auto'; // Reset height after sending

        // Add a placeholder for bot's response
        const botMessageDiv = addMessageToChat('assistant', 'Pensando...', true);

        try {
            const headers = {
                'Content-Type': 'application/json',
            };
            const apiKey = apiKeyInput.value.trim();
            if (apiKey) {
                headers['Authorization'] = `Bearer ${apiKey}`;
            }

            // Construct messages array for API
            const apiMessages = (chatHistory[currentChatId] || [])
                .filter(msg => msg.role === 'user' || msg.role === 'assistant') // Ensure only valid roles
                .map(msg => ({ role: msg.role, content: msg.content }));
            
            // Remove the last "user" message if it's the one we just added to avoid duplication in history for the API call
            // The history for the API should be up to the point *before* the current user message
            const messagesForApi = chatHistory[currentChatId].slice(0, -1);


            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    model: "search-gpt", // Ou o nome do seu modelo
                    messages: messagesForApi, // Use a cópia filtrada
                    temperature: parseFloat(temperatureInput.value),
                    max_tokens: parseInt(maxTokensInput.value),
                    // stream: true, // Implementar streaming se a API suportar e desejar
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Erro desconhecido na API.' }));
                throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorData.detail || errorData.message}`);
            }

            const data = await response.json();
            let botResponse = '';

            if (data.choices && data.choices.length > 0) {
                botResponse = data.choices[0].message.content;
            } else {
                botResponse = "Não recebi uma resposta válida.";
            }
            
            // Update or replace the placeholder
            botMessageDiv.innerHTML = `<p>${botResponse.replace(/\n/g, '<br>')}</p>`; // Update content
            botMessageDiv.classList.remove('streaming');


            updateChatHistory('assistant', botResponse);
            saveSettings(); // Save after successful response and history update

        } catch (error) {
            console.error('Error sending message:', error);
            botMessageDiv.innerHTML = `<p>Erro: ${error.message}</p>`;
            botMessageDiv.classList.remove('streaming');
            botMessageDiv.style.color = 'red';
        }
    };

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Auto-resize textarea
    messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        const scrollHeight = messageInput.scrollHeight;
        const maxHeight = parseInt(window.getComputedStyle(messageInput).maxHeight, 10);
        if (scrollHeight > maxHeight) {
            messageInput.style.height = maxHeight + 'px';
            messageInput.style.overflowY = 'auto';
        } else {
            messageInput.style.height = scrollHeight + 'px';
            messageInput.style.overflowY = 'hidden';
        }
    });


    // --- Chat History Management ---
    const renderChatHistoryList = () => {
        chatHistoryList.innerHTML = ''; // Clear existing list
        const sortedChatIds = Object.keys(chatHistory).sort((a, b) => {
            const timeA = chatHistory[a] && chatHistory[a].length > 0 ? new Date(chatHistory[a][0].timestamp).getTime() : 0;
            const timeB = chatHistory[b] && chatHistory[b].length > 0 ? new Date(chatHistory[b][0].timestamp).getTime() : 0;
            return timeB - timeA; // Sort by newest first based on the first message's timestamp
        });

        sortedChatIds.forEach(chatId => {
            if (!chatHistory[chatId] || chatHistory[chatId].length === 0) return; // Skip empty chats

            const li = document.createElement('li');
            li.dataset.chatId = chatId;

            const firstUserOrBotMessage = chatHistory[chatId][0];
            let previewText = `Chat ${chatId.substring(5, 10)}`; // Fallback name with part of timestamp
            if (firstUserOrBotMessage) {
                 previewText = firstUserOrBotMessage.content.substring(0, 25) + (firstUserOrBotMessage.content.length > 25 ? '...' : '');
            }
            
            const textNode = document.createElement('span');
            textNode.textContent = previewText;
            li.appendChild(textNode);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = '🗑️';
            deleteButton.classList.add('delete-chat-button');
            deleteButton.ariaLabel = 'Deletar conversa';
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent li click event when deleting
                if (confirm(`Tem certeza que quer deletar esta conversa: "${previewText}"?`)) {
                    deleteChat(chatId);
                }
            });
            li.appendChild(deleteButton);
            
            if (chatId === currentChatId) {
                li.classList.add('active-chat');
            }

            li.addEventListener('click', () => {
                loadChat(chatId);
                if (sidebar.classList.contains('open') && window.innerWidth < 769) {
                    sidebar.classList.remove('open');
                    document.body.classList.remove('sidebar-open-overlay');
                }
            });
            chatHistoryList.appendChild(li);
        });
    };
    
    const deleteChat = (chatIdToDelete) => {
        delete chatHistory[chatIdToDelete];
        if (currentChatId === chatIdToDelete) {
            // If active chat is deleted, start a new one or load another if available
            const remainingChatIds = Object.keys(chatHistory);
            if (remainingChatIds.length > 0) {
                loadChat(remainingChatIds[0]); // Load the "newest" remaining
            } else {
                startNewChat();
            }
        }
        renderChatHistoryList();
        saveSettings();
    };


    const updateChatHistory = (role, content) => {
        if (!currentChatId || !chatHistory[currentChatId]) {
            // This case should ideally be handled by startNewChat correctly initializing currentChatId and chatHistory[currentChatId]
            console.warn("currentChatId not set or history not initialized, starting new chat for safety.");
            startNewChat(); // Ensure chat is initialized
        }
        // Ensure the array exists before pushing
        if (!Array.isArray(chatHistory[currentChatId])) {
            chatHistory[currentChatId] = [];
        }

        chatHistory[currentChatId].push({ role, content, timestamp: new Date().toISOString() });
        renderChatHistoryList(); 
        saveSettings();
    };

    const startNewChat = () => {
        const newId = `chat_${new Date().getTime()}`;
        currentChatId = newId;
        chatHistory[currentChatId] = []; // Initialize as an empty array
        chatMessages.innerHTML = ''; 
        
        const initialBotMessage = 'Olá! Como posso te ajudar hoje?';
        addMessageToChat('assistant', initialBotMessage); 
        updateChatHistory('assistant', initialBotMessage); // This will now correctly use the initialized currentChatId

        renderChatHistoryList(); // Ensure the new chat appears in the list
        // Highlight the new chat as active
        document.querySelectorAll('#chat-history-list li').forEach(li => {
            li.classList.toggle('active-chat', li.dataset.chatId === currentChatId);
        });
        saveSettings(); 
        messageInput.focus();
    };

    const loadChat = (chatId) => {
        if (!chatHistory[chatId]) {
            console.warn(`Chat with id ${chatId} not found. Starting a new chat.`);
            startNewChat();
            return;
        }
        currentChatId = chatId;
        chatMessages.innerHTML = ''; 
        chatHistory[chatId].forEach(msg => addMessageToChat(msg.role, msg.content, `msg_${msg.timestamp}`)); // Add unique ID for messages if needed
        
        document.querySelectorAll('#chat-history-list li').forEach(li => {
            li.classList.toggle('active-chat', li.dataset.chatId === chatId);
        });
        saveSettings(); 
    };

    newChatButton.addEventListener('click', startNewChat);

    // --- Initial Load ---
    loadSettings(); // This will call startNewChat if no valid history/currentChatId is found
});
