/**
 * Ad slot — reserved space for a contextual ad unit.
 *
 * Rules baked in by design:
 *  · only ever rendered in the LOWER half of the page (never above the
 *    download box or between a result and its buttons),
 *  · no pop-ups / interstitials / click traps,
 *  · subtle styling so it reads as part of the layout, not as spam.
 *
 * To go live: paste your AdSense (or other network) <script> + <ins> markup
 * inside the inner <div> below and remove the placeholder text.
 */

interface Props {
  /** Slot id — keeps multiple ads unique for the ad network. */
  slot: string;
  /** Optional label shown above the unit ("Sponsored"). */
  label?: string;
}

export default function AdSlot({ slot, label = 'Advertisement' }: Props) {
  return (
    <aside
      aria-label={label}
      data-ad-slot={slot}
      className="mx-auto w-full max-w-3xl px-4 sm:px-6"
    >
      <div className="rounded-2xl border border-dashed border-border bg-subtle/60 px-4 py-5">
        <p className="text-center text-[10px] font-medium uppercase tracking-[0.2em] text-muted">
          {label}
        </p>

        {/*
          ── Ad network markup goes here ────────────────────────────────
          Example (AdSense):

          <ins className="adsbygoogle"
               style={{ display: 'block' }}
               data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
               data-ad-slot={slot}
               data-ad-format="auto"
               data-full-width-responsive="true" />
          <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js" />
        */}
        <div className="grid min-h-[90px] place-items-center sm:min-h-[110px]">
          <p className="text-xs text-muted/70">728 × 90 · responsive ad space</p>
        </div>
      </div>
    </aside>
  );
}
