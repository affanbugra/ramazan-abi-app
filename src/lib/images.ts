import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '@/lib/firebase';

export type ImageSource = 'camera' | 'library';

/** "Fotoğraf çek / Galeriden seç" sorusu; vazgeçilirse null. */
export function askImageSource(): Promise<ImageSource | null> {
  return new Promise((resolve) => {
    Alert.alert('Fotoğraf', undefined, [
      { text: 'Fotoğraf çek', onPress: () => resolve('camera') },
      { text: 'Galeriden seç', onPress: () => resolve('library') },
      { text: 'Vazgeç', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}

interface PickOptions {
  /** true: 1:1 kırpma ekranı açılır (ürün, profil). Kategori PNG'lerinde saydamlık bozulmasın diye false. */
  squareCrop: boolean;
}

/** Seçilen fotoğrafın yerel adresi; izin yoksa ya da vazgeçilirse null. */
export async function pickImage(source: ImageSource, { squareCrop }: PickOptions): Promise<string | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Kamera izni gerekli', 'Ayarlar → Ramazan Abi → Kamera iznini açabilirsin.');
      return null;
    }
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: squareCrop,
    aspect: squareCrop ? [1, 1] : undefined,
    quality: 1,
    // PNG'nin saydam arka planı JPEG'e çevrilip kaybolmasın
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
  };
  const result =
    source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || result.assets.length === 0) return null;
  return result.assets[0].uri;
}

/** Genişliği `width` px'e indirir; JPEG %75 ya da PNG (saydamlık korunur). */
export async function resizeImage(uri: string, width: number, format: 'jpeg' | 'png'): Promise<string> {
  const result = await manipulateAsync(uri, [{ resize: { width } }], {
    compress: format === 'jpeg' ? 0.75 : 1,
    format: format === 'jpeg' ? SaveFormat.JPEG : SaveFormat.PNG,
  });
  return result.uri;
}

/** Yerel dosyayı Storage'a yükler, indirme adresini döndürür. */
export async function uploadImage(localUri: string, path: string): Promise<string> {
  const blob = await (await fetch(localUri)).blob();
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, blob, { contentType: path.endsWith('.png') ? 'image/png' : 'image/jpeg' });
  return getDownloadURL(fileRef);
}

/** Eski fotoğrafı siler; bulunamazsa sessizce geçer (ana işlemi bozmasın). */
export async function deleteImageByUrl(url: string): Promise<void> {
  try {
    await deleteObject(ref(storage, url));
  } catch (err) {
    console.warn('Eski fotoğraf silinemedi', err);
  }
}
