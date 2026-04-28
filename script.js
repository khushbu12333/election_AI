const chatHistory = document.getElementById('chat-history');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const apiKeyInput = document.getElementById('api-key');

// Navigation Logic
const navBtns = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('.content-section');

let currentContext = 'Assistant'; // Track current section for LLM context

navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all
        navBtns.forEach(b => b.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));
        
        // Add active class to clicked
        btn.classList.add('active');
        const targetId = btn.dataset.target;
        document.getElementById(targetId).classList.add('active');
        
        // Update context for the AI
        currentContext = btn.innerText.trim();
    });
});

// UI helpers
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

function addMessage(text, isUser = false) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');
    msgDiv.classList.add(isUser ? 'user-message' : 'ai-message');
    
    const icon = isUser ? 'person' : 'smart_toy';
    
    // Escape HTML to prevent XSS
    let escapedText = escapeHTML(text);
    
    // Parse simple markdown bold
    let formattedText = escapedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Parse newlines to <br>
    formattedText = formattedText.replace(/\n/g, '<br>');
    
    msgDiv.innerHTML = `
        <div class="avatar"><span class="material-symbols-outlined">${icon}</span></div>
        <div class="message-content">${formattedText}</div>
    `;
    
    chatHistory.appendChild(msgDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function showLoading() {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', 'ai-message', 'loading-msg');
    msgDiv.innerHTML = `
        <div class="avatar"><span class="material-symbols-outlined">smart_toy</span></div>
        <div class="message-content">
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    chatHistory.appendChild(msgDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    return msgDiv;
}

// Google Gemini API Integration
async function callGemini(prompt, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    // Context injection: Give the AI knowledge about the app and what the user is currently looking at.
    const systemPrompt = `You are Votey, a smart, dynamic, and helpful election assistant. 
Your goal is to help users understand the election process, timelines, and how to vote.
Provide accurate, neutral, and practical advice. Keep answers structured, concise, and easy to follow. 
Use markdown bolding for key terms.
Current context: The user is currently viewing the "${currentContext}" section of the app.
If the user asks non-election things, politely steer them back to election topics.`;
    
    const payload = {
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
        contents: [{
            parts: [
                { text: "User question: " + prompt }
            ]
        }],
        generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        throw new Error(errorData.error?.message || "Failed to communicate with Google Gemini API.");
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

// Handle sending message
async function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;
    
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        addMessage("Please enter your Google Gemini API Key in the sidebar settings to enable the smart assistant.", false);
        return;
    }

    // Display user message
    addMessage(text, true);
    chatInput.value = '';
    
    // Show typing indicator
    const loadingMsg = showLoading();
    
    try {
        const reply = await callGemini(text, apiKey);
        loadingMsg.remove();
        addMessage(reply, false);
    } catch (e) {
        loadingMsg.remove();
        addMessage("Oops! Something went wrong. " + e.message, false);
    }
}

// Event Listeners
sendBtn.addEventListener('click', handleSend);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
});

// Initial animation for the intro message
document.addEventListener("DOMContentLoaded", () => {
    const introMsg = chatHistory.querySelector('.message');
    if (introMsg) {
        introMsg.style.opacity = '0';
        introMsg.style.transform = 'translateY(20px)';
        setTimeout(() => {
            introMsg.style.transition = 'all 0.5s ease';
            introMsg.style.opacity = '1';
            introMsg.style.transform = 'translateY(0)';
        }, 300);
    }
});

// Interactive Cards (Accordion) Logic
const interactiveCards = document.querySelectorAll('.interactive-card');

interactiveCards.forEach(card => {
    card.addEventListener('click', () => {
        // Accordion behavior: close others
        const isActive = card.classList.contains('active');
        
        interactiveCards.forEach(c => {
            c.classList.remove('active');
            c.setAttribute('aria-expanded', 'false');
            const hint = c.querySelector('.expand-hint');
            if(hint) hint.innerText = 'Click to expand';
        });

        if (!isActive) {
            card.classList.add('active');
            card.setAttribute('aria-expanded', 'true');
            const hint = card.querySelector('.expand-hint');
            if(hint) hint.innerText = 'Click to close';
        }
    });

    // Keyboard accessibility
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            card.click();
        }
    });
});
