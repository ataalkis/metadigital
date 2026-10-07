import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MoneyInput, { parseMoney, formatTRY, formatMoneyInput } from './MoneyInput';

const PAYMENT_KEY='@gelir_giderim_payments_v1';
const C={bg:'#0B1020',card:'#141B2D',card2:'#101726',border:'#263149',text:'#F5F7FB',muted:'#95A2B8',income:'#2DD4A7',expense:'#FF6B6B',accent:'#6EA8FE',warning:'#FBBF24'};
const pad=(n)=>String(n).padStart(2,'0');
const today=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
const monthKey=(d)=>String(d||'').slice(0,7);
const pretty=(iso)=>{const[y,m,d]=String(iso||'').split('-');return y&&m&&d?`${d}.${m}.${y}`:iso;};
const LABEL={fixed:'Sabit Ödeme',loan:'Kredi',person:'Kişiye Borç',pending:'Bekleyen Ödeme'};

function Chip({label,active,onPress}){return <Pressable onPress={onPress} style={[s.chip,active&&s.chipActive]}><Text style={[s.chipText,active&&{color:C.accent}]}>{label}</Text></Pressable>;}
function toInput(v){return formatMoneyInput(String(Number(v||0)).replace('.',','));}
function personPaid(p){return (p.paymentHistory||[]).reduce((sum,x)=>sum+Number(x.amount||0),0);}
function personRemaining(p){return Math.max(0,Number(p.totalDebt??p.amount??0)-personPaid(p));}
function addMonths(period,offset){const[y,m]=period.split('-').map(Number);const d=new Date(y,m-1+offset,1);return `${d.getFullYear()}-${pad(d.getMonth()+1)}`;}
function dueDateFor(period,day){return `${period}-${pad(Math.min(28,Math.max(1,Number(day||1))))}`;}

function normalize(items){
  return (items||[]).map((p)=>{
    if(p.kind==='person'){
      const history=Array.isArray(p.paymentHistory)?p.paymentHistory:[];
      return {...p,totalDebt:Number(p.totalDebt??p.amount??0),paymentHistory:history,paidTotal:history.reduce((a,x)=>a+Number(x.amount||0),0)};
    }
    if(p.kind==='loan'){
      const paidCount=Object.keys(p.paidPeriods||{}).length;
      const remaining=Number(p.remainingInstallments||0);
      return {...p,paidPeriods:p.paidPeriods||{},remainingInstallments:remaining,startingInstallments:Number(p.startingInstallments||remaining+paidCount)};
    }
    return p;
  });
}

export default function Payments({onAddExpense,onRemoveExpense}){
  const [payments,setPayments]=useState([]),[loaded,setLoaded]=useState(false),[kind,setKind]=useState('fixed'),[name,setName]=useState(''),[amount,setAmount]=useState(''),[dueDay,setDueDay]=useState('1'),[remaining,setRemaining]=useState(''),[dueDate,setDueDate]=useState(today()),[filter,setFilter]=useState('waiting');
  const [selectedId,setSelectedId]=useState(null);
  const [editName,setEditName]=useState(''),[editAmount,setEditAmount]=useState(''),[editDueDay,setEditDueDay]=useState('1'),[editRemaining,setEditRemaining]=useState(''),[editDueDate,setEditDueDate]=useState(today()),[editTotalDebt,setEditTotalDebt]=useState('');
  const [partAmount,setPartAmount]=useState(''),[partDate,setPartDate]=useState(today()),[partNote,setPartNote]=useState('');
  const month=monthKey(today());

  useEffect(()=>{AsyncStorage.getItem(PAYMENT_KEY).then((x)=>setPayments(normalize(x?JSON.parse(x):[]))).catch(()=>{}).finally(()=>setLoaded(true));},[]);
  useEffect(()=>{if(loaded)AsyncStorage.setItem(PAYMENT_KEY,JSON.stringify(payments)).catch(()=>{});},[payments,loaded]);

  const data=useMemo(()=>payments.filter((x)=>x.kind!=='bill'),[payments]);
  const selected=useMemo(()=>data.find((x)=>x.id===selectedId)||null,[data,selectedId]);
  const isPaid=(p)=>p.kind==='person'?personRemaining(p)<=0:(p.kind==='fixed'||p.kind==='loan')?Boolean(p.paidPeriods?.[month]):Boolean(p.paidAt);
  const visible=useMemo(()=>[...data].filter((p)=>filter==='all'?true:filter==='paid'?isPaid(p):!isPaid(p)).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'tr')),[data,filter,month]);
  const loanRemaining=useMemo(()=>data.filter((p)=>p.kind==='loan').reduce((sum,p)=>sum+Number(p.amount||0)*Number(p.remainingInstallments||0),0),[data]);
  const waitingTotal=useMemo(()=>data.reduce((sum,p)=>{
    if(p.kind==='person')return sum+personRemaining(p);
    if(p.kind==='loan'||p.kind==='fixed')return sum+(p.paidPeriods?.[month]?0:Number(p.amount||0));
    return sum+(p.paidAt?0:Number(p.amount||0));
  },0),[data,month]);

  const add=()=>{
    const v=parseMoney(amount);if(!name.trim())return Alert.alert('Ad gerekli','Ödeme için bir ad yaz.');if(v<=0)return Alert.alert('Tutar gerekli','0’dan büyük bir tutar gir.');
    const base={id:`pay_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,kind,name:name.trim(),amount:v,createdAt:Date.now()};
    if(kind==='fixed'||kind==='loan'){const d=Number(dueDay);if(d<1||d>31)return Alert.alert('Gün hatalı','1-31 arasında gün gir.');base.dueDay=d;base.paidPeriods={};}
    if(kind==='loan'){const r=Number(remaining);if(r<=0)return Alert.alert('Taksit gerekli','Kalan taksit sayısını gir.');base.remainingInstallments=r;base.startingInstallments=r;}
    if(kind==='person'){if(!/^\d{4}-\d{2}-\d{2}$/.test(dueDate))return Alert.alert('Tarih hatalı','YYYY-AA-GG biçiminde tarih gir.');base.totalDebt=v;base.paymentHistory=[];base.paidTotal=0;base.dueDate=dueDate;}
    if(kind==='pending'){if(!/^\d{4}-\d{2}-\d{2}$/.test(dueDate))return Alert.alert('Tarih hatalı','YYYY-AA-GG biçiminde tarih gir.');base.dueDate=dueDate;base.paidAt=null;}
    setPayments((old)=>[base,...old]);setName('');setAmount('');setRemaining('');
  };

  const openDetail=(p)=>{
    setSelectedId(p.id);setEditName(p.name||'');setEditAmount(toInput(p.amount));setEditDueDay(String(p.dueDay||1));setEditRemaining(String(p.remainingInstallments||''));setEditDueDate(p.dueDate||today());setEditTotalDebt(toInput(p.totalDebt??p.amount));setPartAmount('');setPartDate(today());setPartNote('');
  };

  const saveDetail=()=>{
    if(!selected)return;const clean=editName.trim();if(!clean)return Alert.alert('Ad gerekli','Kayıt adını yaz.');
    setPayments((old)=>old.map((x)=>{
      if(x.id!==selected.id)return x;
      if(x.kind==='person'){const total=parseMoney(editTotalDebt);if(total<=0)return x;return {...x,name:clean,totalDebt:total,amount:total,dueDate:editDueDate};}
      if(x.kind==='loan'){const a=parseMoney(editAmount),d=Number(editDueDay),r=Number(editRemaining);if(a<=0||d<1||d>31||r<0)return x;return {...x,name:clean,amount:a,dueDay:d,remainingInstallments:r,startingInstallments:Math.max(Number(x.startingInstallments||0),r+Object.keys(x.paidPeriods||{}).length)};}
      if(x.kind==='fixed'){const a=parseMoney(editAmount),d=Number(editDueDay);if(a<=0||d<1||d>31)return x;return {...x,name:clean,amount:a,dueDay:d};}
      const a=parseMoney(editAmount);if(a<=0)return x;return {...x,name:clean,amount:a,dueDate:editDueDate};
    }));
    Alert.alert('Kaydedildi','Değişiklikler güncellendi.');
  };

  const toggle=(p)=>{
    if(p.kind==='person')return openDetail(p);
    const recurring=p.kind==='fixed'||p.kind==='loan',period=recurring?month:'once',paid=isPaid(p);
    if(paid){setPayments((old)=>old.map((x)=>{if(x.id!==p.id)return x;if(recurring){const n={...(x.paidPeriods||{})};delete n[month];return {...x,paidPeriods:n,remainingInstallments:x.kind==='loan'?Number(x.remainingInstallments||0)+1:x.remainingInstallments};}return {...x,paidAt:null};}));onRemoveExpense?.(p.id,period);return;}
    if(p.kind==='loan'&&Number(p.remainingInstallments||0)<=0)return Alert.alert('Kredi tamamlandı','Kalan taksit görünmüyor.');
    setPayments((old)=>old.map((x)=>x.id===p.id?(recurring?{...x,paidPeriods:{...(x.paidPeriods||{}),[month]:today()},remainingInstallments:x.kind==='loan'?Math.max(0,Number(x.remainingInstallments||0)-1):x.remainingInstallments}:{...x,paidAt:today()}):x));
    onAddExpense?.({sourcePaymentId:p.id,paymentPeriod:period,amount:Number(p.amount||0),category:p.kind==='fixed'?'Kira':'Borç',note:p.name,date:today()});
  };

  const addPartial=()=>{
    if(!selected||selected.kind!=='person')return;const value=parseMoney(partAmount);const left=personRemaining(selected);
    if(value<=0)return Alert.alert('Tutar gerekli','Ödediğin tutarı yaz.');
    if(value>left)return Alert.alert('Tutar fazla',`Kalan borç ${formatTRY(left)}.`);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(partDate))return Alert.alert('Tarih hatalı','YYYY-AA-GG biçiminde tarih gir.');
    const entry={id:`part_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,amount:value,date:partDate,note:partNote.trim(),createdAt:Date.now()};
    setPayments((old)=>old.map((x)=>x.id===selected.id?{...x,paymentHistory:[...(x.paymentHistory||[]),entry],paidTotal:personPaid({...x,paymentHistory:[...(x.paymentHistory||[]),entry]})}:x));
    onAddExpense?.({sourcePaymentId:selected.id,paymentPeriod:entry.id,amount:value,category:'Borç',note:`${selected.name} borç ödemesi${entry.note?` · ${entry.note}`:''}`,date:partDate});
    setPartAmount('');setPartNote('');setPartDate(today());
  };

  const undoPartial=(entry)=>{
    if(!selected)return;
    setPayments((old)=>old.map((x)=>{if(x.id!==selected.id)return x;const next=(x.paymentHistory||[]).filter((h)=>h.id!==entry.id);return {...x,paymentHistory:next,paidTotal:personPaid({...x,paymentHistory:next})};}));
    onRemoveExpense?.(selected.id,entry.id);
  };

  const undoLoanPeriod=(period)=>{
    if(!selected||selected.kind!=='loan')return;
    setPayments((old)=>old.map((x)=>{if(x.id!==selected.id)return x;const next={...(x.paidPeriods||{})};delete next[period];return {...x,paidPeriods:next,remainingInstallments:Number(x.remainingInstallments||0)+1};}));
    onRemoveExpense?.(selected.id,period);
  };

  const removeSelected=()=>{if(!selected)return;Alert.alert('Kaydı sil',`${selected.name} tamamen silinsin mi?`,[{text:'Vazgeç',style:'cancel'},{text:'Sil',style:'destructive',onPress:()=>{setPayments((old)=>old.filter((x)=>x.id!==selected.id));setSelectedId(null);}}]);};

  const paidLoanPeriods=selected?.kind==='loan'?Object.entries(selected.paidPeriods||{}).sort((a,b)=>b[0].localeCompare(a[0])):[];
  const futureLoanPeriods=selected?.kind==='loan'?Array.from({length:Number(selected.remainingInstallments||0)},(_,i)=>addMonths(month,(selected.paidPeriods?.[month]?1:0)+i)):[];

  return <View style={s.wrap}>
    <View style={s.summaryRow}><View style={s.summary}><Text style={s.small}>BEKLEYEN</Text><Text style={[s.sumValue,{color:C.warning}]}>{formatTRY(waitingTotal)}</Text></View><View style={s.summary}><Text style={s.small}>KREDİ KALAN</Text><Text style={[s.sumValue,{color:C.accent}]}>{formatTRY(loanRemaining)}</Text></View></View>

    <View style={s.card}><Text style={s.cardTitle}>Ödeme / borç ekle</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rowGap}><Chip label="Sabit / Kira" active={kind==='fixed'} onPress={()=>setKind('fixed')}/><Chip label="Kredi" active={kind==='loan'} onPress={()=>setKind('loan')}/><Chip label="Kişiye Borç" active={kind==='person'} onPress={()=>setKind('person')}/><Chip label="Bekleyen" active={kind==='pending'} onPress={()=>setKind('pending')}/></ScrollView>
      <Text style={s.label}>{kind==='person'?'Kime borçlusun?':'Ödeme adı'}</Text><TextInput value={name} onChangeText={setName} placeholder={kind==='fixed'?'Örn. Ev kirası':kind==='loan'?'Örn. İhtiyaç kredisi':kind==='person'?'Örn. Ahmet':'Örn. Servis ödemesi'} placeholderTextColor={C.muted} style={s.input}/>
      <MoneyInput label={kind==='loan'?'Aylık taksit':kind==='person'?'Toplam borç':'Tutar'} value={amount} onChangeText={setAmount}/>
      {(kind==='fixed'||kind==='loan')&&<><Text style={s.label}>Her ay ödeme günü</Text><TextInput value={dueDay} onChangeText={setDueDay} keyboardType="number-pad" placeholder="1" placeholderTextColor={C.muted} style={s.input}/></>}
      {kind==='loan'&&<><Text style={s.label}>Kalan taksit</Text><TextInput value={remaining} onChangeText={setRemaining} keyboardType="number-pad" placeholder="12" placeholderTextColor={C.muted} style={s.input}/></>}
      {(kind==='person'||kind==='pending')&&<><Text style={s.label}>Son ödeme tarihi</Text><TextInput value={dueDate} onChangeText={setDueDate} placeholder="YYYY-AA-GG" placeholderTextColor={C.muted} style={s.input}/></>}
      <Pressable onPress={add} style={s.primary}><Text style={s.primaryText}>Kaydet</Text></Pressable>
    </View>

    <View style={s.filter}><Chip label="Bekleyen" active={filter==='waiting'} onPress={()=>setFilter('waiting')}/><Chip label="Ödendi" active={filter==='paid'} onPress={()=>setFilter('paid')}/><Chip label="Tümü" active={filter==='all'} onPress={()=>setFilter('all')}/></View>

    {!visible.length?<View style={s.empty}><Text style={s.emptyTitle}>Kayıt yok</Text><Text style={s.hint}>Kira, kredi veya borç ekleyebilirsin.</Text></View>:visible.map((p)=>{
      const paid=isPaid(p),loan=p.kind==='loan',person=p.kind==='person',left=person?personRemaining(p):0,paidPerson=person?personPaid(p):0;
      return <View key={p.id} style={[s.item,paid&&{borderColor:'rgba(45,212,167,.45)'}]}>
        <Pressable onPress={()=>openDetail(p)} style={{flex:1}}><View style={s.itemHead}><Text style={s.kind}>{LABEL[p.kind]||'Ödeme'}</Text><Text style={[s.status,{color:paid?C.income:C.warning}]}>{paid?'TAMAMLANDI':person&&paidPerson>0?'KISMİ ÖDENDİ':'BEKLİYOR'}</Text></View><Text style={s.name}>{p.name}</Text>
          {person?<><Text style={s.meta}>Toplam {formatTRY(p.totalDebt??p.amount)} · Ödenen {formatTRY(paidPerson)}</Text><Text style={[s.amount,{color:left>0?C.warning:C.income}]}>Kalan {formatTRY(left)}</Text></>:loan?<><Text style={s.meta}>{p.remainingInstallments||0} taksit kaldı · Aylık {formatTRY(p.amount)}</Text><Text style={s.amount}>Kalan {formatTRY(Number(p.amount||0)*Number(p.remainingInstallments||0))}</Text></>:<><Text style={s.meta}>{p.kind==='fixed'?`Her ay ${p.dueDay}. gün`:`Son ödeme ${pretty(p.dueDate)}`}</Text><Text style={s.amount}>{formatTRY(p.amount)}</Text></>}
          <Text style={s.detailHint}>Dokun: ayrıntılar ve düzenleme</Text>
        </Pressable>
        {!person&&<Pressable onPress={()=>toggle(p)} style={[s.pay,paid&&s.undo]}><Text style={[s.payText,paid&&{color:C.muted}]}>{paid?'Geri al':'Ödendi'}</Text></Pressable>}
      </View>;
    })}

    <Modal visible={Boolean(selected)} transparent animationType="slide" onRequestClose={()=>setSelectedId(null)}><View style={s.modalShade}><View style={s.modalWrap}><ScrollView contentContainerStyle={s.modalCard} keyboardShouldPersistTaps="handled">
      <View style={s.modalHead}><View><Text style={s.kind}>{selected?LABEL[selected.kind]:''}</Text><Text style={s.modalTitle}>{selected?.name}</Text></View><Pressable onPress={()=>setSelectedId(null)}><Text style={s.close}>Kapat</Text></Pressable></View>

      {selected?.kind==='person'&&<>
        <View style={s.detailSummary}><View><Text style={s.small}>TOPLAM</Text><Text style={s.detailValue}>{formatTRY(selected.totalDebt??selected.amount)}</Text></View><View><Text style={s.small}>ÖDENEN</Text><Text style={[s.detailValue,{color:C.income}]}>{formatTRY(personPaid(selected))}</Text></View><View><Text style={s.small}>KALAN</Text><Text style={[s.detailValue,{color:C.warning}]}>{formatTRY(personRemaining(selected))}</Text></View></View>
        <Text style={s.sectionTitle}>Kısmi ödeme ekle</Text><MoneyInput label="Ödenen tutar" value={partAmount} onChangeText={setPartAmount}/><Text style={s.label}>Ödeme tarihi</Text><TextInput value={partDate} onChangeText={setPartDate} placeholder="YYYY-AA-GG" placeholderTextColor={C.muted} style={s.input}/><Text style={s.label}>Açıklama</Text><TextInput value={partNote} onChangeText={setPartNote} placeholder="Örn. EFT / nakit" placeholderTextColor={C.muted} style={s.input}/><Pressable onPress={addPartial} style={s.primary}><Text style={s.primaryText}>Ödemeyi Kaydet</Text></Pressable>
        <Text style={s.sectionTitle}>Ödeme geçmişi</Text>{!(selected.paymentHistory||[]).length?<Text style={s.hint}>Henüz ödeme yok.</Text>:[...(selected.paymentHistory||[])].sort((a,b)=>String(b.date).localeCompare(String(a.date))).map((h)=><View key={h.id} style={s.historyRow}><View style={{flex:1}}><Text style={s.historyAmount}>{formatTRY(h.amount)}</Text><Text style={s.meta}>{pretty(h.date)}{h.note?` · ${h.note}`:''}</Text></View><Pressable onPress={()=>undoPartial(h)}><Text style={s.dangerLink}>Geri al</Text></Pressable></View>)}
      </>}

      {selected?.kind==='loan'&&<>
        <View style={s.detailSummary}><View><Text style={s.small}>AYLIK</Text><Text style={s.detailValue}>{formatTRY(selected.amount)}</Text></View><View><Text style={s.small}>KALAN TAKSİT</Text><Text style={[s.detailValue,{color:C.warning}]}>{selected.remainingInstallments||0}</Text></View><View><Text style={s.small}>KALAN BORÇ</Text><Text style={[s.detailValue,{color:C.accent}]}>{formatTRY(Number(selected.amount||0)*Number(selected.remainingInstallments||0))}</Text></View></View>
        <Text style={s.sectionTitle}>Ödenen taksitler</Text>{!paidLoanPeriods.length?<Text style={s.hint}>Henüz kayıtlı ödenmiş taksit yok.</Text>:paidLoanPeriods.map(([period,date])=><View key={period} style={s.historyRow}><View style={{flex:1}}><Text style={s.historyAmount}>{formatTRY(selected.amount)}</Text><Text style={s.meta}>{period} · ödendi {pretty(date)}</Text></View><Pressable onPress={()=>undoLoanPeriod(period)}><Text style={s.dangerLink}>Geri al</Text></Pressable></View>)}
        <Text style={s.sectionTitle}>Kalan taksitler</Text>{futureLoanPeriods.map((period,i)=><View key={`${period}_${i}`} style={s.scheduleRow}><View><Text style={s.scheduleNo}>{i+1}. taksit</Text><Text style={s.meta}>{pretty(dueDateFor(period,selected.dueDay))}</Text></View><Text style={s.scheduleAmount}>{formatTRY(selected.amount)}</Text></View>)}
      </>}

      <Text style={s.sectionTitle}>Kaydı düzenle</Text>
      <Text style={s.label}>Ad</Text><TextInput value={editName} onChangeText={setEditName} placeholder="Ad" placeholderTextColor={C.muted} style={s.input}/>
      {selected?.kind==='person'?<><MoneyInput label="Toplam borç" value={editTotalDebt} onChangeText={setEditTotalDebt}/><Text style={s.label}>Son ödeme tarihi</Text><TextInput value={editDueDate} onChangeText={setEditDueDate} placeholder="YYYY-AA-GG" placeholderTextColor={C.muted} style={s.input}/></>:<MoneyInput label={selected?.kind==='loan'?'Aylık taksit':'Tutar'} value={editAmount} onChangeText={setEditAmount}/>} 
      {(selected?.kind==='fixed'||selected?.kind==='loan')&&<><Text style={s.label}>Her ay ödeme günü</Text><TextInput value={editDueDay} onChangeText={setEditDueDay} keyboardType="number-pad" style={s.input}/></>}
      {selected?.kind==='loan'&&<><Text style={s.label}>Kalan taksit sayısı</Text><TextInput value={editRemaining} onChangeText={setEditRemaining} keyboardType="number-pad" style={s.input}/></>}
      {selected?.kind==='pending'&&<><Text style={s.label}>Son ödeme tarihi</Text><TextInput value={editDueDate} onChangeText={setEditDueDate} placeholder="YYYY-AA-GG" placeholderTextColor={C.muted} style={s.input}/></>}
      <Pressable onPress={saveDetail} style={s.primary}><Text style={s.primaryText}>Değişiklikleri Kaydet</Text></Pressable>
      <Pressable onPress={removeSelected} style={s.deleteButton}><Text style={s.deleteText}>Bu kaydı sil</Text></Pressable>
    </ScrollView></View></View></Modal>
  </View>;
}

const s=StyleSheet.create({
  wrap:{gap:14},summaryRow:{flexDirection:'row',gap:10},summary:{flex:1,backgroundColor:C.card,borderWidth:1,borderColor:C.border,borderRadius:18,padding:14},small:{color:C.muted,fontSize:9,fontWeight:'900'},sumValue:{fontSize:16,fontWeight:'900',marginTop:7},card:{backgroundColor:C.card,borderWidth:1,borderColor:C.border,borderRadius:20,padding:16,gap:10},cardTitle:{color:C.text,fontSize:18,fontWeight:'900'},rowGap:{gap:7,paddingVertical:2},chip:{backgroundColor:C.card2,borderWidth:1,borderColor:C.border,borderRadius:999,paddingHorizontal:12,paddingVertical:8},chipActive:{borderColor:C.accent,backgroundColor:'rgba(110,168,254,.13)'},chipText:{color:C.muted,fontSize:11,fontWeight:'800'},label:{color:C.muted,fontSize:11,fontWeight:'800'},input:{backgroundColor:C.bg,borderWidth:1,borderColor:C.border,borderRadius:14,color:C.text,paddingHorizontal:14,paddingVertical:12},primary:{backgroundColor:C.accent,borderRadius:14,paddingVertical:13,alignItems:'center'},primaryText:{color:'#071016',fontWeight:'900'},hint:{color:C.muted,fontSize:10,lineHeight:15},filter:{flexDirection:'row',gap:7,flexWrap:'wrap'},empty:{borderWidth:1,borderStyle:'dashed',borderColor:C.border,borderRadius:18,padding:22,alignItems:'center'},emptyTitle:{color:C.text,fontWeight:'900'},item:{backgroundColor:C.card,borderWidth:1,borderColor:C.border,borderRadius:18,padding:14,flexDirection:'row',alignItems:'center',gap:10},itemHead:{flexDirection:'row',justifyContent:'space-between'},kind:{color:C.accent,fontSize:9,fontWeight:'900'},status:{fontSize:9,fontWeight:'900'},name:{color:C.text,fontSize:15,fontWeight:'900',marginTop:4},meta:{color:C.muted,fontSize:10,marginTop:3},amount:{color:C.text,fontSize:17,fontWeight:'900',marginTop:7},detailHint:{color:C.accent,fontSize:9,fontWeight:'800',marginTop:6},pay:{backgroundColor:C.income,borderRadius:12,paddingHorizontal:12,paddingVertical:10},undo:{backgroundColor:C.card2,borderWidth:1,borderColor:C.border},payText:{color:'#071016',fontSize:11,fontWeight:'900'},
  modalShade:{flex:1,backgroundColor:'rgba(0,0,0,.72)',justifyContent:'flex-end'},modalWrap:{maxHeight:'94%'},modalCard:{backgroundColor:C.card,borderTopLeftRadius:25,borderTopRightRadius:25,padding:18,gap:10,paddingBottom:42},modalHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},modalTitle:{color:C.text,fontSize:22,fontWeight:'900',marginTop:3},close:{color:C.accent,fontWeight:'900'},detailSummary:{flexDirection:'row',gap:7,backgroundColor:C.card2,borderRadius:16,padding:12},detailValue:{color:C.text,fontSize:13,fontWeight:'900',marginTop:5},sectionTitle:{color:C.text,fontSize:15,fontWeight:'900',marginTop:9},historyRow:{flexDirection:'row',alignItems:'center',gap:10,borderWidth:1,borderColor:C.border,borderRadius:13,padding:11},historyAmount:{color:C.income,fontSize:14,fontWeight:'900'},dangerLink:{color:C.expense,fontSize:10,fontWeight:'900'},scheduleRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderBottomWidth:1,borderBottomColor:C.border,paddingVertical:9},scheduleNo:{color:C.text,fontSize:12,fontWeight:'900'},scheduleAmount:{color:C.warning,fontSize:12,fontWeight:'900'},deleteButton:{borderWidth:1,borderColor:'rgba(255,107,107,.45)',borderRadius:14,paddingVertical:12,alignItems:'center'},deleteText:{color:C.expense,fontWeight:'900'}
});
