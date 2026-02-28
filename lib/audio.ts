/**
 * Game audio manager — handles BGM loops and one-shot SFX.
 * All paths are relative to /public.
 */

// ── BGM tracks ────────────────────────────────────────────────
const BGM_TRACKS = {
    title: "/assets/sounds/bgm/bgm-001-title.mp3",
    cooking: "/assets/sounds/bgm/bgm-002-cooking.mp3",
    result: "/assets/sounds/bgm/bgm-003-result.mp3",
    loading: "/assets/sounds/bgm/bgm-004-loading.mp3",
    hint: "/assets/sounds/bgm/bgm-005-hint.mp3",
} as const;

type BgmKey = keyof typeof BGM_TRACKS;

// ── SFX one-shots ─────────────────────────────────────────────
const SFX_TRACKS = {
    chopping: "/assets/sounds/sfx/sfx-001-chopping.mp3",
    sizzling: "/assets/sounds/sfx/sfx-002-sizzling.mp3",
    boiling: "/assets/sounds/sfx/sfx-003-boiling.mp3",
    buttonClick: "/assets/sounds/sfx/sfx-008.mp3",
    dropSuccess: "/assets/sounds/sfx/sfx-012.mp3",
    cookingComplete: "/assets/sounds/sfx/sfx-018.mp3",
} as const;

type SfxKey = keyof typeof SFX_TRACKS;

// ── Tool → SFX mapping ──────────────────────────────────────
const TOOL_SFX_MAP: Record<string, SfxKey> = {
    "도마": "chopping",
    "프라이팬": "sizzling",
    "냄비": "boiling",
    "화로": "sizzling",
    "믹싱볼": "chopping",
    "오븐": "sizzling",
    "그릴": "sizzling",
};

// ── Screen → BGM mapping ────────────────────────────────────
const SCREEN_BGM_MAP: Record<string, BgmKey> = {
    title: "title",
    upload: "title",
    confirm: "title",
    preparing: "loading",
    hint: "hint",
    cooking: "cooking",
    result: "result",
};

// ── Audio cache ─────────────────────────────────────────────
const audioCache = new Map<string, HTMLAudioElement>();

function getAudio(path: string): HTMLAudioElement {
    let audio = audioCache.get(path);
    if (!audio) {
        audio = new Audio(path);
        audioCache.set(path, audio);
    }
    return audio;
}

// ── Current BGM state ───────────────────────────────────────
let currentBgmKey: BgmKey | null = null;
let currentBgm: HTMLAudioElement | null = null;
let bgmVolume = 0.3;
let sfxVolume = 0.5;

// ── Public API ──────────────────────────────────────────────

export function setBgmVolume(vol: number) {
    bgmVolume = Math.max(0, Math.min(1, vol));
    if (currentBgm) currentBgm.volume = bgmVolume;
}

export function setSfxVolume(vol: number) {
    sfxVolume = Math.max(0, Math.min(1, vol));
}

export function playBgmForScreen(screen: string) {
    const key = SCREEN_BGM_MAP[screen];
    if (!key) return;
    if (key === currentBgmKey && currentBgm && !currentBgm.paused) return;

    // Fade out current
    if (currentBgm) {
        const prev = currentBgm;
        const fadeOut = setInterval(() => {
            if (prev.volume > 0.05) {
                prev.volume = Math.max(0, prev.volume - 0.05);
            } else {
                prev.pause();
                prev.currentTime = 0;
                clearInterval(fadeOut);
            }
        }, 50);
    }

    const path = BGM_TRACKS[key];
    const audio = getAudio(path);
    audio.loop = true;
    audio.volume = 0;
    currentBgmKey = key;
    currentBgm = audio;

    audio.play().then(() => {
        // Fade in
        const fadeIn = setInterval(() => {
            if (audio.volume < bgmVolume - 0.05) {
                audio.volume = Math.min(bgmVolume, audio.volume + 0.05);
            } else {
                audio.volume = bgmVolume;
                clearInterval(fadeIn);
            }
        }, 50);
    }).catch(() => {
        // Autoplay blocked — ignore, will retry on next user interaction
    });
}

export function stopBgm() {
    if (currentBgm) {
        currentBgm.pause();
        currentBgm.currentTime = 0;
        currentBgm = null;
        currentBgmKey = null;
    }
}

export function playSfx(key: SfxKey) {
    const path = SFX_TRACKS[key];
    // Clone so overlapping plays work
    const audio = new Audio(path);
    audio.volume = sfxVolume;
    audio.play().catch(() => { });
}

export function playSfxForTool(toolName: string) {
    const key = TOOL_SFX_MAP[toolName];
    if (key) {
        playSfx("dropSuccess");
        // Play tool-specific SFX slightly delayed
        setTimeout(() => playSfx(key), 150);
    } else {
        playSfx("dropSuccess");
    }
}

export { type BgmKey, type SfxKey };
