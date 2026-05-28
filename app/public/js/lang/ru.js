/**
 * Russian translations for ClipQ
 */
ClipQ.I18n.register('ru', {
    _name: 'Русский',
    _flag: 'https://flagcdn.com/ru.svg',

    // Login page
    'login.subtitle': 'Очередь клипов для вашего стрима',
    'login.connect_twitch': 'Подключиться к Twitch',
    'login.select_language': 'Выбрать язык',

    // Navigation
    'nav.queue': 'Очередь',
    'nav.history': 'История',

    // Queue status
    'queue.status.open': 'Открыта',
    'queue.status.closed': 'Закрыта',

    // User menu
    'menu.settings': '⚙ Настройки',
    'menu.logout': '↪ Выйти',

    // Player
    'player.empty_icon': '🎬',
    'player.waiting': 'Ожидание клипов...',
    'player.no_clip': 'Нет загруженного клипа',
    'player.previous': '← Назад',
    'player.start': '▶ Старт',
    'player.next': 'Вперед →',
    'player.auto': 'Авто',
    'player.loading_instagram': 'Загрузка видео из Instagram...',
    'player.submitted_by': 'Отправлено:',
    'player.visit_channel': 'Перейти на {channel}',

    // Time formatting
    'time.minutes_ago': '{count} мин. назад',
    'time.hours_ago': '{count} ч. назад',
    'time.day_ago': '{count} день назад',
    'time.days_ago': '{count} дн. назад',
    'time.week_ago': '{count} нед. назад',
    'time.weeks_ago': '{count} нед. назад',
    'time.month_ago': '{count} мес. назад',
    'time.months_ago': '{count} мес. назад',
    'time.year_ago': '{count} г. назад',
    'time.years_ago': '{count} г. назад',

    // Queue sidebar
    'queue.title': 'Очередь',
    'queue.clear_btn': 'Очистить',
    'queue.empty_message': 'Очередь пуста.<br>Ожидание клипов в чате...',
    'queue.confirm_clear': 'Действительно очистить очередь?',
    'queue.click_to_play': 'Нажмите для прямого воспроизведения',
    'queue.delete': 'Удалить',
    'queue.pushed': 'Приоритет',

    // History
    'history.empty': 'Клипы еще не просмотрены.',

    // Settings modal
    'settings.title': 'Настройки',
    'settings.cancel': 'Отмена',
    'settings.save': 'Сохранить',
    'settings.save_close': 'Сохранить + Закрыть',

    // Settings tabs
    'settings.tab.general': 'Общие',
    'settings.tab.queue': 'Очередь клипов',
    'settings.tab.commands': 'Команды',
    'settings.tab.history': 'История',
    'settings.tab.memory': 'Память клипов',
    'settings.tab.design': 'Дизайн',

    // Settings — General
    'settings.general.language': 'Язык',
    'settings.general.language_hint': 'Выберите язык интерфейса приложения',
    'settings.general.app_title': 'Название приложения',
    'settings.general.app_title_hint': 'Измените название приложения в левом верхнем углу (макс. 30 символов)',
    'settings.general.app_title_placeholder': 'ClipQ',
    'settings.general.channel': 'Канал Twitch',
    'settings.general.channel_hint': 'Канал чата для подключения',
    'settings.general.channel_placeholder': 'ваш_канал',
    'settings.general.reset': 'Сбросить до заводских настроек',
    'settings.general.confirm_reset': 'Действительно сбросить все настройки до заводских? Приложение будет перезагружено.',

    // Settings — Queue
    'settings.queue.providers': 'Провайдеры клипов',
    'settings.queue.providers_hint': 'Выберите разрешенные платформы',
    'settings.queue.user_limit': 'Лимит клипов на пользователя',
    'settings.queue.user_limit_hint': 'Максимальное количество клипов от одного пользователя в очереди (0 = без лимита)',
    'settings.queue.age_limit': 'Лимит возраста клипа (дней)',
    'settings.queue.age_limit_hint': 'Клипы старше этого значения будут отклонены (0 = отключено)',
    'settings.queue.blocked_streamers': 'Заблокированные стримеры',
    'settings.queue.blocked_streamers_hint': 'Один канал на строку. Клипы этих стримеров будут отклонены.',
    'settings.queue.blocked_users': 'Заблокированные пользователи',
    'settings.queue.blocked_users_hint': 'Одно имя на строку. Сообщения этих пользователей будут игнорироваться.',

    // Settings — Commands
    'settings.commands.hint': 'Команды чата для стрима. Регистр не важен.<br>Пример: Если префикс <code>!queue</code> и команда <code>next</code>, то распознается <code>!queue next</code>.',
    'settings.commands.example_label': 'Прим:',
    'settings.commands.prefix': 'Префикс команды',
    'settings.commands.next': 'Следующий клип',
    'settings.commands.push': 'Вставить клип на 1 место',
    'settings.commands.open': 'Открыть очередь',
    'settings.commands.close': 'Закрыть очередь',
    'settings.commands.clear': 'Очистить очередь',
    'settings.commands.purgememory': 'Очистить память клипов',
    'settings.commands.autoplay': 'Автовоспроизведение вкл/выкл',
    'settings.commands.limit': 'Установить лимит клипов',
    'settings.commands.remove': 'Удалить клип',
    'settings.commands.providers': 'Провайдеры вкл/выкл',
    'settings.commands.role_all': 'Все',

    // Settings — History
    'settings.history.retention': 'Срок хранения (дней)',
    'settings.history.retention_hint': 'Как долго просмотренные клипы остаются в истории (0 = без лимита). Не влияет на память клипов.',
    'settings.history.count': 'В истории <strong>{count}</strong> клипов.',
    'settings.history.purge_hint': 'Очистка удаляет только историю, память клипов сохраняется.',
    'settings.history.purge_btn': 'Очистить историю',
    'settings.history.confirm_purge': 'Действительно очистить всю историю? (Память клипов сохранится)',

    // Settings — Memory
    'settings.memory.hint': 'Память клипов сохраняет URL всех просмотренных клипов, чтобы они не попали в очередь повторно.',
    'settings.memory.count': 'В памяти <strong>{count}</strong> клипов.',
    'settings.memory.purge_btn': 'Очистить память',
    'settings.memory.confirm_purge': 'Действительно очистить память клипов?',
    'settings.memory.bypass_title': 'Обход памяти клипов',
    'settings.memory.bypass_hint': 'Разрешить этим ролям добавлять в очередь клипы, которые уже есть в памяти',

    // Settings — Design
    'settings.design.show_badges': 'Показывать значки',
    'settings.design.show_badges_hint': 'Показывать роли Twitch (модератор, VIP, стример) в очереди',
    'settings.design.font': 'Шрифт',
    'settings.design.font_hint': 'Выберите шрифт для всего приложения',
    'settings.design.set_default': 'Сохранить как стандарт',
    'settings.design.reset': 'Сбросить дизайн',

    // Design — Color Groups
    'design.group.backgrounds': 'Фоны',
    'design.group.borders': 'Границы',
    'design.group.accent': 'Акцент',
    'design.group.status': 'Статус',
    'design.group.text': 'Текст',
    'design.group.misc': 'Разное',

    // Design — Color Labels
    'design.color.app': 'Приложение',
    'design.color.menubar': 'Панель меню',
    'design.color.player': 'Плеер',
    'design.color.facecam': 'Вебкамера',
    'design.color.chat': 'Чат',
    'design.color.queue': 'Очередь',
    'design.color.tile': 'Плитка',
    'design.color.tile_hover': 'Наведение на плитку',
    'design.color.infobar': 'Панель информации',
    'design.color.ad': 'Рекламная область',
    'design.color.settings': 'Настройки',
    'design.color.standard': 'Стандартный',
    'design.color.accent': 'Акцент',
    'design.color.hover': 'Наведение',
    'design.color.glow': 'Свечение',
    'design.color.secondary': 'Вторичный',
    'design.color.gradient': 'Градиент',
    'design.color.open': 'Открыто',
    'design.color.closed': 'Закрыто',
    'design.color.danger': 'Опасность',
    'design.color.badge': 'Значок',
    'design.color.dimmed': 'Затемненный',
    'design.color.bright': 'Яркий',
    'design.color.overlay': 'Перекрытие',
    'design.color.info': 'Информация',

    // Design — Confirm Dialogs
    'design.confirm_set_default': 'Сохранить текущие значения дизайна как новые по умолчанию?',
    'design.alert_set_default': 'Текущие значения дизайна сохранены как стандартные!\n\n(Пожалуйста, нажмите \"Сохранить\" для подтверждения).',
    'design.confirm_reset_custom': 'Сбросить дизайн к вашим сохраненным значениям?\n\n(ОК для ваших сохраненных значений, Отмена для сброса к оригинальному красному дизайну).',
    'design.confirm_reset_factory': 'Полностью сбросить к оригинальному красному дизайну? (Ваши сохраненные значения будут удалены).',
    'design.confirm_reset_all': 'Сбросить все цвета и шрифты к оригинальному заводскому дизайну?',

    // Settings tabs & Layout tab
    'settings.tab.layout': 'Макет',
    'settings.layout.info_position': 'Позиция панели информации',
    'settings.layout.info_position_hint': 'Выберите, где будет находиться панель информации: под или над плеером',
    'settings.layout.position_below': 'Под плеером',
    'settings.layout.position_above': 'Над плеером',
    'settings.layout.sidebar_position': 'Позиция боковой панели',
    'settings.layout.sidebar_position_hint': 'Выберите, где будет находиться боковая панель: справа или слева от плеера',
    'settings.layout.position_right': 'Справа от плеера',
    'settings.layout.position_left': 'Слева от плеера',
    'settings.layout.widths': 'Ширина компонентов',
    'settings.layout.widths_hint': 'Настройте ширину плеера и компонентов боковой панели',
    'settings.layout.player_width': 'Ширина плеера',
    'settings.layout.player_width_hint': 'Настройте ширину видеоплеера относительно боковой панели',
    'settings.layout.chat_width': 'Ширина чата',
    'settings.layout.chat_width_hint': 'Настройте ширину чата относительно рекламного блока',
    'settings.layout.heights': 'Высота компонентов',
    'settings.layout.heights_hint': 'Настройте высоту и заблокируйте размеры компонентов боковой панели',
    'settings.layout.facecam_height': 'Высота веб-камеры',
    'settings.layout.queue_height': 'Высота очереди',
    'settings.layout.chat_ad_lock': 'Заблокировать высоту чата/рекламы',
    'settings.layout.visibility': 'Видимость компонентов',
    'settings.layout.visibility_hint': 'Включение/выключение отдельных компонентов боковой панели',
    'settings.layout.show_facecam': 'Показать веб-камеру',
    'settings.layout.show_chat': 'Показать чат',
    'settings.layout.show_ad': 'Показать рекламу',
    'settings.layout.show_queue': 'Показать очередь',
    'settings.layout.ordering': 'Порядок компонентов',
    'settings.layout.ordering_hint': 'Выберите вертикальное положение для каждого активного компонента боковой панели',
    'settings.layout.pos_top': 'Вверху',
    'settings.layout.pos_middle': 'В середине',
    'settings.layout.pos_bottom': 'Внизу',
    'settings.layout.block_facecam': 'Вебкамера',
    'settings.layout.block_chat_ad': 'Чат + Реклама',
    'settings.layout.block_queue': 'Очередь',
    'settings.layout.confirm_set_default': 'Хотите сохранить текущую разметку по умолчанию?',
    'settings.layout.alert_set_default': 'Текущая разметка сохранена по умолчанию.\n\n(Пожалуйста, нажмите "Сохранить" для подтверждения).',
    'settings.layout.confirm_reset_custom': 'Хотите сбросить разметку к вашему сохраненному значению?\n\n(ОК для вашего сохраненного значения, Отмена для сброса к оригинальной заводской разметке)',
    'settings.layout.confirm_reset_factory': 'Полностью сбросить к оригинальной заводской разметке? (Ваша сохраненная разметка будет удалена)',
    'settings.layout.confirm_reset_all': 'Сбросить всю разметку к оригинальной заводской разметке?',
});
