import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Home from './Home';
import Transactions from './Transactions';
import Payments from './Payments';
import Blog from './Blog';
import Exchange from './Exchange';
import { useRemoteContent } from './ContentService';

const TX_KEY = '@gelir_giderim_transactions_v1';
const SETTINGS_KEY = '@gelir_giderim_settings_v1';
const C = {
  bg: '#0B1020', card2: '#101726', border: '#263149', text: '#F5F7FB', muted: '#95A2B8', accent: '#6EA8FE',
};
const pad = (n) => String(n).padStart(2, '0');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const monthKey = (d) => String(d || '').slice(0, 7);
const money = (v) => {
  const x = String(v || '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  const n = Number(x); return Number.isFinite(n) ? n : 0;
};

export default function App() {
  const [items, setItems] = useState([]);
  const [budget, setBudget] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState('home');
  const [transactionInitialType, setTransactionInitialType] = useState('expense');
  const [selectedMonth, setSelectedMonth] = useState(monthKey(today()));
  const [selectedBlogId, setSelectedBlogId] = useState(null);
  const { content } = useRemoteContent();

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

  const addPaymentExpense = ({ sourcePaymentId, paymentPeriod, amount, category, note, date }) => {
    setItems((old) => {
      if (old.some((x) => x.sourcePaymentId === sourcePaymentId && x.paymentPeriod === paymentPeriod)) return old;
      return [{
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: 'expense', amount: Number(amount || 0), category: category || 'Borç', note: note || '', date: date || today(), createdAt: Date.now(), sourcePaymentId, paymentPeriod,
      }, ...old];
    });
    setSelectedMonth(monthKey(date || today()));
  };

  const removePaymentExpense = (sourcePaymentId, paymentPeriod) => {
    setItems((old) => old.filter((x) => !(x.sourcePaymentId === sourcePaymentId && x.paymentPeriod === paymentPeriod)));
  };

  const navigate = (target, initialType) => {
    if (initialType) setTransactionInitialType(initialType);
    if (target !== 'blog') setSelectedBlogId(null);
    setTab(target);
  };

  const openBlog = (id) => {
    setSelectedBlogId(id);
    setTab('blog');
  };

  const selectTab = (target) => {
    if (target === 'blog') setSelectedBlogId(null);
    setTab(target);
  };

  const pageTitle = tab === 'home' ? 'Bugün paran nasıl?'
    : tab === 'transactions' ? 'İşlemler'
    : tab === 'payments' ? 'Ödemeler'
    : tab === 'exchange' ? 'Döviz'
    : 'Blog';

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <View style={s.brandRow}>
            <View>
              <Text style={s.eyebrow}>ABİ BÜTÇE</Text>
              <Text style={s.title}>{pageTitle}</Text>
            </View>
            <View style={s.versionBadge}><Text style={s.versionText}>YENİ</Text></View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
            {[
              ['home', 'Ana Sayfa'],
              ['transactions', 'İşlemler'],
              ['payments', 'Ödemeler'],
              ['exchange', 'Döviz'],
              ['blog', 'Blog'],
            ].map(([key, label]) => (
              <Pressable key={key} onPress={() => selectTab(key)} style={[s.tab, tab === key && s.tabActive]}>
                <Text style={[s.tabText, tab === key && s.tabTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          {tab === 'home' && <Home items={items} content={content} onNavigate={navigate} onOpenBlog={openBlog} />}
          {tab === 'transactions' && (
            <Transactions items={items} setItems={setItems} selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} initialType={transactionInitialType} />
          )}
          {tab === 'payments' && (
            <View style={{ gap: 10 }}>
              <Text style={s.pageTitle}>Ödemeler</Text>
              <Text style={s.subtitle}>Faturalar, sabit ödemeler, krediler, kişiye borçlar ve bekleyen ödemeler.</Text>
              <Payments onAddExpense={addPaymentExpense} onRemoveExpense={removePaymentExpense} />
            </View>
          )}
          {tab === 'exchange' && <Exchange />}
          {tab === 'blog' && <Blog content={content} initialBlogId={selectedBlogId} onClearInitial={() => setSelectedBlogId(null)} />}
          <Text style={s.footer}>Finans verilerin bu cihazda saklanır. Blog ve sponsor içerikleri uzaktan güncellenir.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.bg },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  eyebrow: { color: C.accent, fontSize: 9, fontWeight: '900', letterSpacing: 1.6 },
  title: { color: C.text, fontSize: 23, fontWeight: '900', marginTop: 2 },
  versionBadge: { backgroundColor: C.card2, borderWidth: 1, borderColor: C.border, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 5 },
  versionText: { color: C.muted, fontSize: 9, fontWeight: '900' },
  tabs: { backgroundColor: C.card2, borderWidth: 1, borderColor: C.border, padding: 4, borderRadius: 15, gap: 4 },
  tab: { minWidth: 88, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 11, alignItems: 'center' }, tabActive: { backgroundColor: 'rgba(110,168,254,.16)' },
  tabText: { color: C.muted, fontSize: 10, fontWeight: '800' }, tabTextActive: { color: C.accent },
  container: { padding: 18, paddingBottom: 54, gap: 14 },
  pageTitle: { color: C.text, fontSize: 24, fontWeight: '900' }, subtitle: { color: C.muted, fontSize: 12, marginTop: -4 },
  footer: { color: C.muted, textAlign: 'center', fontSize: 9, marginTop: 6, lineHeight: 14 },
});
