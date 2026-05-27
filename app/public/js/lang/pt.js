/**
 * Portuguese translations for ClipQ
 */
ClipQ.I18n.register('pt', {
    _name: 'Português',
    _flag: 'https://flagcdn.com/pt.svg',

    // Login page
    'login.subtitle': 'Fila de clips para a tua transmissão',
    'login.connect_twitch': 'Conectar com a Twitch',
    'login.select_language': 'Selecionar idioma',

    // Navigation
    'nav.queue': 'Fila',
    'nav.history': 'Histórico',

    // Queue status
    'queue.status.open': 'Aberto',
    'queue.status.closed': 'Fechado',

    // User menu
    'menu.settings': '⚙ Configurações',
    'menu.logout': '↪ Sair',

    // Player
    'player.empty_icon': '🎬',
    'player.waiting': 'A aguardar clips...',
    'player.no_clip': 'Nenhum clip carregado',
    'player.previous': '← Anterior',
    'player.start': '▶ Iniciar',
    'player.next': 'Seguinte →',
    'player.auto': 'Auto',
    'player.loading_instagram': 'A carregar vídeo do Instagram...',
    'player.submitted_by': 'Enviado por:',
    'player.visit_channel': 'Visitar {channel}',

    // Time formatting
    'time.minutes_ago': 'há {count} min',
    'time.hours_ago': 'há {count} hr',
    'time.day_ago': 'há {count} dia',
    'time.days_ago': 'há {count} dias',
    'time.week_ago': 'há {count} semana',
    'time.weeks_ago': 'há {count} semanas',
    'time.month_ago': 'há {count} mês',
    'time.months_ago': 'há {count} meses',
    'time.year_ago': 'há {count} ano',
    'time.years_ago': 'há {count} anos',

    // Queue sidebar
    'queue.title': 'Fila',
    'queue.clear_btn': 'Limpar',
    'queue.empty_message': 'A fila está vazia.<br>A aguardar clips no chat...',
    'queue.confirm_clear': 'Desejas realmente limpar a fila?',
    'queue.click_to_play': 'Clica para reproduzir diretamente',
    'queue.delete': 'Eliminar',
    'queue.pushed': 'Priorizado',

    // History
    'history.empty': 'Ainda não foram vistos clips.',

    // Settings modal
    'settings.title': 'Configurações',
    'settings.cancel': 'Cancelar',
    'settings.save': 'Guardar',

    // Settings tabs
    'settings.tab.general': 'Geral',
    'settings.tab.queue': 'Fila de clips',
    'settings.tab.commands': 'Comandos',
    'settings.tab.history': 'Histórico',
    'settings.tab.memory': 'Memória de clips',
    'settings.tab.design': 'Design',

    // Settings — General
    'settings.general.language': 'Idioma',
    'settings.general.language_hint': 'Escolhe o idioma de exibição da aplicação',
    'settings.general.app_title': 'Nome da aplicação',
    'settings.general.app_title_hint': 'Altera o título exibido no canto superior esquerdo (máx. 30 caracteres)',
    'settings.general.app_title_placeholder': 'ClipQ',
    'settings.general.channel': 'Canal da Twitch',
    'settings.general.channel_hint': 'Canal de chat para aderir',
    'settings.general.channel_placeholder': 'o_teu_canal',

    // Settings — Queue
    'settings.queue.providers': 'Plataformas de clips',
    'settings.queue.providers_hint': 'Escolhe quais plataformas são permitidas',
    'settings.queue.user_limit': 'Limite de clips por utilizador',
    'settings.queue.user_limit_hint': 'Máximo de clips que um único utilizador pode ter na fila ao mesmo tempo (0 = ilimitado)',
    'settings.queue.age_limit': 'Limite de idade do clip (Dias)',
    'settings.queue.age_limit_hint': 'Clips mais antigos do que isto serão rejeitados (0 = desativado)',
    'settings.queue.blocked_streamers': 'Streamers bloqueados',
    'settings.queue.blocked_streamers_hint': 'Um nome de canal por linha. Clips destes streamers serão rejeitados.',
    'settings.queue.blocked_users': 'Utilizadores bloqueados',
    'settings.queue.blocked_users_hint': 'Um nome por linha. Mensagens destes utilizadores serão ignoradas.',

    // Settings — Commands
    'settings.commands.hint': 'Comandos de chat para a transmissão. Não distingue maiúsculas de minúsculas.<br>Exemplo: Se o prefixo for <code>!queue</code> e a ação for <code>next</code>, então <code>!queuenext</code> é reconhecido.',
    'settings.commands.example_label': 'Ex:',
    'settings.commands.prefix': 'Prefijo do comando',
    'settings.commands.next': 'Próximo clip',
    'settings.commands.push': 'Priorizar clip no #1',
    'settings.commands.open': 'Abrir fila',
    'settings.commands.close': 'Fechar fila',
    'settings.commands.clear': 'Limpar fila',
    'settings.commands.purgememory': 'Limpar memória de clips',
    'settings.commands.autoplay': 'Autoplay ligado/desligado',
    'settings.commands.limit': 'Definir limite de clips',
    'settings.commands.remove': 'Remover clip',
    'settings.commands.providers': 'Plataforma ligada/desligada',
    'settings.commands.role_all': 'Todos',

    // Settings — History
    'settings.history.retention': 'Retenção (Dias)',
    'settings.history.retention_hint': 'Quanto tempo os clips vistos permanecem no histórico (0 = ilimitado). Não afeta a memória de clips.',
    'settings.history.count': 'Tens <strong>{count}</strong> clips no histórico.',
    'settings.history.purge_hint': 'Limpar remove apenas a exibição do histórico, não a memória de clips.',
    'settings.history.purge_btn': 'Limpar histórico',
    'settings.history.confirm_purge': 'Desejas realmente limpar todo o histórico? (A memória de clips é preservada)',

    // Settings — Memory
    'settings.memory.hint': 'A memória de clips armazena as URL de todos os clips vistos para evitar que voltem a entrar na fila.',
    'settings.memory.count': 'Tens <strong>{count}</strong> clips na memória.',
    'settings.memory.purge_btn': 'Limpar memória',
    'settings.memory.confirm_purge': 'Desejas realmente limpar a memória de clips?',

    // Settings — Design
    'settings.design.show_badges': 'Mostrar insígnias',
    'settings.design.show_badges_hint': 'Mostrar funções da Twitch (Moderador, VIP, Streamer) na fila',
    'settings.design.font': 'Fonte',
    'settings.design.font_hint': 'Escolhe uma fonte para toda a aplicação',
    'settings.design.set_default': 'Definir como padrão',
    'settings.design.reset': 'Repor padrão',

    // Design — Color Groups
    'design.group.backgrounds': 'Fundos',
    'design.group.borders': 'Bordas',
    'design.group.accent': 'Acento',
    'design.group.status': 'Estado',
    'design.group.text': 'Texto',
    'design.group.misc': 'Diversos',

    // Design — Color Labels
    'design.color.app': 'Aplicação',
    'design.color.menubar': 'Barra de menu',
    'design.color.player': 'Reprodutor',
    'design.color.facecam': 'Facecam',
    'design.color.chat': 'Chat',
    'design.color.queue': 'Fila',
    'design.color.tile': 'Mosaico',
    'design.color.tile_hover': 'Mosaico em foco',
    'design.color.infobar': 'Barra de informações',
    'design.color.ad': 'Área de anúncios',
    'design.color.settings': 'Configurações',
    'design.color.standard': 'Padrão',
    'design.color.accent': 'Acento',
    'design.color.hover': 'Foco',
    'design.color.glow': 'Brilho',
    'design.color.secondary': 'Secundário',
    'design.color.open': 'Aberto',
    'design.color.closed': 'Fechado',
    'design.color.danger': 'Perigo',
    'design.color.badge': 'Insígnia',
    'design.color.dimmed': 'Esbatido',
    'design.color.bright': 'Brilhante',
    'design.color.overlay': 'Sobreposição',
    'design.color.info': 'Informações',

    // Design — Confirm Dialogs
    'design.confirm_set_default': 'Guardar os valores de design atuais como novos padrões?',
    'design.alert_set_default': 'Os valores de design atuais foram guardados como novos padrões!\n\n(Clica em \"Guardar\" depois para aplicar o design permanentemente).',
    'design.confirm_reset_custom': 'Desejas repor os teus padrões personalizados guardados?\n\n(Clica em \"OK\" para os teus padrões guardados, ou \"Cancelar\" para repor o design vermelho original de fábrica).',
    'design.confirm_reset_factory': 'Repor completamente o design vermelho original de fábrica? (Os teus padrões guardados serão eliminados).',
    'design.confirm_reset_all': 'Repor todas as cores e fontes para o design de fábrica original?',

    // Settings tabs & Layout tab
    'settings.tab.layout': 'Layout',
    'settings.layout.info_position': 'Posição da barra de informações',
    'settings.layout.info_position_hint': 'Escolha se a barra de informações fica abaixo ou acima do reprodutor',
    'settings.layout.position_below': 'Abaixo do reprodutor',
    'settings.layout.position_above': 'Acima do reprodutor',
    'settings.layout.sidebar_position': 'Posição da barra lateral',
    'settings.layout.sidebar_position_hint': 'Escolha se a barra lateral fica à direita ou à esquerda do reprodutor',
    'settings.layout.position_right': 'Direita do reprodutor',
    'settings.layout.position_left': 'Esquerda do reprodutor',
    'settings.layout.player_width': 'Largura do reprodutor',
    'settings.layout.player_width_hint': 'Ajuste a largura do reprodutor de vídeo em relação à barra lateral',
    'settings.layout.visibility': 'Visibilidade dos componentes',
    'settings.layout.visibility_hint': 'Alternar componentes individuais da barra lateral',
    'settings.layout.show_facecam': 'Mostrar caixa de Facecam',
    'settings.layout.show_chat': 'Mostrar caixa de chat',
    'settings.layout.show_ad': 'Mostrar caixa de anúncios',
    'settings.layout.show_queue': 'Mostrar fila',
    'settings.layout.ordering': 'Ordem dos componentes',
    'settings.layout.ordering_hint': 'Escolha a posição vertical de cada componente ativo na barra lateral',
    'settings.layout.pos_top': 'Topo',
    'settings.layout.pos_middle': 'Meio',
    'settings.layout.pos_bottom': 'Fundo',
    'settings.layout.block_facecam': 'Facecam',
    'settings.layout.block_chat_ad': 'Chat + Anúncios',
    'settings.layout.block_queue': 'Fila',
    'settings.layout.confirm_set_default': 'Desejas guardar o layout atual como padrão?',
    'settings.layout.alert_set_default': 'O layout atual foi guardado como padrão.\n\n(Clica em "Guardar" depois para aplicar o layout permanentemente).',
    'settings.layout.confirm_reset_custom': 'Desejas repor o teu layout personalizado guardado?\n\n(Clica em "OK" para o teu layout guardado, ou "Cancelar" para repor o layout original de fábrica)',
    'settings.layout.confirm_reset_factory': 'Repor completamente o layout original de fábrica? (O teu layout guardado será eliminado)',
    'settings.layout.confirm_reset_all': 'Repor todo o layout para o layout original de fábrica?',
});
