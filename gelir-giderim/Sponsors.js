import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

const C = {
  card: '#141B2D', card2: '#101726', border: '#263149', text: '#F5F7FB',
  muted: '#95A2B8', accent: '#6EA8FE',
};

// Yeni sponsor eklemek için bu listeye bir kayıt eklemek yeterli:
// { name: 'Marka Adı', description: 'Kısa açıklama', url: 'https://...' }
const SPONSORS = [];

export default function Sponsors() {
  const openSponsor = async (url) => {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch (_) {}
  };

  return (
    <View style={s.wrap}>
      <View>
        <Text style={s.title}>Sponsorlarımız</Text>
        <Text style={s.sub}>Bize destek olan markalar.</Text>
      </View>

      {!SPONSORS.length ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>Sponsor alanı</Text>
          <Text style={s.emptyText}>Sponsorlarımız burada yer alacak. Kartlara dokununca sponsor bağlantısı açılacak.</Text>
        </View>
      ) : SPONSORS.map((sponsor) => (
        <Pressable key={`${sponsor.name}-${sponsor.url}`} onPress={() => openSponsor(sponsor.url)} style={s.card}>
          <View style={s.badge}><Text style={s.badgeText}>SPONSOR</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{sponsor.name}</Text>
            {!!sponsor.description && <Text style={s.desc}>{sponsor.description}</Text>}
          </View>
          <Text style={s.link}>Ziyaret et ›</Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 10 },
  title: { color: C.text, fontSize: 18, fontWeight: '900' },
  sub: { color: C.muted, fontSize: 11, marginTop: 3 },
  empty: { backgroundColor: C.card, borderWidth: 1, borderStyle: 'dashed', borderColor: C.border, borderRadius: 18, padding: 16 },
  emptyTitle: { color: C.text, fontSize: 14, fontWeight: '900' },
  emptyText: { color: C.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 13 },
  badge: { backgroundColor: C.card2, borderWidth: 1, borderColor: C.accent, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  badgeText: { color: C.accent, fontSize: 8, fontWeight: '900', letterSpacing: .7 },
  name: { color: C.text, fontSize: 14, fontWeight: '900' },
  desc: { color: C.muted, fontSize: 10, marginTop: 3 },
  link: { color: C.accent, fontSize: 11, fontWeight: '900' },
});
