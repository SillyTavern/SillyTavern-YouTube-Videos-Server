import { Router } from 'express';
import { Chalk } from 'chalk';
import YTDlpWrap from 'yt-dlp-wrap';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

interface PluginInfo {
    id: string;
    name: string;
    description: string;
}

interface Plugin {
    init: (router: Router) => Promise<void>;
    exit: () => Promise<void>;
    info: PluginInfo;
}

interface VideoInfo {
    id: string;
    title: string;
    url: string;
    thumbnail: string;
    duration: number;
    description: string;
    uploader: string;
    view_count: number;
    upload_date: string;
}

const chalk = new Chalk();
const MODULE_NAME = '[SillyTavern-YouTube-Videos-Server]';
const INFO_CACHE = new Map<string, VideoInfo>();
const PENDING_REQUESTS = new Map<string, Promise<VideoInfo>>();

/**
 * Get the YouTube video ID from a YouTube URL.
 * @param url YouTube URL
 * @returns YouTube video ID or null
 */
function getYouTubeId(url: string): string | null {
    let regex = /(http:\/\/|https:\/\/)?(youtu.*be.*)\/(watch\?v=|embed\/|v|shorts|)(.*?((?=[&#?])|$))/gm;
    let match = regex.exec(url);
    if (match) {
        return match[4];
    }
    return null;
}

async function getYoutubeVideoUrl(url: string): Promise<string> {
    const videoInfo = await getVideoInfo(url);
    const videoUrl = videoInfo?.url;

    if (!videoUrl) {
        throw new Error('Failed to get video URL');
    }

    console.log(chalk.green(MODULE_NAME), 'Video URL:', videoUrl);
    return videoUrl;
}

async function getVideoInfo(url: string): Promise<VideoInfo> {
    const videoId = getYouTubeId(url);
	
    // Use videoId as cache key when available, otherwise fall back to URL
    const cacheKey = videoId || url;

    // Check cache first
    if (INFO_CACHE.has(cacheKey)) {
        const cachedInfo = INFO_CACHE.get(cacheKey);
        if (cachedInfo) {
            console.log(chalk.green(MODULE_NAME), 'Using cached info for:', cacheKey);
            return cachedInfo;
        }
    }

    // Check if we already have a pending request for this URL
    if (PENDING_REQUESTS.has(cacheKey)) {
        console.log(chalk.yellow(MODULE_NAME), 'Info request already in progress for:', url);
        return PENDING_REQUESTS.get(cacheKey)!;
    }

    if (!videoId) {
        console.warn(chalk.yellow(MODULE_NAME), 'Unrecognized URL format. It might not be a YouTube video.', url);
    }

    // Create a new promise for this request
    const promise = (async () => {
        try {
            console.log(chalk.green(MODULE_NAME), 'Getting YouTube video:', videoId);
            const fileName = 'yt-dlp' + (os.platform() === 'win32' ? '.exe' : '');
            const filePath = path.join(__dirname, fileName);
            if (!fs.existsSync(filePath)) {
                console.log(chalk.green(MODULE_NAME), 'Downloading yt-dlp');
                await YTDlpWrap.downloadFromGithub(filePath);
            }
            const ytDlpWrap = new YTDlpWrap(filePath);
            const videoInfo = await ytDlpWrap.getVideoInfo(url);
            INFO_CACHE.set(cacheKey, videoInfo);
            return videoInfo;
        } finally {
            // Clean up the pending request after completion
            setTimeout(() => {
                PENDING_REQUESTS.delete(cacheKey);
            }, 1000); // Keep it for 1 second to handle rapid re-requests
        }
    })();

    PENDING_REQUESTS.set(cacheKey, promise);
    return promise;
}

/**
 * Initialize the plugin.
 * @param router Express Router
 */
export async function init(router: Router): Promise<void> {
    router.post('/probe', (_req, res) => {
        return res.sendStatus(204);
    });
    router.get('/play/:url(*)', async (req, res) => {
        try {
            if (!req.query.url && !req.params.url) {
                return res.status(400).send('Bad Request');
            }
            const url = (req.params.url || req.query.url) as string;
            const videoUrl = await getYoutubeVideoUrl(url);
            return res.location(videoUrl).sendStatus(302);
        } catch (error) {
            console.error(chalk.red(MODULE_NAME), 'Download failed', error);
            return res.status(500).send('Internal Server Error');
        }
    });
    router.get('/info/:url(*)', async (req, res) => {
        try {
            if (!req.query.url && !req.params.url) {
                return res.status(400).send('Bad Request');
            }
            const url = (req.params.url || req.query.url) as string;
            const videoInfo = await getVideoInfo(url);
            return res.send(videoInfo);
        } catch (error) {
            console.error(chalk.red(MODULE_NAME), 'Download failed', error);
            return res.status(500).send('Internal Server Error');
        }
    });

    console.log(chalk.green(MODULE_NAME), 'Plugin loaded!');
}

export async function exit(): Promise<void> {
    console.log(chalk.yellow(MODULE_NAME), 'Plugin exited');
}

export const info: PluginInfo = {
    id: 'youtube',
    name: 'YouTube Videos',
    description: 'Extract a direct video URL to a YouTube video.',
};

const plugin: Plugin = {
    init,
    exit,
    info,
};

export default plugin;
