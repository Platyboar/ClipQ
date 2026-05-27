/**
 * Japanese translations for ClipQ
 */
ClipQ.I18n.register('ja', {
    _name: '日本語',
    _flag: 'https://flagcdn.com/jp.svg',

    // Login page
    'login.subtitle': 'あなたの配信のためのクリップキュー',
    'login.connect_twitch': 'Twitchと連携する',
    'login.select_language': '言語を選択',

    // Navigation
    'nav.queue': 'キュー',
    'nav.history': '履歴',

    // Queue status
    'queue.status.open': 'オープン',
    'queue.status.closed': 'クローズ',

    // User menu
    'menu.settings': '⚙ 設定',
    'menu.logout': '↪ ログアウト',

    // Player
    'player.empty_icon': '🎬',
    'player.waiting': 'クリップを待機中...',
    'player.no_clip': 'クリップが読み込まれていません',
    'player.previous': '← 前へ',
    'player.start': '▶ スタート',
    'player.next': '次へ →',
    'player.auto': '自動',
    'player.loading_instagram': 'Instagram動画を読み込み中...',
    'player.submitted_by': '送信者:',
    'player.visit_channel': '{channel} を開く',

    // Time formatting
    'time.minutes_ago': '{count} 分前',
    'time.hours_ago': '{count} 時間前',
    'time.day_ago': '{count} 日前',
    'time.days_ago': '{count} 日前',
    'time.week_ago': '{count} 週間前',
    'time.weeks_ago': '{count} 週間前',
    'time.month_ago': '{count} ヶ月前',
    'time.months_ago': '{count} ヶ月前',
    'time.year_ago': '{count} 年前',
    'time.years_ago': '{count} 年前',

    // Queue sidebar
    'queue.title': 'キュー',
    'queue.clear_btn': 'クリア',
    'queue.empty_message': 'キューは空です。<br>チャットでのクリップ送信を待機しています...',
    'queue.confirm_clear': 'キューをクリアしますか？',
    'queue.click_to_play': 'クリックして直接再生',
    'queue.delete': '削除',
    'queue.pushed': '優先',

    // History
    'history.empty': '再生されたクリップはまだありません。',

    // Settings modal
    'settings.title': '設定',
    'settings.cancel': 'キャンセル',
    'settings.save': '保存',

    // Settings tabs
    'settings.tab.general': '一般',
    'settings.tab.queue': 'クリップキュー',
    'settings.tab.commands': 'コマンド',
    'settings.tab.history': '履歴',
    'settings.tab.memory': 'メモリ',
    'settings.tab.design': 'デザイン',

    // Settings — General
    'settings.general.language': '言語',
    'settings.general.language_hint': '表示言語を選択してください',
    'settings.general.app_title': 'アプリ名',
    'settings.general.app_title_hint': '左上に表示されるタイトルを変更（最大30文字）',
    'settings.general.app_title_placeholder': 'ClipQ',
    'settings.general.channel': 'Twitchチャンネル',
    'settings.general.channel_hint': '参加するチャットチャンネル',
    'settings.general.channel_placeholder': 'your_channel',

    // Settings — Queue
    'settings.queue.providers': '対応プラットフォーム',
    'settings.queue.providers_hint': '許可するプラットフォームを選択',
    'settings.queue.user_limit': 'ユーザーごとの上限数',
    'settings.queue.user_limit_hint': '1人のユーザーがキューに同時登録できる最大数（0 = 無制限）',
    'settings.queue.age_limit': 'クリップの期限（日数）',
    'settings.queue.age_limit_hint': 'これより古いクリップは拒否されます（0 = 無効）',
    'settings.queue.blocked_streamers': 'ブロックされた配信者',
    'settings.queue.blocked_streamers_hint': '1行に1つのチャンネル名。これらの配信者のクリップは拒否されます。',
    'settings.queue.blocked_users': 'ブロックされたユーザー',
    'settings.queue.blocked_users_hint': '1行に1ユーザー名。これらのユーザーからのメッセージは無視されます。',

    // Settings — Commands
    'settings.commands.hint': '配信用のチャットコマンド。大文字と小文字は区別されません。<br>例：プレフィックスが <code>!queue</code> でコマンドが <code>next</code> の場合、<code>!queuenext</code> が認識されます。',
    'settings.commands.example_label': '例:',
    'settings.commands.prefix': 'コマンドプレフィックス',
    'settings.commands.next': '次のクリップ',
    'settings.commands.push': 'クリップを最優先',
    'settings.commands.open': 'キューを開く',
    'settings.commands.close': 'キューを閉じる',
    'settings.commands.clear': 'キューをクリア',
    'settings.commands.purgememory': 'クリップメモリをクリア',
    'settings.commands.autoplay': '自動再生のオン/オフ',
    'settings.commands.limit': 'クリップ登録上限を設定',
    'settings.commands.remove': 'クリップを削除',
    'settings.commands.providers': '対応プラットフォームのオン/オフ',
    'settings.commands.role_all': '全員',

    // Settings — History
    'settings.history.retention': '保存期間（日数）',
    'settings.history.retention_hint': '再生されたクリップが履歴に残る期間（0 = 無制限）。クリップメモリには影響しません。',
    'settings.history.count': '現在履歴には <strong>{count}</strong> 件のクリップがあります。',
    'settings.history.purge_hint': 'クリアすると履歴表示のみが削除され、クリップメモリは保持されます。',
    'settings.history.purge_btn': '履歴をクリア',
    'settings.history.confirm_purge': '履歴をすべて削除しますか？ (クリップメモリは保持されます)',

    // Settings — Memory
    'settings.memory.hint': 'クリップメモリは、重複登録を防ぐために視聴済みのクリップURLを保存します。',
    'settings.memory.count': '現在メモリには <strong>{count}</strong> 件のクリップがあります。',
    'settings.memory.purge_btn': 'メモリをクリア',
    'settings.memory.confirm_purge': 'クリップメモリをクリアしますか？',

    // Settings — Design
    'settings.design.show_badges': 'バッジを表示',
    'settings.design.show_badges_hint': 'キュー内にTwitchのロールバッジ（モデレーター、VIP、配信者）を表示する',
    'settings.design.font': 'フォント',
    'settings.design.font_hint': 'アプリ全体のフォントを選択',
    'settings.design.set_default': 'デフォルトに設定',
    'settings.design.reset': 'デフォルトに戻す',

    // Design — Color Groups
    'design.group.backgrounds': '背景',
    'design.group.borders': '境界線',
    'design.group.accent': 'アクセント',
    'design.group.status': 'ステータス',
    'design.group.text': 'テキスト',
    'design.group.misc': 'その他',

    // Design — Color Labels
    'design.color.app': 'アプリ',
    'design.color.menubar': 'メニューバー',
    'design.color.player': 'プレイヤー',
    'design.color.facecam': 'フェイスカメラ',
    'design.color.chat': 'チャット',
    'design.color.queue': 'キュー',
    'design.color.tile': 'タイル',
    'design.color.tile_hover': 'タイルホバー',
    'design.color.infobar': '情報バー',
    'design.color.ad': '広告エリア',
    'design.color.settings': '設定',
    'design.color.standard': '標準',
    'design.color.accent': 'アクセント',
    'design.color.hover': 'ホバー',
    'design.color.glow': '発光',
    'design.color.secondary': 'サブ',
    'design.color.open': 'オープン',
    'design.color.closed': 'クローズ',
    'design.color.danger': '危険',
    'design.color.badge': 'バッジ',
    'design.color.dimmed': '暗め',
    'design.color.bright': '明るめ',
    'design.color.overlay': 'オーバーレイ',
    'design.color.info': '情報',

    // Design — Confirm Dialogs
    'design.confirm_set_default': '現在のデザインを新しいデフォルトとして保存しますか？',
    'design.alert_set_default': '現在のデザインがデフォルトとして保存されました！\n\n(「保存」をクリックすると永続的に反映されます)。',
    'design.confirm_reset_custom': 'カスタム保存されたデフォルトに戻しますか？\n\n(「OK」で保存したデフォルトへ、「キャンセル」でオリジナルの赤色テーマへ戻します)',
    'design.confirm_reset_factory': 'オリジナルの赤色テーマ（出荷状態）に完全にリセットしますか？ (保存されたデフォルトは削除されます)',
    'design.confirm_reset_all': 'すべての配色とフォントを初期状態にリセットしますか？',

    // Settings tabs & Layout tab
    'settings.tab.layout': 'レイアウト',
    'settings.layout.info_position': '情報バーの位置',
    'settings.layout.info_position_hint': '情報バーをプレイヤーの下にするか上にするか選択',
    'settings.layout.position_below': 'プレイヤーの下',
    'settings.layout.position_above': 'プレイヤーの上',
    'settings.layout.sidebar_position': 'サイドバーの位置',
    'settings.layout.sidebar_position_hint': 'サイドバーをプレイヤーの右側にするか左側にするか選択',
    'settings.layout.position_right': 'プレイヤーの右側',
    'settings.layout.position_left': 'プレイヤーの左側',
    'settings.layout.player_width': 'プレイヤーの幅',
    'settings.layout.player_width_hint': 'サイドバーに対するプレイヤーの幅を調整',
    'settings.layout.visibility': 'コンポーネントの表示設定',
    'settings.layout.visibility_hint': 'サイドバー内の各要素を表示・非表示',
    'settings.layout.show_facecam': 'フェイスカムを表示',
    'settings.layout.show_chat': 'チャットを表示',
    'settings.layout.show_ad': '広告枠を表示',
    'settings.layout.show_queue': 'キューを表示',
    'settings.layout.ordering': '並び順',
    'settings.layout.ordering_hint': 'サイドバー内のアクティブな各要素の垂直方向の位置を選択',
    'settings.layout.pos_top': '上部',
    'settings.layout.pos_middle': '中央',
    'settings.layout.pos_bottom': '下部',
    'settings.layout.block_facecam': 'フェイスカメラ',
    'settings.layout.block_chat_ad': 'チャット＋広告',
    'settings.layout.block_queue': 'キュー',
    'settings.layout.confirm_set_default': '現在のレイアウトをデフォルトとして保存しますか？',
    'settings.layout.alert_set_default': '現在のレイアウトがデフォルトとして保存されました。\n\n(「保存」をクリックすると永続的に反映されます)。',
    'settings.layout.confirm_reset_custom': '保存されたカスタムレイアウトに戻しますか？\n\n(「OK」で保存されたレイアウトへ、「キャンセル」で初期レイアウトへ戻します)',
    'settings.layout.confirm_reset_factory': '完全に初期レイアウト（出荷状態）にリセットしますか？ (保存されたカスタムレイアウトは削除されます)',
    'settings.layout.confirm_reset_all': 'すべてのレイアウト設定を初期状態にリセットしますか？',
});
