import React from 'react';
import { Pressable, StyleSheet, TextInput, View, Text } from 'react-native';

const C = { bg: '#0B1020', border: '#263149', text: '#F5F7FB', muted: '#95A2B8', accent: '#6EA8FE' };

export function parseMoney(value) {
  const cleaned = String(value ?? '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function formatMoneyInput(value) {
  let text = String(value ?? '').trim();
  if (!text) return '';

  // Nokta ekranda binlik ayırıcıdır. Ondalık için uygulamadaki virgül tuşu kullanılır.
  text = text.replace(/\./g, '');
  const firstComma = text.indexOf(',');
  if (firstComma >= 0) text = text.slice(0, firstComma + 1) + text.slice(firstComma + 1).replace(/,/g, '');

  const hasComma = text.includes(',');
  const [rawInteger = '', rawDecimals = ''] = text.split(',');
  const integerDigits = rawInteger.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
  const decimals = rawDecimals.replace(/[^0-9]/g, '').slice(0, 2);
  const integer = integerDigits || '0';
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return hasComma ? `${grouped},${decimals}` : grouped;
}

export function formatTRY(value) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency', currency: 'TRY', maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function MoneyInput({ value, onChangeText, label, placeholder = '0,00', style }) {
  const addComma = () => {
    const current = String(value || '');
    if (!current.includes(',')) onChangeText(formatMoneyInput(`${current || '0'},`));
  };
  const addZeros = () => {
    const current = String(value || '');
    if (!current) return onChangeText('1.000');
    if (!current.includes(',')) return onChangeText(formatMoneyInput(`${current}000`));
  };

  return (
    <View style={s.wrap}>
      {!!label && <Text style={s.label}>{label}</Text>}
      <View style={s.row}>
        <TextInput
          value={value}
          onChangeText={(t) => onChangeText(formatMoneyInput(t))}
          keyboardType="number-pad"
          placeholder={placeholder}
          placeholderTextColor={C.muted}
          style={[s.input, style]}
          selectTextOnFocus={false}
        />
        <View style={s.keys}>
          <Pressable onPress={addComma} style={s.key}><Text style={s.keyText}>,</Text></Pressable>
          <Pressable onPress={addZeros} style={s.key}><Text style={s.keyText}>000</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 7 },
  label: { color: C.muted, fontSize: 12, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  input: {
    flex: 1, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 14,
    color: C.text, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, fontWeight: '800',
  },
  keys: { flexDirection: 'row', gap: 6 },
  key: { minWidth: 46, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  keyText: { color: C.accent, fontSize: 16, fontWeight: '900' },
});
