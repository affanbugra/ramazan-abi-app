// Kategorilerin fotoğraf yokken gösterdiği Phosphor ikonları (CategoryDoc.placeholderIcon).
// Tüm kütüphaneyi paketlememek için sadece buradaki ikonlar seçilebilir.
import {
  Bread,
  BowlFood,
  BowlSteam,
  Cake,
  Carrot,
  Cheese,
  Coffee,
  CookingPot,
  Cookie,
  Egg,
  Fish,
  ForkKnife,
  Hamburger,
  IceCream,
  OrangeSlice,
  Pepper,
  Pizza,
  Popcorn,
  type Icon,
} from 'phosphor-react-native';

export const CATEGORY_ICONS: Record<string, Icon> = {
  CookingPot,
  Bread,
  Hamburger,
  ForkKnife,
  BowlFood,
  BowlSteam,
  Pizza,
  Egg,
  Cheese,
  Fish,
  Carrot,
  Pepper,
  Popcorn,
  Coffee,
  Cake,
  Cookie,
  IceCream,
  OrangeSlice,
};

export const DEFAULT_CATEGORY_ICON = 'ForkKnife';

export function categoryIcon(name: string | null | undefined): Icon {
  return (name && CATEGORY_ICONS[name]) || ForkKnife;
}
