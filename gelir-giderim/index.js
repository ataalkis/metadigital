import React, { useEffect } from 'react';
import { Alert, Linking } from 'react-native';
import { registerRootComponent } from 'expo';
import App from './App';

const CURRENT_VERSION = '1.4.0';
const CURRENT_VERSION_CODE = 5;
const UPDATE_META_URL = 'https://raw.githubusercontent.com/ataalkis/metadigital/main/gelir-giderim/latest.json';

function Root() {
  useEffect(() => {
    const checkForUpdate = async () => {
      try {
        const response = await fetch(`${UPDATE_META_URL}?t=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
        if (!response.ok) return;
        const latest = await response.json();
        const latestCode = Number(latest.versionCode || 0);
        if (latestCode <= CURRENT_VERSION_CODE || !latest.apkUrl) return;
        const required = Number(latest.minimumVersionCode || 0) > CURRENT_VERSION_CODE;
        const buttons = required
          ? [{ text: 'Güncelle', onPress: () => Linking.openURL(latest.apkUrl) }]
          : [{ text: 'Sonra', style: 'cancel' }, { text: 'Güncelle', onPress: () => Linking.openURL(latest.apkUrl) }];
        Alert.alert(`Yeni sürüm ${latest.version || ''}`.trim(), latest.notes || 'ABİ Bütçe için yeni bir sürüm hazır.', buttons, { cancelable: !required });
      } catch (_) {}
    };
    const timer = setTimeout(checkForUpdate, 1200);
    return () => clearTimeout(timer);
  }, []);
  return <App />;
}

Root.displayName = `ABIButce-${CURRENT_VERSION}`;
registerRootComponent(Root);
