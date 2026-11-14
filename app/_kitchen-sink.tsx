import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ForkKnife,
  Gear,
  Clock,
  Trash,
} from 'phosphor-react-native';
import {
  Button,
  TextField,
  Chip,
  StatusPill,
  ListRow,
  EmptyState,
  Toast,
  Avatar,
  getShopStatusConfig,
  getOrderStatusConfig,
} from '@/components/ui';
import { colors, rounded, spacing, typography } from '@/theme/tokens';

export default function KitchenSinkScreen() {
  const [selectedChip, setSelectedChip] = useState<'tavalar' | 'tostlar' | 'durumler'>('tavalar');
  const [textValue, setTextValue] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.screenTitle}>Bileşen Vitrini</Text>
        <Text style={styles.screenSubtitle}>Faz 0 — İskelet ve Tasarım Temeli Doğrulama</Text>

        {/* 1. TÜRKÇE KARAKTER VE TİPOGRAFİ TESTİ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Tipografi & Türkçe Karakter Testi</Text>
          <View style={styles.card}>
            <Text style={styles.displayXl}>#23 ~12 dk</Text>
            <Text style={styles.displayL}>Çiğ Köfte Dürüm & Şimşek</Text>
            <Text style={styles.displayM}>Iğdır'ın Soğuğu, Ömer'in Tostu</Text>
            <View style={styles.divider} />
            <Text style={styles.bodySemiBold}>
              Barlow 600 SemiBold: Çiğ köfte, Kaşarlı tost, 115 ₺
            </Text>
            <Text style={styles.bodyMedium}>
              Barlow 500 Medium: Şekerli çay, İnce belli bardak, Öğrenci menüsü
            </Text>
            <Text style={styles.bodyRegular}>
              Barlow 400 Regular: Türkçe karakterler: ç, Ç, ğ, Ğ, ı, İ, ö, Ö, ş, Ş, ü, Ü.
            </Text>
            <Text style={styles.caption}>
              Caption 12px: Sipariş takip numarası ve zaman damgası testi.
            </Text>
          </View>
        </View>

        {/* 2. BUTONLAR */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Butonlar (Button)</Text>
          <View style={styles.buttonCol}>
            <Button
              title="Birincil Buton (Sepete Ekle 115 ₺)"
              variant="primary"
              onPress={() => showToast('Birincil butona dokunuldu!')}
            />
            <Button
              title="Yükleniyor Hali"
              variant="primary"
              loading
              onPress={() => {}}
            />
            <Button
              title="İkincil Buton (Giriş Yap)"
              variant="secondary"
              onPress={() => showToast('İkincil butona dokunuldu')}
            />
            <Button
              title="Metin Buton"
              variant="text"
              onPress={() => showToast('Metin butona dokunuldu')}
            />
            <Button
              title="Yıkıcı Eylem (Siparişi İptal Et)"
              variant="text"
              destructive
              onPress={() => showToast('İptal butonuna dokunuldu')}
            />
            <Button
              title="Pasif Buton"
              variant="primary"
              disabled
              onPress={() => {}}
            />
          </View>
        </View>

        {/* 3. METİN ALANLARI */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Metin Girişi (TextField)</Text>
          <TextField
            label="Ad Soyad"
            placeholder="Örn. Ahmet Yılmaz"
            value={textValue}
            onChangeText={setTextValue}
            hint="Sipariş tesliminde bu ad ile seslenilir."
          />
          <TextField
            label="Davet Kodu"
            placeholder="6 haneli kod (örn: X7K2PQ)"
            error="Bu kodun süresi dolmuş. Ramazan abiden yeni kod iste."
          />
        </View>

        {/* 4. ÇİPLER */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Çipler (Chip)</Text>
          <View style={styles.rowWrap}>
            <Chip
              label="Tavalar"
              selected={selectedChip === 'tavalar'}
              onPress={() => setSelectedChip('tavalar')}
              icon={<ForkKnife size={16} color={selectedChip === 'tavalar' ? colors.ground : colors.ink} />}
            />
            <Chip
              label="Tostlar"
              selected={selectedChip === 'tostlar'}
              onPress={() => setSelectedChip('tostlar')}
            />
            <Chip
              label="Dürümler"
              selected={selectedChip === 'durumler'}
              onPress={() => setSelectedChip('durumler')}
            />
            <Chip
              label="Pasif Çip"
              disabled
              onPress={() => {}}
            />
          </View>
        </View>

        {/* 5. DURUM ETİKETLERİ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Durum Etiketleri (StatusPill)</Text>
          <Text style={styles.subHeading}>Kantin durumu:</Text>
          <View style={styles.rowWrap}>
            {(() => {
              const open = getShopStatusConfig({ isOpen: true });
              const prayer = getShopStatusConfig({ isOpen: true, prayerBreak: true });
              const closed = getShopStatusConfig({ isOpen: false });
              return (
                <>
                  <StatusPill label={open.label} variant={open.variant} />
                  <StatusPill label={prayer.label} variant={prayer.variant} />
                  <StatusPill label={closed.label} variant={closed.variant} />
                </>
              );
            })()}
          </View>

          <Text style={[styles.subHeading, { marginTop: spacing.md }]}>Sipariş Durumları:</Text>
          <View style={styles.rowWrap}>
            {(() => {
              const s1 = getOrderStatusConfig('pending');
              const s2 = getOrderStatusConfig('preparing');
              const s3 = getOrderStatusConfig('ready');
              const s4 = getOrderStatusConfig('delivered');
              const s5 = getOrderStatusConfig('rejected');
              return (
                <>
                  <StatusPill label={s1.label} variant={s1.variant} />
                  <StatusPill label={s2.label} variant={s2.variant} />
                  <StatusPill label={s3.label} variant={s3.variant} />
                  <StatusPill label={s4.label} variant={s4.variant} />
                  <StatusPill label={s5.label} variant={s5.variant} />
                </>
              );
            })()}
          </View>
        </View>

        {/* 6. LİSTE SATIRLARI */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Liste Satırları (ListRow)</Text>
          <View style={styles.cardNoPadding}>
            <ListRow
              title="Kantin Ayarları"
              subtitle="Yoğunluk ve açık/kapalı durumu"
              icon={<Gear size={22} color={colors.ink} />}
              onPress={() => showToast('Ayarlar tıklandı')}
            />
            <ListRow
              title="Çalışma Saatleri"
              value="08:00 - 23:30"
              icon={<Clock size={22} color={colors.ink} />}
              onPress={() => showToast('Saatler tıklandı')}
            />
            <ListRow
              title="Hesabımı Sil"
              destructive
              icon={<Trash size={22} color={colors.alert} />}
              hasBottomDivider={false}
              onPress={() => showToast('Hesap silme tıklandı')}
            />
          </View>
        </View>

        {/* 7. AVATARLAR */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Avatarlar (Avatar)</Text>
          <View style={styles.avatarRow}>
            <View style={styles.avatarItem}>
              <Avatar name="Ahmet Yılmaz" size="sm" />
              <Text style={styles.caption}>Küçük (32)</Text>
            </View>
            <View style={styles.avatarItem}>
              <Avatar name="Ramazan Abi" size="md" />
              <Text style={styles.caption}>Orta (48)</Text>
            </View>
            <View style={styles.avatarItem}>
              <Avatar name="Canan Demir" size="lg" />
              <Text style={styles.caption}>Büyük (96)</Text>
            </View>
            <View style={styles.avatarItem}>
              <Avatar size="md" />
              <Text style={styles.caption}>İkonlu</Text>
            </View>
          </View>
        </View>

        {/* 8. BOŞ DURUM */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Boş Durum (EmptyState)</Text>
          <View style={styles.card}>
            <EmptyState
              icon={<ForkKnife size={40} color={colors.teaDeep} weight="regular" />}
              title="Henüz siparişin yok"
              description="Ramazan abinin taze menüsüne göz atıp sıcak bir şeyler seçebilirsin."
              actionTitle="Menüye göz at"
              onAction={() => showToast('Menüye yönlendiriliyor')}
            />
          </View>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* 9. TOAST */}
      <Toast
        message={toastMessage}
        visible={toastVisible}
        onDismiss={() => setToastVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  scrollContent: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.md,
  },
  screenTitle: {
    fontFamily: typography.display.fontFamily,
    fontSize: typography.display.sizes.l,
    color: colors.ink,
    letterSpacing: typography.display.letterSpacing,
  },
  screenSubtitle: {
    fontFamily: typography.body.fontFamily.medium,
    fontSize: typography.body.sizes.small,
    color: colors.muted,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontFamily: typography.body.fontFamily.semiBold,
    fontSize: typography.body.sizes.body,
    color: colors.tea,
    marginBottom: spacing.sm,
  },
  subHeading: {
    fontFamily: typography.body.fontFamily.medium,
    fontSize: typography.body.sizes.small,
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: rounded.card,
    padding: spacing.md,
  },
  cardNoPadding: {
    backgroundColor: colors.surface,
    borderRadius: rounded.card,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: colors.hairline,
    marginVertical: spacing.sm,
  },
  displayXl: {
    fontFamily: typography.display.fontFamily,
    fontSize: typography.display.sizes.xl,
    color: colors.ink,
    letterSpacing: typography.display.letterSpacing,
  },
  displayL: {
    fontFamily: typography.display.fontFamily,
    fontSize: typography.display.sizes.l,
    color: colors.ink,
    letterSpacing: typography.display.letterSpacing,
  },
  displayM: {
    fontFamily: typography.display.fontFamily,
    fontSize: typography.display.sizes.m,
    color: colors.ink,
    letterSpacing: typography.display.letterSpacing,
  },
  bodySemiBold: {
    fontFamily: typography.body.fontFamily.semiBold,
    fontSize: typography.body.sizes.body,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  bodyMedium: {
    fontFamily: typography.body.fontFamily.medium,
    fontSize: typography.body.sizes.small,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  bodyRegular: {
    fontFamily: typography.body.fontFamily.regular,
    fontSize: typography.body.sizes.small,
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  caption: {
    fontFamily: typography.body.fontFamily.regular,
    fontSize: typography.body.sizes.caption,
    color: colors.muted,
    marginTop: spacing.xxs,
  },
  buttonCol: {
    gap: spacing.sm,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: rounded.card,
    padding: spacing.md,
  },
  avatarItem: {
    alignItems: 'center',
  },
});
