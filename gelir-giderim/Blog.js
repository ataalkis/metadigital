import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import SponsorAreas from './SponsorAreas';

const C = {
  card: '#141B2D', card2: '#101726', border: '#263149', text: '#F5F7FB', muted: '#95A2B8', accent: '#6EA8FE',
};

const prettyDate = (iso) => {
  const [y, m, d] = String(iso || '').split('-');
  return y && m && d ? `${d}.${m}.${y}` : iso;
};

export default function Blog({ content, initialBlogId, onClearInitial }) {
  const blogs = useMemo(() => (content?.blogs || [])
    .filter((b) => b?.active !== false)
    .sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || ''))), [content]);
  const [selectedId, setSelectedId] = useState(initialBlogId || null);

  useEffect(() => {
    if (initialBlogId) setSelectedId(initialBlogId);
  }, [initialBlogId]);

  const selected = blogs.find((x) => x.id === selectedId) || null;

  if (selected) {
    return <View style={s.wrap}>
      <Pressable onPress={() => { setSelectedId(null); onClearInitial?.(); }}><Text style={s.back}>‹ Bloglara dön</Text></Pressable>
      {!!selected.coverImageUrl && <Image source={{ uri: selected.coverImageUrl }} style={s.hero} resizeMode="cover" />}
      <Text style={s.date}>{prettyDate(selected.publishedAt)}</Text>
      <Text style={s.title}>{selected.title}</Text>
      {!!selected.excerpt && <Text style={s.excerpt}>{selected.excerpt}</Text>}
      <SponsorAreas areas={content?.sponsorAreas || []} placement="blog_top" />
      <View style={s.article}>
        {String(selected.body || '').split(/\n\n+/).filter(Boolean).map((p, i) => <Text key={i} style={s.paragraph}>{p}</Text>)}
      </View>
      <SponsorAreas areas={content?.sponsorAreas || []} placement="blog_bottom" />
    </View>;
  }

  return <View style={s.wrap}>
    <View><Text style={s.pageTitle}>Blog</Text><Text style={s.subtitle}>Bütçe, ödeme ve kişisel finans notları.</Text></View>
    <SponsorAreas areas={content?.sponsorAreas || []} placement="blog_top" />
    {!blogs.length ? <View style={s.empty}><Text style={s.emptyTitle}>Henüz blog yazısı yok</Text></View> : blogs.map((blog) => (
      <Pressable key={blog.id} onPress={() => setSelectedId(blog.id)} style={s.card}>
        {!!blog.coverImageUrl && <Image source={{ uri: blog.coverImageUrl }} style={s.image} resizeMode="cover" />}
        <View style={s.body}>
          <Text style={s.date}>{prettyDate(blog.publishedAt)}</Text>
          <Text style={s.cardTitle}>{blog.title}</Text>
          {!!blog.excerpt && <Text style={s.cardText} numberOfLines={3}>{blog.excerpt}</Text>}
          <Text style={s.read}>Devamını oku ›</Text>
        </View>
      </Pressable>
    ))}
    <SponsorAreas areas={content?.sponsorAreas || []} placement="blog_bottom" />
  </View>;
}

const s = StyleSheet.create({
  wrap: { gap: 14 },
  pageTitle: { color: C.text, fontSize: 24, fontWeight: '900' }, subtitle: { color: C.muted, fontSize: 12, marginTop: 4 },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, overflow: 'hidden' },
  image: { width: '100%', height: 170, backgroundColor: C.card2 }, body: { padding: 14 },
  date: { color: C.accent, fontSize: 10, fontWeight: '900', letterSpacing: .6 },
  cardTitle: { color: C.text, fontSize: 17, fontWeight: '900', marginTop: 5 }, cardText: { color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 7 },
  read: { color: C.accent, fontSize: 11, fontWeight: '900', marginTop: 10 },
  back: { color: C.accent, fontSize: 12, fontWeight: '900' },
  hero: { width: '100%', height: 220, borderRadius: 22, backgroundColor: C.card2, marginTop: 2 },
  title: { color: C.text, fontSize: 27, lineHeight: 33, fontWeight: '900', marginTop: 4 }, excerpt: { color: C.muted, fontSize: 14, lineHeight: 21 },
  article: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 16, gap: 12 },
  paragraph: { color: C.text, fontSize: 14, lineHeight: 22 },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderColor: C.border, borderRadius: 18, padding: 28, alignItems: 'center' }, emptyTitle: { color: C.text, fontWeight: '900' },
});
