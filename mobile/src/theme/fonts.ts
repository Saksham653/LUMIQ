import { AnekDevanagari_400Regular } from '@expo-google-fonts/anek-devanagari/400Regular';
import { AnekDevanagari_500Medium } from '@expo-google-fonts/anek-devanagari/500Medium';
import { AnekDevanagari_600SemiBold } from '@expo-google-fonts/anek-devanagari/600SemiBold';
import { AnekDevanagari_700Bold } from '@expo-google-fonts/anek-devanagari/700Bold';
import { AnekLatin_400Regular } from '@expo-google-fonts/anek-latin/400Regular';
import { AnekLatin_500Medium } from '@expo-google-fonts/anek-latin/500Medium';
import { AnekLatin_600SemiBold } from '@expo-google-fonts/anek-latin/600SemiBold';
import { AnekLatin_700Bold } from '@expo-google-fonts/anek-latin/700Bold';
import { Outfit_500Medium } from '@expo-google-fonts/outfit/500Medium';
import { Outfit_600SemiBold } from '@expo-google-fonts/outfit/600SemiBold';
import { useFonts } from 'expo-font';

// The brand fonts on a phone (Anek Latin, Anek Devanagari, Outfit). They are
// switched on: PHONE_FONTS_BUNDLED in type.ts is true, and this is the only
// place the files load. The browser preview has its own file (fonts.web.ts)
// that loads the real families from a stylesheet.
//
// Each weight is imported from its own folder so the unused weights stay out
// of the app (ten files in all). The files are part of the app: nothing is
// fetched from the network.
//
// The keys are the names in FONT_FILES (type.ts): the name a file is loaded
// under is the name a style asks for.
const FILES = {
  AnekLatin_400Regular,
  AnekLatin_500Medium,
  AnekLatin_600SemiBold,
  AnekLatin_700Bold,
  AnekDevanagari_400Regular,
  AnekDevanagari_500Medium,
  AnekDevanagari_600SemiBold,
  AnekDevanagari_700Bold,
  Outfit_500Medium,
  Outfit_600SemiBold,
};

// True once text can be drawn in its final fonts. The root layout holds the
// start screen until then, for at most 900 ms (brand spec, section 5, rule
// 6). A font that fails to load never blocks the app: an error also answers
// true, and the phone's own font shows for the files that are missing.
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts(FILES);
  return loaded || error != null;
}
