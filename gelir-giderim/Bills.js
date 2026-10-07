import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MoneyInput, { parseMoney, formatTRY } from './MoneyInput';

const PAYMENT_KEY = '@gelir_giderim_payments_v1';
const C = {
  bg: '#0B1020', card: '#141B2D', card2: '#101726', border: '#263149',
  text: '#F5F7FB', muted: '#95A2B8', accent: '#6EA8FE', income: '#2DD4A7', expense: '#FF6B6B', warning: '#FBBF24',
};
const TYPES = ['Elektrik', 'Su', 'Doğalgaz', 'İnternet', 'Telefon', 'Aidat', 'TV', 'Diğer'];
const pad = (n) => String(n).padStart(2, '0');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const monthKey = (d) => String(d || '').slice(0, 7);
const currentMonth = () => monthKey(today());
const pretty = (iso) => { const [y,m,d] = String(iso || '').split('-'); return y && m && d ? `${d}.${m}.${y}` : iso; };

function Chip({ label, active, onPress }) {
  return <Pressable onPress={onPress} style={[s.chip, active && s.chipActive]}><Text style={[s.chipText, active && { color: C.accent }]}>{label}</Text></Pressable>;
}

export default function Bills({ onAddExpense, onRemoveExpense }) {
  const [allPayments, setAllPayments] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [billType, setBillType] = useState('Elektrik');
  const [title, setTitle] = useState('');
  const [subscriberNo, setSubscriberNo] = useState('');
  const [owner, setOwner] = useState('');
  const [dueDay, setDueDay] = useState('15');
  const [amount, setAmount] = useState('');
  const [filter, setFilter] = useState('waiting');
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem(PAYMENT_KEY).then((x) => setAllPayments(x ? JSON.parse(x) : [])).catch(() => {}).finally(() => setLoaded(true));
  }, []);
  useEffect(() => {
    if (loaded) AsyncStorage.setItem(PAYMENT_KEY, JSON.stringify(allPayments)).catch(() => {});
  }, [allPayments, loaded]);

  const bills = useMemo(() => allPayments.filter((x) => x.kind === 'bill'), [allPayments]);
  const month = currentMonth();
  const paid = (b) => Boolean(b.paidPeriods?.[month]);
  const amountFor = (b) => Number(b.monthlyAmounts?.[month] ?? b.amount ?? 0);
  const dueDateFor = (b) => `${month}-${pad(Math.min(28, Math.max(1, Number(b.dueDay || 1))))}`;

  const visible = useMemo(() => [...bills]
    .filter((b) => filter === 'all' ? true : filter === 'paid' ? paid(b) : !paid(b))
    .sort((a,b) => Number(a.dueDay || 31) - Number(b.dueDay || 31)), [bills, filter, allPayments]);

  const totalWaiting = useMemo(() => bills.filter((b) => !paid(b)).reduce((sum,b) => sum + amountFor(b), 0), [bills, allPayments]);
  const totalPaid = useMemo(() => bills.filter((b) => paid(b)).reduce((sum,b) => sum + amountFor(b), 0), [bills, allPayments]);

  const reset = () => {
    setEditId(null); setBillType('Elektrik'); setTitle(''); setSubscriberNo(''); setOwner(''); setDueDay('15'); setAmount('');
  };

  const save = () => {
    const cleanTitle = title.trim();
    const day = Number(String(dueDay).replace(/[^0-9]/g, ''));
    const value = parseMoney(amount);
    if (!cleanTitle) return Alert.alert('Açıklama gerekli', 'Örn. Ev elektrik veya Dükkan elektrik yaz.');
    if (day < 1 || day > 31) return Alert.alert('Gün hatalı', 'Son ödeme günü 1 ile 31 arasında olmalı.');
    if (value < 0) return Alert.alert('Tutar hatalı', 'Tutar 0 veya daha büyük olmalı.');

    if (editId) {
      setAllPayments((old) => old.map((x) => x.id === editId ? {
        ...x, billType, title: cleanTitle, subscriberNo: subscriberNo.trim(), owner: owner.trim(), dueDay: day,
        amount: value, monthlyAmounts: { ...(x.monthlyAmounts || {}), [month]: value },
      } : x));
    } else {
      setAllPayments((old) => [{
        id: `bill_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
        kind: 'bill', billType, title: cleanTitle, subscriberNo: subscriberNo.trim(), owner: owner.trim(), dueDay: day,
        amount: value, monthlyAmounts: { [month]: value }, paidPeriods: {}, createdAt: Date.now(),
      }, ...old]);
    }
    reset();
  };

  const openEdit = (b) => {
    setEditId(b.id); setBillType(b.billType || 'Diğer'); setTitle(b.title || b.name || '');
    setSubscriberNo(b.subscriberNo || ''); setOwner(b.owner || ''); setDueDay(String(b.dueDay || 1));
    setAmount(amountFor(b) ? String(amountFor(b)).replace('.', ',') : '');
  };

  const togglePaid = (b) => {
    const isPaid = paid(b);
    const billAmount = amountFor(b);
    if (!isPaid && billAmount <= 0) return Alert.alert('Tutar eksik', 'Ödemeden önce bu ayın fatura tutarını gir.');
    if (isPaid) {
      setAllPayments((old) => old.map((x) => {
        if (x.id !== b.id) return x;
        const next = { ...(x.paidPeriods || {}) }; delete next[month];
        return { ...x, paidPeriods: next };
      }));
      onRemoveExpense?.(b.id, month);
      return;
    }
    setAllPayments((old) => old.map((x) => x.id === b.id ? { ...x, paidPeriods: { ...(x.paidPeriods || {}), [month]: today() } } : x));
    onAddExpense?.({ sourcePaymentId: b.id, paymentPeriod: month, amount: billAmount, category: 'Fatura', note: `${b.billType || 'Fatura'} · ${b.title || ''}`.trim(), date: today() });
  };

  const remove = (b) => Alert.alert('Faturayı sil', `${b.title} kaydı silinsin mi?`, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Sil', style: 'destructive', onPress: () => setAllPayments((old) => old.filter((x) => x.id !== b.id)) },
  ]);

  return <View style={s.wrap}>
    <View><Text style={s.title}>Faturalar</Text><Text style={s.subtitle}>Elektrik, su, doğalgaz ve diğer abonelikleri tek yerde takip et.</Text></View>

    <View style={s.summaryRow}>
      <View style={s.summary}><Text style={s.summaryLabel}>BEKLEYEN</Text><Text style={[s.summaryValue,{color:C.warning}]}>{formatTRY(totalWaiting)}</Text></View>
      <View style={s.summary}><Text style={s.summaryLabel}>ÖDENEN</Text><Text style={[s.summaryValue,{color:C.income}]}>{formatTRY(totalPaid)}</Text></View>
    </View>

    <View style={s.card}>
      <Text style={s.cardTitle}>{editId ? 'Faturayı düzenle' : 'Fatura kaydet'}</Text>
      <Text style={s.label}>Fatura türü</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rowGap}>
        {TYPES.map((x) => <Chip key={x} label={x} active={billType === x} onPress={() => setBillType(x)} />)}
      </ScrollView>
      <Text style={s.label}>Açıklama</Text>
      <TextInput value={title} onChangeText={setTitle} placeholder="Örn. Ev elektrik / Dükkan elektrik" placeholderTextColor={C.muted} style={s.input} />
      <Text style={s.label}>Abone / sözleşme no</Text>
      <TextInput value={subscriberNo} onChangeText={setSubscriberNo} placeholder="Abone numarası" placeholderTextColor={C.muted} style={s.input} />
      <Text style={s.label}>Fatura kimin üzerine?</Text>
      <TextInput value={owner} onChangeText={setOwner} placeholder="Örn. Atakan Alkış" placeholderTextColor={C.muted} style={s.input} />
      <Text style={s.label}>Son ödeme günü</Text>
      <TextInput value={dueDay} onChangeText={setDueDay} keyboardType="number-pad" placeholder="15" placeholderTextColor={C.muted} style={s.input} />
      <MoneyInput label="Bu ay tutar" value={amount} onChangeText={setAmount} />
      <Text style={s.hint}>Tutar her ay değişebilir. Faturaya dokunup yeni ayın tutarını güncelleyebilirsin.</Text>
      <View style={s.actions}>
        {editId && <Pressable onPress={reset} style={s.secondary}><Text style={s.secondaryText}>Vazgeç</Text></Pressable>}
        <Pressable onPress={save} style={s.primary}><Text style={s.primaryText}>{editId ? 'Değişiklikleri Kaydet' : 'Faturayı Kaydet'}</Text></Pressable>
      </View>
    </View>

    <View style={s.filterRow}><Chip label="Bekleyen" active={filter==='waiting'} onPress={() => setFilter('waiting')} /><Chip label="Ödendi" active={filter==='paid'} onPress={() => setFilter('paid')} /><Chip label="Tümü" active={filter==='all'} onPress={() => setFilter('all')} /></View>

    {!visible.length ? <View style={s.empty}><Text style={s.emptyTitle}>Bu listede fatura yok</Text><Text style={s.subtitle}>Yukarıdan ilk faturayı ekleyebilirsin.</Text></View> : visible.map((b) => {
      const isPaid = paid(b); const a = amountFor(b); const due = dueDateFor(b);
      return <View key={b.id} style={[s.bill, isPaid && { borderColor:'rgba(45,212,167,.45)' }]}>
        <Pressable onPress={() => openEdit(b)} onLongPress={() => remove(b)} style={{flex:1}}>
          <View style={s.billHead}><Text style={s.billType}>{b.billType || 'Fatura'}</Text><Text style={[s.status,{color:isPaid?C.income:C.warning}]}>{isPaid?'ÖDENDİ':'BEKLİYOR'}</Text></View>
          <Text style={s.billTitle}>{b.title}</Text>
          {!!b.owner && <Text style={s.meta}>Kimin üzerine: {b.owner}</Text>}
          {!!b.subscriberNo && <Text style={s.meta}>Abone no: {b.subscriberNo}</Text>}
          <Text style={s.meta}>Son ödeme: her ay {b.dueDay}. gün · {pretty(due)}</Text>
          <Text style={s.amount}>{a > 0 ? formatTRY(a) : 'Tutar girilmedi'}</Text>
          <Text style={s.editHint}>Dokun: düzenle · Basılı tut: sil</Text>
        </Pressable>
        <Pressable onPress={() => togglePaid(b)} style={[s.payButton, isPaid && s.undoButton]}><Text style={[s.payText,isPaid&&{color:C.muted}]}>{isPaid?'Geri al':'Ödendi'}</Text></Pressable>
      </View>;
    })}
  </View>;
}

const s = StyleSheet.create({
  wrap:{gap:14}, title:{color:C.text,fontSize:25,fontWeight:'900'}, subtitle:{color:C.muted,fontSize:12,lineHeight:17,marginTop:3},
  summaryRow:{flexDirection:'row',gap:10}, summary:{flex:1,backgroundColor:C.card,borderWidth:1,borderColor:C.border,borderRadius:18,padding:14}, summaryLabel:{color:C.muted,fontSize:9,fontWeight:'900'}, summaryValue:{fontSize:17,fontWeight:'900',marginTop:7},
  card:{backgroundColor:C.card,borderWidth:1,borderColor:C.border,borderRadius:20,padding:16,gap:10}, cardTitle:{color:C.text,fontSize:18,fontWeight:'900'}, label:{color:C.muted,fontSize:11,fontWeight:'800',marginTop:3},
  input:{backgroundColor:C.bg,borderWidth:1,borderColor:C.border,borderRadius:14,color:C.text,paddingHorizontal:14,paddingVertical:12,fontSize:14}, rowGap:{gap:7,paddingVertical:2}, chip:{backgroundColor:C.card2,borderWidth:1,borderColor:C.border,borderRadius:999,paddingHorizontal:12,paddingVertical:8}, chipActive:{borderColor:C.accent,backgroundColor:'rgba(110,168,254,.13)'}, chipText:{color:C.muted,fontSize:11,fontWeight:'800'},
  hint:{color:C.muted,fontSize:10,lineHeight:15}, actions:{flexDirection:'row',gap:8}, primary:{flex:1,backgroundColor:C.accent,borderRadius:14,paddingVertical:13,alignItems:'center'}, primaryText:{color:'#071016',fontWeight:'900'}, secondary:{paddingHorizontal:15,borderWidth:1,borderColor:C.border,borderRadius:14,justifyContent:'center'}, secondaryText:{color:C.muted,fontWeight:'800'}, filterRow:{flexDirection:'row',gap:7,flexWrap:'wrap'},
  empty:{borderWidth:1,borderStyle:'dashed',borderColor:C.border,borderRadius:18,padding:22,alignItems:'center'}, emptyTitle:{color:C.text,fontSize:15,fontWeight:'900'},
  bill:{backgroundColor:C.card,borderWidth:1,borderColor:C.border,borderRadius:18,padding:14,flexDirection:'row',gap:10,alignItems:'center'}, billHead:{flexDirection:'row',justifyContent:'space-between',gap:10}, billType:{color:C.accent,fontSize:10,fontWeight:'900'}, status:{fontSize:9,fontWeight:'900'}, billTitle:{color:C.text,fontSize:16,fontWeight:'900',marginTop:4}, meta:{color:C.muted,fontSize:10,marginTop:3}, amount:{color:C.text,fontSize:18,fontWeight:'900',marginTop:8}, editHint:{color:C.accent,fontSize:9,marginTop:5},
  payButton:{backgroundColor:C.income,borderRadius:12,paddingHorizontal:12,paddingVertical:10}, undoButton:{backgroundColor:C.card2,borderWidth:1,borderColor:C.border}, payText:{color:'#071016',fontSize:11,fontWeight:'900'},
});
