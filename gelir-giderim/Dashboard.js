import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Sponsors from './Sponsors';

const PAYMENT_KEY = '@gelir_giderim_payments_v1';
const C = {
  bg: '#0B1020', card: '#141B2D', card2: '#101726', border: '#263149',
  text: '#F5F7FB', muted: '#95A2B8', income: '#2DD4A7', expense: '#FF6B6B',
  accent: '#6EA8FE', warning: '#FBBF24',
};
const pad = (n) => String(n).padStart(2, '0');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const monthKey = (d) => String(d || '').slice(0, 7);
const money = (v) => {
  const x = String(v || '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  const n = Number(x); return Number.isFinite(n) ? n : 0;
};
const fmt = (n) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(Number(n || 0));
const prettyDate = (iso) => { const [y, m, d] = String(iso || '').split('-'); return y && m && d ? `${d}.${m}.${y}` : iso; };

function Pill({ label, active, onPress }) {
  return <Pressable onPress={onPress} style={[s.pill, active && s.pillActive]}><Text style={[s.pillText, active && { color: C.accent }]}>{label}</Text></Pressable>;
}
function Summary({ label, value, color }) {
  return <View style={s.summary}><Text style={s.smallLabel}>{label}</Text><Text style={[s.summaryValue, { color }]} numberOfLines={1}>{fmt(value)}</Text></View>;
}
function Metric({ label, value, color }) {
  return <View style={s.metric}><Text style={s.metricLabel}>{label}</Text><Text style={[s.metricValue, { color }]} numberOfLines={1}>{value}</Text></View>;
}
function Breakdown({ title, data, total, color }) {
  return <View style={s.card}>
    <Text style={s.cardTitle}>{title}</Text>
    {!data.length ? <Text style={s.muted}>Bu ay kayıt yok.</Text> : data.map((x) => {
      const pct = total > 0 ? x.amount / total * 100 : 0;
      return <View key={x.category} style={s.breakRow}>
        <View style={s.breakTop}><Text style={s.breakName}>{x.category}</Text><Text style={[s.breakAmount, { color }]}>{fmt(x.amount)}</Text></View>
        <View style={s.track}><View style={[s.fill, { width: `${Math.min(100, pct)}%`, backgroundColor: color }]} /></View>
        <Text style={s.breakPct}>%{pct.toFixed(0)} · {x.count} işlem</Text>
      </View>;
    })}
  </View>;
}

export default function Dashboard({ items, selectedMonth, setSelectedMonth, budget, setBudget, onNavigate }) {
  const [payments, setPayments] = useState([]);
  useEffect(() => {
    AsyncStorage.getItem(PAYMENT_KEY).then((x) => setPayments(x ? JSON.parse(x) : [])).catch(() => {});
  }, []);

  const months = useMemo(() => [...new Set([monthKey(today()), ...items.map((x) => monthKey(x.date))])].filter(Boolean).sort().reverse(), [items]);
  const monthItems = useMemo(() => items.filter((x) => monthKey(x.date) === selectedMonth), [items, selectedMonth]);
  const totals = useMemo(() => {
    const income = monthItems.filter((x) => x.type === 'income').reduce((a, x) => a + Number(x.amount || 0), 0);
    const expense = monthItems.filter((x) => x.type === 'expense').reduce((a, x) => a + Number(x.amount || 0), 0);
    return { income, expense, net: income - expense };
  }, [monthItems]);

  const categoryData = (wantedType) => {
    const map = {};
    monthItems.filter((x) => x.type === wantedType).forEach((x) => {
      const key = x.category || 'Diğer';
      if (!map[key]) map[key] = { category: key, amount: 0, count: 0 };
      map[key].amount += Number(x.amount || 0); map[key].count += 1;
    });
    return Object.values(map).sort((a, b) => b.amount - a.amount);
  };
  const expenseData = useMemo(() => categoryData('expense'), [monthItems]);
  const incomeData = useMemo(() => categoryData('income'), [monthItems]);
  const recent = useMemo(() => [...monthItems].sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)).slice(0, 5), [monthItems]);

  const currentMonth = monthKey(today());
  const paymentSummary = useMemo(() => {
    let due = 0, paid = 0, loanRemaining = 0;
    payments.forEach((p) => {
      const amount = Number(p.amount || 0);
      if (p.kind === 'fixed') {
        due += amount; if (p.paidPeriods?.[currentMonth]) paid += amount;
      } else if (p.kind === 'loan') {
        if (Number(p.remainingInstallments || 0) > 0 || p.paidPeriods?.[currentMonth]) due += amount;
        if (p.paidPeriods?.[currentMonth]) paid += amount;
        loanRemaining += amount * Number(p.remainingInstallments || 0);
      } else {
        if (monthKey(p.dueDate) === currentMonth) due += amount;
        if (monthKey(p.paidAt) === currentMonth) paid += amount;
      }
    });
    return { due, paid, waiting: Math.max(0, due - paid), loanRemaining };
  }, [payments, currentMonth]);

  const budgetNum = money(budget);
  const budgetPct = budgetNum > 0 ? Math.min(100, totals.expense / budgetNum * 100) : 0;

  return <View style={s.wrap}>
    <View><Text style={s.pageTitle}>Ana Sayfa</Text><Text style={s.subtitle}>Aylık finans durumunun ayrıntılı özeti.</Text></View>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rowGap}>
      {months.map((m) => <Pill key={m} label={m} active={selectedMonth === m} onPress={() => setSelectedMonth(m)} />)}
    </ScrollView>

    <View style={s.twoCol}><Summary label="GELİR" value={totals.income} color={C.income} /><Summary label="GİDER" value={totals.expense} color={C.expense} /></View>
    <View style={s.netCard}><Text style={s.smallLabel}>NET DURUM</Text><Text style={[s.netValue, { color: totals.net < 0 ? C.expense : C.text }]}>{fmt(totals.net)}</Text><Text style={s.muted}>{totals.net >= 0 ? 'Bu ay artıdasın.' : 'Bu ay gider geliri aşmış.'}</Text></View>

    <View style={s.quickRow}>
      <Pressable onPress={() => onNavigate('transactions', 'income')} style={s.quickButton}><Text style={[s.quickText, { color: C.income }]}>+ Gelir Ekle</Text></Pressable>
      <Pressable onPress={() => onNavigate('transactions', 'expense')} style={s.quickButton}><Text style={[s.quickText, { color: C.expense }]}>− Gider Ekle</Text></Pressable>
    </View>

    <View style={s.card}>
      <View style={s.head}><Text style={s.cardTitle}>Aylık gider hedefi</Text>{budgetNum > 0 && <Text style={s.headValue}>%{budgetPct.toFixed(0)}</Text>}</View>
      <TextInput value={budget} onChangeText={setBudget} keyboardType="decimal-pad" placeholder="Örn. 50.000" placeholderTextColor={C.muted} style={s.input} />
      {budgetNum > 0 && <><View style={s.track}><View style={[s.fill, { width: `${budgetPct}%`, backgroundColor: budgetPct >= 100 ? C.expense : C.warning }]} /></View><Text style={s.muted}>{fmt(totals.expense)} harcandı · {fmt(Math.max(0, budgetNum - totals.expense))} kaldı</Text></>}
    </View>

    <View style={s.card}>
      <View style={s.head}><Text style={s.cardTitle}>Ödeme durumu</Text><Pressable onPress={() => onNavigate('payments')}><Text style={s.link}>Ödemelere git ›</Text></Pressable></View>
      <View style={s.metricGrid}>
        <Metric label="BU AY ÖDENECEK" value={fmt(paymentSummary.due)} color={C.warning} />
        <Metric label="ÖDENEN" value={fmt(paymentSummary.paid)} color={C.income} />
        <Metric label="BEKLEYEN" value={fmt(paymentSummary.waiting)} color={C.expense} />
        <Metric label="KREDİ KALAN" value={fmt(paymentSummary.loanRemaining)} color={C.accent} />
      </View>
    </View>

    <Breakdown title="Giderler kalem kalem" data={expenseData} total={totals.expense} color={C.expense} />
    <Breakdown title="Gelirler kalem kalem" data={incomeData} total={totals.income} color={C.income} />

    <View style={s.card}>
      <View style={s.head}><Text style={s.cardTitle}>Son hareketler</Text><Pressable onPress={() => onNavigate('transactions')}><Text style={s.link}>Tümünü gör ›</Text></Pressable></View>
      {!recent.length ? <Text style={s.muted}>Bu ay henüz işlem yok.</Text> : recent.map((x) => <View key={x.id} style={s.tx}><View style={{ flex: 1 }}><Text style={s.txCat}>{x.category}</Text><Text style={s.txMeta}>{prettyDate(x.date)}{x.note ? ` · ${x.note}` : ''}</Text></View><Text style={[s.txAmount, { color: x.type === 'income' ? C.income : C.expense }]}>{x.type === 'income' ? '+' : '−'}{fmt(x.amount)}</Text></View>)}
    </View>

    <Sponsors />
  </View>;
}

const s = StyleSheet.create({
  wrap: { gap: 14 }, pageTitle: { color: C.text, fontSize: 24, fontWeight: '900' }, subtitle: { color: C.muted, fontSize: 12, marginTop: 4 },
  rowGap: { gap: 8, paddingVertical: 2 }, pill: { borderWidth: 1, borderColor: C.border, backgroundColor: C.card2, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 }, pillActive: { borderColor: C.accent, backgroundColor: 'rgba(110,168,254,.14)' }, pillText: { color: C.muted, fontSize: 12, fontWeight: '700' },
  twoCol: { flexDirection: 'row', gap: 10 }, summary: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, padding: 14, borderRadius: 18 }, smallLabel: { color: C.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1 }, summaryValue: { fontSize: 19, fontWeight: '900', marginTop: 8 },
  netCard: { backgroundColor: C.card2, borderWidth: 1, borderColor: C.border, padding: 18, borderRadius: 20 }, netValue: { fontSize: 32, fontWeight: '900', marginTop: 7 }, muted: { color: C.muted, fontSize: 12, marginTop: 4 },
  quickRow: { flexDirection: 'row', gap: 10 }, quickButton: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 15, paddingVertical: 13, alignItems: 'center' }, quickText: { fontSize: 13, fontWeight: '900' },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, padding: 16, borderRadius: 20, gap: 10 }, head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }, cardTitle: { color: C.text, fontSize: 17, fontWeight: '900' }, headValue: { color: C.warning, fontWeight: '900' }, link: { color: C.accent, fontSize: 11, fontWeight: '900' },
  input: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 14, color: C.text, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 }, track: { height: 9, borderRadius: 99, backgroundColor: C.bg, overflow: 'hidden', borderWidth: 1, borderColor: C.border }, fill: { height: '100%', borderRadius: 99 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, metric: { width: '48.5%', backgroundColor: C.card2, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 11 }, metricLabel: { color: C.muted, fontSize: 9, fontWeight: '900' }, metricValue: { fontSize: 14, fontWeight: '900', marginTop: 6 },
  breakRow: { gap: 5, paddingVertical: 4 }, breakTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 }, breakName: { color: C.text, fontSize: 13, fontWeight: '800' }, breakAmount: { fontSize: 13, fontWeight: '900' }, breakPct: { color: C.muted, fontSize: 10 },
  tx: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border }, txCat: { color: C.text, fontSize: 13, fontWeight: '900' }, txMeta: { color: C.muted, fontSize: 10, marginTop: 2 }, txAmount: { fontSize: 13, fontWeight: '900' },
});
