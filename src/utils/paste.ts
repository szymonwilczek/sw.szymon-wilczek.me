// Shared by /paste/ and its Worker (worker/paste), so both sides agree on the rules

export const PASTE_URL = "https://paste.szymon-wilczek.me";

// paste lives one day, then KV lets it go
export const LIFETIME_SECONDS = 24 * 60 * 60;
export const MAX_CHARS = 65_536;
export const ID_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export const ID_LENGTH = 5;
export const ID_PATTERN = new RegExp(`^[${ID_ALPHABET}]{${ID_LENGTH}}$`);
