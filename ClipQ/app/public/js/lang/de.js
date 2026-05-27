/**
 * German translations for ClipQ
 */
ClipQ.I18n.register('de', {
    _name: 'Deutsch',
    _flag: '🇩🇪',

    // Login page
    'login.subtitle': 'Clip Queue für deinen Stream',
    'login.connect_twitch': 'Mit Twitch verbinden',
    'login.select_language': 'Sprache wählen',

    // Navigation
    'nav.queue': 'Queue',
    'nav.history': 'History',

    // Queue status
    'queue.status.open': 'Offen',
    'queue.status.closed': 'Geschlossen',

    // User menu
    'menu.settings': '⚙ Einstellungen',
    'menu.logout': '↪ Abmelden',

    // Player
    'player.empty_icon': '🎬',
    'player.waiting': 'Warte auf Clips...',
    'player.no_clip': 'Kein Clip geladen',
    'player.previous': '← Vorheriger',
    'player.start': '▶ Start',
    'player.next': 'Nächster →',
    'player.auto': 'Auto',
    'player.loading_instagram': 'Lade Instagram-Video...',
    'player.submitted_by': 'Eingereicht von:',
    'player.visit_channel': '{channel} besuchen',

    // Time formatting
    'time.minutes_ago': 'vor {count} Min.',
    'time.hours_ago': 'vor {count} Std.',
    'time.day_ago': 'vor {count} Tag',
    'time.days_ago': 'vor {count} Tagen',
    'time.week_ago': 'vor {count} Woche',
    'time.weeks_ago': 'vor {count} Wochen',
    'time.month_ago': 'vor {count} Monat',
    'time.months_ago': 'vor {count} Monaten',
    'time.year_ago': 'vor {count} Jahr',
    'time.years_ago': 'vor {count} Jahren',

    // Queue sidebar
    'queue.title': 'Queue',
    'queue.clear_btn': 'Leeren',
    'queue.empty_message': 'Queue ist leer.<br>Warte auf Clips im Chat...',
    'queue.confirm_clear': 'Queue wirklich leeren?',
    'queue.click_to_play': 'Klicken zum direkten Abspielen',
    'queue.delete': 'Löschen',
    'queue.pushed': 'Pushed',

    // History
    'history.empty': 'Noch keine Clips angesehen.',

    // Settings modal
    'settings.title': 'Einstellungen',
    'settings.cancel': 'Abbrechen',
    'settings.save': 'Speichern',

    // Settings tabs
    'settings.tab.general': 'Allgemein',
    'settings.tab.queue': 'Clip Queue',
    'settings.tab.commands': 'Commands',
    'settings.tab.history': 'History',
    'settings.tab.memory': 'Clip Memory',
    'settings.tab.design': 'Design',

    // Settings — General
    'settings.general.language': 'Sprache',
    'settings.general.language_hint': 'Wähle die Anzeigesprache der App',
    'settings.general.app_title': 'App-Name',
    'settings.general.app_title_hint': 'Ändere den Schriftzug oben links (max. 30 Zeichen)',
    'settings.general.app_title_placeholder': 'ClipQ',
    'settings.general.channel': 'Twitch Channel',
    'settings.general.channel_hint': 'Chat-Kanal dem beigetreten wird',
    'settings.general.channel_placeholder': 'dein_kanal',

    // Settings — Queue
    'settings.queue.providers': 'Clip-Anbieter',
    'settings.queue.providers_hint': 'Wähle welche Plattformen erlaubt sind',
    'settings.queue.user_limit': 'User Clip-Limit',
    'settings.queue.user_limit_hint': 'Maximale Clips die ein einzelner User gleichzeitig in der Queue haben darf (0 = unbegrenzt)',
    'settings.queue.age_limit': 'Clip-Alter-Limit (Tage)',
    'settings.queue.age_limit_hint': 'Clips die älter sind werden abgelehnt (0 = deaktiviert)',
    'settings.queue.blocked_streamers': 'Gesperrte Streamer',
    'settings.queue.blocked_streamers_hint': 'Ein Kanalname pro Zeile. Clips von diesen Streamern werden abgelehnt.',
    'settings.queue.blocked_users': 'Gesperrte User',
    'settings.queue.blocked_users_hint': 'Ein Name pro Zeile. Nachrichten dieser User werden ignoriert.',

    // Settings — Commands
    'settings.commands.hint': 'Chat-Commands für den Stream. Nicht case-sensitive.<br>Beispiel: Wenn Prefix <code>!queue</code> und Next <code>next</code>, dann wird <code>!queuenext</code> erkannt.',
    'settings.commands.prefix': 'Command-Prefix',
    'settings.commands.next': 'Nächster Clip',
    'settings.commands.push': 'Clip an 1. Stelle pushen',
    'settings.commands.open': 'Queue öffnen',
    'settings.commands.close': 'Queue schließen',
    'settings.commands.clear': 'Queue leeren',
    'settings.commands.purgememory': 'Clip Memory leeren',
    'settings.commands.autoplay': 'Autoplay ein/aus',
    'settings.commands.limit': 'Clip-Limit setzen',
    'settings.commands.remove': 'Clip entfernen',
    'settings.commands.providers': 'Anbieter ein/aus',
    'settings.commands.role_all': 'Alle',

    // Settings — History
    'settings.history.retention': 'Aufbewahrung (Tage)',
    'settings.history.retention_hint': 'Wie lange gesehene Clips in der History bleiben (0 = unbegrenzt). Beeinflusst nicht die Clip Memory.',
    'settings.history.count': 'Du hast <strong>{count}</strong> Clips in der History.',
    'settings.history.purge_hint': 'Das Löschen entfernt nur die History-Anzeige, nicht die Clip Memory.',
    'settings.history.purge_btn': 'History leeren',
    'settings.history.confirm_purge': 'History wirklich komplett löschen? (Clip Memory bleibt erhalten)',

    // Settings — Memory
    'settings.memory.hint': 'Die Clip Memory speichert URLs aller gesehenen Clips, damit sie nicht erneut in die Queue kommen.',
    'settings.memory.count': 'Du hast <strong>{count}</strong> Clips in der Memory.',
    'settings.memory.purge_btn': 'Memory leeren',
    'settings.memory.confirm_purge': 'Clip Memory wirklich leeren?',

    // Settings — Design
    'settings.design.show_badges': 'Zeige Badges',
    'settings.design.show_badges_hint': 'Twitch-Rollen (Moderator, VIP, Streamer) in der Queue anzeigen',
    'settings.design.font': 'Schriftart',
    'settings.design.font_hint': 'Wähle eine Schriftart für die gesamte App',
    'settings.design.set_default': 'Als Default setzen',
    'settings.design.reset': 'Auf Standard zurücksetzen',
});
