import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@gelir_giderim_remote_content_v1';
const CONTENT_URL = 'https://raw.githubusercontent.com/ataalkis/metadigital/main/gelir-giderim/content/content.json';

const EMPTY = { updatedAt: null, sponsorAreas: [], blogs: [] };

export function useRemoteContent() {
  const [content, setContent] = useState(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`${CONTENT_URL}?t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!response.ok) throw new Error('content_fetch_failed');
      const json = await response.json();
      const normalized = {
        updatedAt: json.updatedAt || null,
        sponsorAreas: Array.isArray(json.sponsorAreas) ? json.sponsorAreas : [],
        blogs: Array.isArray(json.blogs) ? json.blogs : [],
      };
      setContent(normalized);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(normalized));
    } catch (_) {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) setContent(JSON.parse(cached));
      } catch (_) {}
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) setContent(JSON.parse(cached));
      } catch (_) {}
      refresh();
    })();
  }, [refresh]);

  return { content, loading, refresh };
}

export const contentUrl = CONTENT_URL;
