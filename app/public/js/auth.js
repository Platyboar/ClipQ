/**
 * auth.js — Twitch OAuth Implicit Grant Flow
 */
window.ClipQ = window.ClipQ || {};

ClipQ.CLIENT_ID = '7i3oa82uoo3e39ovny3p7k079f84n3';

ClipQ.Auth = (() => {
    'use strict';

    const REDIRECT_URI = 'http://localhost:8000/';
    const TOKEN_KEY = 'clipq_token';
    const USER_KEY = 'clipq_user';

    function getLoginUrl() {
        const scopes = 'chat:read';
        return `https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=${ClipQ.CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scopes)}`;
    }

    function parseTokenFromHash() {
        const hash = window.location.hash.substring(1);
        if (!hash) return null;
        const params = new URLSearchParams(hash);
        const token = params.get('access_token');
        if (token) {
            try {
                localStorage.setItem(TOKEN_KEY, token);
            } catch { /* ignore storage quota errors */ }
            // Clean URL
            history.replaceState(null, '', window.location.pathname);
            return token;
        }
        return null;
    }

    function getToken() {
        try {
            return localStorage.getItem(TOKEN_KEY);
        } catch {
            return null;
        }
    }

    async function fetchUser(token) {
        try {
            const res = await fetch('https://api.twitch.tv/helix/users', {
                headers: { 'Client-ID': ClipQ.CLIENT_ID, 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return null;
            const data = await res.json();
            if (data.data && data.data[0]) {
                const user = {
                    id: data.data[0].id,
                    login: data.data[0].login,
                    displayName: data.data[0].display_name,
                    avatar: data.data[0].profile_image_url
                };
                try {
                    localStorage.setItem(USER_KEY, JSON.stringify(user));
                } catch { /* ignore storage quota errors */ }
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
            return { valid: res.ok, unauthorized: res.status === 401 };
        } catch {
            return { valid: false, unauthorized: false };
        }
    }

    function clearSession() {
        try {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
        } catch { /* ignore storage errors */ }
    }

    function logout() {
        clearSession();
        try {
            localStorage.removeItem('clipq_language');
        } catch { /* ignore storage errors */ }
        window.location.reload();
    }

    return { getLoginUrl, parseTokenFromHash, getToken, fetchUser, getUser, validate, clearSession, logout };
})();
