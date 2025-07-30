import { ROOT } from '@/constants/constants';
import { fetchBooks } from "@/data/api";
import { Audiobook, FileRow, getFilesForBook, upsertAudiobooks } from "@/data/db";
import { useAudioPlayer } from "@/hooks/useAudioplayer";
import { Audio } from "expo-av";
import { useEffect, useState } from "react";
import { FlatList, View } from "react-native";
import BookCard from './book-card';


function Library() {
    const [books, setBooks] = useState<Audiobook[]>([]);
    const [downloadingBookId, setDownloadingBookId] = useState<number | null>(null);
    const [downloadedFiles, setDownloadedFiles] = useState<Record<number, FileRow[]>>({});
    const player = useAudioPlayer();

    useEffect(() => {
        fetchBooks().then(async (data) => {
            setBooks(data.books);
            await upsertAudiobooks(data.books)

            data?.books.forEach(async b => {
                const destPath = `${ROOT}${b.id}/`;
                const files = await getFilesForBook(b.id)
                if (files && files.length) {
                    setDownloadedFiles((prev) => ({ ...prev, [b.id]: files }));
                }
            })
        });

        Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
        });

    }, []);


    return (
        <View style={{ backgroundColor: "#fff", paddingTop: 20 }}>
            <FlatList
                data={books}
                keyExtractor={(book) => book?.id?.toString()}
                renderItem={({ item }) => <BookCard book={item} />}
                contentContainerStyle={{ paddingBottom: 40 }}
            />
        </View>
    )
}

export default Library