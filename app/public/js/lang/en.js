/**
 * English translations for ClipQ
 */
ClipQ.I18n.register('en', {
    _name: 'English',
    _flag: 'https://flagcdn.com/gb.svg',

    // Login page
    'login.subtitle': 'Clip Queue for your Stream',
    'login.connect_twitch': 'Connect with Twitch',
    'login.select_language': 'Select Language',

    // Navigation
    'nav.queue': 'Queue',
    'nav.history': 'History',

    // Queue status
    'queue.status.open': 'Open',
    'queue.status.closed': 'Closed',

    // User menu
    'menu.settings': '⚙ Settings',
    'menu.logout': '↪ Logout',

    // Player
    'player.empty_icon': '🎬',
    'player.waiting': 'Waiting for clips...',
    'player.no_clip': 'No clip loaded',
    'player.previous': '← Previous',
    'player.start': '▶ Start',
    'player.next': 'Next →',
    'player.auto': 'Auto',
    'player.loading_instagram': 'Loading Instagram video...',
    'player.submitted_by': 'Submitted by:',
    'player.visit_channel': 'Visit {channel}',

    // Time formatting
    'time.minutes_ago': '{count} min ago',
    'time.hours_ago': '{count} hr ago',
    'time.day_ago': '{count} day ago',
    'time.days_ago': '{count} days ago',
    'time.week_ago': '{count} week ago',
    'time.weeks_ago': '{count} weeks ago',
    'time.month_ago': '{count} month ago',
    'time.months_ago': '{count} months ago',
    'time.year_ago': '{count} year ago',
    'time.years_ago': '{count} years ago',

    // Queue sidebar
    'queue.title': 'Queue',
    'queue.clear_btn': 'Clear',
    'queue.empty_message': 'Queue is empty.<br>Waiting for clips in chat...',
    'queue.confirm_clear': 'Really clear the queue?',
    'queue.click_to_play': 'Click to play directly',
    'queue.delete': 'Delete',
    'queue.pushed': 'Pushed',

    // History
    'history.empty': 'No clips watched yet.',

    // Settings modal
    'settings.title': 'Settings',
    'settings.cancel': 'Cancel',
    'settings.save': 'Save',
    'settings.save_close': 'Save + Close',

    // Settings tabs
    'settings.tab.general': 'General',
    'settings.tab.queue': 'Clip Queue',
    'settings.tab.commands': 'Commands',
    'settings.tab.history': 'History',
    'settings.tab.memory': 'Clip Memory',
    'settings.tab.design': 'Design',

    // Settings — General
    'settings.general.language': 'Language',
    'settings.general.language_hint': 'Choose the display language of the app',
    'settings.general.app_title': 'App Name',
    'settings.general.app_title_hint': 'Change the title shown in the top left (max. 30 characters)',
    'settings.general.app_title_placeholder': 'ClipQ',
    'settings.general.channel': 'Twitch Channel',
    'settings.general.channel_hint': 'Chat channel to join',
    'settings.general.channel_placeholder': 'your_channel',
    'settings.general.reset': 'Reset to Factory Settings',
    'settings.general.confirm_reset': 'Really reset all settings to factory defaults? The app will reload.',

    // Settings — Queue
    'settings.queue.providers': 'Clip Providers',
    'settings.queue.providers_hint': 'Choose which platforms are allowed',
    'settings.queue.user_limit': 'User Clip Limit',
    'settings.queue.user_limit_hint': 'Maximum clips a single user can have in the queue at once (0 = unlimited)',
    'settings.queue.age_limit': 'Clip Age Limit (Days)',
    'settings.queue.age_limit_hint': 'Clips older than this will be rejected (0 = disabled)',
    'settings.queue.blocked_streamers': 'Blocked Streamers',
    'settings.queue.blocked_streamers_hint': 'One channel name per line. Clips from these streamers will be rejected.',
    'settings.queue.blocked_users': 'Blocked Users',
    'settings.queue.blocked_users_hint': 'One name per line. Messages from these users will be ignored.',

    // Settings — Commands
    'settings.commands.hint': 'Chat commands for the stream. Not case-sensitive.<br>Example: If prefix is <code>!queue</code> and next is <code>next</code>, then <code>!queue next</code> is recognized.',
    'settings.commands.example_label': 'Ex:',
    'settings.commands.prefix': 'Command Prefix',
    'settings.commands.next': 'Next Clip',
    'settings.commands.push': 'Push Clip to #1',
    'settings.commands.open': 'Open Queue',
    'settings.commands.close': 'Close Queue',
    'settings.commands.clear': 'Clear Queue',
    'settings.commands.purgememory': 'Purge Clip Memory',
    'settings.commands.autoplay': 'Autoplay on/off',
    'settings.commands.limit': 'Set Clip Limit',
    'settings.commands.remove': 'Remove Clip',
    'settings.commands.providers': 'Provider on/off',
    'settings.commands.role_all': 'All',

    // Settings — History
    'settings.history.retention': 'Retention (Days)',
    'settings.history.retention_hint': 'How long watched clips stay in history (0 = unlimited). Does not affect Clip Memory.',
    'settings.history.count': 'You have <strong>{count}</strong> clips in history.',
    'settings.history.purge_hint': 'Clearing only removes the history display, not the Clip Memory.',
    'settings.history.purge_btn': 'Clear History',
    'settings.history.confirm_purge': 'Really clear all history? (Clip Memory is preserved)',

    // Settings — Memory
    'settings.memory.hint': 'Clip Memory stores URLs of all watched clips to prevent them from being re-queued.',
    'settings.memory.count': 'You have <strong>{count}</strong> clips in memory.',
    'settings.memory.purge_btn': 'Clear Memory',
    'settings.memory.confirm_purge': 'Really clear Clip Memory?',
    'settings.memory.bypass_title': 'Bypass Clip Memory',
    'settings.memory.bypass_hint': 'Allow these roles to queue clips that are already in the memory',

    // Settings — Design
    'settings.design.show_badges': 'Show Badges',
    'settings.design.show_badges_hint': 'Show Twitch roles (Moderator, VIP, Streamer) in the queue',
    'settings.design.font': 'Font',
    'settings.design.font_hint': 'Choose a font for the entire app',
    'settings.design.set_default': 'Set as Default',
    'settings.design.reset': 'Reset to Default',

    // Design — Color Groups
    'design.group.backgrounds': 'Backgrounds',
    'design.group.borders': 'Borders',
    'design.group.accent': 'Accent',
    'design.group.status': 'Status',
    'design.group.text': 'Text',
    'design.group.misc': 'Miscellaneous',

    // Design — Color Labels
    'design.color.app': 'App',
    'design.color.menubar': 'Menu Bar',
    'design.color.player': 'Player',
    'design.color.facecam': 'Facecam',
    'design.color.chat': 'Chat',
    'design.color.queue': 'Queue',
    'design.color.tile': 'Tile',
    'design.color.tile_hover': 'Tile Hover',
    'design.color.infobar': 'Info Bar',
    'design.color.ad': 'Ad Area',
    'design.color.settings': 'Settings',
    'design.color.standard': 'Standard',
    'design.color.accent': 'Accent',
    'design.color.hover': 'Hover',
    'design.color.glow': 'Glow',
    'design.color.secondary': 'Secondary',
    'design.color.gradient': 'Gradient',
    'design.color.open': 'Open',
    'design.color.closed': 'Closed',
    'design.color.danger': 'Danger',
    'design.color.badge': 'Badge',
    'design.color.dimmed': 'Dimmed',
    'design.color.bright': 'Bright',
    'design.color.overlay': 'Overlay',
    'design.color.info': 'Info',

    // Design — Confirm Dialogs
    'design.confirm_set_default': 'Save current design values as new defaults?',
    'design.alert_set_default': 'Current design values have been saved as new defaults!\n\n(Please click \"Save\" afterwards to permanently apply the design.)',
    'design.confirm_reset_custom': 'Do you want to reset to your custom saved defaults?\n\n(Click \"OK\" for your saved defaults, or \"Cancel\" to reset to the original red factory design)',
    'design.confirm_reset_factory': 'Completely reset to the original red factory design? (Your saved defaults will be deleted)',
    'design.confirm_reset_all': 'Reset all colors and font to the original factory design?',

    // Settings tabs & Layout tab
    'settings.tab.layout': 'Layout',
    'settings.layout.info_position': 'Info Bar Position',
    'settings.layout.info_position_hint': 'Choose whether the info bar is below or above the player',
    'settings.layout.position_below': 'Below Player',
    'settings.layout.position_above': 'Above Player',
    'settings.layout.sidebar_position': 'Sidebar Position',
    'settings.layout.sidebar_position_hint': 'Choose whether the sidebar is on the right or left of the player',
    'settings.layout.position_right': 'Right of Player',
    'settings.layout.position_left': 'Left of Player',
    'settings.layout.widths': 'Component Widths',
    'settings.layout.widths_hint': 'Adjust the widths of the player and sidebar components',
    'settings.layout.player_width': 'Player Width',
    'settings.layout.player_width_hint': 'Adjust the width of the video player relative to the sidebar',
    'settings.layout.chat_width': 'Chat Width',
    'settings.layout.chat_width_hint': 'Adjust the width of the chat relative to the ad box',
    'settings.layout.heights': 'Component Heights',
    'settings.layout.heights_hint': 'Adjust heights and lock sizes of sidebar components',
    'settings.layout.facecam_height': 'Facecam Height',
    'settings.layout.queue_height': 'Queue Height',
    'settings.layout.chat_ad_lock': 'Lock Chat/Ad Height',
    'settings.layout.visibility': 'Component Visibility',
    'settings.layout.visibility_hint': 'Toggle individual sidebar components',
    'settings.layout.show_facecam': 'Show Facecam Box',
    'settings.layout.show_chat': 'Show Chat Box',
    'settings.layout.show_ad': 'Show Ad Box',
    'settings.layout.show_queue': 'Show Queue Box',
    'settings.layout.ordering': 'Component Order',
    'settings.layout.ordering_hint': 'Choose the vertical position of each active component in the sidebar',
    'settings.layout.pos_top': 'Top',
    'settings.layout.pos_middle': 'Middle',
    'settings.layout.pos_bottom': 'Bottom',
    'settings.layout.block_facecam': 'Facecam',
    'settings.layout.block_chat_ad': 'Chat + Ad',
    'settings.layout.block_queue': 'Queue',
    'settings.layout.confirm_set_default': 'Do you want to save the current layout as default?',
    'settings.layout.alert_set_default': 'The current layout has been saved as default.\n\n(Please click "Save" afterwards to permanently apply the layout.)',
    'settings.layout.confirm_reset_custom': 'Do you want to reset to your custom saved layout?\n\n(Click "OK" for your saved layout, or "Cancel" to reset to the original factory layout)',
    'settings.layout.confirm_reset_factory': 'Completely reset to the original factory layout? (Your saved custom layout will be deleted)',
    'settings.layout.confirm_reset_all': 'Reset the entire layout to the original factory layout?',
});
