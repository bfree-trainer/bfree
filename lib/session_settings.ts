export function saveSession(key: string, obj: Object) {
	try {
		sessionStorage.setItem(key, JSON.stringify(obj));
	} catch {
		// sessionStorage may be unavailable (e.g. private browsing restrictions)
	}
}

export function loadSession(key: string) {
	if (typeof window === 'undefined') return null;
	try {
		const stored = sessionStorage.getItem(key);
		return stored ? JSON.parse(stored) : null;
	} catch {
		return null;
	}
}
