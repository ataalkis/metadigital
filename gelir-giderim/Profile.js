import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const C={bg:'#0B1020',card:'#141B2D',card2:'#101726',border:'#263149',text:'#F5F7FB',muted:'#95A2B8',accent:'#6EA8FE',income:'#2DD4A7',expense:'#FF6B6B'};

function initials(name){
  return String(name||'').trim().split(/\s+/).filter(Boolean).slice(0,2).map((x)=>x[0]?.toUpperCase()).join('') || 'AB';
}

export default function Profile({profile,onSave,onCancel,onboarding=false}){
  const [fullName,setFullName]=useState(profile?.fullName||'');
  const [email,setEmail]=useState(profile?.email||'');
  const [phone,setPhone]=useState(profile?.phone||'');
  const [photoUri,setPhotoUri]=useState(profile?.photoUri||'');

  useEffect(()=>{
    setFullName(profile?.fullName||'');
    setEmail(profile?.email||'');
    setPhone(profile?.phone||'');
    setPhotoUri(profile?.photoUri||'');
  },[profile]);

  const shortName=useMemo(()=>String(fullName||'').trim().split(/\s+/)[0]||'Kullanıcı',[fullName]);

  const pickPhoto=async()=>{
    try{
      const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
      if(!permission.granted) return Alert.alert('İzin gerekli','Profil fotoğrafı seçebilmek için fotoğraf erişimine izin vermelisin.');
      const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:0.75});
      if(!result.canceled && result.assets?.[0]?.uri) setPhotoUri(result.assets[0].uri);
    }catch(_){Alert.alert('Fotoğraf açılamadı','Galeriden fotoğraf seçerken bir sorun oluştu.');}
  };

  const save=()=>{
    const name=fullName.trim();
    const mail=email.trim().toLowerCase();
    const tel=phone.trim();
    if(!name) return Alert.alert('Ad soyad gerekli','Adını ve soyadını yaz.');
    if(!mail || !/^\S+@\S+\.\S+$/.test(mail)) return Alert.alert('E-posta gerekli','Geçerli bir e-posta adresi yaz.');
    if(!tel || tel.replace(/\D/g,'').length<10) return Alert.alert('Telefon gerekli','Geçerli bir telefon numarası yaz.');
    onSave?.({fullName:name,email:mail,phone:tel,photoUri,updatedAt:Date.now(),completed:true});
  };

  return <View style={[s.wrap,onboarding&&s.onboarding]}>
    <View style={s.hero}>
      <Pressable onPress={pickPhoto} style={s.avatarWrap}>
        {photoUri?<Image source={{uri:photoUri}} style={s.avatar}/>:<View style={[s.avatar,s.avatarFallback]}><Text style={s.initials}>{initials(fullName)}</Text></View>}
        <View style={s.cameraBadge}><Text style={s.cameraText}>＋</Text></View>
      </Pressable>
      <Text style={s.title}>{onboarding?'Seni tanıyalım':`Merhaba ${shortName}`}</Text>
      <Text style={s.subtitle}>{onboarding?'ABİ Bütçe sana özel bir ana sayfa hazırlasın.':'Profil bilgilerini buradan güncelleyebilirsin.'}</Text>
      <Pressable onPress={pickPhoto}><Text style={s.photoLink}>{photoUri?'Fotoğrafı değiştir':'Profil fotoğrafı ekle'}</Text></Pressable>
    </View>

    <View style={s.card}>
      <Text style={s.label}>Ad Soyad</Text>
      <TextInput value={fullName} onChangeText={setFullName} autoCapitalize="words" placeholder="Ad Soyad" placeholderTextColor={C.muted} style={s.input}/>
      <Text style={s.label}>E-posta</Text>
      <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="ornek@mail.com" placeholderTextColor={C.muted} style={s.input}/>
      <Text style={s.label}>Telefon</Text>
      <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="05xx xxx xx xx" placeholderTextColor={C.muted} style={s.input}/>
      <Text style={s.note}>Bu sürümde profil bilgilerin yalnızca bu cihazda saklanır. Bulut hesabı ve yedekleme sonraki aşamada bağlanacak.</Text>
      <View style={s.actions}>
        {!onboarding&&onCancel&&<Pressable onPress={onCancel} style={s.secondary}><Text style={s.secondaryText}>Vazgeç</Text></Pressable>}
        <Pressable onPress={save} style={s.primary}><Text style={s.primaryText}>{onboarding?'Başla':'Profili Kaydet'}</Text></Pressable>
      </View>
    </View>
  </View>;
}

const s=StyleSheet.create({
  wrap:{gap:16},onboarding:{paddingTop:18},hero:{alignItems:'center',paddingVertical:12},avatarWrap:{position:'relative'},avatar:{width:104,height:104,borderRadius:52,borderWidth:3,borderColor:C.accent,backgroundColor:C.card2},avatarFallback:{alignItems:'center',justifyContent:'center'},initials:{color:C.text,fontSize:32,fontWeight:'900'},cameraBadge:{position:'absolute',right:1,bottom:1,width:30,height:30,borderRadius:15,backgroundColor:C.accent,borderWidth:3,borderColor:C.bg,alignItems:'center',justifyContent:'center'},cameraText:{color:'#071016',fontSize:18,fontWeight:'900',lineHeight:20},title:{color:C.text,fontSize:25,fontWeight:'900',marginTop:14},subtitle:{color:C.muted,fontSize:12,textAlign:'center',lineHeight:18,marginTop:5,maxWidth:310},photoLink:{color:C.accent,fontSize:11,fontWeight:'900',marginTop:9},card:{backgroundColor:C.card,borderWidth:1,borderColor:C.border,borderRadius:22,padding:17,gap:9},label:{color:C.muted,fontSize:11,fontWeight:'900',marginTop:2},input:{backgroundColor:C.bg,borderWidth:1,borderColor:C.border,borderRadius:14,color:C.text,paddingHorizontal:14,paddingVertical:12,fontSize:15},note:{color:C.muted,fontSize:10,lineHeight:15,marginTop:4},actions:{flexDirection:'row',gap:9,marginTop:6},primary:{flex:1,backgroundColor:C.accent,borderRadius:14,paddingVertical:13,alignItems:'center'},primaryText:{color:'#071016',fontWeight:'900'},secondary:{paddingHorizontal:16,borderRadius:14,borderWidth:1,borderColor:C.border,alignItems:'center',justifyContent:'center'},secondaryText:{color:C.muted,fontWeight:'900'}
});
