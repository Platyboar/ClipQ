/**
 * French translations for ClipQ
 */
ClipQ.I18n.register('fr', {
    _name: 'Français',
    _flag: 'https://flagcdn.com/fr.svg',

    // Login page
    'login.subtitle': 'File d\'attente de clips pour votre stream',
    'login.connect_twitch': 'Se connecter avec Twitch',
    'login.select_language': 'Choisir la langue',

    // Navigation
    'nav.queue': 'File d\'attente',
    'nav.history': 'Historique',

    // Queue status
    'queue.status.open': 'Ouvert',
    'queue.status.closed': 'Fermé',

    // User menu
    'menu.settings': '⚙ Paramètres',
    'menu.logout': '↪ Se déconnecter',

    // Player
    'player.empty_icon': '🎬',
    'player.waiting': 'En attente de clips...',
    'player.no_clip': 'Aucun clip chargé',
    'player.previous': '← Précédent',
    'player.start': '▶ Démarrer',
    'player.next': 'Suivant →',
    'player.auto': 'Auto',
    'player.loading_instagram': 'Chargement de la vidéo Instagram...',
    'player.submitted_by': 'Soumis par :',
    'player.visit_channel': 'Visiter {channel}',

    // Time formatting
    'time.minutes_ago': 'il y a {count} min',
    'time.hours_ago': 'il y a {count} h',
    'time.day_ago': 'il y a {count} jour',
    'time.days_ago': 'il y a {count} jours',
    'time.week_ago': 'il y a {count} semaine',
    'time.weeks_ago': 'il y a {count} semaines',
    'time.month_ago': 'il y a {count} mois',
    'time.months_ago': 'il y a {count} mois',
    'time.year_ago': 'il y a {count} an',
    'time.years_ago': 'il y a {count} ans',

    // Queue sidebar
    'queue.title': 'File d\'attente',
    'queue.clear_btn': 'Vider',
    'queue.empty_message': 'La file d\'attente est vide.<br>En attente de clips dans le chat...',
    'queue.confirm_clear': 'Voulez-vous vraiment vider la file d\'attente ?',
    'queue.click_to_play': 'Cliquez pour lire directement',
    'queue.delete': 'Supprimer',
    'queue.pushed': 'Prioritaire',

    // History
    'history.empty': 'Aucun clip visionné pour le moment.',

    // Settings modal
    'settings.title': 'Paramètres',
    'settings.cancel': 'Annuler',
    'settings.save': 'Enregistrer',

    // Settings tabs
    'settings.tab.general': 'Général',
    'settings.tab.queue': 'File d\'attente',
    'settings.tab.commands': 'Commandes',
    'settings.tab.history': 'Historique',
    'settings.tab.memory': 'Mémoire de clips',
    'settings.tab.design': 'Design',

    // Settings — General
    'settings.general.language': 'Langue',
    'settings.general.language_hint': 'Choisissez la langue d\'affichage de l\'application',
    'settings.general.app_title': 'Nom de l\'application',
    'settings.general.app_title_hint': 'Modifiez le titre affiché en haut à gauche (max. 30 caractères)',
    'settings.general.app_title_placeholder': 'ClipQ',
    'settings.general.channel': 'Chaîne Twitch',
    'settings.general.channel_hint': 'Chaîne de chat à rejoindre',
    'settings.general.channel_placeholder': 'votre_chaine',

    // Settings — Queue
    'settings.queue.providers': 'Fournisseurs de clips',
    'settings.queue.providers_hint': 'Choisissez les plateformes autorisées',
    'settings.queue.user_limit': 'Limite de clips par utilisateur',
    'settings.queue.user_limit_hint': 'Nombre maximal de clips qu\'un seul utilisateur peut avoir dans la file d\'attente en même temps (0 = illimité)',
    'settings.queue.age_limit': 'Limite d\'âge des clips (jours)',
    'settings.queue.age_limit_hint': 'Les clips plus anciens que cela seront rejetés (0 = désactivé)',
    'settings.queue.blocked_streamers': 'Streamers bloqués',
    'settings.queue.blocked_streamers_hint': 'Un nom de chaîne par ligne. Les clips de ces streamers seront rejetés.',
    'settings.queue.blocked_users': 'Utilisateurs bloqués',
    'settings.queue.blocked_users_hint': 'Un nom par ligne. Les messages de ces utilisateurs seront ignorés.',

    // Settings — Commands
    'settings.commands.hint': 'Commandes de chat pour le stream. Non sensible à la casse.<br>Exemple : Si le préfixe est <code>!queue</code> et le mot-clé suivant <code>next</code>, alors <code>!queuenext</code> est reconnu.',
    'settings.commands.example_label': 'Ex :',
    'settings.commands.prefix': 'Préfixe de commande',
    'settings.commands.next': 'Clip suivant',
    'settings.commands.push': 'Placer le clip en #1',
    'settings.commands.open': 'Ouvrir la file d\'attente',
    'settings.commands.close': 'Fermer la file d\'attente',
    'settings.commands.clear': 'Vider la file d\'attente',
    'settings.commands.purgememory': 'Vider la mémoire de clips',
    'settings.commands.autoplay': 'Lecture automatique on/off',
    'settings.commands.limit': 'Définir la limite de clips',
    'settings.commands.remove': 'Supprimer le clip',
    'settings.commands.providers': 'Fournisseur activé/désactivé',
    'settings.commands.role_all': 'Tous',

    // Settings — History
    'settings.history.retention': 'Rétention (jours)',
    'settings.history.retention_hint': 'Durée de conservation des clips visionnés dans l\'historique (0 = illimitée). N\'affecte pas la mémoire de clips.',
    'settings.history.count': 'Vous avez <strong>{count}</strong> clips dans l\'historique.',
    'settings.history.purge_hint': 'Le vidage supprime uniquement l\'affichage de l\'historique, pas la mémoire de clips.',
    'settings.history.purge_btn': 'Vider l\'historique',
    'settings.history.confirm_purge': 'Voulez-vous vraiment vider tout l\'historique ? (La mémoire de clips est conservée)',

    // Settings — Memory
    'settings.memory.hint': 'La mémoire de clips enregistre les URL de tous les clips visionnés pour éviter qu\'ils ne soient remis en file d\'attente.',
    'settings.memory.count': 'Vous avez <strong>{count}</strong> clips en mémoire.',
    'settings.memory.purge_btn': 'Vider la mémoire',
    'settings.memory.confirm_purge': 'Voulez-vous vraiment vider la mémoire de clips ?',

    // Settings — Design
    'settings.design.show_badges': 'Afficher les badges',
    'settings.design.show_badges_hint': 'Afficher les rôles Twitch (Modérateur, VIP, Streamer) dans la file d\'attente',
    'settings.design.font': 'Police',
    'settings.design.font_hint': 'Choisissez une police pour toute l\'application',
    'settings.design.set_default': 'Définir par défaut',
    'settings.design.reset': 'Réinitialiser par défaut',

    // Design — Color Groups
    'design.group.backgrounds': 'Arrière-plans',
    'design.group.borders': 'Bordures',
    'design.group.accent': 'Accentuation',
    'design.group.status': 'Statut',
    'design.group.text': 'Texte',
    'design.group.misc': 'Divers',

    // Design — Color Labels
    'design.color.app': 'Application',
    'design.color.menubar': 'Barra de menu', // (kept menubar)
    'design.color.player': 'Lecteur',
    'design.color.facecam': 'Facecam',
    'design.color.chat': 'Tchat',
    'design.color.queue': 'File',
    'design.color.tile': 'Tuile',
    'design.color.tile_hover': 'Survol tuile',
    'design.color.infobar': 'Barre d\'infos',
    'design.color.ad': 'Zone de pub',
    'design.color.settings': 'Paramètres',
    'design.color.standard': 'Standard',
    'design.color.accent': 'Accent',
    'design.color.hover': 'Survol',
    'design.color.glow': 'Brillance',
    'design.color.secondary': 'Secondaire',
    'design.color.open': 'Ouvert',
    'design.color.closed': 'Fermé',
    'design.color.danger': 'Danger',
    'design.color.badge': 'Badge',
    'design.color.dimmed': 'Assombri',
    'design.color.bright': 'Clair',
    'design.color.overlay': 'Superposition',
    'design.color.info': 'Info',

    // Design — Confirm Dialogs
    'design.confirm_set_default': 'Enregistrer les valeurs de design actuelles comme nouvelles valeurs par défaut ?',
    'design.alert_set_default': 'Les valeurs de design actuelles ont été enregistrées comme nouvelles valeurs par défaut !\n\n(Veuillez cliquer sur \"Enregistrer\" ensuite pour appliquer le design de manière permanente).',
    'design.confirm_reset_custom': 'Voulez-vous restaurer vos valeurs par défaut personnalisées enregistrées ?\n\n(Cliquez sur \"OK\" pour vos valeurs enregistrées, ou \"Annuler\" pour restaurer le design rouge d\'origine).',
    'design.confirm_reset_factory': 'Réinitialiser complètement au design rouge d\'origine ? (Vos valeurs personnalisées seront supprimées).',
    'design.confirm_reset_all': 'Réinitialiser toutes les couleurs et la police au design d\'origine ?',

    // Settings tabs & Layout tab
    'settings.tab.layout': 'Disposition',
    'settings.layout.info_position': 'Position de la barre d\'infos',
    'settings.layout.info_position_hint': 'Choisissez si la barre d\'infos est en dessous ou au-dessus du lecteur',
    'settings.layout.position_below': 'En dessous du lecteur',
    'settings.layout.position_above': 'Au-dessus du lecteur',
    'settings.layout.sidebar_position': 'Position de la barre latérale',
    'settings.layout.sidebar_position_hint': 'Choisissez si la barre latérale est à droite ou à gauche du lecteur',
    'settings.layout.position_right': 'À droite du lecteur',
    'settings.layout.position_left': 'À gauche du lecteur',
    'settings.layout.player_width': 'Largeur du lecteur',
    'settings.layout.player_width_hint': 'Ajustez la largeur du lecteur vidéo par rapport à la barre latérale',
    'settings.layout.visibility': 'Visibilité des composants',
    'settings.layout.visibility_hint': 'Activer/désactiver des composants individuels de la barre latérale',
    'settings.layout.show_facecam': 'Afficher la boîte Facecam',
    'settings.layout.show_chat': 'Afficher la boîte de chat',
    'settings.layout.show_ad': 'Afficher la boîte de pub',
    'settings.layout.show_queue': 'Afficher la file d\'attente',
    'settings.layout.ordering': 'Ordre des composants',
    'settings.layout.ordering_hint': 'Choisissez la position verticale de chaque composant actif dans la barre latérale',
    'settings.layout.pos_top': 'Haut',
    'settings.layout.pos_middle': 'Milieu',
    'settings.layout.pos_bottom': 'Bas',
    'settings.layout.block_facecam': 'Facecam',
    'settings.layout.block_chat_ad': 'Tchat + Pub',
    'settings.layout.block_queue': 'File d\'attente',
    'settings.layout.confirm_set_default': 'Voulez-vous enregistrer la disposition actuelle par défaut ?',
    'settings.layout.alert_set_default': 'La disposition actuelle a été enregistrée par défaut.\n\n(Veuillez cliquer sur "Enregistrer" ensuite pour appliquer la disposition de manière permanente).',
    'settings.layout.confirm_reset_custom': 'Voulez-vous restaurer votre disposition personnalisée enregistrée ?\n\n(Cliquez sur "OK" pour votre disposition enregistrée, ou "Annuler" pour restaurer la disposition d\'origine)',
    'settings.layout.confirm_reset_factory': 'Réinitialiser complètement à la disposition d\'origine ? (Votre disposition personnalisée sera supprimée)',
    'settings.layout.confirm_reset_all': 'Réinitialiser toute la disposition à la disposition d\'origine ?',
});
