from io import BytesIO

from PIL import Image, UnidentifiedImageError

AVATAR_FORMATS = {
    "image/png": "PNG",
    "image/jpeg": "JPEG",
    "image/gif": "GIF",
    "image/webp": "WEBP",
}
AVATAR_MAX_DIMENSION = 4096


def validate_avatar(content_type: str, data: bytes) -> str | None:
    expected_format = AVATAR_FORMATS.get(content_type)
    if expected_format is None:
        return "Escolha uma imagem PNG, JPEG, GIF ou WebP."
    try:
        with Image.open(BytesIO(data), formats=[expected_format]) as image:
            if max(image.size) > AVATAR_MAX_DIMENSION:
                return "A imagem deve ter no máximo 4096 × 4096 pixels."
            image.verify()
        # verify() checks the structure; load() also checks the compressed pixels.
        with Image.open(BytesIO(data), formats=[expected_format]) as image:
            image.load()
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError,
            Image.DecompressionBombError):
        return "O arquivo não é uma imagem válida ou está corrompido."
    return None
