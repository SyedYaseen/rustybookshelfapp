import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, usePathname, useRouter } from 'expo-router';
import 'react-native-reanimated';

import { initDb } from '@/data/db';
import { useColorScheme } from '@/hooks/useColorScheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);




  useEffect(() => {
    (async () => {
      try {
        await initDb();
        // await resetDb()
        console.log("Database initialized!");
      } catch (err) {
        console.error("DB init error:", err);
      }
    })();

    const checkToken = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token && pathname !== '/login') {
        router.replace('/login');
      }
      setChecking(false);
    };

    checkToken();
  }, [pathname]);
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded || checking) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </ThemeProvider>
  );
}
