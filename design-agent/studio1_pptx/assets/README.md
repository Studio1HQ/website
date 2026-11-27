# Picture assets

The only pictures in the deck. Rebuild them when the brand pack changes. Run from the repo root,
with `S` set to a scratch folder and the sandbox image built (`uv run design-agent sandbox build`).

```bash
S=/tmp/pptx-assets; mkdir -p $S/out/renders
run() { docker run --rm --network=none --user="$(id -u):$(id -g)" --env=HOME=/tmp --workdir=/workspace \
  --volume "$PWD/workspace/tools:/workspace/tools:ro" --volume "$PWD/workspace/brand:/workspace/brand:ro" \
  --volume "$PWD/fonts:/workspace/fonts:ro" --volume "$S/out:/workspace/out" design-agent-sandbox:local bash -c "$1"; }
```

## sunrise-1920x1080.png

`$S/out/sunrise.html`: `<link rel=stylesheet href="/workspace/brand/sunrise-panel.css">` and
`<div class="s1-sunrise" style="width:1920px;height:1080px"></div>`, body margin 0.

```bash
run 'node tools/html2png.mjs out/sunrise.html --out out/renders --name sunrise --size 1920x1080 --brand-fonts'
uv run python -c "from PIL import Image; Image.open('$S/out/renders/sunrise-1920x1080.png').convert('RGB').save('studio1_pptx/assets/sunrise-1920x1080.png', optimize=True)"
```

## grain-1920x1080.png

Paper `#f4efe7` with `grain.svg` multiplied at 30% (graphic-language.md), as one flat picture.
`$S/out/grain.html`: a 1920x1080 `div` with that background and an `::after` that sets
`background: url("/workspace/brand/grain.svg")`, `mix-blend-mode: multiply`, `opacity: 0.3`.

```bash
run 'node tools/html2png.mjs out/grain.html --out out/renders --name grain --size 1920x1080 --brand-fonts'
uv run python -c "from PIL import Image; Image.open('$S/out/renders/grain-1920x1080.png').convert('RGB').save('studio1_pptx/assets/grain-1920x1080.png', optimize=True)"
```

## logo-on-light.png and logo-on-dark.png

`html2png.mjs` cannot write transparency. Each logo is rendered twice, on pure white and on pure
black, at 1338x320 (twice the SVG size), and `make_logo_alpha.py` turns the pair into one
transparent PNG. Page: body margin 0 and background `white` or `black`, one
`<img src="/workspace/brand/logos/studio1-logo-on-<light|dark>.svg" style="width:1338px;height:320px">`.
Name the pages `logo-<light|dark>-<white|black>.html`.

```bash
for v in light dark; do for g in white black; do
  run "node tools/html2png.mjs out/logo-$v-$g.html --out out/renders --name logo-$v-$g --size 1338x320 --brand-fonts"
done; done
for v in light dark; do
  uv run python studio1_pptx/assets/make_logo_alpha.py \
    $S/out/renders/logo-$v-white-1338x320.png $S/out/renders/logo-$v-black-1338x320.png \
    studio1_pptx/assets/logo-on-$v.png
done
```
