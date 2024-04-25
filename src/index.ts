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

const chalk = new Chalk();
const MODULE_NAME = '[SillyTavern-YouTube-Player]';

async function getYoutubeVideoUrl(url: string): Promise<string> {
    console.log(chalk.green(MODULE_NAME), 'Getting YouTube video:', url);
    const fileName = 'yt-dlp' + (os.platform() === 'win32' ? '.exe' : '');
    const filePath = path.join(__dirname, fileName);
    if (!fs.existsSync(filePath)) {
        console.log(chalk.green(MODULE_NAME), 'Downloading yt-dlp');
        await YTDlpWrap.downloadFromGithub(filePath);
    }
    const ytDlpWrap = new YTDlpWrap(filePath);
    const videoInfo = await ytDlpWrap.getVideoInfo(url);
    const videoUrl = videoInfo?.url;

    if (!videoUrl) {
        throw new Error('Failed to get video URL');
    }

    console.log(chalk.green(MODULE_NAME), 'Video URL:', videoUrl);
    return videoUrl;
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

    console.log(chalk.green(MODULE_NAME), 'Plugin loaded!');
}

export async function exit(): Promise<void> {
    console.log(chalk.yellow(MODULE_NAME), 'Plugin exited');
}

export const info: PluginInfo = {
    id: 'youtube',
    name: 'YouTube Player',
    description: 'Extract a direct video URL to a YouTube video.',
};

const plugin: Plugin = {
    init,
    exit,
    info,
};

export default plugin;
