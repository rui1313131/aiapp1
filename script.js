// DOM要素の取得
const chatHistory = document.getElementById('chat-history');
const statusMessage = document.getElementById('status-message');
const sendButton = document.getElementById('send-button');
const userInput = document.getElementById('user-input');
const talkButton = document.getElementById('talk-button');

// Web Speech API の準備
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;
const synth = window.speechSynthesis;

let isListening = false;
let isSpeaking = false;

// UIの状態を管理する関数
function setUiLoading(isLoading) {
    if (isLoading) {
        sendButton.disabled = true;
        talkButton.disabled = true;
    } else {
        sendButton.disabled = false;
        talkButton.disabled = false;
    }
}

// サポートチェック
if (!recognition) {
    talkButton.disabled = true;
    statusMessage.textContent = "お使いのブラウザは音声認識に非対応です。";
}
if (!synth) {
    statusMessage.textContent = "お使いのブラウザは音声合成に非対応です。";
}

/**
 * 画面にメッセージを表示する関数
 */
function displayMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'ai-message');
    messageDiv.textContent = text;
    chatHistory.appendChild(messageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight; // 自動スクロール
}

/**
 * テキストを音声で読み上げる関数
 */
function speak(text) {
    return new Promise((resolve, reject) => {
        if (isSpeaking) synth.cancel();
        if (text) {
            isSpeaking = true;
            const utterThis = new SpeechSynthesisUtterance(text);
            utterThis.onend = () => {
                isSpeaking = false;
                resolve();
            };
            utterThis.onerror = (event) => {
                isSpeaking = false;
                reject(event.error);
            };
            // 利用可能な日本語の音声を探して設定
            const japaneseVoice = synth.getVoices().find(voice => voice.lang.startsWith('ja'));
            if (japaneseVoice) utterThis.voice = japaneseVoice;
            
            synth.speak(utterThis);
        } else {
            resolve();
        }
    });
}
// ブラウザによっては音声リストの読み込みが非同期なため、イベントで再取得
if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = () => synth.getVoices();
}

/**
 * サーバー経由でGemini APIにリクエストを送信する関数
 */
async function getGeminiResponse(prompt) {
    setUiLoading(true);
    statusMessage.textContent = 'AIが応答を考えています...';
    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTPエラー: ${response.status}`);
        }

        const data = await response.json();
        const aiText = data.candidates[0].content.parts[0].text;
        
        displayMessage(aiText, 'ai');
        statusMessage.textContent = 'AIが応答を読み上げています...';
        await speak(aiText);

    } catch (error) {
        console.error('リクエスト中にエラーが発生しました:', error);
        const errorMessage = `エラーが発生しました: ${error.message}`;
        displayMessage(errorMessage, 'ai');
        statusMessage.textContent = errorMessage;
    } finally {
        setUiLoading(false);
        statusMessage.textContent = '準備完了';
    }
}

/**
 * テキスト送信処理
 */
async function handleTextInput() {
    const userText = userInput.value.trim();
    if (userText) {
        displayMessage(userText, 'user');
        userInput.value = '';
        await getGeminiResponse(userText);
    }
}

// イベントリスナーの設定
sendButton.addEventListener('click', handleTextInput);
userInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleTextInput();
    }
});

if (recognition) {
    recognition.lang = 'ja-JP';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
        const userText = event.results[0][0].transcript;
        displayMessage(userText, 'user');
        getGeminiResponse(userText);
    };
    recognition.onerror = (event) => {
        console.error('音声認識エラー:', event.error);
        statusMessage.textContent = `認識エラー: ${event.error}`;
    };
    recognition.onend = () => {
        isListening = false;
        talkButton.classList.remove('listening');
        setUiLoading(false);
        if (statusMessage.textContent === '話してください...') {
            statusMessage.textContent = '準備完了';
        }
    };

    talkButton.addEventListener('click', () => {
        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
            isListening = true;
            talkButton.classList.add('listening');
            setUiLoading(true); // 音声認識中もボタンは無効
            statusMessage.textContent = '話してください...';
        }
    });
}