// DOM要素の取得
const chatHistory = document.getElementById('chat-history');
const statusMessage = document.getElementById('status-message');
const sendButton = document.getElementById('send-button');
const userInput = document.getElementById('user-input');
const talkButton = document.getElementById('talk-button');
const avatarContainer = document.getElementById('avatar-container');
const chatContainer = document.getElementById('chat-container');
const fullscreenAvatarBtn = document.getElementById('fullscreen-avatar-btn');
const fullscreenChatBtn = document.getElementById('fullscreen-chat-btn');
const canvas = document.getElementById('live2d-canvas');

// Web Speech API の準備
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;
const synth = window.speechSynthesis;

let isListening = false;
let isSpeaking = false;
let live2dModel; // Live2Dモデルをグローバルで保持

// 全画面切り替えイベント
fullscreenAvatarBtn.addEventListener('click', () => {
    avatarContainer.classList.toggle('fullscreen');
    chatContainer.classList.toggle('hidden');
});

fullscreenChatBtn.addEventListener('click', () => {
    chatContainer.classList.toggle('fullscreen');
    avatarContainer.classList.toggle('hidden');
});

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
 * 画面にメッセージを表示する関数 (LINE風表示に対応)
 */
function displayMessage(text, sender) {
    const messageContainer = document.createElement('div');
    const senderName = document.createElement('div');
    const messageDiv = document.createElement('div');
    if (sender === 'user') {
        messageContainer.classList.add('user-container');
        senderName.textContent = 'You';
    } else {
        messageContainer.classList.add('ai-container');
        senderName.textContent = 'AI';
    }
    senderName.classList.add('sender-name');
    messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'ai-message');
    messageDiv.textContent = text;
    messageContainer.appendChild(senderName);
    messageContainer.appendChild(messageDiv);
    chatHistory.appendChild(messageContainer);
    chatHistory.scrollTop = chatHistory.scrollHeight;
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
                if (live2dModel) {
                    live2dModel.motion('Idle'); // 話し終わったら待機モーションに
                }
                resolve();
            };
            utterThis.onerror = (event) => {
                isSpeaking = false;
                reject(event.error);
            };
            // リップシンクを開始
            if (live2dModel) {
                live2dModel.motion('Talk');
            }
            const japaneseVoice = synth.getVoices().find(voice => voice.lang.startsWith('ja'));
            if (japaneseVoice) utterThis.voice = japaneseVoice;
            synth.speak(utterThis);
        } else {
            resolve();
        }
    });
}
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

        if (aiText.includes('嬉しい') || aiText.includes('ありがとう')) {
            live2dModel.expression('F02'); // 笑顔
        } else {
            live2dModel.expression('F01'); // 通常の表情
        }
        
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

// 音声認識の処理
if (recognition) {
    recognition.lang = 'ja-JP';
    recognition.onresult = (event) => {
        const userText = event.results[0][0].transcript;
        displayMessage(userText, 'user');
        getGeminiResponse(userText);
    };
    recognition.onend = () => {
        isListening = false;
        setUiLoading(false);
    };
    talkButton.addEventListener('click', () => {
        if (!isListening) {
            recognition.start();
            isListening = true;
            setUiLoading(true);
        }
    });
}

// ▼ Live2Dのメイン処理を関数として定義 ▼
async function initLive2D() {
    // Live2Dモデルのパスを指定
    const modelPath = '/assets/live2d_models/kei_jp/kei.model3.json';

    // PIXIのApplicationを作成
    const app = new PIXI.Application({
        view: canvas,
        autoStart: true,
        resizeTo: avatarContainer,
        backgroundAlpha: 0,
    });

    // Live2Dモデルを読み込み
    live2dModel = await PIXI.live2d.Live2DModel.from(modelPath, {
        autoInteract: false
    });
    
    app.stage.addChild(live2dModel);

    // モデルのサイズと位置を調整する関数
    function resizeModel() {
        if (!live2dModel) return;
        const scale = (avatarContainer.clientHeight / live2dModel.height) * 0.9;
        live2dModel.scale.set(scale);
        live2dModel.position.set(avatarContainer.clientWidth / 2, avatarContainer.clientHeight / 2);
    }

    resizeModel();
    window.addEventListener('resize', resizeModel);

    // 自動でのまばたきや呼吸を有効にする
    live2dModel.internalModel.motionManager.startMotion('Idle');
}

// ▼ すべてのライブラリが読み込まれた後にLive2Dの処理を開始 ▼
window.onload = () => {
    initLive2D();
};