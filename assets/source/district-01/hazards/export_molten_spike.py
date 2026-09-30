"""Package the selected generated artwork as a centered transparent runtime PNG."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[4]
SOURCE = Path(__file__).with_name("molten-spike-A-gpt-image.png")
TARGET = ROOT / "public/assets/m6/molten-spike-trial.png"


def main() -> None:
    source = Image.open(SOURCE).convert("RGBA")
    opaque_enough = source.getchannel("A").point(
        lambda alpha: 255 if alpha > 24 else 0
    )
    bounds = opaque_enough.getbbox()
    if bounds is None:
        raise ValueError("The source artwork has no visible subject")

    artwork = source.crop(bounds)
    artwork.thumbnail((224, 224), Image.Resampling.NEAREST)
    canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    canvas.alpha_composite(
        artwork, ((256 - artwork.width) // 2, (256 - artwork.height) // 2)
    )
    canvas.save(TARGET, optimize=True)


if __name__ == "__main__":
    main()
