/**
 * SEO landing pages — one per supported platform plus the two tool pages.
 * Each entry renders a real indexable page at `/<slug>` with its own title,
 * description, copy and JSON-LD. Edit copy here, not in the page components.
 */

export interface LandingPage {
  slug: string;
  /** Brand name used in headings, e.g. "Instagram". */
  name: string;
  /** Keyword-led <title>, e.g. "Instagram Video Downloader". */
  title: string;
  metaDescription: string;
  keywords: string[];
  /** One-line promise shown under the H1. */
  tagline: string;
  intro: string;
  steps: { title: string; description: string }[];
  faqs: { q: string; a: string }[];
  /** Bullet list of what the platform downloader handles. */
  supports: string[];
}

export const LANDING_PAGES: LandingPage[] = [
  {
    slug: '/instagram-downloader',
    name: 'Instagram',
    title: 'Instagram Video Downloader — Reels, Stories & Photos in HD',
    metaDescription:
      'Free Instagram downloader: save reels, posts, carousels, stories and IGTV videos in HD or audio-only. No login, no watermark, no app needed.',
    keywords: [
      'instagram downloader',
      'instagram reel downloader',
      'instagram story saver',
      'download instagram photo',
      'instagram video downloader online',
      'save instagram carousel',
    ],
    tagline: 'Save reels, posts, carousels and stories in one click — original quality, no watermark.',
    intro:
      'Paste any Instagram link — reel, post, carousel, story highlight or IGTV — and MediaSave Pro returns every available quality, plus an audio-only track. Nothing is stored on our side and no account is required.',
    steps: [
      { title: 'Copy the post link', description: 'Open the reel or post, tap the ⋯ menu and choose "Copy link".' },
      { title: 'Paste it in the box', description: 'Instagram is detected automatically and the media list loads in a second or two.' },
      { title: 'Download or bundle', description: 'Pick a quality and press Download, tick several items for a ZIP, or grab the audio.' },
    ],
    supports: [
      'Reels and short videos up to the highest available resolution',
      'Photo posts and multi-image carousels (whole set as a ZIP)',
      'Stories and story highlights while they are live',
      'Audio-only export in M4A or MP3',
    ],
    faqs: [
      {
        q: 'Can I download private Instagram posts?',
        a: 'No. Only publicly visible posts can be fetched. Private, close-friends and members-only content is rejected by design.',
      },
      {
        q: 'Does the downloaded reel have a watermark?',
        a: 'No. We return the original media file the platform serves, not a re-encoded screen recording, so there is no watermark and no quality loss.',
      },
      {
        q: 'How do I save an Instagram carousel?',
        a: 'Open the carousel link, tick the images you want in the results list and press "Download ZIP" to get every slide in one archive.',
      },
    ],
  },
  {
    slug: '/tiktok-downloader',
    name: 'TikTok',
    title: 'TikTok Video Downloader — Save Videos Without Watermark',
    metaDescription:
      'Free TikTok downloader: save any TikTok video without watermark in HD, or convert it to MP3. Works in the browser, no app or signup required.',
    keywords: [
      'tiktok downloader',
      'tiktok video downloader without watermark',
      'download tiktok video',
      'tiktok to mp3',
      'save tiktok video',
      'tiktok hd download',
    ],
    tagline: 'Watermark-free TikTok videos in HD, plus one-click MP3.',
    intro:
      'Paste a TikTok link and get the original video file — no watermark burned in, no compression artefacts, no app installed. TikTok photos and slideshow posts are supported too.',
    steps: [
      { title: 'Copy the TikTok link', description: 'Tap Share on the video and choose "Copy link to clipboard".' },
      { title: 'Paste and detect', description: 'The URL is recognised as TikTok instantly and the qualities load.' },
      { title: 'Save it', description: 'Download the MP4 directly, convert to MP3, or select a few clips for one ZIP.' },
    ],
    supports: [
      'Videos without the TikTok watermark, in the original resolution',
      'HD 1080p tier where the source provides it',
      'Audio-only MP3 extraction (~160 kbps)',
      'GIF conversion for short clips',
    ],
    faqs: [
      {
        q: 'Does it work for private or friends-only TikToks?',
        a: 'No. Publicly shared videos only. Anything restricted to friends or set to private cannot be downloaded.',
      },
      {
        q: 'Why is the video sometimes lower quality than in the app?',
        a: 'We serve the best quality the platform actually publishes. Some uploads only exist in 720p; the label next to each option always tells you the real resolution.',
      },
    ],
  },
  {
    slug: '/youtube-downloader',
    name: 'YouTube',
    title: 'YouTube Video Downloader — MP4, MP3 & HD Online',
    metaDescription:
      'Free YouTube video downloader: save Shorts and videos in 480p, 720p or 1080p MP4, merge audio automatically and convert to MP3. No extension needed.',
    keywords: [
      'youtube video downloader',
      'youtube downloader online',
      'youtube to mp3',
      'download youtube shorts',
      'youtube mp4 downloader',
      'save youtube video',
    ],
    tagline: 'Shorts and videos in 480p / 720p / 1080p, audio merged automatically.',
    intro:
      'YouTube streams video and audio as separate DASH tracks, which is why most downloaders give you a silent file. MediaSave Pro grabs both tracks in parallel and merges them into a normal MP4 with sound.',
    steps: [
      { title: 'Copy the video link', description: 'Press the YouTube share button and copy the URL — Shorts work too.' },
      { title: 'Paste it here', description: 'YouTube is detected automatically, including youtu.be and m.youtube.com links.' },
      { title: 'Download', description: 'Choose a quality. High tiers are merged server-side; audio-only is one click away.' },
    ],
    supports: [
      'Normal (≈480p), High (≈720p) and Original (best available) tiers',
      'Automatic video + audio merge for DASH-only streams',
      'Audio-only export in M4A or MP3',
      'Playlists are detected and reported instead of silently failing',
    ],
    faqs: [
      {
        q: 'Why does YouTube need ffmpeg or a JavaScript runtime?',
        a: 'Recent YouTube streams are protected by a JavaScript challenge and split into separate audio and video tracks. ffmpeg merges them and Deno solves the challenge — both are handled automatically.',
      },
      {
        q: 'Can I download an entire playlist?',
        a: 'Not in one go. Playlists are intentionally rejected so a single request cannot hammer the server; download the videos you need individually or select several results for a ZIP.',
      },
    ],
  },
  {
    slug: '/facebook-downloader',
    name: 'Facebook',
    title: 'Facebook Video Downloader — Reels & Watch Videos in HD',
    metaDescription:
      'Free Facebook video downloader for public reels and videos, including fb.watch links. Save in HD, as audio, or as a ZIP. No login required.',
    keywords: [
      'facebook video downloader',
      'facebook reel downloader',
      'fb watch download',
      'download facebook video hd',
      'facebook video downloader online',
    ],
    tagline: 'Public Facebook reels and videos, including fb.watch short links.',
    intro:
      'Drop in a facebook.com or fb.watch link and get the video file straight away — including audio-only MP3 if you only need the sound.',
    steps: [
      { title: 'Copy the link', description: 'Open the video or reel, tap Share and copy the link (fb.watch also works).' },
      { title: 'Paste it here', description: 'Facebook is detected and the available formats load instantly.' },
      { title: 'Save it', description: 'Download in HD, convert to MP3, or batch several videos into a ZIP.' },
    ],
    supports: [
      'Public videos and reels (facebook.com and fb.watch)',
      'HD and standard quality tiers',
      'Audio-only MP3 export',
      'Batch ZIP downloads',
    ],
    faqs: [
      {
        q: 'Can I download from private Facebook groups?',
        a: 'No. Only content that is publicly visible can be fetched, including friends-only and group-only posts are rejected.',
      },
      {
        q: 'Why did my fb.watch link fail?',
        a: 'The video may have been deleted or made private after you copied the link. Try copying the link again from the video itself.',
      },
    ],
  },
  {
    slug: '/twitter-downloader',
    name: 'X (Twitter)',
    title: 'X (Twitter) Video Downloader — Save Videos & GIFs Online',
    metaDescription:
      'Free X / Twitter video downloader: save videos and GIFs in HD from any public post. Works with x.com and t.co links, no signup needed.',
    keywords: [
      'twitter video downloader',
      'x video downloader',
      'download twitter gif',
      't.co video download',
      'twitter mp4 downloader',
    ],
    tagline: 'Save videos and GIFs from any public post on X.',
    intro:
      'Paste an x.com, twitter.com or t.co link and the video or GIF is returned in the best available quality, ready to download or convert to audio.',
    steps: [
      { title: 'Copy the post link', description: 'Tap Share on the post and choose "Copy link" — x.com and t.co both work.' },
      { title: 'Paste it here', description: 'The platform is detected automatically and the formats load.' },
      { title: 'Download', description: 'Save the MP4, take the audio track, or pick several posts for a ZIP.' },
    ],
    supports: [
      'Videos posted in the feed, in replies and in threads',
      'GIFs saved as MP4',
      'HD quality selection',
      'Audio-only export',
    ],
    faqs: [
      {
        q: 'Why does t.co short link sometimes fail?',
        a: 't.co links only redirect while the post is public. If the account is protected, the redirect no longer resolves to a video.',
      },
    ],
  },
  {
    slug: '/threads-downloader',
    name: 'Threads',
    title: 'Threads Video Downloader — Save Posts, Videos & Photos',
    metaDescription:
      'Free Threads downloader: save videos and photos from public Threads posts in HD, or grab the audio. No app, no signup, no watermark.',
    keywords: [
      'threads downloader',
      'threads video downloader',
      'download threads post',
      'save threads photo',
    ],
    tagline: 'Videos and photos from public Threads posts, no watermark.',
    intro:
      'Threads posts are downloaded exactly like any other supported link — paste the URL and the media appears with its available qualities.',
    steps: [
      { title: 'Copy the post link', description: 'Open the post, tap the ⋯ menu and copy the link.' },
      { title: 'Paste it here', description: 'Threads is detected automatically.' },
      { title: 'Download', description: 'Save the video or photos, or bundle several items as a ZIP.' },
    ],
    supports: ['Videos in available qualities', 'Single photos', 'Carousel posts as a ZIP', 'Audio-only export'],
    faqs: [
      {
        q: 'Does this work for private Threads accounts?',
        a: 'Only public posts can be downloaded. Followers-only threads are rejected.',
      },
    ],
  },
  {
    slug: '/pinterest-downloader',
    name: 'Pinterest',
    title: 'Pinterest Video Downloader — Save Video Pins & Idea Pins',
    metaDescription:
      'Free Pinterest downloader for video pins and Idea Pins in HD, plus audio export and ZIP bundles. Paste a pin link and download instantly.',
    keywords: [
      'pinterest video downloader',
      'pinterest downloader',
      'download pinterest video',
      'save video pin',
      'pinterest idea pin downloader',
    ],
    tagline: 'Video pins and Idea Pins in HD, straight from the link.',
    intro:
      'Paste a pin URL (including pin.it short links) to download the video behind it, or save the images from a carousel pin.',
    steps: [
      { title: 'Copy the pin link', description: 'Tap the ⋯ menu on the pin and copy its link — pin.it also works.' },
      { title: 'Paste it here', description: 'Pinterest is detected automatically and the media loads.' },
      { title: 'Download', description: 'Save the video, extract the audio, or select several pins for a ZIP.' },
    ],
    supports: ['Video pins', 'Idea Pin videos', 'Carousel pin images as a ZIP', 'Audio-only export'],
    faqs: [
      {
        q: 'Why does my pin say "unsupported"?',
        a: 'Most pins are static images, not video. Only pins that actually contain a video can be downloaded.',
      },
    ],
  },
  {
    slug: '/video-to-gif',
    name: 'Video to GIF',
    title: 'Video to GIF Converter — Make a GIF Online, Free',
    metaDescription:
      'Free online video to GIF converter. Turn any downloaded clip into a GIF in seconds — no Photoshop, no app, no watermark added.',
    keywords: [
      'video to gif converter',
      'gif converter online',
      'turn video into gif',
      'free gif maker',
      'video to gif no watermark',
    ],
    tagline: 'Any short clip → a shareable GIF, in seconds.',
    intro:
      'Every video result has a "GIF" button. The server converts the clip with ffmpeg, optimises the palette so colours stay clean, and hands you the file — nothing is uploaded to a third-party site.',
    steps: [
      { title: 'Download a clip first', description: 'Paste any supported link and pick a quality, or use a file you already have.' },
      { title: 'Press "GIF"', description: 'The conversion runs server-side; clips up to 30 seconds are supported.' },
      { title: 'Share it', description: 'Download the GIF and drop it straight into a chat, forum or story.' },
    ],
    supports: ['Clips up to 30 seconds', 'Smooth scaling (Lanczos)', 'Optimised 128-colour palette', 'No watermark, no signup'],
    faqs: [
      {
        q: 'Why is my GIF larger than the MP4?',
        a: 'GIF only supports 256 colours and no audio, so the same clip is always bigger as a GIF. Shorter clips and lower frame rates shrink it a lot.',
      },
      {
        q: 'Do you store my videos?',
        a: 'No. Files stream from the platform to you, and any temporary conversion file is deleted immediately after the response.',
      },
    ],
  },
  {
    slug: '/audio-extractor',
    name: 'Audio Extractor',
    title: 'Audio Extractor — Pull the Soundtrack Out of Any Video',
    metaDescription:
      'Free audio extractor: convert social media videos to MP3 or M4A online. Extract the soundtrack from any reel or clip, no app required.',
    keywords: [
      'audio extractor',
      'video to mp3 converter',
      'extract audio from video',
      'video to m4a',
      'mp3 converter online',
    ],
    tagline: 'Pull the soundtrack out of any clip as MP3 or M4A.',
    intro:
      'Videos are often the only place a track is available. The "Audio-only" row on every result extracts the sound as M4A, and the MP3 converter re-encodes it to a compact 160 kbps MP3.',
    steps: [
      { title: 'Paste the link', description: 'Any supported post works — reel, reel video, Facebook or X video.' },
      { title: 'Choose Audio', description: 'Use the "Audio-only" quick action, or the audio row under the quality options.' },
      { title: 'Download the audio', description: 'Save the M4A directly, or press "MP3" for a universal MP3.' },
    ],
    supports: ['M4A extraction straight from the source', 'MP3 re-encode at ~160 kbps', 'Works for every supported platform', 'No app, no signup'],
    faqs: [
      {
        q: 'Is extracting audio allowed?',
        a: 'Only for personal use and content you have the right to use. Do not redistribute copyrighted music commercially.',
      },
      {
        q: 'Why is the MP3 smaller than the M4A?',
        a: 'The M4A is the original audio track; the MP3 is re-encoded at a fixed bitrate so it plays everywhere, including older players and editors.',
      },
    ],
  },
];

export function getLandingPage(slug: string) {
  return LANDING_PAGES.find((page) => page.slug === slug);
}