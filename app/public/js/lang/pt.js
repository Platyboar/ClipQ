/**
 * Portuguese translations for ClipQ
 */
ClipQ.I18n.register('pt', {
    _name: 'Português',
    _flag: '/img/flags/pt.png',

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
    'player.waiting': 'A aguardar clips...',
    'player.no_clip': 'Nenhum clip carregado',
    'player.previous': '← Anterior',
    'player.start': '▶ Iniciar',
    'player.next': 'Seguinte →',
    'player.auto': 'Auto',
    'player.autoplay_title': 'Reprodução automática',
    'player.loading_instagram': 'A carregar vídeo do Instagram...',
    'player.submitted_by': 'Enviado por:',
    'player.visit_channel': 'Visitar {channel}',

    // Roles
    'roles.broadcaster': 'Streamer',
    'roles.lead_mod': 'Moderador principal',
    'roles.mod': 'Moderador',
    'roles.vip': 'VIP',

    // Time formatting
    'time.minutes_ago': 'há {count} min',
    'time.hours_ago': 'há {count} h',
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
    'history.delete': 'Remover do histórico',
    'history.confirm_delete': 'Desejas realmente remover este clip do histórico?',
    'history.confirm_yes': 'Sim',
    'history.confirm_cancel': 'Cancelar',
    'history.load_more': 'Carregar mais ({count} restantes)',

    // Settings modal
    'settings.title': 'Configurações',
    'settings.cancel': 'Cancelar',
    'settings.save': 'Guardar',
    'settings.save_close': 'Guardar + Fechar',

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
    'settings.general.channel_hint': 'Canal de chat ao qual se ligar',
    'settings.general.reset': 'Restaurar configurações de fábrica',
    'settings.general.confirm_reset': 'Desejas realmente restaurar todas as configurações para os padrões de fábrica? A aplicação será recarregada.',
    'settings.general.export': 'Exportar dados (JSON)',
    'settings.general.delete_cloud': 'Eliminar dados do servidor',
    'settings.general.confirm_delete_cloud': 'Eliminar permanentemente todas as tuas configurações, histórico e memória de clips do servidor? Esta ação não pode ser desfeita.',
    'settings.general.delete_cloud_done': 'Todos os dados do servidor foram eliminados.',
    'settings.general.delete_cloud_error': 'Não foi possível eliminar os dados do servidor. Tenta novamente.',

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
    'settings.commands.hint': 'Comandos de chat para a transmissão. Não distingue maiúsculas de minúsculas.<br>Exemplo: Se o prefixo for <code>!queue</code> e «Próximo clip» for <code>next</code>, então <code>!queue next</code> é reconhecido.',
    'settings.commands.example_label': 'Ex:',
    'settings.commands.prefix': 'Prefixo do comando',
    'settings.commands.next': 'Próximo clip',
    'settings.commands.push': 'Priorizar clip no #1',
    'settings.commands.open': 'Abrir fila',
    'settings.commands.close': 'Fechar fila',
    'settings.commands.clear': 'Limpar fila',
    'settings.commands.purgememory': 'Limpar memória de clips',
    'settings.commands.autoplay': 'Ligar/desligar Autoplay',
    'settings.commands.limit': 'Definir limite de clips',
    'settings.commands.remove': 'Remover clip',
    'settings.commands.providers': 'Ligar/desligar plataforma',
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
    'settings.memory.bypass_title': 'Ignorar memória de clips',
    'settings.memory.bypass_hint': 'Permitir que estes cargos adicionem à fila clips já presentes na memória',

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
    'design.color.tile_hover': 'Mosaico ao passar o rato',
    'design.color.infobar': 'Barra de informações',
    'design.color.ad': 'Área de anúncios',
    'design.color.settings': 'Configurações',
    'design.color.standard': 'Padrão',
    'design.color.accent': 'Acento',
    'design.color.hover': 'Ao passar o rato',
    'design.color.glow': 'Brilho',
    'design.color.secondary': 'Secundário',
    'design.color.gradient': 'Gradiente',
    'design.color.open': 'Aberto',
    'design.color.closed': 'Fechado',
    'design.color.danger': 'Perigo',
    'design.color.badge': 'Insígnia',
    'design.color.dimmed': 'Esbatido',
    'design.color.bright': 'Brilhante',
    'design.color.overlay': 'Sobreposição',
    'design.color.info': 'Informações',
    'design.color.opacity': 'Opacidade',

    // Design — Confirm Dialogs
    'design.confirm_set_default': 'Guardar os valores de design atuais como novos padrões?',
    'design.alert_set_default': 'Os valores de design atuais foram guardados como novos padrões!\n\n(Clica em "Guardar" depois para aplicar o design permanentemente).',
    'design.confirm_reset_custom': 'Desejas repor os teus padrões personalizados guardados?\n\n(Clica em "OK" para os teus padrões guardados, ou "Cancelar" para repor o design vermelho original de fábrica).',
    'design.confirm_reset_factory': 'Repor completamente o design vermelho original de fábrica? (Os teus padrões guardados serão eliminados).',
    'design.confirm_reset_all': 'Repor todas as cores e a fonte para o design de fábrica original?',

    // Settings tabs & Layout tab
    'settings.tab.layout': 'Layout',
    'settings.layout.info_position': 'Posição da barra de informações',
    'settings.layout.info_position_hint': 'Escolhe se a barra de informações fica abaixo ou acima do reprodutor',
    'settings.layout.position_below': 'Abaixo do reprodutor',
    'settings.layout.position_above': 'Acima do reprodutor',
    'settings.layout.sidebar_position': 'Posição da barra lateral',
    'settings.layout.sidebar_position_hint': 'Escolhe se a barra lateral fica à direita ou à esquerda do reprodutor',
    'settings.layout.position_right': 'Direita do reprodutor',
    'settings.layout.position_left': 'Esquerda do reprodutor',
    'settings.layout.widths': 'Larguras dos componentes',
    'settings.layout.widths_hint': 'Ajusta as larguras do reprodutor e dos componentes da barra lateral',
    'settings.layout.player_width': 'Largura do reprodutor',
    'settings.layout.chat_width': 'Largura do chat',
    'settings.layout.heights': 'Alturas dos componentes',
    'settings.layout.heights_hint': 'Ajusta as alturas e bloqueia os tamanhos dos componentes da barra lateral',
    'settings.layout.facecam_height': 'Altura da Facecam',
    'settings.layout.queue_height': 'Altura da fila',
    'settings.layout.chat_ad_lock': 'Bloquear altura do Chat/Anúncios',
    'settings.layout.lock_height': 'Bloquear altura',
    'settings.layout.visibility': 'Visibilidade dos componentes',
    'settings.layout.visibility_hint': 'Ocultar mantém o espaço; Remover liberta-o para outros componentes',
    'settings.layout.visibility_hide': 'Ocultar',
    'settings.layout.visibility_remove': 'Remover',
    'settings.layout.box_facecam': 'Caixa de Facecam',
    'settings.layout.box_chat': 'Caixa de chat',
    'settings.layout.box_ad': 'Caixa de anúncios',
    'settings.layout.box_queue': 'Caixa de fila',
    'settings.layout.ordering': 'Ordem dos componentes',
    'settings.layout.ordering_hint': 'Escolhe a posição vertical de cada componente ativo na barra lateral',
    'settings.layout.pos_top': 'Topo',
    'settings.layout.pos_middle': 'Meio',
    'settings.layout.pos_bottom': 'Em baixo',
    'settings.layout.block_facecam': 'Facecam',
    'settings.layout.block_chat_ad': 'Chat + Anúncios',
    'settings.layout.block_queue': 'Fila',
    'settings.layout.confirm_set_default': 'Desejas guardar o layout atual como padrão?',
    'settings.layout.alert_set_default': 'O layout atual foi guardado como padrão.\n\n(Clica em "Guardar" depois para aplicar o layout permanentemente).',
    'settings.layout.confirm_reset_custom': 'Desejas repor o teu layout personalizado guardado?\n\n(Clica em "OK" para o teu layout guardado, ou "Cancelar" para repor o layout original de fábrica)',
    'settings.layout.confirm_reset_factory': 'Repor completamente o layout original de fábrica? (O teu layout guardado será eliminado)',
    'settings.layout.confirm_reset_all': 'Repor todo o layout para o layout original de fábrica?',

    // Settings — About
    'settings.tab.about': 'Sobre',
    'settings.about.heading': 'Sobre o ClipQ',
    'settings.about.description': 'Criado por Platyboar com a ajuda do Antigravity.',
    'settings.about.license': 'Licenciado sob a licença MIT.',
    'settings.about.issues_hint': 'Encontraste um bug ou problema? Reporta diretamente no GitHub:',
    'settings.about.report_btn': 'Reportar um problema no GitHub',
    'settings.about.privacy_heading': 'Privacidade e armazenamento de dados',
    'settings.about.privacy_text': 'Na versão online, as tuas configurações, memória de clips e histórico são guardados na UE (Cloudflare D1) associados apenas ao teu ID de utilizador da Twitch. Nenhum token de acesso da Twitch é guardado no servidor. A reprodução de clips carrega leitores externos da Twitch, YouTube, TikTok ou Instagram. Podes exportar ou eliminar os teus dados a qualquer momento em Configurações → Geral.',
});
