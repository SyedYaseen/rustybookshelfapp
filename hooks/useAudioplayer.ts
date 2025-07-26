// useAudioPlayer.ts
import { Audio, AVPlaybackStatusSuccess } from "expo-av";
import { useCallback, useRef, useState } from "react";

export function useAudioPlayer() {
    const soundRef = useRef<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentUri, setCurrentUri] = useState<string | null>(null);

    const unload = useCallback(async () => {
        if (soundRef.current) {
            await soundRef.current.unloadAsync();
            soundRef.current.setOnPlaybackStatusUpdate(null);
            soundRef.current = null;
            setIsPlaying(false);
            setPosition(0);
            setDuration(0);
            setCurrentUri(null);
        }
    }, []);

    const playUri = useCallback(
        async (uri: string) => {
            // If tapping the same file, just toggle
            if (uri === currentUri && soundRef.current) {
                const status = await soundRef.current.getStatusAsync();
                if (status.isLoaded) {
                    if (status.isPlaying) {
                        await soundRef.current.pauseAsync();
                        setIsPlaying(false);
                    } else {
                        await soundRef.current.playAsync();
                        setIsPlaying(true);
                    }
                }
                return;
            }

            // new file -> unload and load
            await unload();

            const { sound } = await Audio.Sound.createAsync(
                { uri },
                { shouldPlay: true }, // auto play
                (status) => {
                    if (!status.isLoaded) return;
                    const s = status as AVPlaybackStatusSuccess;
                    setIsPlaying(s.isPlaying);
                    setPosition(s.positionMillis ?? 0);
                    setDuration(s.durationMillis ?? 0);
                }
            );

            soundRef.current = sound;
            setCurrentUri(uri);
        },
        [currentUri, unload]
    );

    const togglePlayPause = useCallback(async () => {
        if (!soundRef.current) return;
        const status = await soundRef.current.getStatusAsync();
        if (!status.isLoaded) return;
        if (status.isPlaying) {
            await soundRef.current.pauseAsync();
            setIsPlaying(false);
        } else {
            await soundRef.current.playAsync();
            setIsPlaying(true);
        }
    }, []);

    const seekTo = useCallback(async (ms: number) => {
        if (!soundRef.current) return;
        await soundRef.current.setPositionAsync(ms);
    }, []);

    return {
        playUri,
        togglePlayPause,
        seekTo,
        unload,
        isPlaying,
        position,
        duration,
        currentUri,
    };
}
