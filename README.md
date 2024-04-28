# SillyTavern YouTube Player

**Also check out a companion UI extension! [SillyTavern-YouTube-Videos-UI](https://github.com/SillyTavern/SillyTavern-YouTube-Videos-UI)**

Server plugin to extract a direct URL to a YouTube video using the [yt-dlp](https://github.com/yt-dlp/yt-dlp) library.

## How to use

Send a message containing a video element with the source URL pre-wrapped with `/api/plugins/youtube/play/`.

For example

```html
<video src="/api/plugins/youtube/play/https://youtu.be/zFfL0y3zyfc" autoplay controls></video>
```

## How to install

1. Before you begin, make sure you set a config `enableServerPlugins` to `true` in the config.yaml file of SillyTavern.

2. Open a terminal in your SillyTavern directory, then run the following:

```bash
cd plugins
git clone https://github.com/SillyTavern/SillyTavern-YouTube-Videos-Server
```

3. Restart the SillyTavern server. The yt-dlp binary will be automatically downloaded from GitHub when you start the first video.

## How to build

Clone the repository, then run `npm install`.

```bash
# Debug build
npm run build:dev
# Prod build
npm run build
```

## License

AGPLv3
