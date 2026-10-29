# Integrated portfolio portrait

The supplied photo was processed with the image editing tool to remove its background. The original generated PNG is retained outside the repository. A transparent 104 KB WebP is stored at assets/images/avinash-portrait.webp and copied to docs/images/avinash-portrait.webp by the build.

The hero and About introduction share the same image and CSS treatment. The desktop layout places the portrait beside the introduction. Mobile places it alongside the heading, with supporting text and actions spanning the full section width. No separate card, panel, or new portrait section was introduced.

The visual treatment uses muted colour, a bottom transparency fade, portrait-masked scanlines and brief mint glitch slices. The base face remains stationary and visible; the glitch is a decorative overlay. Reduced-motion settings disable that animation. Image dimensions reserve layout space, and decorative overlays do not intercept input. The hero loads eagerly; About loads lazily, using the same cached asset.

Validation: build succeeded; browser journey suite passed at six widths; hero and About were visually inspected at 393px and 1440px; portrait bounds were checked at 320, 393, 768 and 1440px; the image loaded at its expected width and retained alpha transparency. Focused reduced-motion and normal-motion assertions checked loading, mobile gutters and animation state. Full responsive matrix results are recorded in the delivery message.

The previous FigJam request is delivered separately under /workspace/deliverables/portfolio-flowcharts: a combined SVG, three section diagrams, DOT sources, JSON nodes/connections, a navigator and a ZIP. It describes the existing website and proposed admin/lead flows. Figma tools were unavailable, so no live FigJam board or native FigJam objects were created.

## Stronger glitch revision

Following feedback that the first treatment appeared plain, both portrait placements now use a 3.6-second cycle of clearly displaced horizontal slices and mint/cyan ghosting. The stationary base portrait remains legible. Both decorative layers disappear under reduced motion. Focused checks passed for hero and About at 320, 393, 768 and 1440 pixels in normal and reduced-motion modes, verifying image loading, animation state and no horizontal overflow. The earlier complete matrix covered the unchanged layout; this revision changes only decorative overlay timing and appearance.
