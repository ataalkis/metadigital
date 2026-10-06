# Gelir Giderim Admin

Bu panel `gelir-giderim/content/content.json` dosyasını yönetir. Mobil uygulama bu dosyayı uzaktan okuyarak blog ve sponsor içeriklerini APK güncellemesi olmadan yeniler.

## GitHub Pages

Repository Settings > Pages bölümünde:

- Source: Deploy from a branch
- Branch: main
- Folder: /docs

Kaydettikten sonra panel adresi:

`https://ataalkis.github.io/metadigital/gelir-giderim-admin/`

## Yönetim anahtarı

Fine-grained personal access token oluşturulmalı:

- Repository access: Only select repositories > metadigital
- Repository permissions > Contents: Read and write

Token admin paneline girilir. Panel tokeni yalnızca tarayıcı sekmesinin `sessionStorage` alanında tutar; repo dosyalarına veya mobil uygulamaya kaydetmez.

## Yönetilebilen içerikler

- Sponsor alanı ekleme / silme / sıralama
- Sponsor adı, açıklaması, aktif/pasif durumu
- Sponsor tıklama linki
- Sponsor görseli yükleme
- Blog yazısı ekleme / silme / sıralama
- Blog başlık, özet, içerik, yayın tarihi, aktif/pasif durumu
- Blog kapak görseli yükleme

Görseller `gelir-giderim/content/uploads/` altında saklanır.
