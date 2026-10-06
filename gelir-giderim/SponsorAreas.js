import React from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const C = {
  card: '#141B2D', card2: '#101726', border: '#263149', text: '#F5F7FB', muted: '#95A2B8', accent: '#6EA8FE',
};

async function openTarget(url) {
  if (!url) return;
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) return Alert.alert('Bağlantı açılamadı', 'Sponsor bağlantısı geçerli görünmüyor.');
    await Linking.openURL(url);
  } catch (_) {
    Alert.alert('Bağlantı açılamadı', 'Sponsor bağlantısı şu anda açılamıyor.');
  }
}

function SponsorCard({ sponsor, compact }) {
  return (
    <Pressable onPress={() => openTarget(sponsor.targetUrl)} style={[s.card, compact && s.cardCompact]}>
      {sponsor.imageUrl ? (
        <Image source={{ uri: sponsor.imageUrl }} style={[s.image, compact && s.imageCompact]} resizeMode="cover" />
      ) : (
        <View style={[s.image, s.imageFallback, compact && s.imageCompact]}><Text style={s.fallbackText}>{sponsor.name?.slice(0, 1) || 'S'}</Text></View>
      )}
      <View style={s.body}>
        <Text style={s.name} numberOfLines={1}>{sponsor.name || 'Sponsor'}</Text>
        {!!sponsor.subtitle && <Text style={s.subtitle} numberOfLines={2}>{sponsor.subtitle}</Text>}
        {!!sponsor.targetUrl && <Text style={s.link}>İncele ›</Text>}
      </View>
    </Pressable>
  );
}

export default function SponsorAreas({ areas = [], placement }) {
  const visibleAreas = (areas || []).filter((a) => a?.active !== false && a?.placement === placement);
  if (!visibleAreas.length) return null;

  return (
    <View style={s.wrap}>
      {visibleAreas.map((area) => {
        const sponsors = (area.sponsors || []).filter((x) => x?.active !== false);
        if (!sponsors.length) return null;
        const horizontal = area.layout !== 'stack';
        return (
          <View key={area.id} style={s.area}>
            <View style={s.head}>
              <Text style={s.title}>{area.name || 'Sponsorlarımız'}</Text>
              <Text style={s.badge}>SPONSOR</Text>
            </View>
            {horizontal ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
                {sponsors.map((sp) => <SponsorCard key={sp.id} sponsor={sp} compact />)}
              </ScrollView>
            ) : sponsors.map((sp) => <SponsorCard key={sp.id} sponsor={sp} />)}
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 14 },
  area: { gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  title: { color: C.text, fontSize: 17, fontWeight: '900' },
  badge: { color: C.accent, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  row: { gap: 10, paddingRight: 4 },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, overflow: 'hidden', marginBottom: 8 },
  cardCompact: { width: 235, marginBottom: 0 },
  image: { width: '100%', height: 130, backgroundColor: C.card2 },
  imageCompact: { height: 112 },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  fallbackText: { color: C.accent, fontSize: 38, fontWeight: '900' },
  body: { padding: 12 },
  name: { color: C.text, fontSize: 14, fontWeight: '900' },
  subtitle: { color: C.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  link: { color: C.accent, fontSize: 11, fontWeight: '900', marginTop: 8 },
});
