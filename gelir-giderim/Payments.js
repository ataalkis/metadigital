import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PAYMENT_KEY = '@gelir_giderim_payments_v1';
const C = {
  bg: '#0B1020', card: '#141B2D', card2: '#101726', border: '#263149',
  text: '#F5F7FB', muted: '#95A2B8', income: '#2DD4A7', expense: '#FF6B6B',
  accent: '#6EA8FE', warning: '#FBBF24',
};

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
const intValue = (v) => {
  const n = parseInt(String(v || '').replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
};
const fmt = (n) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(Number(n || 0));
const prettyDate = (iso) => {
  const [y, m, d] = String(iso || '').split('-');
  return y && m && d ? `${d}.${m}.${y}` : iso;
};

const KIND_LABELS = {
  fixed: 'Sabit Ödeme',
  loan: 'Kredi',
  person: 'Kişiye Borç',
  pending: 'Bekleyen Ödeme',
};

function Choice({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[s.choice, active && s.choiceActive]}>
      <Text style={[s.choiceText, active && { color: C.accent }]}>{label}</Text>
    </Pressable>
  );
}

function Mini({ label, value, color = C.text }) {
  return (
    <View style={s.mini}>
      <Text style={s.miniLabel}>{label}</Text>
      <Text style={[s.miniValue, { color }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export default function Payments({ onAddExpense, onRemoveExpense }) {
  const [payments, setPayments] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [kind, setKind] = useState('fixed');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('1');
  const [remaining, setRemaining] = useState('');
  const [dueDate, setDueDate] = useState(today());
  const [filter, setFilter] = useState('all');

  const currentMonth = monthKey(today());

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(PAYMENT_KEY);
        if (saved) setPayments(JSON.parse(saved));
      } catch (_) {
        Alert.alert('Hata', 'Ödeme kayıtları okunamadı.');
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(PAYMENT_KEY, JSON.stringify(payments)).catch(() => {});
  }, [payments, loaded]);

  const isPaid = (p) => {
    if (p.kind === 'fixed' || p.kind === 'loan') return Boolean(p.paidPeriods?.[currentMonth]);
    return Boolean(p.paidAt);
  };

  const dueThisMonth = useMemo(() => payments.reduce((sum, p) => {
    if (p.kind === 'fixed') return sum + Number(p.amount || 0);
    if (p.kind === 'loan') {
      const active = Number(p.remainingInstallments || 0) > 0 || Boolean(p.paidPeriods?.[currentMonth]);
      return active ? sum + Number(p.amount || 0) : sum;
    }
    return monthKey(p.dueDate) === currentMonth ? sum + Number(p.amount || 0) : sum;
  }, 0), [payments, currentMonth]);

  const paidThisMonth = useMemo(() => payments.reduce((sum, p) => {
    if ((p.kind === 'fixed' || p.kind === 'loan') && p.paidPeriods?.[currentMonth]) return sum + Number(p.amount || 0);
    if ((p.kind === 'person' || p.kind === 'pending') && monthKey(p.paidAt) === currentMonth) return sum + Number(p.amount || 0);
    return sum;
  }, 0), [payments, currentMonth]);

  const loanRemaining = useMemo(() => payments
    .filter((p) => p.kind === 'loan')
    .reduce((sum, p) => sum + Number(p.amount || 0) * Number(p.remainingInstallments || 0), 0), [payments]);

  const visible = useMemo(() => {
    const data = filter === 'all' ? payments : payments.filter((p) => filter === 'paid' ? isPaid(p) : !isPaid(p));
    return [...data].sort((a, b) => {
      const aDate = a.kind === 'fixed' || a.kind === 'loan' ? `${currentMonth}-${pad(a.dueDay || 1)}` : (a.dueDate || '9999-12-31');
      const bDate = b.kind === 'fixed' || b.kind === 'loan' ? `${currentMonth}-${pad(b.dueDay || 1)}` : (b.dueDate || '9999-12-31');
      return aDate.localeCompare(bDate);
    });
  }, [payments, filter, currentMonth]);

  const addPayment = () => {
    const cleanName = name.trim();
    const value = money(amount);
    if (!cleanName) return Alert.alert('Ad gerekli', 'Ödeme için bir ad yaz.');
    if (value <= 0) return Alert.alert('Tutar gerekli', '0’dan büyük bir tutar gir.');

    const base = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      kind,
      name: cleanName,
      amount: value,
      createdAt: Date.now(),
    };

    if (kind === 'fixed' || kind === 'loan') {
      const day = intValue(dueDay);
      if (day < 1 || day > 31) return Alert.alert('Gün hatalı', 'Ödeme günü 1 ile 31 arasında olmalı.');
      base.dueDay = day;
      base.paidPeriods = {};
    }

    if (kind === 'loan') {
      const count = intValue(remaining);
      if (count <= 0) return Alert.alert('Taksit gerekli', 'Kalan taksit sayısını gir.');
      base.remainingInstallments = count;
    }

    if (kind === 'person' || kind === 'pending') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return Alert.alert('Tarih hatalı', 'Tarihi 2026-10-31 biçiminde gir.');
      base.dueDate = dueDate;
      base.paidAt = null;
    }

    setPayments((old) => [base, ...old]);
    setName('');
    setAmount('');
    setRemaining('');
  };

  const togglePaid = (p) => {
    const recurring = p.kind === 'fixed' || p.kind === 'loan';
    const period = recurring ? currentMonth : 'once';
    const paid = isPaid(p);

    if (paid) {
      setPayments((old) => old.map((x) => {
        if (x.id !== p.id) return x;
        if (recurring) {
          const next = { ...(x.paidPeriods || {}) };
          delete next[currentMonth];
          return {
            ...x,
            paidPeriods: next,
            remainingInstallments: x.kind === 'loan' ? Number(x.remainingInstallments || 0) + 1 : x.remainingInstallments,
          };
        }
        return { ...x, paidAt: null };
      }));
      onRemoveExpense?.(p.id, period);
      return;
    }

    if (p.kind === 'loan' && Number(p.remainingInstallments || 0) <= 0) {
      return Alert.alert('Kredi tamamlandı', 'Bu kredinin kalan taksiti görünmüyor.');
    }

    setPayments((old) => old.map((x) => {
      if (x.id !== p.id) return x;
      if (recurring) {
        return {
          ...x,
          paidPeriods: { ...(x.paidPeriods || {}), [currentMonth]: today() },
          remainingInstallments: x.kind === 'loan' ? Math.max(0, Number(x.remainingInstallments || 0) - 1) : x.remainingInstallments,
        };
      }
      return { ...x, paidAt: today() };
    }));

    onAddExpense?.({
      sourcePaymentId: p.id,
      paymentPeriod: period,
      amount: Number(p.amount || 0),
      category: p.kind === 'fixed' ? 'Fatura' : 'Borç',
      note: p.name,
      date: today(),
    });
  };

  const removePayment = (p) => Alert.alert(
    'Ödeme kaydını sil',
    `${p.name} silinsin mi? Daha önce giderlere işlenmiş ödemeler silinmez.`,
    [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => setPayments((old) => old.filter((x) => x.id !== p.id)) },
    ]
  );

  const detail = (p) => {
    if (p.kind === 'fixed') return `Her ay ${p.dueDay}. gün`;
    if (p.kind === 'loan') return `${p.remainingInstallments || 0} taksit kaldı · Kalan ${fmt(Number(p.amount || 0) * Number(p.remainingInstallments || 0))}`;
    return `Son ödeme ${prettyDate(p.dueDate)}`;
  };

  return (
    <View style={s.wrap}>
      <View style={s.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.sectionTitle}>Ödemeler</Text>
          <Text style={s.sub}>Sabit giderler, krediler, kişiye borçlar ve bekleyen ödemeler.</Text>
        </View>
      </View>

      <View style={s.grid}>
        <Mini label="BU AY ÖDENECEK" value={fmt(dueThisMonth)} color={C.warning} />
        <Mini label="BU AY ÖDENEN" value={fmt(paidThisMonth)} color={C.income} />
        <Mini label="BU AY BEKLEYEN" value={fmt(Math.max(0, dueThisMonth - paidThisMonth))} color={C.expense} />
        <Mini label="KREDİ KALAN" value={fmt(loanRemaining)} color={C.accent} />
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Sabit ödeme / borç ekle</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rowGap}>
          <Choice label="Sabit" active={kind === 'fixed'} onPress={() => setKind('fixed')} />
          <Choice label="Kredi" active={kind === 'loan'} onPress={() => setKind('loan')} />
          <Choice label="Kişiye Borç" active={kind === 'person'} onPress={() => setKind('person')} />
          <Choice label="Bekleyen" active={kind === 'pending'} onPress={() => setKind('pending')} />
        </ScrollView>

        <Text style={s.label}>{kind === 'person' ? 'Kime borçlusun?' : 'Ödeme adı'}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={kind === 'fixed' ? 'Örn. Ev kirası' : kind === 'loan' ? 'Örn. Garanti ihtiyaç kredisi' : kind === 'person' ? 'Örn. Ahmet' : 'Örn. Servis ödemesi'}
          placeholderTextColor={C.muted}
          style={s.input}
        />

        <Text style={s.label}>{kind === 'loan' ? 'Aylık taksit' : 'Tutar'}</Text>
        <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={C.muted} style={s.input} />

        {(kind === 'fixed' || kind === 'loan') && <>
          <Text style={s.label}>Her ay ödeme günü</Text>
          <TextInput value={dueDay} onChangeText={setDueDay} keyboardType="number-pad" placeholder="1" placeholderTextColor={C.muted} style={s.input} />
        </>}

        {kind === 'loan' && <>
          <Text style={s.label}>Kalan taksit sayısı</Text>
          <TextInput value={remaining} onChangeText={setRemaining} keyboardType="number-pad" placeholder="Örn. 18" placeholderTextColor={C.muted} style={s.input} />
        </>}

        {(kind === 'person' || kind === 'pending') && <>
          <Text style={s.label}>Son ödeme tarihi</Text>
          <TextInput value={dueDate} onChangeText={setDueDate} placeholder="YYYY-AA-GG" placeholderTextColor={C.muted} style={s.input} />
        </>}

        <Pressable onPress={addPayment} style={s.primary}><Text style={s.primaryText}>Ödemeyi Ekle</Text></Pressable>
      </View>

      <View style={s.listHead}>
        <Text style={s.cardTitle}>Ödeme listesi</Text>
        <View style={s.filterRow}>
          <Choice label="Tümü" active={filter === 'all'} onPress={() => setFilter('all')} />
          <Choice label="Ödenmedi" active={filter === 'unpaid'} onPress={() => setFilter('unpaid')} />
          <Choice label="Ödendi" active={filter === 'paid'} onPress={() => setFilter('paid')} />
        </View>
      </View>

      {!visible.length ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>Henüz ödeme kaydı yok</Text>
          <Text style={s.sub}>Kira, fatura, kredi veya kişiye olan borcunu ekleyebilirsin.</Text>
        </View>
      ) : visible.map((p) => {
        const paid = isPaid(p);
        const completedLoan = p.kind === 'loan' && Number(p.remainingInstallments || 0) <= 0 && !p.paidPeriods?.[currentMonth];
        return (
          <Pressable key={p.id} onLongPress={() => removePayment(p)} style={[s.payment, paid && { borderColor: 'rgba(45,212,167,.45)' }]}>
            <View style={{ flex: 1 }}>
              <View style={s.kindRow}>
                <Text style={s.kind}>{KIND_LABELS[p.kind]}</Text>
                <Text style={[s.status, { color: paid || completedLoan ? C.income : C.warning }]}>{completedLoan ? 'TAMAMLANDI' : paid ? 'ÖDENDİ' : 'BEKLİYOR'}</Text>
              </View>
              <Text style={s.name}>{p.name}</Text>
              <Text style={s.detail}>{detail(p)}</Text>
              <Text style={s.amount}>{fmt(p.amount)}</Text>
            </View>
            {!completedLoan && <Pressable onPress={() => togglePaid(p)} style={[s.payButton, paid && s.undoButton]}>
              <Text style={[s.payButtonText, paid && { color: C.muted }]}>{paid ? 'Geri Al' : 'Ödendi'}</Text>
            </Pressable>}
          </Pressable>
        );
      })}

      <Text style={s.hint}>İpucu: Bir ödeme kaydını silmek için üzerine uzun bas. “Ödendi” dediğinde tutar otomatik olarak giderlere eklenir.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { color: C.text, fontSize: 20, fontWeight: '900' },
  sub: { color: C.muted, fontSize: 12, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mini: { width: '48.5%', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 12 },
  miniLabel: { color: C.muted, fontSize: 9, fontWeight: '900', letterSpacing: .6 },
  miniValue: { fontSize: 15, fontWeight: '900', marginTop: 7 },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, padding: 16, borderRadius: 20, gap: 9 },
  cardTitle: { color: C.text, fontSize: 16, fontWeight: '900' },
  rowGap: { gap: 7, paddingVertical: 2 },
  choice: { borderWidth: 1, borderColor: C.border, backgroundColor: C.card2, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999 },
  choiceActive: { borderColor: C.accent, backgroundColor: 'rgba(110,168,254,.14)' },
  choiceText: { color: C.muted, fontSize: 11, fontWeight: '800' },
  label: { color: C.muted, fontSize: 12, fontWeight: '700', marginTop: 3 },
  input: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 14, color: C.text, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14 },
  primary: { marginTop: 4, backgroundColor: C.accent, paddingVertical: 13, borderRadius: 14, alignItems: 'center' },
  primaryText: { color: '#071016', fontWeight: '900', fontSize: 14 },
  listHead: { gap: 8 },
  filterRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderColor: C.border, borderRadius: 18, padding: 22, alignItems: 'center' },
  emptyTitle: { color: C.text, fontWeight: '900', fontSize: 14 },
  payment: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 17, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  kindRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  kind: { color: C.accent, fontSize: 10, fontWeight: '900', letterSpacing: .6 },
  status: { fontSize: 9, fontWeight: '900', letterSpacing: .5 },
  name: { color: C.text, fontSize: 15, fontWeight: '900', marginTop: 4 },
  detail: { color: C.muted, fontSize: 11, marginTop: 3 },
  amount: { color: C.text, fontSize: 15, fontWeight: '900', marginTop: 6 },
  payButton: { backgroundColor: C.income, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  undoButton: { backgroundColor: C.card2, borderWidth: 1, borderColor: C.border },
  payButtonText: { color: '#071016', fontSize: 11, fontWeight: '900' },
  hint: { color: C.muted, fontSize: 10, textAlign: 'center', lineHeight: 15 },
});
