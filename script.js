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
// ... (この部分は変更なし) ...

/**
 * 画面にメッセージを表示する関数 (LINE風表示に対応)
 */
// ... (この部分は変更なし) ...

/**
 * テキストを音声で読み上げる関数
 */
// ... (この部分は変更なし) ...

/**
 * サーバー経由でGemini APIにリクエストを送信する関数
 */
// ... (この部分は変更なし) ...

/**
 * テキスト送信処理
 */
// ... (この部分は変更なし) ...

// イベントリスナーの設定
// ... (この部分は変更なし) ...

// 音声認識の処理
// ... (この部分は変更なし) ...

// ▼ここからLive2Dの処理（最終修正版）▼
(async function main() {
    // PIXIのApplicationを作成
    const app = new PIXI.Application({
        view: canvas,
        autoStart: true,
        resizeTo: avatarContainer,
        backgroundAlpha: 0, // 背景を透過
    });

    // モデル定義ファイルのパスを指定
    const modelPath = '/assets/live2d_models/kei_jp/kei.model3.json';

    // Live2Dモデルを読み込む
    // この .from メソッドが、.model3.jsonを元に必要なファイル(moc3, texture, motion)を
    // 自動的に正しい場所から読み込んでくれるため、フォルダ構造の違いに強い
    live2dModel = await PIXI.live2d.Live2DModel.from(modelPath);
    
    app.stage.addChild(live2dModel);

    // モデルのサイズと位置を調整する関数
    function resizeModel() {
        if (!live2dModel) return;
        // 横幅か高さのどちらか小さい方に合わせてスケールを計算
        const scale = Math.min(
            avatarContainer.clientWidth / live2dModel.width,
            avatarContainer.clientHeight / live2dModel.height
        ) * 0.9;
        live2dModel.scale.set(scale);
        live2dModel.position.set(avatarContainer.clientWidth / 2, avatarContainer.clientHeight / 2);
    }

    resizeModel();

    // ウィンドウリサイズ時にモデルもリサイズ
    window.addEventListener('resize', resizeModel);

})();
// ▲ここまでLive2Dの処理▲