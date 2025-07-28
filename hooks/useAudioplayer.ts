import { saveProgress } from "@/data/api";
import { setFileProgress } from "@/data/db";
import { Audio, AVPlaybackStatusSuccess } from "expo-av";
import { useCallback, useEffect, useRef, useState } from "react";
export function useAudioPlayer() {
    const soundRef = useRef<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentUri, setCurrentUri] = useState<string | null>(null);
    const [currentFileId, setCurrentFileId] = useState<number | null>(null);
    const [currentBookId, setCurrentBookId] = useState<number | null>(null);

    const positionRef = useRef(position);
    const intervalRef = useRef<number | null>(null);
    const serverRef = useRef<number>(0)

    useEffect(() => {
        positionRef.current = position;
    }, [position]);

    useEffect(() => {
        if (isPlaying) {
            intervalRef.current = setInterval(async () => {
                const pos = Math.floor(positionRef.current);
                if (currentBookId && currentFileId) {
                    console.log("Saving progress", currentBookId, currentFileId, pos);
                    await setFileProgress(currentBookId, currentFileId, pos);
                }
                serverRef.current += 1
                console.log(serverRef.current)
                if (serverRef.current > 10) {
                    await saveProgress(1, currentBookId as number, currentFileId as number, pos)
                    serverRef.current = 0
                }
            }, 2000);
        } else if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isPlaying, currentBookId, currentFileId]);

    const unload = useCallback(async () => {
        if (soundRef.current) {
            await soundRef.current.unloadAsync();
            soundRef.current.setOnPlaybackStatusUpdate(null);
            soundRef.current = null;
        }
        setIsPlaying(false);
        setPosition(0);
        setDuration(0);
        setCurrentUri(null);
        setCurrentFileId(null);
        setCurrentBookId(null);
    }, []);

    const playUri = useCallback(
        async (uri: string, bookId: number, fileId: number, startPosition = 0) => {
            if (uri === currentUri && soundRef.current) {
                const status = await soundRef.current.getStatusAsync();
                if (status.isLoaded) {
                    if (status.isPlaying) {
                        await soundRef.current.pauseAsync();
                        setPosition(status.positionMillis)
                        await setFileProgress(
                            currentBookId as number,
                            currentFileId as number,
                            Math.floor(status.positionMillis),
                        );
                        await saveProgress(1, currentBookId as number, currentFileId as number, Math.floor(status.positionMillis))

                        setIsPlaying(false);
                    } else {
                        await soundRef.current.playAsync();
                        await soundRef.current.setPositionAsync(startPosition)
                        setIsPlaying(true);
                    }
                }
                return;
            }

            await unload();

            const { sound } = await Audio.Sound.createAsync(
                { uri },
                { shouldPlay: true, positionMillis: startPosition },
                (status: { isLoaded: any; }) => {
                    if (!status.isLoaded) return;
                    const s = status as AVPlaybackStatusSuccess;
                    setIsPlaying(s.isPlaying);
                    setPosition(s.positionMillis ?? 0);
                    setDuration(s.durationMillis ?? 0);
                }
            );

            soundRef.current = sound;
            setCurrentUri(uri);
            setCurrentBookId(bookId);
            setCurrentFileId(fileId);
        },
        [currentUri, unload, currentBookId, currentFileId]
    );

    const togglePlayPause = useCallback(async () => {
        if (!soundRef.current) return;
        const status = await soundRef.current.getStatusAsync();
        if (!status.isLoaded) return;

        if (status.isPlaying) {
            await soundRef.current.pauseAsync();
            const currentPos = status.positionMillis
            await setFileProgress(currentBookId as number, currentFileId as number, currentPos);
            await saveProgress(1, currentBookId as number, currentFileId as number, currentPos)
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
        currentBookId,
        currentFileId
    };
}
