CREATE TABLE IF NOT EXISTS multiplayer_voice_calls (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    room_id INTEGER NOT NULL,
    caller_id INTEGER NOT NULL,
    callee_id INTEGER NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'ringing',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    caller_seen INTEGER NOT NULL DEFAULT 0,
    callee_seen INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX multiplayer_voice_calls_room_status ON multiplayer_voice_calls(room_id,status,updated_at);
CREATE TABLE IF NOT EXISTS multiplayer_voice_signals (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    call_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    recipient_id INTEGER NOT NULL,
    signal_type VARCHAR(16) NOT NULL,
    payload TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE INDEX multiplayer_voice_signals_recipient ON multiplayer_voice_signals(call_id,recipient_id,id);
