import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Dashboard from './Dashboard';
import Transactions from './Transactions';
import Payments from './Payments';

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
        type: 'expense',
        amount: Number(amount || 0),
        category: category || 'Borç',
        note: note || '',
        date: date || today(),
        createdAt: Date.now(),
        sourcePaymentId,
        paymentPeriod,
      }, ...old];
    });
    setSelectedMonth(monthKey(date || today()));
  };

  const removePaymentExpense = (sourcePaymentId, paymentPeriod) => {
    setItems((old) => old.filter((x) => !(x.sourcePaymentId === sourcePaymentId && x.paymentPeriod === paymentPeriod)));
  };

  const navigate = (target, initialType) => {
    if (initialType) setTransactionInitialType(initialType);
    setTab(target);
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <View>
            <Text style={s.eyebrow}>KİŞİSEL FİNANS</Text>
            <Text style={s.title}>Gelir Giderim</Text>
          </View>
          <View style={s.tabs}>
            {[
              ['home', 'Ana Sayfa'],
              ['transactions', 'İşlemler'],
              ['payments', 'Ödemeler'],
            ].map(([key, label]) => (
              <Pressable key={key} onPress={() => setTab(key)} style={[s.tab, tab === key && s.tabActive]}>
                <Text style={[s.tabText, tab === key && s.tabTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          {tab === 'home' && (
            <Dashboard
              items={items}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              budget={budget}
              setBudget={setBudget}
              onNavigate={navigate}
            />
          )}
          {tab === 'transactions' && (
            <Transactions
              items={items}
              setItems={setItems}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              initialType={transactionInitialType}
            />
          )}
          {tab === 'payments' && (
            <View style={{ gap: 10 }}>
              <Text style={s.pageTitle}>Ödemeler</Text>
              <Text style={s.subtitle}>Sabit ödemeler, krediler, kişiye borçlar ve bekleyen ödemeler.</Text>
              <Payments onAddExpense={addPaymentExpense} onRemoveExpense={removePaymentExpense} />
            </View>
          )}
          <Text style={s.footer}>Veriler bu cihazda saklanır.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.bg },
  eyebrow: { color: C.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: C.text, fontSize: 25, fontWeight: '900', marginTop: 2 },
  tabs: { flexDirection: 'row', backgroundColor: C.card2, borderWidth: 1, borderColor: C.border, padding: 4, borderRadius: 15, gap: 4 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: 'center' },
  tabActive: { backgroundColor: 'rgba(110,168,254,.16)' },
  tabText: { color: C.muted, fontSize: 11, fontWeight: '800' },
  tabTextActive: { color: C.accent },
  container: { padding: 18, paddingBottom: 54, gap: 14 },
  pageTitle: { color: C.text, fontSize: 24, fontWeight: '900' },
  subtitle: { color: C.muted, fontSize: 12, marginTop: -4 },
  footer: { color: C.muted, textAlign: 'center', fontSize: 10, marginTop: 4 },
});
