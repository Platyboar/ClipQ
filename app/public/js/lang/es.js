/**
 * Spanish translations for ClipQ
 */
ClipQ.I18n.register('es', {
    _name: 'Español',
    _flag: 'https://flagcdn.com/es.svg',

    // Login page
    'login.subtitle': 'Cola de clips para tu transmisión',
    'login.connect_twitch': 'Conectar con Twitch',
    'login.select_language': 'Seleccionar idioma',

    // Navigation
    'nav.queue': 'Cola',
    'nav.history': 'Historial',

    // Queue status
    'queue.status.open': 'Abierto',
    'queue.status.closed': 'Cerrado',

    // User menu
    'menu.settings': '⚙ Configuración',
    'menu.logout': '↪ Cerrar sesión',

    // Player
    'player.empty_icon': '🎬',
    'player.waiting': 'Esperando clips...',
    'player.no_clip': 'Ningún clip cargado',
    'player.previous': '← Anterior',
    'player.start': '▶ Iniciar',
    'player.next': 'Siguiente →',
    'player.auto': 'Auto',
    'player.loading_instagram': 'Cargando video de Instagram...',
    'player.submitted_by': 'Enviado por:',
    'player.visit_channel': 'Visitar {channel}',

    // Time formatting
    'time.minutes_ago': 'hace {count} min',
    'time.hours_ago': 'hace {count} hr',
    'time.day_ago': 'hace {count} día',
    'time.days_ago': 'hace {count} días',
    'time.week_ago': 'hace {count} semana',
    'time.weeks_ago': 'hace {count} semanas',
    'time.month_ago': 'hace {count} mes',
    'time.months_ago': 'hace {count} meses',
    'time.year_ago': 'hace {count} año',
    'time.years_ago': 'hace {count} años',

    // Queue sidebar
    'queue.title': 'Cola',
    'queue.clear_btn': 'Limpiar',
    'queue.empty_message': 'La cola está vacía.<br>Esperando clips en el chat...',
    'queue.confirm_clear': '¿Realmente limpiar la cola?',
    'queue.click_to_play': 'Haga clic para reproducir directamente',
    'queue.delete': 'Eliminar',
    'queue.pushed': 'Priorizado',

    // History
    'history.empty': 'Aún no se han visto clips.',

    // Settings modal
    'settings.title': 'Configuración',
    'settings.cancel': 'Cancelar',
    'settings.save': 'Guardar',

    // Settings tabs
    'settings.tab.general': 'General',
    'settings.tab.queue': 'Cola de clips',
    'settings.tab.commands': 'Comandos',
    'settings.tab.history': 'Historial',
    'settings.tab.memory': 'Memoria de clips',
    'settings.tab.design': 'Diseño',

    // Settings — General
    'settings.general.language': 'Idioma',
    'settings.general.language_hint': 'Elige el idioma de visualización de la aplicación',
    'settings.general.app_title': 'Nombre de la aplicación',
    'settings.general.app_title_hint': 'Cambia el título mostrado en la parte superior izquierda (máx. 30 caracteres)',
    'settings.general.app_title_placeholder': 'ClipQ',
    'settings.general.channel': 'Canal de Twitch',
    'settings.general.channel_hint': 'Canal de chat al que unirse',
    'settings.general.channel_placeholder': 'tu_canal',

    // Settings — Queue
    'settings.queue.providers': 'Proveedores de clips',
    'settings.queue.providers_hint': 'Elige qué plataformas están permitidas',
    'settings.queue.user_limit': 'Límite de clips por usuario',
    'settings.queue.user_limit_hint': 'Clips máximos que un solo usuario puede tener en la cola a la vez (0 = ilimitado)',
    'settings.queue.age_limit': 'Límite de edad del clip (días)',
    'settings.queue.age_limit_hint': 'Los clips más antiguos que esto serán rechazados (0 = desactivado)',
    'settings.queue.blocked_streamers': 'Streamers bloqueados',
    'settings.queue.blocked_streamers_hint': 'Un nombre de canal por línea. Se rechazarán los clips de estos streamers.',
    'settings.queue.blocked_users': 'Usuarios bloqueados',
    'settings.queue.blocked_users_hint': 'Un nombre por línea. Se ignorarán los mensajes de estos usuarios.',

    // Settings — Commands
    'settings.commands.hint': 'Comandos de chat para la transmisión. No distingue mayúsculas de minúsculas.<br>Ejemplo: Si el prefijo es <code>!queue</code> y el siguiente es <code>next</code>, entonces se reconoce <code>!queuenext</code>.',
    'settings.commands.example_label': 'Ej:',
    'settings.commands.prefix': 'Prefijo de comando',
    'settings.commands.next': 'Siguiente clip',
    'settings.commands.push': 'Priorizar clip al #1',
    'settings.commands.open': 'Abrir cola',
    'settings.commands.close': 'Cerrar cola',
    'settings.commands.clear': 'Limpiar cola',
    'settings.commands.purgememory': 'Limpiar memoria de clips',
    'settings.commands.autoplay': 'Autoplay activar/desactivar',
    'settings.commands.limit': 'Establecer límite de clips',
    'settings.commands.remove': 'Eliminar clip',
    'settings.commands.providers': 'Proveedor activar/desactivar',
    'settings.commands.role_all': 'Todos',

    // Settings — History
    'settings.history.retention': 'Retención (días)',
    'settings.history.retention_hint': 'Cuánto tiempo permanecen los clips vistos en el historial (0 = ilimitado). No afecta a la memoria de clips.',
    'settings.history.count': 'Tienes <strong>{count}</strong> clips en el historial.',
    'settings.history.purge_hint': 'Limpiar solo elimina la visualización del historial, no la memoria de clips.',
    'settings.history.purge_btn': 'Limpiar historial',
    'settings.history.confirm_purge': '¿Realmente limpiar todo el historial? (La memoria de clips se conserva)',

    // Settings — Memory
    'settings.memory.hint': 'La memoria de clips almacena las URL de todos los clips vistos para evitar que se vuelvan a poner en cola.',
    'settings.memory.count': 'Tienes <strong>{count}</strong> clips en la memoria.',
    'settings.memory.purge_btn': 'Limpiar memoria',
    'settings.memory.confirm_purge': '¿Realmente limpiar la memoria de clips?',

    // Settings — Design
    'settings.design.show_badges': 'Mostrar insignias',
    'settings.design.show_badges_hint': 'Mostrar roles de Twitch (Moderador, VIP, Streamer) en la cola',
    'settings.design.font': 'Fuente',
    'settings.design.font_hint': 'Elige una fuente para toda la aplicación',
    'settings.design.set_default': 'Establecer como predeterminado',
    'settings.design.reset': 'Restablecer valores predeterminados',

    // Design — Color Groups
    'design.group.backgrounds': 'Fondos',
    'design.group.borders': 'Bordes',
    'design.group.accent': 'Acento',
    'design.group.status': 'Estado',
    'design.group.text': 'Texto',
    'design.group.misc': 'Varios',

    // Design — Color Labels
    'design.color.app': 'Aplicación',
    'design.color.menubar': 'Barra de menú',
    'design.color.player': 'Reproductor',
    'design.color.facecam': 'Facecam',
    'design.color.chat': 'Chat',
    'design.color.queue': 'Cola',
    'design.color.tile': 'Mosaico',
    'design.color.tile_hover': 'Mosaico al pasar el mouse',
    'design.color.infobar': 'Barra de información',
    'design.color.ad': 'Área de publicidad',
    'design.color.settings': 'Configuración',
    'design.color.standard': 'Estándar',
    'design.color.accent': 'Acento',
    'design.color.hover': 'Hover',
    'design.color.glow': 'Brillo',
    'design.color.secondary': 'Secundario',
    'design.color.open': 'Abierto',
    'design.color.closed': 'Cerrado',
    'design.color.danger': 'Peligro',
    'design.color.badge': 'Insignia',
    'design.color.dimmed': 'Atenuado',
    'design.color.bright': 'Brillante',
    'design.color.overlay': 'Superposición',
    'design.color.info': 'Información',

    // Design — Confirm Dialogs
    'design.confirm_set_default': '¿Guardar los valores de diseño actuales como nuevos valores predeterminados?',
    'design.alert_set_default': '¡Los valores de diseño actuales se han guardado como nuevos valores predeterminados!\n\n(Haga clic en \"Guardar\" después para aplicar el diseño de forma permanente).',
    'design.confirm_reset_custom': '¿Desea restablecer sus valores predeterminados guardados personalizados?\n\n(Haga clic en \"Aceptar\" para sus valores predeterminados guardados, o \"Cancelar\" para restablecer el diseño rojo original de fábrica).',
    'design.confirm_reset_factory': '¿Restablecer completamente al diseño rojo original de fábrica? (Sus valores predeterminados guardados se eliminarán).',
    'design.confirm_reset_all': '¿Restablecer todos los colores y fuentes al diseño original de fábrica?',

    // Settings tabs & Layout tab
    'settings.tab.layout': 'Diseño',
    'settings.layout.info_position': 'Posición de la barra de información',
    'settings.layout.info_position_hint': 'Elige si la barra de información está debajo o encima del reproductor',
    'settings.layout.position_below': 'Debajo del reproductor',
    'settings.layout.position_above': 'Encima del reproductor',
    'settings.layout.sidebar_position': 'Posición de la barra lateral',
    'settings.layout.sidebar_position_hint': 'Elige si la barra lateral está a la derecha o a la izquierda del reproductor',
    'settings.layout.position_right': 'Derecha del reproductor',
    'settings.layout.position_left': 'Izquierda del reproductor',
    'settings.layout.player_width': 'Ancho del reproductor',
    'settings.layout.player_width_hint': 'Ajusta el ancho del reproductor de video en relación con la barra lateral',
    'settings.layout.visibility': 'Visibilidad del componente',
    'settings.layout.visibility_hint': 'Alternar componentes individuales de la barra lateral',
    'settings.layout.show_facecam': 'Mostrar Facecam',
    'settings.layout.show_chat': 'Mostrar chat',
    'settings.layout.show_ad': 'Mostrar caja de anuncios',
    'settings.layout.show_queue': 'Mostrar cola',
    'settings.layout.ordering': 'Orden de los componentes',
    'settings.layout.ordering_hint': 'Elige la posición vertical de cada componente activo en la barra lateral',
    'settings.layout.pos_top': 'Arriba',
    'settings.layout.pos_middle': 'Centro',
    'settings.layout.pos_bottom': 'Abajo',
    'settings.layout.block_facecam': 'Facecam',
    'settings.layout.block_chat_ad': 'Chat + Anuncios',
    'settings.layout.block_queue': 'Cola',
    'settings.layout.confirm_set_default': '¿Desea guardar el diseño actual como predeterminado?',
    'settings.layout.alert_set_default': 'El diseño actual se ha guardado como predeterminado.\n\n(Haga clic en "Guardar" después para aplicar el diseño de forma permanente).',
    'settings.layout.confirm_reset_custom': '¿Desea restablecer su diseño personalizado guardado?\n\n(Haga clic en "Aceptar" para su diseño guardado, o "Cancelar" para restablecer el diseño original de fábrica)',
    'settings.layout.confirm_reset_factory': '¿Restablecer completamente al diseño original de fábrica? (Su diseño personalizado guardado se eliminará)',
    'settings.layout.confirm_reset_all': '¿Restablecer todo el diseño al diseño original de fábrica?',
});
