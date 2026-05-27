/**
 * auth.js — Twitch OAuth Implicit Grant Flow
 */
window.ClipQ = window.ClipQ || {};

ClipQ.CLIENT_ID = '7i3oa82uoo3e39ovny3p7k079f84n3';
ClipQ.REDIRECT_URI = 'http://localhost:8000/';

ClipQ.Auth = (() => {
    const TOKEN_KEY = 'clipq_token';
    const USER_KEY = 'clipq_user';

    function getLoginUrl() {
        const scopes = 'chat:read';
        return `https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=${ClipQ.CLIENT_ID}&redirect_uri=${encodeURIComponent(ClipQ.REDIRECT_URI)}&scope=${encodeURIComponent(scopes)}`;
    }

    function parseTokenFromHash() {
        const hash = window.location.hash.substring(1);
        if (!hash) return null;
        const params = new URLSearchParams(hash);
        const token = params.get('access_token');
        if (token) {
            localStorage.setItem(TOKEN_KEY, token);
            // Clean URL
            history.replaceState(null, '', window.location.pathname);
            return token;
        }
        return null;
    }

    function getToken() {
        return localStorage.getItem(TOKEN_KEY);
    }

    async function fetchUser(token) {
        try {
            const res = await fetch('https://api.twitch.tv/helix/users', {
                headers: { 'Client-ID': ClipQ.CLIENT_ID, 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.data && data.data[0]) {
                const user = {
                    id: data.data[0].id,
                    login: data.data[0].login,
                    displayName: data.data[0].display_name,
                    avatar: data.data[0].profile_image_url
                };
                localStorage.setItem(USER_KEY, JSON.stringify(user));
                return user;
            }
        } catch (e) {
            console.error('Failed to fetch user:', e);
        }
        return null;
    }

    function getUser() {
        try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
    }

    async function validate(token) {
        try {
            const res = await fetch('https://id.twitch.tv/oauth2/validate', {
                headers: { 'Authorization': `OAuth ${token}` }
            });
            return res.ok;
        } catch { return false; }
    }

    function logout() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem('clipq_language');
        window.location.reload();
    }

    return { getLoginUrl, parseTokenFromHash, getToken, fetchUser, getUser, validate, logout };
})();
