// DOM要素の取得
const talkButton = document.getElementById('talk-button');
const chatHistory = document.getElementById('chat-history');
const statusMessage = document.getElementById('status-message');

// Gemini APIの設定
const API_KEY = 'AIzaSyAYA87F-5ec_KPQqwvcZ37y801yMEJdews'
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`;

// Web Speech API の準備
const SpeechRecognition = window.SpeechRecognition |

 window.webkitSpeechRecognition;
const recognition = SpeechRecognition? new SpeechRecognition() : null;
const synth = window.speechSynthesis;

let isListening = false;

// APIサポートのチェック
if (!recognition ||!synth) {
    statusMessage.textContent = "お使いのブラウザはWeb Speech APIに対応していません。";
    talkButton.disabled = true;
} else {
    // 音声認識の設定
    recognition.lang = 'ja-JP'; // 日本語に設定
    recognition.interimResults = false; // 最終結果のみ取得
    recognition.continuous = false; // 一度の発話で認識を終了
}

/**
 * 画面にメッセージを表示する関数
 * @param {string} text - 表示するテキスト
 * @param {string} sender - 'user' または 'ai'
 */
function displayMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender === 'user'? 'user-message' : 'ai-message');
    messageDiv.textContent = text;
    chatHistory.appendChild(messageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

/**
 * テキストを音声で読み上げる関数
 * @param {string} text - 読み上げるテキスト
 * @returns {Promise<void>} 読み上げが完了したら解決するPromise
 */
function speak(text) {
    return new Promise((resolve, reject) => {
        if (synth.speaking) {
            synth.cancel(); // 念のため既存の読み上げをキャンセル
        }
        if (text!== '') {
            const utterThis = new SpeechSynthesisUtterance(text);
            utterThis.onend = () => {
                statusMessage.textContent = '応答完了。';
                resolve();
            };
            utterThis.onerror = (event) => {
                statusMessage.textContent = `読み上げエラー: ${event.error}`;
                reject(event.error);
            };
            const japaneseVoice = synth.getVoices().find(voice => voice.lang.startsWith('ja'));
            if (japaneseVoice) {
                utterThis.voice = japaneseVoice;
            }
            synth.speak(utterThis);
        } else {
            resolve(); // テキストが空なら即座に解決
        }
    });
}

/**
 * Gemini APIにリクエストを送信し、応答を取得する関数
 * @param {string} prompt - ユーザーからの入力プロンプト
 */
async function getGeminiResponse(prompt) {
    try {
        statusMessage.textContent = 'AIが応答を考えています...';
        talkButton.disabled = true;

        const payload = {
            contents: [{ parts: [{ text: prompt }] }]
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`APIエラー: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const aiText = data.candidates.content.parts.text;
        
        displayMessage(aiText, 'ai');
        await speak(aiText); // 読み上げが終わるまで待つ

    } catch (error) {
        console.error('Gemini APIリクエスト中にエラーが発生しました:', error);
        statusMessage.textContent = `エラー: ${error.message}`;
        displayMessage(`エラーが発生しました。`, 'ai');
    } finally {
        talkButton.disabled = false;
        statusMessage.textContent = 'ボタンを押して話しかけてください。';
    }
}

// 音声認識のイベントハンドラ
recognition.onresult = (event) => {
    const userText = event.results.transcript;
    displayMessage(userText, 'user');
    getGeminiResponse(userText);
};

recognition.onerror = (event) => {
    console.error('音声認識エラー:', event.error);
    statusMessage.textContent = `認識エラー: ${event.error}`;
    isListening = false;
    talkButton.classList.remove('listening');
    talkButton.textContent = '🎤 話す';
};

recognition.onend = () => {
    if (isListening) {
        isListening = false;
        talkButton.classList.remove('listening');
        talkButton.textContent = '🎤 話す';
    }
};

// 話すボタンのクリックイベント
talkButton.addEventListener('click', () => {
    if (!isListening) {
        recognition.start();
        isListening = true;
        talkButton.classList.add('listening');
        talkButton.textContent = '... 聞き取り中';
        statusMessage.textContent = '話してください...';
    } else {
        recognition.stop();
        // onendイベントで状態がリセットされる
    }
});
