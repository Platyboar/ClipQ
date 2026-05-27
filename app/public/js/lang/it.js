/**
 * Italian translations for ClipQ
 */
ClipQ.I18n.register('it', {
    _name: 'Italiano',
    _flag: 'https://flagcdn.com/it.svg',

    // Login page
    'login.subtitle': 'Coda di clip per la tua trasmissione',
    'login.connect_twitch': 'Connettiti con Twitch',
    'login.select_language': 'Seleziona lingua',

    // Navigation
    'nav.queue': 'Coda',
    'nav.history': 'Cronologia',

    // Queue status
    'queue.status.open': 'Aperta',
    'queue.status.closed': 'Chiusa',

    // User menu
    'menu.settings': '⚙ Impostazioni',
    'menu.logout': '↪ Disconnetti',

    // Player
    'player.empty_icon': '🎬',
    'player.waiting': 'In attesa di clip...',
    'player.no_clip': 'Nessuna clip caricata',
    'player.previous': '← Precedente',
    'player.start': '▶ Avvia',
    'player.next': 'Successivo →',
    'player.auto': 'Auto',
    'player.loading_instagram': 'Caricamento video Instagram...',
    'player.submitted_by': 'Inviato da:',
    'player.visit_channel': 'Visita {channel}',

    // Time formatting
    'time.minutes_ago': '{count} min fa',
    'time.hours_ago': '{count} ore fa',
    'time.day_ago': '{count} giorno fa',
    'time.days_ago': '{count} giorni fa',
    'time.week_ago': '{count} settimana fa',
    'time.weeks_ago': '{count} settimane fa',
    'time.month_ago': '{count} mese fa',
    'time.months_ago': '{count} mesi fa',
    'time.year_ago': '{count} anno fa',
    'time.years_ago': '{count} anni fa',

    // Queue sidebar
    'queue.title': 'Coda',
    'queue.clear_btn': 'Svuota',
    'queue.empty_message': 'La coda è vuota.<br>In attesa di clip nella chat...',
    'queue.confirm_clear': 'Vuoi davvero svuotare la coda?',
    'queue.click_to_play': 'Clicca per riprodurre direttamente',
    'queue.delete': 'Elimina',
    'queue.pushed': 'Prioritario',

    // History
    'history.empty': 'Nessuna clip ancora visualizzata.',

    // Settings modal
    'settings.title': 'Impostazioni',
    'settings.cancel': 'Annulla',
    'settings.save': 'Salva',

    // Settings tabs
    'settings.tab.general': 'Generale',
    'settings.tab.queue': 'Coda clip',
    'settings.tab.commands': 'Comandi',
    'settings.tab.history': 'Cronologia',
    'settings.tab.memory': 'Memoria clip',
    'settings.tab.design': 'Design',

    // Settings — General
    'settings.general.language': 'Lingua',
    'settings.general.language_hint': 'Scegli la lingua di visualizzazione dell\'applicazione',
    'settings.general.app_title': 'Nome dell\'applicazione',
    'settings.general.app_title_hint': 'Modifica il titolo visualizzato in alto a sinistra (max. 30 caratteri)',
    'settings.general.app_title_placeholder': 'ClipQ',
    'settings.general.channel': 'Canale Twitch',
    'settings.general.channel_hint': 'Canale chat a cui unirsi',
    'settings.general.channel_placeholder': 'tuo_canale',

    // Settings — Queue
    'settings.queue.providers': 'Fornitori di clip',
    'settings.queue.providers_hint': 'Scegli quali piattaforme sono consentite',
    'settings.queue.user_limit': 'Limite clip per utente',
    'settings.queue.user_limit_hint': 'Numero massimo di clip che un singolo utente può avere in coda contemporaneamente (0 = illimitato)',
    'settings.queue.age_limit': 'Limite età delle clip (giorni)',
    'settings.queue.age_limit_hint': 'Le clip più vecchie di questa soglia verranno rifiutate (0 = disabilitato)',
    'settings.queue.blocked_streamers': 'Streamer bloccati',
    'settings.queue.blocked_streamers_hint': 'Un nome canale per riga. Le clip di questi streamer verranno rifiutate.',
    'settings.queue.blocked_users': 'Utenti bloccati',
    'settings.queue.blocked_users_hint': 'Un nome per riga. I messaggi di questi utenti verranno ignorati.',

    // Settings — Commands
    'settings.commands.hint': 'Comandi chat per la trasmissione. Non distingue tra maiuscole e minuscole.<br>Esempio: Se il prefisso è <code>!queue</code> e la parola chiave è <code>next</code>, allora viene riconosciuto <code>!queuenext</code>.',
    'settings.commands.example_label': 'Es:',
    'settings.commands.prefix': 'Prefisso comando',
    'settings.commands.next': 'Clip successiva',
    'settings.commands.push': 'Metti clip in prima posizione',
    'settings.commands.open': 'Apri coda',
    'settings.commands.close': 'Chiudi coda',
    'settings.commands.clear': 'Svuota coda',
    'settings.commands.purgememory': 'Svuota memoria clip',
    'settings.commands.autoplay': 'Autoplay attivo/disattivo',
    'settings.commands.limit': 'Imposta limite clip',
    'settings.commands.remove': 'Rimuovi clip',
    'settings.commands.providers': 'Abilita/disabilita fornitore',
    'settings.commands.role_all': 'Tutti',

    // Settings — History
    'settings.history.retention': 'Mantenimento (giorni)',
    'settings.history.retention_hint': 'Quanto tempo le clip guardate rimangono nella cronologia (0 = illimitato). Non influisce sulla memoria delle clip.',
    'settings.history.count': 'Hai <strong>{count}</strong> clip nella cronologia.',
    'settings.history.purge_hint': 'Lo svuotamento rimuove solo la visualizzazione della cronologia, non la memoria delle clip.',
    'settings.history.purge_btn': 'Svuota cronologia',
    'settings.history.confirm_purge': 'Vuoi davvero svuotare tutta la cronologia? (La memoria delle clip verrà conservata)',

    // Settings — Memory
    'settings.memory.hint': 'La memoria delle clip memorizza gli URL di tutte le clip visualizzate per evitare che vengano reinserite in coda.',
    'settings.memory.count': 'Hai <strong>{count}</strong> clip in memoria.',
    'settings.memory.purge_btn': 'Svuota memoria',
    'settings.memory.confirm_purge': 'Vuoi davvero svuotare la memoria delle clip?',

    // Settings — Design
    'settings.design.show_badges': 'Mostra badge',
    'settings.design.show_badges_hint': 'Mostra i ruoli Twitch (Moderatore, VIP, Streamer) nella coda',
    'settings.design.font': 'Carattere',
    'settings.design.font_hint': 'Scegli un carattere per l\'intera applicazione',
    'settings.design.set_default': 'Salva come predefinito',
    'settings.design.reset': 'Ripristina predefinito',

    // Design — Color Groups
    'design.group.backgrounds': 'Sfondi',
    'design.group.borders': 'Bordi',
    'design.group.accent': 'Accento',
    'design.group.status': 'Stato',
    'design.group.text': 'Testo',
    'design.group.misc': 'Varie',

    // Design — Color Labels
    'design.color.app': 'Applicazione',
    'design.color.menubar': 'Barra dei menu',
    'design.color.player': 'Lettore',
    'design.color.facecam': 'Facecam',
    'design.color.chat': 'Chat',
    'design.color.queue': 'Coda',
    'design.color.tile': 'Tessera',
    'design.color.tile_hover': 'Hover tessera',
    'design.color.infobar': 'Barra informazioni',
    'design.color.ad': 'Area pubblicitaria',
    'design.color.settings': 'Impostazioni',
    'design.color.standard': 'Standard',
    'design.color.accent': 'Accento',
    'design.color.hover': 'Hover',
    'design.color.glow': 'Bagliore',
    'design.color.secondary': 'Secondario',
    'design.color.open': 'Aperto',
    'design.color.closed': 'Chiuso',
    'design.color.danger': 'Pericolo',
    'design.color.badge': 'Badge',
    'design.color.dimmed': 'Attenuato',
    'design.color.bright': 'Luminoso',
    'design.color.overlay': 'Superposizione',
    'design.color.info': 'Info',

    // Design — Confirm Dialogs
    'design.confirm_set_default': 'Salvare i valori di design correnti come nuovi predefiniti?',
    'design.alert_set_default': 'I valori di design correnti sono stati salvati come nuovi predefiniti!\n\n(Fare clic su \"Salva\" successivamente per applicare il design in modo permanente).',
    'design.confirm_reset_custom': 'Ripristinare i tuoi predefiniti personalizzati salvati?\n\n(Fare clic su \"OK\" per i tuoi predefiniti salvati, o \"Annulla\" per ripristinare il design rosso originale).',
    'design.confirm_reset_factory': 'Ripristinare completamente il design rosso originale di fabbrica? (I tuoi predefiniti salvati saranno eliminati).',
    'design.confirm_reset_all': 'Ripristinare tutti i colori e il carattere al design originale di fabbrica?',

    // Settings tabs & Layout tab
    'settings.tab.layout': 'Layout',
    'settings.layout.info_position': 'Posizione barra informazioni',
    'settings.layout.info_position_hint': 'Scegli se la barra informazioni si trova sotto o sopra il lettore',
    'settings.layout.position_below': 'Sotto il lettore',
    'settings.layout.position_above': 'Sopra il lettore',
    'settings.layout.sidebar_position': 'Posizione barra laterale',
    'settings.layout.sidebar_position_hint': 'Scegli se la barra laterale si trova a destra o a sinistra del lettore',
    'settings.layout.position_right': 'A destra del lettore',
    'settings.layout.position_left': 'A sinistra del lettore',
    'settings.layout.player_width': 'Larghezza lettore',
    'settings.layout.player_width_hint': 'Regola la larghezza del lettore video rispetto alla barra laterale',
    'settings.layout.visibility': 'Visibilità componenti',
    'settings.layout.visibility_hint': 'Attiva/disattiva singoli componenti della barra laterale',
    'settings.layout.show_facecam': 'Mostra Facecam',
    'settings.layout.show_chat': 'Mostra Chat',
    'settings.layout.show_ad': 'Mostra Annunci',
    'settings.layout.show_queue': 'Mostra Coda',
    'settings.layout.ordering': 'Ordine dei componenti',
    'settings.layout.ordering_hint': 'Scegli la posizione verticale di ogni componente attivo nella barra laterale',
    'settings.layout.pos_top': 'Alto',
    'settings.layout.pos_middle': 'Centro',
    'settings.layout.pos_bottom': 'Basso',
    'settings.layout.block_facecam': 'Facecam',
    'settings.layout.block_chat_ad': 'Chat + Annunci',
    'settings.layout.block_queue': 'Coda',
    'settings.layout.confirm_set_default': 'Vuoi salvare il layout attuale come predefinito?',
    'settings.layout.alert_set_default': 'Il layout attuale è stato salvato come predefinito.\n\n(Fare clic su "Salva" successivamente per applicare il layout in modo permanente).',
    'settings.layout.confirm_reset_custom': 'Ripristinare il tuo layout personalizzato salvato?\n\n(Fare clic su "OK" per il tuo layout salvato, o "Annulla" per ripristinare il layout originale di fabbrica)',
    'settings.layout.confirm_reset_factory': 'Ripristinare completamente il layout originale di fabbrica? (Il tuo layout personalizzato salvato sarà eliminato)',
    'settings.layout.confirm_reset_all': 'Ripristinare tutto il layout al layout originale di fabbrica?',
});
