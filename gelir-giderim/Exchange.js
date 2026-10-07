import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MoneyInput, { parseMoney } from './MoneyInput';

const CACHE_KEY = '@abi_butce_exchange_v1';
const C = {
  bg: '#0B1020', card: '#141B2D', card2: '#101726', border: '#263149',
  text: '#F5F7FB', muted: '#95A2B8', accent: '#6EA8FE', income: '#2DD4A7', expense: '#FF6B6B', warning: '#FBBF24',
};
const CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP', 'CHF'];
const LABELS = { TRY: 'Türk Lirası', USD: 'ABD Doları', EUR: 'Euro', GBP: 'Sterlin', CHF: 'İsviçre Frangı' };

const fmt = (n, digits = 4) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: digits }).format(Number(n || 0));

async function fetchPair(base, quote) {
  const url = `https://api.frankfurter.dev/v2/rate/${base.toLowerCase()}/${quote.toLowerCase()}?providers=tcmb`;
  const r = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
  if (!r.ok) throw new Error(`Kur alınamadı: ${base}/${quote}`);
  return r.json();
}

async function loadRates() {
  const pairs = await Promise.all(['USD', 'EUR', 'GBP', 'CHF'].map((c) => fetchPair(c, 'TRY')));
  const rates = { TRY: 1 };
  let date = '';
  pairs.forEach((x) => {
    rates[String(x.base || '').toUpperCase()] = Number(x.rate || 0);
    if (x.date && x.date > date) date = x.date;
  });
  return { rates, date, fetchedAt: Date.now() };
}

function CurrencyChoice({ code, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[s.choice, active && s.choiceActive]}>
      <Text style={[s.choiceText, active && { color: C.accent }]}>{code}</Text>
    </Pressable>
  );
}

export default function Exchange({ compact = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState('TRY');
  const [to, setTo] = useState('USD');
  const [amount, setAmount] = useState('1.000,00');

  const refresh = async () => {
    setLoading(true);
    try {
      const next = await loadRates();
      setData(next);
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next)).catch(() => {});
    } catch (_) {
      // cache varsa ekranda kalır
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) setData(JSON.parse(cached));
      } finally {
        refresh();
      }
    })();
  }, []);

  const result = useMemo(() => {
    const value = parseMoney(amount);
    if (!data?.rates || value < 0) return 0;
    const tryValue = from === 'TRY' ? value : value * Number(data.rates[from] || 0);
    return to === 'TRY' ? tryValue : tryValue / Number(data.rates[to] || 1);
  }, [amount, data, from, to]);

  if (compact) {
    return (
      <View style={s.card}>
        <View style={s.head}>
          <View><Text style={s.cardTitle}>Günlük Kurlar</Text><Text style={s.muted}>{data?.date ? `TCMB · ${data.date}` : 'Kur verisi bekleniyor'}</Text></View>
          <Pressable onPress={refresh}><Text style={s.link}>{loading ? '...' : 'Yenile'}</Text></Pressable>
        </View>
        <View style={s.rateGrid}>
          {['USD','EUR','GBP','CHF'].map((c) => <View key={c} style={s.rateMini}><Text style={s.rateCode}>{c}</Text><Text style={s.rateValue}>{data?.rates?.[c] ? `₺${fmt(data.rates[c], 4)}` : '—'}</Text></View>)}
        </View>
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <View><Text style={s.title}>Döviz</Text><Text style={s.subtitle}>Günlük kurlar ve hızlı para birimi çevirici.</Text></View>
        <Pressable onPress={refresh} style={s.refresh}><Text style={s.refreshText}>{loading ? 'Yükleniyor' : 'Yenile'}</Text></Pressable>
      </View>

      <View style={s.card}>
        <View style={s.head}><Text style={s.cardTitle}>Günlük Kurlar</Text>{loading && <ActivityIndicator />}</View>
        <Text style={s.muted}>{data?.date ? `TCMB verisi · ${data.date}` : 'İnternet bağlantısı olduğunda güncellenir.'}</Text>
        {['USD','EUR','GBP','CHF'].map((c) => (
          <View key={c} style={s.rateRow}>
            <View><Text style={s.rateCode}>{c}</Text><Text style={s.muted}>{LABELS[c]}</Text></View>
            <Text style={s.rateBig}>{data?.rates?.[c] ? `₺${fmt(data.rates[c], 4)}` : '—'}</Text>
          </View>
        ))}
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Döviz Çevir</Text>
        <Text style={s.label}>Nereden?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rowGap}>
          {CURRENCIES.map((c) => <CurrencyChoice key={c} code={c} active={from === c} onPress={() => setFrom(c)} />)}
        </ScrollView>
        <MoneyInput label="Tutar" value={amount} onChangeText={setAmount} />

        <Text style={s.label}>Nereye?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rowGap}>
          {CURRENCIES.map((c) => <CurrencyChoice key={c} code={c} active={to === c} onPress={() => setTo(c)} />)}
        </ScrollView>

        <View style={s.result}>
          <Text style={s.muted}>SONUÇ</Text>
          <Text style={s.resultValue}>{fmt(result, 2)} {to}</Text>
          <Text style={s.resultMeta}>{from} → {to}</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 14 },
  title: { color: C.text, fontSize: 25, fontWeight: '900' }, subtitle: { color: C.muted, fontSize: 12, marginTop: 3 },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 15, gap: 11 },
  cardTitle: { color: C.text, fontSize: 17, fontWeight: '900' }, muted: { color: C.muted, fontSize: 10, marginTop: 2 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  refresh: { backgroundColor: C.card2, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  refreshText: { color: C.accent, fontSize: 11, fontWeight: '900' }, link: { color: C.accent, fontSize: 10, fontWeight: '900' },
  rateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, rateMini: { width: '48%', backgroundColor: C.card2, borderRadius: 12, padding: 10 },
  rateCode: { color: C.text, fontSize: 12, fontWeight: '900' }, rateValue: { color: C.income, fontSize: 14, fontWeight: '900', marginTop: 5 },
  rateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderTopWidth: 1, borderTopColor: C.border },
  rateBig: { color: C.income, fontSize: 18, fontWeight: '900' },
  label: { color: C.muted, fontSize: 11, fontWeight: '900' }, rowGap: { gap: 7, paddingVertical: 1 },
  choice: { borderWidth: 1, borderColor: C.border, backgroundColor: C.card2, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  choiceActive: { borderColor: C.accent, backgroundColor: 'rgba(110,168,254,.13)' }, choiceText: { color: C.muted, fontSize: 12, fontWeight: '900' },
  result: { backgroundColor: C.card2, borderWidth: 1, borderColor: C.border, borderRadius: 17, padding: 16 },
  resultValue: { color: C.text, fontSize: 27, fontWeight: '900', marginTop: 5 }, resultMeta: { color: C.accent, fontSize: 10, fontWeight: '900', marginTop: 4 },
});
