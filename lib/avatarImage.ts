// lib/avatarImage.ts
// 프로필 사진: 브라우저에서 256x256 정사각형(가운데 기준)으로 줄여 JPEG 글자열(data URL)로 만듭니다.
// 별도 저장소 설정 없이 DB에 바로 저장할 수 있도록 용량(약 10~30KB)을 작게 유지합니다.

export const AVATAR_PREFIX = "data:image/jpeg;base64,"
export const AVATAR_MAX_LENGTH = 80_000

export async function fileToAvatarDataUrl(file: File, size = 256): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("이미지 파일만 올릴 수 있어요.")
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("이 기기에서는 사진을 처리할 수 없어요.")
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  bitmap.close()
  let quality = 0.85
  let url = canvas.toDataURL("image/jpeg", quality)
  while (url.length > AVATAR_MAX_LENGTH && quality > 0.4) {
    quality -= 0.15
    url = canvas.toDataURL("image/jpeg", quality)
  }
  if (url.length > AVATAR_MAX_LENGTH) throw new Error("사진 용량이 너무 커요. 다른 사진을 골라 주세요.")
  return url
}
