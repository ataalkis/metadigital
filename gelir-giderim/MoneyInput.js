import React from 'react';
import { StyleSheet, TextInput, View, Text } from 'react-native';

const C = { bg: '#0B1020', border: '#263149', text: '#F5F7FB', muted: '#95A2B8' };

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

  // Kullanıcı ondalık için nokta tuşuna basarsa son noktayı virgül kabul et.
  if (/\.$/.test(text)) text = `${text.slice(0, -1)},`;

  const hasComma = text.includes(',');
  const parts = text.split(',');
  const integerDigits = (parts[0] || '').replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
  const decimals = (parts.slice(1).join('') || '').replace(/[^0-9]/g, '').slice(0, 2);
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
  return (
    <View style={s.wrap}>
      {!!label && <Text style={s.label}>{label}</Text>}
      <TextInput
        value={value}
        onChangeText={(t) => onChangeText(formatMoneyInput(t))}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        style={[s.input, style]}
        selectTextOnFocus={false}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 7 },
  label: { color: C.muted, fontSize: 12, fontWeight: '800' },
  input: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 14,
    color: C.text, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, fontWeight: '800',
  },
});
