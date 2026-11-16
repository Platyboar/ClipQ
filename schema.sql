CREATE TABLE IF NOT EXISTS user_configs (
    twitch_user_id TEXT PRIMARY KEY,
    twitch_login TEXT NOT NULL DEFAULT '',
    settings_json TEXT NOT NULL DEFAULT '{}',
    custom_design_json TEXT,
    custom_layout_json TEXT,
    queue_json TEXT,
    language TEXT NOT NULL DEFAULT 'en',
    autoplay INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS clip_history (
    id TEXT NOT NULL,
    twitch_user_id TEXT NOT NULL,
    clip_json TEXT NOT NULL,
    added_at INTEGER NOT NULL DEFAULT 0,
    watched_at INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (twitch_user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_clip_history_user_watched
    ON clip_history (twitch_user_id, watched_at DESC);

CREATE TABLE IF NOT EXISTS clip_memory (
    twitch_user_id TEXT NOT NULL,
    clip_key TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (twitch_user_id, clip_key)
);
