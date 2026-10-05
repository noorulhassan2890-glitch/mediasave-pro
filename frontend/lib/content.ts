/**
 * Static page content (How-to steps + FAQ) — kept separate from components
 * so copy is easy to edit in one place.
 */

export interface FaqItem {
  q: string;
  a: string;
}

export const FAQS: FaqItem[] = [
  {
    q: 'Which platforms are supported?',
    a: 'YouTube, Instagram (posts, reels, carousels, stories), TikTok, Facebook (videos, reels, stories), X / Twitter (videos, photos, GIFs), Threads, and Pinterest (videos and Idea Pins).',
  },
  {
    q: 'Do I need to create an account or log in?',
    a: 'No. MediaSave Pro is completely anonymous — no signup, no login, no email. Paste a link and download.',
  },
  {
    q: 'Is it free? What is the catch?',
    a: 'The downloader is free for personal use. The page shows a few tasteful ads in the lower sections, which keep the servers running. There are no pop-ups, fake download buttons, or forced redirects.',
  },
  {
    q: 'Why is a file size shown as an estimate (~)?',
    a: 'Some CDNs do not report a file size before the download starts. In that case we estimate the size from the video duration and bitrate, and we mark it with a "~".',
  },
  {
    q: 'The download says "private content". What now?',
    a: 'Private, members-only, or age-restricted posts cannot be downloaded — only publicly visible content is supported. If the post is public but still fails, it may be region-blocked for the server.',
  },
  {
    q: 'Where are my downloads stored?',
    a: 'Files go straight from the source to your device. Your recent downloads list lives only in your browser (localStorage) and is never sent anywhere.',
  },
  {
    q: 'Can I download several files at once?',
    a: 'Yes. Tick the checkboxes next to the quality options or carousel images and press "Download ZIP" — everything arrives in one archive.',
  },
  {
    q: 'How does the GIF converter work?',
    a: 'Short clips (up to 30 seconds) are converted server-side with ffmpeg. Pick "GIF" on any video result and the file is prepared for you automatically.',
  },
];

export const HOW_TO_STEPS = [
  {
    step: '01',
    title: 'Copy the link',
    description:
      'On Instagram, TikTok, Facebook, X, Threads or Pinterest, tap Share (⋯) and choose "Copy link".',
  },
  {
    step: '02',
    title: 'Paste it here',
    description:
      'Drop the URL into the box above. The platform is detected automatically and a preview appears.',
  },
  {
    step: '03',
    title: 'Pick a quality',
    description:
      'Choose Normal, High or Original — with the estimated size next to each — then press Download. Audio-only, GIF and ZIP are one click away.',
  },
];

export const TOOLS = [
  {
    title: 'Instagram Downloader',
    description: 'Reels, photos, carousels, stories and profile videos in original quality.',
    href: '/instagram-downloader',
  },
  {
    title: 'TikTok Downloader',
    description: 'Watermark-free MP4 videos plus audio-only MP3 extraction.',
    href: '/tiktok-downloader',
  },
  {
    title: 'YouTube Downloader',
    description: 'Videos and Shorts in 480p–1080p with audio merged automatically.',
    href: '/youtube-downloader',
  },
  {
    title: 'Video to GIF',
    description: 'Turn any short clip into a lightweight GIF without installing software.',
    href: '/video-to-gif',
  },
  {
    title: 'Audio Extractor',
    description: 'Pull the soundtrack out of any supported post as M4A or MP3.',
    href: '/audio-extractor',
  },
  {
    title: 'Facebook Downloader',
    description: 'Public videos and reels, including fb.watch short links.',
    href: '/facebook-downloader',
  },
  {
    title: 'X (Twitter) Downloader',
    description: 'Save videos and GIFs from any public post, even inside threads.',
    href: '/twitter-downloader',
  },
  {
    title: 'Threads Downloader',
    description: 'Videos and photos from public Threads posts, no watermark.',
    href: '/threads-downloader',
  },
  {
    title: 'Pinterest Downloader',
    description: 'Video pins and Idea Pins in HD, straight from the link.',
    href: '/pinterest-downloader',
  },
];
