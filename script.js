// --- DOM要素の取得 ---
const canvas = document.getElementById('live2d-canvas');
const sendButton = document.getElementById('send-button');
const userInput = document.getElementById('user-input');
const chatHistory = document.getElementById('chat-history');

// --- アプリケーション設定 ---
// ③ あなたのパス情報を反映した最終的なモデルパス
const MODEL_PATH = 'assets/kei_jp/kei_basic_free/runtime/kei_basic_free.model3.json';

// --- Live2Dの初期化処理 ---
const app = new PIXI.Application({
    view: canvas,
    autoStart: true,
    resizeTo: canvas.parentElement,
    backgroundColor: 0x333333,
});

async function loadLive2DModel() {
    try {
        const model = await PIXI.live2d.Live2DModel.from(MODEL_PATH);
        app.stage.addChild(model);

        const scale = canvas.parentElement.offsetHeight / model.height * 0.8;
        model.scale.set(scale);
        model.x = (canvas.parentElement.offsetWidth - model.width) / 2;
        model.y = (canvas.parentElement.offsetHeight - model.height) / 2;

    } catch (error) {
        console.error("Live2Dモデルの読み込みに失敗しました:", error);
        alert("Live2Dモデルの読み込みに失敗しました。MODEL_PATHが正しいか確認してください。");
    }
}

loadLive2DModel();


// --- チャット機能 ---
sendButton.addEventListener('click', handleSendMessage);
userInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        handleSendMessage();
    }
});

async function handleSendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    appendMessage(message, 'user');
    userInput.value = '';

    try {
        const aiResponse = await sendMessageToAI(message);
        appendMessage(aiResponse, 'ai');
    } catch (error) {
        appendMessage('エラーが発生しました。', 'ai');
    }
}

// ④ Grok-4 Fastモデルに接続するよう修正済み
async function sendMessageToAI(message) {
    try {
        const response = await puter.chat(message, { model: 'x-ai/grok-4-fast' });
        return response.message.content;
    } catch (error) {
        console.error("Puter.js API Error:", error);
        return "AIからの応答取得中にエラーが発生しました。";
    }
}

function appendMessage(text, sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender);
    messageElement.innerText = text;
    chatHistory.appendChild(messageElement);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}