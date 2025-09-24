(async function () {
  // PixiJSアプリケーションを初期化
  const app = new PIXI.Application({
    view: document.getElementById('live2d-canvas'),
    autoStart: true,
    resizeTo: window,
    backgroundColor: 0x333333,
  });

  // モデルファイルのパス (Cubism 4モデルの例)
  // パスは自身の環境に合わせて適宜変更してください
  const modelPath = 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/haru_greeter_t03.model3.json';

  try {
    // 統合ライブラリのAPIを使用してモデルを非同期で読み込む
    // PIXI.live2d.Live2DModel.from() を使用する
    const model = await PIXI.live2d.Live2DModel.from(modelPath);

    // モデルをステージに追加
    app.stage.addChild(model);

    // モデルのスケールと位置を調整
    const scale = Math.min(
      window.innerWidth / model.width,
      window.innerHeight / model.height
    ) * 0.8;
    model.scale.set(scale);
    model.x = (window.innerWidth - model.width) / 2;
    model.y = (window.innerHeight - model.height) / 2;

    // ヒットエリア（当たり判定）に対するインタラクションを設定
    model.on('hit', (hitAreaNames) => {
      if (hitAreaNames.includes('Body')) {
        // 体がタップされた場合、ランダムなモーションを再生
        model.motion('TapBody', undefined, PIXI.live2d.MotionPriority.NORMAL);
      }
    });

  } catch (error) {
    console.error('Failed to load Live2D model:', error);
  }
})();