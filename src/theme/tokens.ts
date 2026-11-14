/**
 * src/theme/tokens.ts — Ramazan Abi Tasarım Token'ları
 *
 * DESIGN.md front matter'ının TEK kod karşılığıdır.
 * Renk, boyut, radius, font ve gölge değerleri SADECE buradan alınır.
 * Bileşen içinde doğrudan hex kodu veya sihirli sayı yazmak YASAKTIR.
 */

export const colors = {
  ground: '#FFFFFF', // ana zemin
  surface: '#F5F4F2', // ikincil yüzey (gruplu alanlar, ayarlar satırları)
  ink: '#1E1B18', // ana metin, ground üzerinde ~17:1
  muted: '#6B6560', // ikincil metin, ground üzerinde ~5.7:1
  hairline: '#E4E0DC', // ayırıcı çizgi, input kenarı
  placeholder: '#A39C96', // input içindeki örnek metin (muted'dan açık, gerçek yazıyla karışmasın)
  tea: '#8E1F14', // MARKA + birincil aksiyon (demli çay)
  teaPressed: '#6F170F', // tea basılı hali
  teaSoft: '#F6E7E3', // tea'nın açık zemini (not vurgusu, fotoğrafsız ürün zemini). Seçili çip DEĞİL (o ink)
  teaDeep: '#5E140D', // teaSoft üzerindeki metin/ikon
  fresh: '#2F6B35', // "Hazır" durumu, "Sakin" yoğunluk
  freshSoft: '#E5EFE2',
  busy: '#8A5300', // "Çok yoğun" uyarısı
  busySoft: '#FFF0D4',
  alert: '#D92D20', // az stok, reddedildi, hata. tea'dan ayrışsın diye daha parlak/turuncu kırmızı
  alertSoft: '#FDE9E7',
  onTea: '#FFFFFF',
  onTeaMuted: '#F2C9C1', // tea / fresh zemin üstündeki ikincil metin
} as const;

export type ColorToken = keyof typeof colors;

export const typography = {
  display: {
    fontFamily: 'BarlowCondensed_600SemiBold',
    fontWeight: '600' as const,
    sizes: {
      hero: 112, // takip ekranındaki tek dev sayı
      xl: 44, // sipariş no
      l: 30, // ekran başlığı
      m: 22, // sheet başlığı / ürün adı detayda
    },
    letterSpacing: 0.2,
    codeLetterSpacing: 4, // davet kodu gibi tek tek okunacak karakterler
  },
  body: {
    fontFamily: {
      regular: 'Barlow_400Regular',
      medium: 'Barlow_500Medium',
      semiBold: 'Barlow_600SemiBold',
    },
    sizes: {
      body: 16,
      small: 14,
      caption: 12,
    },
    lineHeight: 1.4,
  },
} as const;

export const rounded = {
  pill: 999, // arama çubuğu, filtre çipleri, durum etiketi, avatar. SADECE gerçekten "hap" olan öğeler
  photo: 16, // ürün fotoğrafları
  card: 16, // gruplu kutular (sipariş kartı, profil kartı)
  button: 12,
  input: 12,
  sheet: 24, // bottom sheet üst köşeleri
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  gutter: 20, // ekran kenar boşluğu
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export const layout = {
  tabletBreakpoint: 768, // bu genişlik ve üstü tablet düzeni
  formMaxWidth: 480, // tablette form ekranları bu genişlikte ortalanır
  contentMaxWidth: 760, // tablette menü ızgarası ve listeler bu genişlikte ortalanır
} as const;

export const shadows = {
  floating: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
} as const;

export const components = {
  buttonPrimary: {
    backgroundColor: colors.tea,
    pressedColor: colors.teaPressed,
    textColor: colors.onTea,
    rounded: rounded.button,
    height: 52,
    fontFamily: typography.body.fontFamily.semiBold,
    fontSize: 16,
  },
  buttonSecondary: {
    backgroundColor: colors.ground,
    pressedColor: colors.surface,
    borderColor: colors.ink,
    textColor: colors.ink,
    rounded: rounded.button,
    height: 52,
    fontFamily: typography.body.fontFamily.semiBold,
    fontSize: 16,
  },
  buttonText: {
    backgroundColor: 'transparent',
    pressedColor: colors.surface,
    textColor: colors.ink,
    rounded: rounded.button,
    height: 52,
    fontFamily: typography.body.fontFamily.semiBold,
    fontSize: 16,
  },
  chip: {
    rounded: rounded.pill,
    idle: {
      backgroundColor: colors.ground,
      borderColor: colors.hairline,
      textColor: colors.ink,
    },
    selected: {
      backgroundColor: colors.ink,
      borderColor: colors.ink,
      textColor: colors.ground,
    },
  },
} as const;
