# Integrated animated portrait

The supplied photo was processed with the image editing tool to remove its background. Its transparent WebP remains at assets/images/avinash-portrait.webp. The hero and About introduction now use an actual animated GIF at assets/images/avinash-portrait-glitch.gif, rather than CSS glitch overlays.

The GIF has 20 frames with 150ms delays: a 2.25-second normal-photo hold followed by a 0.75-second mint/cyan glitch burst, looping continuously. Its 480 × 639 pixel canvas preserves the original portrait proportions. The optimized file is about 228 KiB. GIF supports a transparent palette entry rather than partial alpha; the existing CSS bottom fade blends the rendered portrait into the website background.

A picture element selects the static WebP for prefers-reduced-motion: reduce. Normal-motion browsers load the GIF directly. Both assets are copied into docs/images by the build. The same cached animation is reused across hero and About. No JavaScript animation library or CSS glitch simulation is required for playback.

The layout remains integrated into the existing introduction: portrait beside copy on desktop, alongside the heading on mobile, with full-width supporting text and actions. The image reserves its aspect ratio; the hero loads eagerly and About lazily.

Validation: build and diff checks passed. Focused browser checks passed for both routes at 320, 393, 768 and 1440 pixels in normal/reduced-motion modes, checking the actual selected image source, successful image loading and horizontal overflow. Native browser screenshots over a complete loop produced three visibly distinct samples, confirming actual GIF playback. ImageMagick confirmed 20 frames, a looping GIF and five distinct coalesced image states. The earlier full responsive matrix passed at 13 viewport configurations × 15 routes; this revision replaces image playback while retaining that layout.

Reference consulted: MDN image formats, GIF section, https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types#gif_graphics_interchange_format (via its public content repository).

The earlier FigJam request remains separate under /workspace/deliverables/portfolio-flowcharts. No live FigJam board was created because Figma tools were unavailable.
