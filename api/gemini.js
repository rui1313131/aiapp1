// Vercelのサーバーレス関数として動作します。
// このファイルはプロジェクトルートの /api/ ディレクトリに配置してください。

export default async function handler(request, response) {
  // 環境変数から安全にAPIキーを取得します。
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    return response.status(500).json({ message: 'APIキーが設定されていません。' });
  }

  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`;
  
  // フロントエンドからのPOSTリクエスト以外は拒否します。
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'POSTリクエストのみ受け付けます。' });
  }

  try {
    // フロントエンドから送られてきたユーザーのプロンプト（入力テキスト）を取得します。
    const userInput = request.body.prompt;
    if (!userInput) {
        return response.status(400).json({ message: 'プロンプトがありません。' });
    }

    const payload = {
      contents: [{ parts: [{ text: userInput }] }]
    };

    // このサーバーからGoogleのAPIにリクエストを送信します。
    const geminiResponse = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      throw new Error(`APIエラー: ${geminiResponse.status} - ${errorBody}`);
    }

    const data = await geminiResponse.json();
    
    // Google APIからの結果をそのままフロントエンドに返します。
    response.status(200).json(data);

  } catch (error) {
    console.error('サーバーエラー:', error);
    response.status(500).json({ message: 'サーバーでエラーが発生しました。', error: error.message });
  }
}