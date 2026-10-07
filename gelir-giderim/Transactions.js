import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MoneyInput, { parseMoney, formatTRY, formatMoneyInput } from './MoneyInput';

const C={bg:'#0B1020',card:'#141B2D',card2:'#101726',border:'#263149',text:'#F5F7FB',muted:'#95A2B8',income:'#2DD4A7',expense:'#FF6B6B',accent:'#6EA8FE'};
const INCOME=['Maaş','Kira Geliri','Ek İş','Satış','Tahsilat','Prim','Faiz/Getiri','Diğer'];
const EXPENSE=['Kira','Market','Benzin','Fatura','Abonelik','Ulaşım','Borç','Kredi','Kredi Kartı','Yemek','Çocuk','Sağlık','İş','Diğer'];
const pad=(n)=>String(n).padStart(2,'0');
const today=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
const monthKey=(d)=>String(d||'').slice(0,7);
const pretty=(iso)=>{const[y,m,d]=String(iso||'').split('-');return y&&m&&d?`${d}.${m}.${y}`:iso;};

function Pill({label,active,onPress,danger}){return <Pressable onPress={onPress} style={[s.pill,active&&{borderColor:danger?C.expense:C.accent,backgroundColor:danger?'rgba(255,107,107,.14)':'rgba(110,168,254,.14)'}]}><Text style={[s.pillText,active&&{color:danger?C.expense:C.accent}]}>{label}</Text></Pressable>;}
function Summary({label,value,color}){return <View style={s.summary}><Text style={s.smallLabel}>{label}</Text><Text style={[s.summaryValue,{color}]} numberOfLines={1}>{formatTRY(value)}</Text></View>;}

export default function Transactions({items,setItems,selectedMonth,setSelectedMonth,initialType='expense'}){
  const [type,setType]=useState(initialType),[amount,setAmount]=useState(''),[category,setCategory]=useState(initialType==='income'?'Maaş':'Market'),[note,setNote]=useState(''),[date,setDate]=useState(today()),[filter,setFilter]=useState('all');
  const [editing,setEditing]=useState(null),[editType,setEditType]=useState('expense'),[editAmount,setEditAmount]=useState(''),[editCategory,setEditCategory]=useState('Market'),[editNote,setEditNote]=useState(''),[editDate,setEditDate]=useState(today());

  useEffect(()=>setType(initialType||'expense'),[initialType]);
  useEffect(()=>{const cats=type==='income'?INCOME:EXPENSE;if(!cats.includes(category))setCategory(cats[0]);},[type,category]);
  useEffect(()=>{const cats=editType==='income'?INCOME:EXPENSE;if(!cats.includes(editCategory))setEditCategory(cats[0]);},[editType,editCategory]);

  const months=useMemo(()=>[...new Set([monthKey(today()),...items.map((x)=>monthKey(x.date))])].filter(Boolean).sort().reverse(),[items]);
  const monthItems=useMemo(()=>items.filter((x)=>monthKey(x.date)===selectedMonth),[items,selectedMonth]);
  const visible=useMemo(()=>[...(filter==='all'?monthItems:monthItems.filter((x)=>x.type===filter))].sort((a,b)=>(b.date||'').localeCompare(a.date||'')||Number(b.createdAt||0)-Number(a.createdAt||0)),[monthItems,filter]);
  const totals=useMemo(()=>({income:monthItems.filter((x)=>x.type==='income').reduce((a,x)=>a+Number(x.amount||0),0),expense:monthItems.filter((x)=>x.type==='expense').reduce((a,x)=>a+Number(x.amount||0),0)}),[monthItems]);
  const categories=type==='income'?INCOME:EXPENSE, editCategories=editType==='income'?INCOME:EXPENSE;

  const add=()=>{const value=parseMoney(amount);if(value<=0)return Alert.alert('Tutar gerekli','0’dan büyük bir tutar gir.');if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return Alert.alert('Tarih hatalı','Tarihi 2026-10-07 biçiminde gir.');setItems((old)=>[{id:`${Date.now()}_${Math.random().toString(36).slice(2,8)}`,type,amount:value,category,note:note.trim(),date,createdAt:Date.now()},...old]);setAmount('');setNote('');setSelectedMonth(monthKey(date));};
  const openEdit=(x)=>{setEditing(x);setEditType(x.type);setEditAmount(formatMoneyInput(String(x.amount??'').replace('.',',')));setEditCategory(x.category||'Diğer');setEditNote(x.note||'');setEditDate(x.date||today());};
  const saveEdit=()=>{if(!editing)return;const value=parseMoney(editAmount);if(value<=0)return Alert.alert('Tutar gerekli','0’dan büyük bir tutar gir.');if(!/^\d{4}-\d{2}-\d{2}$/.test(editDate))return Alert.alert('Tarih hatalı','Tarihi 2026-10-07 biçiminde gir.');setItems((old)=>old.map((x)=>x.id===editing.id?{...x,type:editType,amount:value,category:editCategory,note:editNote.trim(),date:editDate}:x));setSelectedMonth(monthKey(editDate));setEditing(null);};
  const remove=()=>{if(!editing)return;Alert.alert('İşlemi sil','Bu kayıt kalıcı olarak silinsin mi?',[{text:'Vazgeç',style:'cancel'},{text:'Sil',style:'destructive',onPress:()=>{setItems((old)=>old.filter((x)=>x.id!==editing.id));setEditing(null);}}]);};

  return <View style={s.wrap}>
    <View><Text style={s.pageTitle}>Gelir & Giderler</Text><Text style={s.subtitle}>Her kaydı sonradan düzenleyebilirsin. Fatura, kira ve borç ödemeleri işaretlendiğinde buraya otomatik gelir.</Text></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rowGap}>{months.map((m)=><Pill key={m} label={m} active={selectedMonth===m} onPress={()=>setSelectedMonth(m)}/>)}</ScrollView>
    <View style={s.twoCol}><Summary label="AYLIK GELİR" value={totals.income} color={C.income}/><Summary label="AYLIK GİDER" value={totals.expense} color={C.expense}/></View>

    <View style={s.card}>
      <Text style={s.cardTitle}>Yeni işlem</Text>
      <View style={s.segmentRow}><Pressable onPress={()=>setType('expense')} style={[s.segment,type==='expense'&&{backgroundColor:'rgba(255,107,107,.14)'}]}><Text style={{color:type==='expense'?C.expense:C.muted,fontWeight:'900'}}>Gider</Text></Pressable><Pressable onPress={()=>setType('income')} style={[s.segment,type==='income'&&{backgroundColor:'rgba(45,212,167,.14)'}]}><Text style={{color:type==='income'?C.income:C.muted,fontWeight:'900'}}>Gelir</Text></Pressable></View>
      <MoneyInput label="Tutar" value={amount} onChangeText={setAmount}/>
      <Text style={s.label}>Kategori</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rowGap}>{categories.map((x)=><Pill key={x} label={x} active={category===x} danger={type==='expense'} onPress={()=>setCategory(x)}/>)}</ScrollView>
      <Text style={s.label}>Açıklama</Text><TextInput value={note} onChangeText={setNote} placeholder="Örn. market alışverişi / benzin" placeholderTextColor={C.muted} style={s.input}/>
      <Text style={s.label}>Tarih</Text><TextInput value={date} onChangeText={setDate} placeholder="YYYY-AA-GG" placeholderTextColor={C.muted} style={s.input}/>
      <Pressable onPress={add} style={[s.primary,{backgroundColor:type==='expense'?C.expense:C.income}]}><Text style={s.primaryText}>{type==='expense'?'Gideri Kaydet':'Geliri Kaydet'}</Text></Pressable>
    </View>

    <View style={s.listHead}><Text style={s.cardTitle}>İşlem listesi</Text><View style={s.filterRow}><Pill label="Tümü" active={filter==='all'} onPress={()=>setFilter('all')}/><Pill label="Gelir" active={filter==='income'} onPress={()=>setFilter('income')}/><Pill label="Gider" active={filter==='expense'} danger onPress={()=>setFilter('expense')}/></View></View>
    {!visible.length?<View style={s.empty}><Text style={s.emptyTitle}>Henüz kayıt yok</Text><Text style={s.subtitle}>İlk gelir veya giderini ekle.</Text></View>:visible.map((x)=><Pressable key={x.id} onPress={()=>openEdit(x)} style={s.tx}><View style={[s.icon,{backgroundColor:x.type==='income'?'rgba(45,212,167,.14)':'rgba(255,107,107,.14)'}]}><Text style={{color:x.type==='income'?C.income:C.expense,fontSize:20,fontWeight:'900'}}>{x.type==='income'?'+':'−'}</Text></View><View style={{flex:1}}><Text style={s.txCat}>{x.category}</Text><Text style={s.txMeta}>{pretty(x.date)}{x.note?` · ${x.note}`:''}</Text>{x.sourcePaymentId&&<Text style={s.auto}>Otomatik kayıt</Text>}</View><Text style={[s.txAmount,{color:x.type==='income'?C.income:C.expense}]}>{x.type==='income'?'+':'−'}{formatTRY(x.amount)}</Text></Pressable>)}

    <Modal visible={Boolean(editing)} transparent animationType="slide" onRequestClose={()=>setEditing(null)}><View style={s.modalShade}><KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={s.modalWrap}><ScrollView contentContainerStyle={s.modalCard} keyboardShouldPersistTaps="handled"><View style={s.modalHead}><Text style={s.cardTitle}>İşlemi düzenle</Text><Pressable onPress={()=>setEditing(null)}><Text style={s.close}>Kapat</Text></Pressable></View>
      <View style={s.segmentRow}><Pressable onPress={()=>setEditType('expense')} style={[s.segment,editType==='expense'&&{backgroundColor:'rgba(255,107,107,.14)'}]}><Text style={{color:editType==='expense'?C.expense:C.muted,fontWeight:'900'}}>Gider</Text></Pressable><Pressable onPress={()=>setEditType('income')} style={[s.segment,editType==='income'&&{backgroundColor:'rgba(45,212,167,.14)'}]}><Text style={{color:editType==='income'?C.income:C.muted,fontWeight:'900'}}>Gelir</Text></Pressable></View>
      <MoneyInput label="Tutar" value={editAmount} onChangeText={setEditAmount}/>
      <Text style={s.label}>Kategori</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rowGap}>{editCategories.map((x)=><Pill key={x} label={x} active={editCategory===x} danger={editType==='expense'} onPress={()=>setEditCategory(x)}/>)}</ScrollView>
      <Text style={s.label}>Açıklama</Text><TextInput value={editNote} onChangeText={setEditNote} placeholder="Açıklama" placeholderTextColor={C.muted} style={s.input}/>
      <Text style={s.label}>Tarih</Text><TextInput value={editDate} onChangeText={setEditDate} placeholder="YYYY-AA-GG" placeholderTextColor={C.muted} style={s.input}/>
      <Pressable onPress={saveEdit} style={[s.primary,{backgroundColor:C.accent}]}><Text style={s.primaryText}>Değişiklikleri Kaydet</Text></Pressable><Pressable onPress={remove} style={s.deleteButton}><Text style={s.deleteText}>Bu kaydı sil</Text></Pressable>
    </ScrollView></KeyboardAvoidingView></View></Modal>
  </View>;
}

const s=StyleSheet.create({wrap:{gap:14},pageTitle:{color:C.text,fontSize:24,fontWeight:'900'},subtitle:{color:C.muted,fontSize:12,marginTop:4,lineHeight:17},rowGap:{gap:8,paddingVertical:2},twoCol:{flexDirection:'row',gap:10},summary:{flex:1,backgroundColor:C.card,borderWidth:1,borderColor:C.border,padding:14,borderRadius:18},smallLabel:{color:C.muted,fontSize:10,fontWeight:'900'},summaryValue:{fontSize:18,fontWeight:'900',marginTop:8},card:{backgroundColor:C.card,borderWidth:1,borderColor:C.border,padding:16,borderRadius:20,gap:10},cardTitle:{color:C.text,fontSize:17,fontWeight:'900'},segmentRow:{flexDirection:'row',backgroundColor:C.bg,borderRadius:14,padding:4,gap:4},segment:{flex:1,paddingVertical:10,borderRadius:11,alignItems:'center'},label:{color:C.muted,fontSize:12,fontWeight:'700',marginTop:4},input:{backgroundColor:C.bg,borderWidth:1,borderColor:C.border,borderRadius:14,color:C.text,paddingHorizontal:14,paddingVertical:12,fontSize:15},primary:{paddingVertical:14,borderRadius:14,alignItems:'center'},primaryText:{color:'#071016',fontWeight:'900',fontSize:14},pill:{borderWidth:1,borderColor:C.border,backgroundColor:C.card2,paddingHorizontal:12,paddingVertical:8,borderRadius:999},pillText:{color:C.muted,fontSize:12,fontWeight:'700'},listHead:{gap:8},filterRow:{flexDirection:'row',gap:7,flexWrap:'wrap'},empty:{borderWidth:1,borderStyle:'dashed',borderColor:C.border,borderRadius:18,padding:22,alignItems:'center'},emptyTitle:{color:C.text,fontSize:15,fontWeight:'900'},tx:{flexDirection:'row',alignItems:'center',gap:10,backgroundColor:C.card,borderWidth:1,borderColor:C.border,borderRadius:17,padding:12},icon:{width:38,height:38,borderRadius:12,alignItems:'center',justifyContent:'center'},txCat:{color:C.text,fontSize:13,fontWeight:'900'},txMeta:{color:C.muted,fontSize:10,marginTop:2},auto:{color:C.accent,fontSize:9,marginTop:3,fontWeight:'800'},txAmount:{fontSize:13,fontWeight:'900'},modalShade:{flex:1,backgroundColor:'rgba(0,0,0,.72)',justifyContent:'flex-end'},modalWrap:{maxHeight:'92%'},modalCard:{backgroundColor:C.card,borderTopLeftRadius:24,borderTopRightRadius:24,padding:18,gap:10,paddingBottom:38},modalHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},close:{color:C.accent,fontWeight:'900'},deleteButton:{borderWidth:1,borderColor:'rgba(255,107,107,.45)',borderRadius:14,paddingVertical:12,alignItems:'center'},deleteText:{color:C.expense,fontWeight:'900'}});
