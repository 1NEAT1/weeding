const SITE_ORIGIN = 'https://alexandr-and-alina.ru';
const OG_IMAGE_PATH = '/assets/images/preview_2026.jpg';
const OG_IMAGE_TYPE = 'image/jpeg';
const OG_IMAGE_WIDTH = '1200';
const OG_IMAGE_HEIGHT = '630';
const OG_TITLE = 'A | A 11.09.26';
const OG_DESCRIPTION = 'Приглашение на свадьбу Александра и Алины — 11.09.2026';

/** Пути персональных ссылок (совпадают с ключами GUEST_BY_PATH). */
const GUEST_PATHS = [
  'semen-anastasia',
  'dmitry-alexandra',
  'sergey-anna',
  'maxim-anastasia',
  'dmitry-marusya',
  'vitaly-elizaveta',
  'dmitry-alina',
  'igor-darya',
  'german-elizaveta',
  'irina-evgeny',
  'family',
  'nadezhda',
  'zahar',
  'alexandr',
  'anton',
  'natalya',
];

function getPageMeta(slug = '') {
  const normalizedSlug = String(slug).replace(/^\/+|\/+$/g, '');
  const pageUrl = normalizedSlug
    ? `${SITE_ORIGIN}/${normalizedSlug}/`
    : `${SITE_ORIGIN}/`;
  const ogImage = `${SITE_ORIGIN}${OG_IMAGE_PATH}`;

  return {
    pageUrl,
    ogImage,
    ogTitle: OG_TITLE,
    ogDescription: OG_DESCRIPTION,
    ogImageType: OG_IMAGE_TYPE,
    ogImageWidth: OG_IMAGE_WIDTH,
    ogImageHeight: OG_IMAGE_HEIGHT,
  };
}

module.exports = {
  SITE_ORIGIN,
  OG_IMAGE_PATH,
  GUEST_PATHS,
  getPageMeta,
};
