/**
 * German translations for ClipQ
 */
ClipQ.I18n.register('de', {
    _name: 'Deutsch',
    _flag: 'https://flagcdn.com/de.svg',

    // Login page
    'login.subtitle': 'Clip Queue für deinen Stream',
    'login.connect_twitch': 'Mit Twitch verbinden',
    'login.select_language': 'Sprache wählen',

    // Navigation
    'nav.queue': 'Queue',
    'nav.history': 'Verlauf',

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
    'settings.save_close': 'Speichern + Schließen',

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
    'settings.general.reset': 'Auf Werkseinstellungen zurücksetzen',
    'settings.general.confirm_reset': 'Möchtest du wirklich alle Einstellungen auf Werkseinstellungen zurücksetzen? Die App wird neu geladen.',

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
    'settings.commands.hint': 'Chat-Commands für den Stream. Nicht case-sensitive.<br>Beispiel: Wenn Prefix <code>!queue</code> und Next <code>next</code>, dann wird <code>!queue next</code> erkannt.',
    'settings.commands.example_label': 'Bsp.:',
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
    'settings.memory.bypass_title': 'Clip-Memory umgehen',
    'settings.memory.bypass_hint': 'Erlaube diesen Rollen, bereits gespielte Clips erneut in die Queue einzureihen',

    // Settings — Design
    'settings.design.show_badges': 'Zeige Badges',
    'settings.design.show_badges_hint': 'Twitch-Rollen (Moderator, VIP, Streamer) in der Queue anzeigen',
    'settings.design.font': 'Schriftart',
    'settings.design.font_hint': 'Wähle eine Schriftart für die gesamte App',
    'settings.design.set_default': 'Als Default setzen',
    'settings.design.reset': 'Auf Standard zurücksetzen',

    // Design — Color Groups
    'design.group.backgrounds': 'Hintergründe',
    'design.group.borders': 'Rahmen',
    'design.group.accent': 'Akzent',
    'design.group.status': 'Status',
    'design.group.text': 'Text',
    'design.group.misc': 'Sonstiges',

    // Design — Color Labels
    'design.color.app': 'App',
    'design.color.menubar': 'Menüleiste',
    'design.color.player': 'Player',
    'design.color.facecam': 'Facecam',
    'design.color.chat': 'Chat',
    'design.color.queue': 'Queue',
    'design.color.tile': 'Kachel',
    'design.color.tile_hover': 'Kachel Hover',
    'design.color.infobar': 'Info-Leiste',
    'design.color.ad': 'Ad-Bereich',
    'design.color.settings': 'Einstellungen',
    'design.color.standard': 'Standard',
    'design.color.accent': 'Akzent',
    'design.color.hover': 'Hover',
    'design.color.glow': 'Glow',
    'design.color.secondary': 'Sekundär',
    'design.color.gradient': 'Verlauf',
    'design.color.open': 'Offen',
    'design.color.closed': 'Geschlossen',
    'design.color.danger': 'Gefahr',
    'design.color.badge': 'Badge',
    'design.color.dimmed': 'Gedimmt',
    'design.color.bright': 'Hell',
    'design.color.overlay': 'Overlay',
    'design.color.info': 'Info',

    // Design — Confirm Dialogs
    'design.confirm_set_default': 'Aktuelle Designwerte als neue Standardwerte (Default) speichern?',
    'design.alert_set_default': 'Aktuelle Designwerte wurden als neue Standardwerte gespeichert!\n\n(Bitte klicke anschließend auf \"Speichern\", um das Design dauerhaft anzuwenden.)',
    'design.confirm_reset_custom': 'Möchtest du auf deine selbst definierten Standardwerte zurücksetzen?\n\n(Klicke \"OK\" für deine gespeicherten Standardwerte, oder \"Abbrechen\" um auf das originale rote Auslieferungs-Design zurückzusetzen)',
    'design.confirm_reset_factory': 'Komplett auf das originale rote Auslieferungs-Design zurücksetzen? (Deine gespeicherten Standardwerte werden gelöscht)',
    'design.confirm_reset_all': 'Alle Farben und Schriftart auf das originale Auslieferungs-Design zurücksetzen?',

    // Settings tabs & Layout tab
    'settings.tab.layout': 'Layout',
    'settings.layout.info_position': 'Info-Leiste Position',
    'settings.layout.info_position_hint': 'Wähle, ob die Info-Leiste über oder unter dem Player angezeigt wird',
    'settings.layout.position_below': 'Unter dem Player',
    'settings.layout.position_above': 'Über dem Player',
    'settings.layout.sidebar_position': 'Sidebar Position',
    'settings.layout.sidebar_position_hint': 'Wähle, ob die Sidebar rechts oder links vom Player ist',
    'settings.layout.position_right': 'Rechts vom Player',
    'settings.layout.position_left': 'Links vom Player',
    'settings.layout.widths': 'Kachelbreiten',
    'settings.layout.widths_hint': 'Passe die Breiten des Players und der Sidebar-Kacheln an',
    'settings.layout.player_width': 'Player-Breite',
    'settings.layout.player_width_hint': 'Passe die Breite des Videoplayers im Verhältnis zur Sidebar an',
    'settings.layout.chat_width': 'Chat-Breite',
    'settings.layout.chat_width_hint': 'Passe die Breite des Chats im Verhältnis zur Ad-Box an',
    'settings.layout.heights': 'Kachelhöhen',
    'settings.layout.heights_hint': 'Passe die Höhen der Sidebar-Komponenten an und sperre sie',
    'settings.layout.facecam_height': 'Facecam-Höhe',
    'settings.layout.queue_height': 'Queue-Höhe',
    'settings.layout.chat_ad_lock': 'Chat/Werbung-Höhe sperren',
    'settings.layout.visibility': 'Sichtbarkeit der Komponenten',
    'settings.layout.visibility_hint': 'Einzelne Sidebar-Komponenten ein- oder ausblenden',
    'settings.layout.show_facecam': 'Facecam-Box anzeigen',
    'settings.layout.show_chat': 'Chat-Box anzeigen',
    'settings.layout.show_ad': 'Ad-Box anzeigen',
    'settings.layout.show_queue': 'Queue-Box anzeigen',
    'settings.layout.ordering': 'Reihenfolge der Komponenten',
    'settings.layout.ordering_hint': 'Bestimme die vertikale Position jeder aktiven Komponente in der Sidebar',
    'settings.layout.pos_top': 'Oben',
    'settings.layout.pos_middle': 'Mitte',
    'settings.layout.pos_bottom': 'Unten',
    'settings.layout.block_facecam': 'Facecam',
    'settings.layout.block_chat_ad': 'Chat + Ad',
    'settings.layout.block_queue': 'Queue',
    'settings.layout.confirm_set_default': 'Möchtest du das aktuelle Layout als Standardwert speichern?',
    'settings.layout.alert_set_default': 'Das aktuelle Layout wurde als Standardwert gespeichert.\n\n(Bitte klicke anschließend auf "Speichern", um das Layout dauerhaft anzuwenden.)',
    'settings.layout.confirm_reset_custom': 'Möchtest du auf dein selbst definiertes Standard-Layout zurücksetzen?\n\n(Klicke "OK" für dein gespeichertes Layout, oder "Abbrechen" um auf das originale Standard-Layout zurückzusetzen)',
    'settings.layout.confirm_reset_factory': 'Komplett auf das originale Standard-Layout zurücksetzen? (Dein gespeichertes Standard-Layout wird gelöscht)',
    'settings.layout.confirm_reset_all': 'Das gesamte Layout auf das originale Auslieferungs-Layout zurücksetzen?',
});
