/** Defaults used when a key has never been saved by the admin. */

export const DEFAULT_SETTINGS = {
  siteTitle: 'Our Little Dream',
  welcomeKicker: '20 · 10',
  welcomeTitle: 'Welcome to Our Little Dream',
  welcomeSubtitle:
    'Một thành phố rất lớn, nhưng trong giấc mơ của anh, điều đẹp nhất vẫn là được ngồi cạnh em.',
  welcomeButton: 'Enter',
  introLine: 'Có một con đường hoa anh đào, chỉ dành cho hai đứa mình.',
  letter:
    'Giấc mơ có thể kết thúc, nhưng câu chuyện của chúng mình thì vẫn còn tiếp tục. Chúc mừng 20/10, tình yêu của anh.',
  dreamHint: 'Click to enter our dream',
  wakeLabel: 'Wake up together',
  specialDate: '2026-10-20',
  defaultCamera: 'overview',
  musicDefaultId: 'ambient',
  musicVolume: 0.55,
  petalIntensity: 1,
  lightIntensity: 1,
  rain: false,
  fog: true,
  bloom: true,
  npcEnabled: true,
  npcCouples: 4,
  npcSpeed: 1,
  npcBehavior: 'wander',
}

/** Editable in /admin — seeded once so the site never opens empty. */
export const SEED_MEMORIES = [
  {
    title: 'Lần đầu tiên chúng mình đi cùng một con đường',
    body:
      'Anh vẫn nhớ hôm đó trời se lạnh, em mặc chiếc áo màu kem và đi chậm hơn anh một chút.\n\nAnh đã giả vờ bận ngắm hàng cây, chỉ để được bước chậm lại và đi cạnh em lâu hơn một chút nữa.',
    date: '2024-11-03',
    palette: 0,
  },
  {
    title: 'Những đêm mưa và một chiếc ô',
    body:
      'Mưa Sài Gòn đến nhanh và đi cũng nhanh, nhưng anh thì không muốn đi đâu cả khi em còn đứng đó.\n\nChiếc ô hơi nhỏ, vai anh ướt một nửa. Đổi lại, em cười.',
    date: '2025-06-18',
    palette: 1,
  },
  {
    title: '20/10 — điều anh muốn nói',
    body:
      'Anh không giỏi nói mấy lời hoa mỹ. Nên anh dựng cả một thành phố nhỏ, trồng cả một con đường hoa, chỉ để nói một câu thôi.\n\nCảm ơn em vì đã ở đây, cùng anh, qua tất cả những ngày bình thường nhất.',
    date: '2026-10-20',
    palette: 2,
  },
]
