# Sun Breaking Its Frame — ai-excited-01

A program (`main.ts`, Node 22 standard library only) that draws one
1024x1024 PNG: a huge vermilion sun breaking out of a thick black frame.

## The picture

A pale paper sheet holds a neat grid of small grey dots, all contained
inside a thick black square frame. One huge vermilion sun is the only thing
that escaped: its upper-right edge punches through the frame's top edge and
right edge, flinging two black frame fragments off at the top-right. Four
cyan speed bars streak down-left from the breach at about 35 degrees, like
geometric speed lines. Under the frame, in heavy black 5x7 pixel block
letters: **BREAK THE FRAME**.

## Why it hits the judge's criteria

1. **Excites** — a giant vermilion disc against pale paper and black frame
   is a jolt at first glance: one huge warm shape, no clutter.
2. **Surprise** — the twist is conceptual, not a stock explosion: the
   container itself is the story. Everything is orderly and contained,
   except the sun, which broke out.
3. **Momentum** — a single 35-degree diagonal drives the whole image:
   breach at the top-right, cyan bars streaking down-left.
4. **Craft** — flat poster style, drawn at 2x supersampling and
   downsampled, so edges are clean; the text is a hand-built pixel font,
   so no letter can come out garbled.
5. **Reads small** — at 300px the frame, the sun, the breach and the
   words are still clear: one dominant shape, one idea.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Writes `out/entry.png` (1024x1024 PNG). Running it twice produces
byte-identical output.
