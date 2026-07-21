export function getSiteUrl(fallbackOrigin: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || fallbackOrigin;

  return siteUrl.replace(/\/+$/, '');
}
