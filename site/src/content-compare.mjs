// Objective comparison page (/vs-web-clippers) across all 8 standard languages.
export const COMPARE = {
  en: {
    title: "Tiny Memo vs Full Web Clippers",
    description: "An objective comparison between Tiny Memo and full-page web clippers like Notion, Evernote, and Obsidian Web Clipper: snippet speed, accounts, local storage, and Markdown export.",
    lede: "Full web clippers excel at archiving entire articles with images into cloud workspaces or local vaults. Tiny Memo takes a deliberately smaller path: fast sentence-level snippets into a temporary Markdown list.",
    whoHead: "Choosing the right tool",
    whoList: [
      { who: "Choose a full Web Clipper (Notion / Evernote / Obsidian)", fit: "if you want to save complete articles, rich HTML layouts, bookmarks, and metadata directly into a structured notebook or vault." },
      { who: "Choose Tiny Memo", fit: "if you want to grab short quotes across several tabs without signing in, merge multi-line excerpts into one line, and copy `- item` Markdown straight into any editor." },
    ],
    tableHead: { feature: "Capability", tinyMemo: "Tiny Memo", cloudClipper: "Cloud Web Clippers", vaultClipper: "Vault Web Clippers" },
    rows: [
      { f: "Primary focus", tinyMemo: "Short text snippets into a Markdown queue", cloudClipper: "Full pages, bookmarks, and rich media", vaultClipper: "Full articles formatted into local Markdown files" },
      { f: "Account requirement", tinyMemo: "Zero accounts required", cloudClipper: "Workspace login required", vaultClipper: "Optional sync / vault setup required" },
      { f: "Multi-line cleanup", tinyMemo: "Automatic single-line merge (toggleable)", cloudClipper: "Preserves original page blocks", vaultClipper: "Preserves full paragraph structure" },
      { f: "Export workflow", tinyMemo: "One-click Copy as Markdown or Copy & Clear", cloudClipper: "Saved inside proprietary cloud database", vaultClipper: "Written to configured Obsidian vault folder" },
      { f: "Optional local TTS", tinyMemo: "Built-in hook for localhost:5020 TTS", cloudClipper: "Not included", vaultClipper: "Not included" },
      { f: "Tracking & telemetry", tinyMemo: "Zero third-party analytics SDKs", cloudClipper: "Standard cloud service telemetry", vaultClipper: "Depends on host app & plugins" },
    ],
    faq: [
      {
        q: "Can Tiny Memo replace a full web clipper for archiving whole pages?",
        a: "No. Tiny Memo intentionally saves only selected text snippets into a flat Markdown list. If you need full-page HTML snapshots or image archiving, pair it with a dedicated archival clipper.",
      },
      {
        q: "Where do copied Markdown snippets go?",
        a: "Clicking Copy as Markdown or Copy & Clear places `- snippet` lines directly into your clipboard so you can paste them into Obsidian, Notion, Apple Notes, GitHub issues, or any plain text file.",
      },
    ],
  },
  ja: {
    title: "Tiny Memo vs 一般的な Web クリッパー比較",
    description: "Tiny Memo と Notion / Evernote / Obsidian Web Clipper などの客観的な比較。抜粋の速さ、アカウント要件、ローカル保存、Markdown コピーの違いを整理します。",
    lede: "多機能な Web クリッパーは記事全体や画像をノートアプリへ保存するのに最適です。Tiny Memo はあえて機能を絞り、複数タブから短い一文だけを手早く集める用途に特化しています。",
    whoHead: "用途に合わせた選び方",
    whoList: [
      { who: "多機能 Web クリッパーが向いている方", fit: "記事本文全体、レイアウト、画像、メタデータを構造化されたノートブックや Vault へ直接アーカイブしたい場合。" },
      { who: "Tiny Memo が向いている方", fit: "ログイン不要で複数ページの引用を手早く集め、1 行に整えた `- テキスト` の Markdown リストとして任意のエディタへ貼り付けたい場合。" },
    ],
    tableHead: { feature: "比較項目", tinyMemo: "Tiny Memo", cloudClipper: "クラウド型クリッパー", vaultClipper: "Vault 連携クリッパー" },
    rows: [
      { f: "主な用途", tinyMemo: "短いテキスト抜粋の Markdown キュー収集", cloudClipper: "ページ全体・ブックマーク・画像保存", vaultClipper: "記事全体のローカル Markdown ファイル化" },
      { f: "アカウント要件", tinyMemo: "アカウント不要", cloudClipper: "サービスへのログインが必須", vaultClipper: "対象アプリや Vault 設定が必要" },
      { f: "複数行の整形", tinyMemo: "自動で 1 行に結合（オン／オフ可）", cloudClipper: "元のページ構造を保持", vaultClipper: "元の段落構造を保持" },
      { f: "取り出し方", tinyMemo: "ワンクリックで Markdown コピー／空にする", cloudClipper: "各社のクラウド DB 内に保存", vaultClipper: "指定した Vault フォルダへ保存" },
      { f: "ローカル TTS 連携", tinyMemo: "localhost:5020 対応（任意）", cloudClipper: "非対応", vaultClipper: "非対応" },
      { f: "追跡・テレメトリ", tinyMemo: "サードパーティ追跡ゼロ", cloudClipper: "標準のサービス解析あり", vaultClipper: "本体およびプラグインに依存" },
    ],
    faq: [
      {
        q: "Tiny Memo はページ全体の保存に向いていますか？",
        a: "いいえ。Tiny Memo は意図的に選択テキストの抜粋だけをフラットな Markdown リストに蓄える設計です。ページ丸ごとの保存には専用のクリッパーをお使いください。",
      },
      {
        q: "コピーした Markdown はどこに貼り付けられますか？",
        a: "システムクリップボードに `- 抜粋` 形式で入るため、Obsidian、Notion、メモアプリ、GitHub など好きなエディタへそのまま貼り付けられます。",
      },
    ],
  },
  "zh-CN": {
    title: "Tiny Memo vs 传统网页剪藏工具",
    description: "客观对比 Tiny Memo 与 Notion、Evernote、Obsidian Web Clipper 等全页剪藏工具在片段速度、账号依赖、本地存储与 Markdown 导出上的差异。",
    lede: "全能网页剪藏工具适合把整篇文章连同排版和图片存入云端或知识库；Tiny Memo 则专注一件更小的事——在多个网页间顺手摘录短句，合并成干净的 Markdown 列表后一键带走。",
    whoHead: "各自适合谁",
    whoList: [
      { who: "适合选全能网页剪藏工具", fit: "如果你需要完整保存整篇长文、网页版式、图片附件以及结构化书签到特定知识库。" },
      { who: "适合选 Tiny Memo", fit: "如果你只想在浏览时顺手摘录几段话，免登录、自动合并多余换行，并一键复制为 `- 列表` 粘贴到任意笔记或文档。" },
    ],
    tableHead: { feature: "对比维度", tinyMemo: "Tiny Memo", cloudClipper: "云端网页剪藏", vaultClipper: "本地库剪藏插件" },
    rows: [
      { f: "核心定位", tinyMemo: "轻量文本片段 Markdown 暂存队列", cloudClipper: "整页快照、书签与富媒体存档", vaultClipper: "将整篇文章转换为本地 Markdown 文件" },
      { f: "账号与登录", tinyMemo: "零账号、零登录要求", cloudClipper: "需登录对应云端工作区", vaultClipper: "需配置对应本地库或同步服务" },
      { f: "多行选区处理", tinyMemo: "默认自动合并为单行（可开关）", cloudClipper: "保留原网页段落与布局", vaultClipper: "保留全文段落结构" },
      { f: "导出工作流", tinyMemo: "一键复制为 Markdown 或复制并清空", cloudClipper: "写入服务商云端数据库", vaultClipper: "写入本地 Vault 指定目录" },
      { f: "可选本地朗读", tinyMemo: "内置 localhost:5020 本地 TTS 接口", cloudClipper: "不提供", vaultClipper: "不提供" },
      { f: "第三方统计追踪", tinyMemo: "无任何第三方闭源追踪 SDK", cloudClipper: "包含常规云服务遥测", vaultClipper: "取决于宿主应用与插件" },
    ],
    faq: [
      {
        q: "Tiny Memo 能替代整页归档类剪藏工具吗？",
        a: "不能。Tiny Memo 刻意只收集选中的短文本片段，适合快速做摘录或灵感收集；如果需要保存完整网页 HTML 与图片，建议搭配专用归档工具使用。",
      },
      {
        q: "复制出来的 Markdown 可以粘贴到哪里？",
        a: "内容会以标准 `- 文本` 列表写入系统剪贴板，你可以直接粘贴到 Obsidian、Notion、Apple 备忘录、GitHub 或任意纯文本编辑器。",
      },
    ],
  },
  "zh-TW": {
    title: "Tiny Memo vs 傳統網頁剪藏工具",
    description: "客觀對比 Tiny Memo 與 Notion、Evernote、Obsidian Web Clipper 等全頁剪藏工具在片段速度、帳號相依、本機儲存與 Markdown 匯出上的差異。",
    lede: "全能網頁剪藏工具適合把整篇文章連同排版和圖片存入雲端或知識庫；Tiny Memo 則專注一件更小的事——在多個網頁間順手摘錄短句，合併成乾淨的 Markdown 清單後一鍵帶走。",
    whoHead: "各自適合誰",
    whoList: [
      { who: "適合選全能網頁剪藏工具", fit: "如果你需要完整儲存整篇長文、網頁版式、圖片附件以及結構化書籤到特定知識庫。" },
      { who: "適合選 Tiny Memo", fit: "如果你只想在瀏覽時順手摘錄幾段話，免登入、自動合併多餘換行，並一鍵複製為 `- 清單` 貼到任意筆記或文件。" },
    ],
    tableHead: { feature: "對比維度", tinyMemo: "Tiny Memo", cloudClipper: "雲端網頁剪藏", vaultClipper: "本機庫剪藏外掛" },
    rows: [
      { f: "核心定位", tinyMemo: "輕量文字片段 Markdown 暫存佇列", cloudClipper: "整頁快照、書籤與富媒體存檔", vaultClipper: "將整篇文章轉換為本機 Markdown 檔案" },
      { f: "帳號與登入", tinyMemo: "零帳號、零登入要求", cloudClipper: "需登入對應雲端工作區", vaultClipper: "需設定對應本機庫或同步服務" },
      { f: "多行選取處理", tinyMemo: "預設自動合併為單行（可開關）", cloudClipper: "保留原網頁段落與佈局", vaultClipper: "保留全文段落結構" },
      { f: "匯出工作流", tinyMemo: "一鍵複製為 Markdown 或複製並清空", cloudClipper: "寫入服務商雲端資料庫", vaultClipper: "寫入本機 Vault 指定目錄" },
      { f: "可選本機朗讀", tinyMemo: "內建 localhost:5020 本機 TTS 介面", cloudClipper: "不提供", vaultClipper: "不提供" },
      { f: "第三方統計追蹤", tinyMemo: "無任何第三方閉源追蹤 SDK", cloudClipper: "包含常規雲端服務遙測", vaultClipper: "取決於宿主應用與外掛" },
    ],
    faq: [
      {
        q: "Tiny Memo 能替代整頁歸檔類剪藏工具嗎？",
        a: "不能。Tiny Memo 刻意只收集選取的短文字片段，適合快速做摘錄或靈感收集；如果需要儲存完整網頁 HTML 與圖片，建議搭配專用歸檔工具使用。",
      },
      {
        q: "複製出來的 Markdown 可以貼到哪裡？",
        a: "內容會以標準 `- 文字` 清單寫入系統剪貼簿，你可以直接貼到 Obsidian、Notion、Apple 備忘錄、GitHub 或任意純文字編輯器。",
      },
    ],
  },
  ko: {
    title: "Tiny Memo vs 일반 웹 클리퍼 비교",
    description: "Tiny Memo와 Notion, Evernote, Obsidian Web Clipper 같은 전체 페이지 클리퍼의 객관적 비교: 스니펫 속도, 계정 요구 사항, 로컬 저장 및 Markdown 내보내기.",
    lede: "일반 웹 클리퍼는 전체 기사와 이미지를 클라우드나 볼트에 보관하는 데 강합니다. Tiny Memo는 의도적으로 더 작게 설계되어 짧은 문장만 빠르게 모아 임시 Markdown 목록으로 내보냅니다.",
    whoHead: "상황에 맞는 선택",
    whoList: [
      { who: "전체 웹 클리퍼 추천", fit: "긴 글 전체, 서식 있는 레이아웃, 이미지, 북마크를 구조화된 노트북이나 볼트에 직접 아카이브하고 싶은 경우." },
      { who: "Tiny Memo 추천", fit: "로그인 없이 여러 탭에서 짧은 인용문만 모아 한 줄로 정리한 뒤 `- 항목` Markdown으로 아무 에디터에나 바로 붙여 넣고 싶은 경우." },
    ],
    tableHead: { feature: "비교 항목", tinyMemo: "Tiny Memo", cloudClipper: "클라우드 웹 클리퍼", vaultClipper: "볼트 연동 클리퍼" },
    rows: [
      { f: "핵심 초점", tinyMemo: "짧은 텍스트 스니펫 Markdown 대기열", cloudClipper: "전체 페이지, 북마크, 리치 미디어", vaultClipper: "전체 기사를 로컬 Markdown 파일로 저장" },
      { f: "계정 필요 여부", tinyMemo: "계정 불필요", cloudClipper: "워크스페이스 로그인 필요", vaultClipper: "볼트 또는 동기화 설정 필요" },
      { f: "여러 줄 정리", tinyMemo: "자동 한 줄 병합(켜고 끄기 가능)", cloudClipper: "원본 블록 구조 유지", vaultClipper: "전체 문단 구조 유지" },
      { f: "내보내기 흐름", tinyMemo: "원클릭 Markdown 복사 / 복사 후 비우기", cloudClipper: "클라우드 데이터베이스에 저장", vaultClipper: "지정된 로컬 볼트 폴더에 저장" },
      { f: "로컬 TTS 지원", tinyMemo: "localhost:5020 로컬 TTS 연동(선택)", cloudClipper: "미지원", vaultClipper: "미지원" },
      { f: "추적 · 텔레메트리", tinyMemo: "서드파티 추적 SDK 없음", cloudClipper: "기본 서비스 텔레메트리 포함", vaultClipper: "호스트 앱 및 플러그인에 따름" },
    ],
    faq: [
      {
        q: "Tiny Memo가 웹페이지 전체 아카이빙을 대체할 수 있나요?",
        a: "아니요. Tiny Memo는 의도적으로 선택한 짧은 텍스트만 Markdown 목록에 담습니다. 전체 HTML과 이미지 보관이 필요하다면 전용 아카이브 클리퍼와 함께 사용하세요.",
      },
      {
        q: "복사한 Markdown은 어디에 붙여 넣을 수 있나요?",
        a: "`- 내용` 형식의 목록이 클립보드에 들어가므로 Obsidian, Notion, 메모 앱, GitHub 등 어떤 텍스트 편집기에도 바로 붙여 넣을 수 있습니다.",
      },
    ],
  },
  de: {
    title: "Tiny Memo vs. klassische Web Clipper",
    description: "Sachlicher Vergleich zwischen Tiny Memo und Web-Clippern wie Notion, Evernote oder Obsidian Web Clipper: Snippet-Tempo, Kontopflicht, lokaler Speicher und Markdown-Export.",
    lede: "Klassische Web Clipper archivieren ganze Artikel samt Bildern in Cloud-Workspaces oder lokale Vaults. Tiny Memo geht bewusst einen kleineren Weg: schnelle Zitate als Markdown-Liste zum Mitnehmen.",
    whoHead: "Welches Werkzeug passt zu dir",
    whoList: [
      { who: "Einen Vollseiten-Clipper wählen", fit: "wenn du ganze Artikel, Layouts, Bilder und Metadaten dauerhaft in ein Notizbuch oder einen Vault sichern möchtest." },
      { who: "Tiny Memo wählen", fit: "wenn du über mehrere Tabs hinweg kurze Zitate ohne Login sammeln, Zeilenumbrüche bereinigen und saubere `- Notiz`-Zeilen in jeden Editor einfügen willst." },
    ],
    tableHead: { feature: "Kriterium", tinyMemo: "Tiny Memo", cloudClipper: "Cloud-Web-Clipper", vaultClipper: "Vault-Web-Clipper" },
    rows: [
      { f: "Hauptfokus", tinyMemo: "Kurze Text-Snippets in einer Markdown-Liste", cloudClipper: "Ganze Seiten, Lesezeichen & Medien", vaultClipper: "Vollständige Artikel als lokale Markdown-Dateien" },
      { f: "Kontopflicht", tinyMemo: "Kein Konto nötig", cloudClipper: "Workspace-Login erforderlich", vaultClipper: "Vault- bzw. Sync-Einrichtung nötig" },
      { f: "Mehrzeilen-Bereinigung", tinyMemo: "Automatisch einzeilig verbinden (umschaltbar)", cloudClipper: "Behält originale Seitenblöcke", vaultClipper: "Behält vollständige Absatzstruktur" },
      { f: "Export-Ablauf", tinyMemo: "Ein-Klick Markdown kopieren / kopieren & leeren", cloudClipper: "Speicherung in Cloud-Datenbank", vaultClipper: "Schreibt direkt in den Vault-Ordner" },
      { f: "Lokales TTS", tinyMemo: "Integrierter localhost:5020-Hook (optional)", cloudClipper: "Nicht enthalten", vaultClipper: "Nicht enthalten" },
      { f: "Tracking-SDKs", tinyMemo: "Null Drittanbieter-Analyse", cloudClipper: "Übliche Dienst-Telemetrie", vaultClipper: "Abhängig von Host-App & Plugins" },
    ],
    faq: [
      {
        q: "Ersetzt Tiny Memo einen Vollseiten-Web-Clipper?",
        a: "Nein. Tiny Memo speichert bewusst nur markierte Textausschnitte als flache Markdown-Liste. Für komplette HTML-Schnappschüsse oder Bilder eignet sich weiterhin ein vollwertiger Archiv-Clipper.",
      },
      {
        q: "Wohin gelangen die kopierten Markdown-Notizen?",
        a: "Über die Zwischenablage als `- Notiz`-Einträge direkt in Obsidian, Notion, Apple Notizen, GitHub oder jeden reinen Texteditor.",
      },
    ],
  },
  fr: {
    title: "Tiny Memo face aux Web Clippers complets",
    description: "Comparatif objectif entre Tiny Memo et les Web Clippers complets (Notion, Evernote, Obsidian) : rapidité par extrait, compte requis, stockage local et export Markdown.",
    lede: "Les Web Clippers complets excellent pour archiver des articles entiers dans un espace cloud ou un coffre local. Tiny Memo reste volontairement minimal : collecter vite de courts extraits en liste Markdown.",
    whoHead: "Choisir selon votre besoin",
    whoList: [
      { who: "Choisir un Web Clipper complet", fit: "si vous archivez des articles entiers avec mise en page, images et métadonnées dans une base ou un coffre structuré." },
      { who: "Choisir Tiny Memo", fit: "si vous collectez de brèves citations sur plusieurs onglets sans connexion, fusionnez les retours à la ligne et collez des puces `- note` partout." },
    ],
    tableHead: { feature: "Critère", tinyMemo: "Tiny Memo", cloudClipper: "Web Clippers cloud", vaultClipper: "Web Clippers coffre" },
    rows: [
      { f: "Usage principal", tinyMemo: "Extraits courts en file Markdown", cloudClipper: "Pages entières, favoris & médias", vaultClipper: "Articles entiers en fichiers Markdown locaux" },
      { f: "Compte requis", tinyMemo: "Aucun compte", cloudClipper: "Connexion à l’espace requise", vaultClipper: "Configuration de coffre ou synchro requise" },
      { f: "Nettoyage multiligne", tinyMemo: "Fusion en une ligne (activable/désactivable)", cloudClipper: "Conserve les blocs d’origine", vaultClipper: "Conserve la structure complète" },
      { f: "Flux d’export", tinyMemo: "Copier en Markdown ou Copier et vider en 1 clic", cloudClipper: "Enregistré dans une base cloud", vaultClipper: "Écrit dans le dossier du coffre" },
      { f: "TTS local optionnel", tinyMemo: "Connexion intégrée vers localhost:5020", cloudClipper: "Non inclus", vaultClipper: "Non inclus" },
      { f: "Suivi & télémétrie", tinyMemo: "Aucun SDK de suivi tiers", cloudClipper: "Télémétrie cloud standard", vaultClipper: "Selon l’app hôte et les extensions" },
    ],
    faq: [
      {
        q: "Tiny Memo remplace-t-il un Web Clipper pour archiver une page entière ?",
        a: "Non. Tiny Memo ne capture volontairement que vos sélections de texte dans une liste Markdown simple. Pour sauvegarder une page HTML complète avec images, gardez un clipper d’archive dédié.",
      },
      {
        q: "Où puis-je coller les extraits copiés ?",
        a: "Les lignes `- extrait` sont placées dans le presse-papiers et prêtes pour Obsidian, Notion, Apple Notes, GitHub ou tout éditeur de texte.",
      },
    ],
  },
  es: {
    title: "Tiny Memo frente a Web Clippers completos",
    description: "Comparativa objetiva entre Tiny Memo y Web Clippers completos como Notion, Evernote u Obsidian: rapidez por fragmento, cuentas, almacenamiento local y exportación Markdown.",
    lede: "Los Web Clippers completos destacan al archivar artículos enteros con imágenes en la nube o bóvedas locales. Tiny Memo elige un camino más ligero: reunir citas breves en una lista Markdown temporal.",
    whoHead: "Cuál elegir según tu flujo",
    whoList: [
      { who: "Elige un Web Clipper completo", fit: "si necesitas archivar páginas enteras, diseño HTML, imágenes y metadatos dentro de una base de notas o bóveda." },
      { who: "Elige Tiny Memo", fit: "si buscas capturar citas cortas entre pestañas sin iniciar sesión, limpiar saltos de línea y pegar listas `- nota` en cualquier editor." },
    ],
    tableHead: { feature: "Criterio", tinyMemo: "Tiny Memo", cloudClipper: "Web Clippers en la nube", vaultClipper: "Web Clippers de bóveda" },
    rows: [
      { f: "Enfoque principal", tinyMemo: "Fragmentos cortos en cola Markdown", cloudClipper: "Páginas completas, marcadores y medios", vaultClipper: "Artículos completos en archivos Markdown locales" },
      { f: "Requisito de cuenta", tinyMemo: "Sin cuenta", cloudClipper: "Requiere inicio de sesión", vaultClipper: "Requiere configurar bóveda o sincronización" },
      { f: "Limpieza multilínea", tinyMemo: "Fusión en una sola línea (configurable)", cloudClipper: "Mantiene bloques originales", vaultClipper: "Mantiene estructura completa" },
      { f: "Flujo de exportación", tinyMemo: "Copiar como Markdown o Copiar y vaciar en 1 clic", cloudClipper: "Guardado en base de datos en la nube", vaultClipper: "Escrito en la carpeta de la bóveda" },
      { f: "TTS local opcional", tinyMemo: "Conexión integrada a localhost:5020", cloudClipper: "No incluido", vaultClipper: "No incluido" },
      { f: "Rastreo y telemetría", tinyMemo: "Cero SDKs de seguimiento", cloudClipper: "Telemetría estándar del servicio", vaultClipper: "Depende de la app y complementos" },
    ],
    faq: [
      {
        q: "¿Tiny Memo sustituye a un Web Clipper para guardar páginas completas?",
        a: "No. Tiny Memo captura intencionadamente solo el texto seleccionado en una lista Markdown plana. Para instantáneas HTML completas o imágenes, usa un archivador dedicado.",
      },
      {
        q: "¿Dónde puedo pegar el Markdown copiado?",
        a: "Las líneas `- nota` van directo al portapapeles para pegarlas en Obsidian, Notion, Notas, GitHub o cualquier editor de texto plano.",
      },
    ],
  },
};
