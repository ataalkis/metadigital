import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TX_KEY = '@gelir_giderim_transactions_v1';
const SETTINGS_KEY = '@gelir_giderim_settings_v1';
const C = {
  bg: '#0B1020', card: '#141B2D', card2: '#101726', border: '#263149',
  text: '#F5F7FB', muted: '#95A2B8', income: '#2DD4A7', expense: '#FF6B6B',
  accent: '#6EA8FE', warning: '#FBBF24',
};
const INCOME = ['Maaş', 'Ek İş', 'Satış', 'Tahsilat', 'Prim', 'Diğer'];
const EXPENSE = ['Kira', 'Market', 'Fatura', 'Ulaşım', 'Borç', 'Kredi Kartı', 'Yemek', 'Çocuk', 'İş', 'Diğer'];

const pad = (n) => String(n).padStart(2, '0');
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const monthKey = (d) => String(d || '').slice(0, 7);
const money = (v) => {
  const x = String(v || '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
};
const fmt = (n) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(Number(n || 0));
const prettyDate = (iso) => {
  const [y, m, d] = String(iso).split('-');
  return y && m && d ? `${d}.${m}.${y}` : iso;
};

function Pill({ label, active, onPress, danger }) {
  return (
    <Pressable onPress={onPress} style={[s.pill, active && { borderColor: danger ? C.expense : C.accent, backgroundColor: danger ? 'rgba(255,107,107,.14)' : 'rgba(110,168,254,.14)' }]}>
      <Text style={[s.pillText, active && { color: danger ? C.expense : C.accent }]}>{label}</Text>
    </Pressable>
  );
}

function Summary({ label, value, color }) {
  return (
    <View style={s.summary}>
      <Text style={s.smallLabel}>{label}</Text>
      <Text style={[s.summaryValue, { color }]} numberOfLines={1}>{fmt(value)}</Text>
    </View>
  );
}

export default function App() {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Market');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(today());
  const [selectedMonth, setSelectedMonth] = useState(monthKey(today()));
  const [filter, setFilter] = useState('all');
  const [budget, setBudget] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [savedItems, savedSettings] = await Promise.all([
          AsyncStorage.getItem(TX_KEY),
          AsyncStorage.getItem(SETTINGS_KEY),
        ]);
        if (savedItems) setItems(JSON.parse(savedItems));
        if (savedSettings) {
          const x = JSON.parse(savedSettings);
          if (x.budget) setBudget(String(x.budget));
        }
      } catch (_) {
        Alert.alert('Hata', 'Kayıtlı veriler okunamadı.');
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(TX_KEY, JSON.stringify(items)).catch(() => {});
  }, [items, loaded]);
  useEffect(() => {
    if (loaded) AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ budget: money(budget) })).catch(() => {});
  }, [budget, loaded]);
  useEffect(() => {
    const cats = type === 'income' ? INCOME : EXPENSE;
    if (!cats.includes(category)) setCategory(cats[0]);
  }, [type, category]);

  const months = useMemo(() => [...new Set([monthKey(today()), ...items.map((x) => monthKey(x.date))])].filter(Boolean).sort().reverse(), [items]);
  const monthItems = useMemo(() => items.filter((x) => monthKey(x.date) === selectedMonth), [items, selectedMonth]);
  const visible = useMemo(() => {
    const data = filter === 'all' ? monthItems : monthItems.filter((x) => x.type === filter);
    return [...data].sort((a, b) => b.createdAt - a.createdAt);
  }, [monthItems, filter]);
  const totals = useMemo(() => {
    const income = monthItems.filter((x) => x.type === 'income').reduce((a, x) => a + x.amount, 0);
    const expense = monthItems.filter((x) => x.type === 'expense').reduce((a, x) => a + x.amount, 0);
    return { income, expense, net: income - expense };
  }, [monthItems]);

  const budgetNum = money(budget);
  const budgetPct = budgetNum > 0 ? Math.min(100, (totals.expense / budgetNum) * 100) : 0;
  const categories = type === 'income' ? INCOME : EXPENSE;

  const add = () => {
    const value = money(amount);
    if (value <= 0) return Alert.alert('Tutar gerekli', '0’dan büyük bir tutar gir.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Alert.alert('Tarih hatalı', 'Tarihi 2026-10-06 biçiminde gir.');
    const tx = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type, amount: value, category, note: note.trim(), date, createdAt: Date.now(),
    };
    setItems((old) => [tx, ...old]);
    setAmount('');
    setNote('');
    setSelectedMonth(monthKey(date));
  };

  const remove = (id) => Alert.alert('İşlemi sil', 'Bu kayıt silinsin mi?', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Sil', style: 'destructive', onPress: () => setItems((old) => old.filter((x) => x.id !== id)) },
  ]);

  const clearAll = () => Alert.alert('Tüm verileri sil', 'Bütün gelir ve gider kayıtları kalıcı olarak silinecek.', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Hepsini sil', style: 'destructive', onPress: () => setItems([]) },
  ]);

  const exportCSV = async () => {
    if (!items.length) return Alert.alert('Kayıt yok', 'Dışa aktarılacak işlem bulunmuyor.');
    const lines = ['Tarih,Tur,Kategori,Aciklama,Tutar'];
    [...items].sort((a, b) => a.date.localeCompare(b.date)).forEach((x) => {
      lines.push([x.date, x.type === 'income' ? 'Gelir' : 'Gider', x.category, `"${String(x.note || '').replace(/"/g, '""')}"`, x.amount.toFixed(2).replace('.', ',')].join(','));
    });
    await Share.share({ title: 'Gelir Giderim CSV', message: lines.join('\n') });
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          <View>
            <Text style={s.eyebrow}>KİŞİSEL FİNANS</Text>
            <Text style={s.title}>Gelir Giderim</Text>
            <Text style={s.subtitle}>Paranın nereye gittiğini tek ekranda gör.</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rowGap}>
            {months.map((m) => <Pill key={m} label={m} active={selectedMonth === m} onPress={() => setSelectedMonth(m)} />)}
          </ScrollView>

          <View style={s.twoCol}>
            <Summary label="GELİR" value={totals.income} color={C.income} />
            <Summary label="GİDER" value={totals.expense} color={C.expense} />
          </View>

          <View style={s.netCard}>
            <Text style={s.smallLabel}>NET BAKİYE</Text>
            <Text style={[s.netValue, { color: totals.net < 0 ? C.expense : C.text }]}>{fmt(totals.net)}</Text>
            <Text style={s.muted}>{totals.net >= 0 ? 'Bu ay artıdasın.' : 'Bu ay gider geliri aşmış.'}</Text>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Aylık gider hedefi</Text>
            <TextInput value={budget} onChangeText={setBudget} keyboardType="decimal-pad" placeholder="Örn. 50.000" placeholderTextColor={C.muted} style={s.input} />
            {budgetNum > 0 && <>
              <View style={s.track}><View style={[s.fill, { width: `${budgetPct}%`, backgroundColor: budgetPct >= 100 ? C.expense : C.warning }]} /></View>
              <Text style={s.muted}>{fmt(totals.expense)} / {fmt(budgetNum)} · %{budgetPct.toFixed(0)}</Text>
            </>}
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Yeni işlem</Text>
            <View style={s.segmentRow}>
              <Pressable onPress={() => setType('expense')} style={[s.segment, type === 'expense' && { backgroundColor: 'rgba(255,107,107,.14)' }]}><Text style={{ color: type === 'expense' ? C.expense : C.muted, fontWeight: '800' }}>Gider</Text></Pressable>
              <Pressable onPress={() => setType('income')} style={[s.segment, type === 'income' && { backgroundColor: 'rgba(45,212,167,.14)' }]}><Text style={{ color: type === 'income' ? C.income : C.muted, fontWeight: '800' }}>Gelir</Text></Pressable>
            </View>
            <Text style={s.label}>Tutar</Text>
            <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={C.muted} style={[s.input, { fontSize: 24, fontWeight: '800' }]} />
            <Text style={s.label}>Kategori</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rowGap}>
              {categories.map((x) => <Pill key={x} label={x} active={category === x} danger={type === 'expense'} onPress={() => setCategory(x)} />)}
            </ScrollView>
            <Text style={s.label}>Açıklama</Text>
            <TextInput value={note} onChangeText={setNote} placeholder="Örn. market alışverişi" placeholderTextColor={C.muted} style={s.input} />
            <Text style={s.label}>Tarih</Text>
            <TextInput value={date} onChangeText={setDate} placeholder="YYYY-AA-GG" placeholderTextColor={C.muted} style={s.input} />
            <Pressable onPress={add} style={[s.primary, { backgroundColor: type === 'expense' ? C.expense : C.income }]}><Text style={s.primaryText}>{type === 'expense' ? 'Gideri Kaydet' : 'Geliri Kaydet'}</Text></Pressable>
          </View>

          <View style={s.listHead}>
            <Text style={s.sectionTitle}>İşlemler</Text>
            <View style={s.filterRow}>
              <Pill label="Tümü" active={filter === 'all'} onPress={() => setFilter('all')} />
              <Pill label="Gelir" active={filter === 'income'} onPress={() => setFilter('income')} />
              <Pill label="Gider" active={filter === 'expense'} danger onPress={() => setFilter('expense')} />
            </View>
          </View>

          {!visible.length ? (
            <View style={s.empty}><Text style={s.emptyTitle}>Henüz kayıt yok</Text><Text style={s.muted}>İlk gelir veya giderini ekle.</Text></View>
          ) : visible.map((x) => (
            <Pressable key={x.id} onLongPress={() => remove(x.id)} style={s.tx}>
              <View style={[s.icon, { backgroundColor: x.type === 'income' ? 'rgba(45,212,167,.14)' : 'rgba(255,107,107,.14)' }]}><Text style={{ color: x.type === 'income' ? C.income : C.expense, fontSize: 20, fontWeight: '900' }}>{x.type === 'income' ? '+' : '−'}</Text></View>
              <View style={{ flex: 1 }}><Text style={s.txCat}>{x.category}</Text><Text style={s.txMeta}>{prettyDate(x.date)}{x.note ? ` · ${x.note}` : ''}</Text></View>
              <Text style={[s.txAmount, { color: x.type === 'income' ? C.income : C.expense }]}>{x.type === 'income' ? '+' : '−'}{fmt(x.amount)}</Text>
            </Pressable>
          ))}

          <View style={s.twoCol}>
            <Pressable onPress={exportCSV} style={s.secondary}><Text style={s.secondaryText}>CSV Paylaş</Text></Pressable>
            <Pressable onPress={clearAll} style={s.secondary}><Text style={[s.secondaryText, { color: C.expense }]}>Tümünü Sil</Text></Pressable>
          </View>
          <Text style={[s.muted, { textAlign: 'center', fontSize: 11 }]}>Veriler bu cihazda saklanır. Bir kaydı silmek için üzerine uzun bas.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { padding: 18, paddingBottom: 54, gap: 14 },
  eyebrow: { color: C.accent, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: C.text, fontSize: 30, fontWeight: '900', marginTop: 2 },
  subtitle: { color: C.muted, fontSize: 12, marginTop: 4 },
  rowGap: { gap: 8, paddingVertical: 2 },
  twoCol: { flexDirection: 'row', gap: 10 },
  summary: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, padding: 14, borderRadius: 18 },
  smallLabel: { color: C.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  summaryValue: { fontSize: 19, fontWeight: '900', marginTop: 8 },
  netCard: { backgroundColor: C.card2, borderWidth: 1, borderColor: C.border, padding: 18, borderRadius: 20 },
  netValue: { fontSize: 32, fontWeight: '900', marginTop: 7 },
  muted: { color: C.muted, fontSize: 12, marginTop: 4 },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, padding: 16, borderRadius: 20, gap: 10 },
  cardTitle: { color: C.text, fontSize: 17, fontWeight: '900' },
  input: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 14, color: C.text, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  label: { color: C.muted, fontSize: 12, fontWeight: '700', marginTop: 4 },
  track: { height: 10, borderRadius: 99, backgroundColor: C.bg, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  fill: { height: '100%', borderRadius: 99 },
  segmentRow: { flexDirection: 'row', backgroundColor: C.bg, borderRadius: 14, padding: 4, gap: 4 },
  segment: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  pill: { borderWidth: 1, borderColor: C.border, backgroundColor: C.card2, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  pillText: { color: C.muted, fontSize: 12, fontWeight: '700' },
  primary: { marginTop: 4, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  primaryText: { color: '#071016', fontWeight: '900', fontSize: 15 },
  listHead: { gap: 10 },
  sectionTitle: { color: C.text, fontSize: 18, fontWeight: '900' },
  filterRow: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderColor: C.border, borderRadius: 18, padding: 24, alignItems: 'center' },
  emptyTitle: { color: C.text, fontWeight: '900', fontSize: 15 },
  tx: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 17, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txCat: { color: C.text, fontSize: 14, fontWeight: '900' },
  txMeta: { color: C.muted, fontSize: 11, marginTop: 3 },
  txAmount: { fontSize: 14, fontWeight: '900', maxWidth: '40%', textAlign: 'right' },
  secondary: { flex: 1, borderWidth: 1, borderColor: C.border, backgroundColor: C.card2, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  secondaryText: { color: C.text, fontWeight: '900', fontSize: 13 },
});
