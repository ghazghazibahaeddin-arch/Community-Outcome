import type { MetadataRoute } from 'next';
import { getVerifiedAppUrl } from '@/lib/services/securityConfig';
import { dbOperations, ensureDatabaseHydrated, getDatabase } from '@/lib/db/store';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getVerifiedAppUrl();
  const now = new Date();

  try {
    await ensureDatabaseHydrated();
  } catch (err) {
    console.warn('[sitemap] Database hydration warning:', err);
  }

  const db = getDatabase();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/auth/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/auth/signup`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 }
  ];

  const publicLinkRoutes: MetadataRoute.Sitemap = (db.links || [])
    .filter((l) => !l.isRevoked && l.audience === 'public')
    .slice(0, 50)
    .map((l) => ({
      url: `${baseUrl}/l/${encodeURIComponent(l.slug)}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8
    }));

  const publicPassportRoutes: MetadataRoute.Sitemap = dbOperations
    .getUsers()
    .filter((u) => u.passport?.isPublic && u.privacy?.allowDiscovery !== false)
    .slice(0, 50)
    .map((u) => ({
      url: `${baseUrl}/p/${encodeURIComponent(u.id)}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6
    }));

  return [...staticRoutes, ...publicLinkRoutes, ...publicPassportRoutes];
}
