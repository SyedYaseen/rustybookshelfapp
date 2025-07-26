import { downloadAndUnzip, fetchBooks } from '@/data/api';
import { useAudioPlayer } from '@/hooks/useAudioplayer';
import { MaterialIcons } from '@expo/vector-icons';
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
export type Book = {
  id: number;
  author: string;
  cover_art: string;
  files_location: string;
  metadata: Record<string, any> | null;
  series: string | null;
  title: string;
};

export type BooksResponse = {
  books: Book[];
  count: number;
  message: string;
};

const AUDIO_EXTS = [".mp3", ".m4b", ".m4a", ".aac", ".wav", ".ogg"];

function isAudioFile(path: string) {
  const lower = path.toLowerCase();
  return AUDIO_EXTS.some((ext) => lower.endsWith(ext));
}


function MiniPlayer({
  isPlaying,
  position,
  duration,
  onToggle,
}: {
  isPlaying: boolean;
  position: number;
  duration: number;
  onToggle: () => void;
}) {
  return (
    <View style={styles.miniPlayer}>
      <TouchableOpacity onPress={onToggle}>
        {
          isPlaying ? (
            <MaterialIcons
              name="pause"
              size={22}
              color="black"
              style={{ marginRight: 8 }}
            />
          ) :
            (
              <MaterialIcons
                name="play-circle"
                size={22}
                color="black"
                style={{ marginRight: 8 }}
              />
            )

        }

      </TouchableOpacity>
      <Text style={styles.timeText}>
        {formatMs(position)} / {formatMs(duration)}
      </Text>
    </View>
  );
}

function formatMs(ms?: number) {
  if (!ms || ms < 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function Library() {
  const [books, setBooks] = useState<Book[]>([]);
  const [files, setFiles] = useState<string[]>([]);

  const [downloadingBookId, setDownloadingBookId] = useState<number | null>(null);
  const [downloadedFiles, setDownloadedFiles] = useState<Record<number, string[]>>({});
  const player = useAudioPlayer();

  useEffect(() => {
    fetchBooks().then((data) => {
      setBooks(data.books);
      // console.log(data.books);
    });

    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

  }, []);

  const handleDownload = async (bookId: number) => {
    try {
      setDownloadingBookId(bookId);
      const { files } = await downloadAndUnzip(bookId);
      setDownloadedFiles((prev) => ({ ...prev, [bookId]: files }));
    } catch (err) {
      console.error(`Failed to download ${bookId}:`, err);
    } finally {
      setDownloadingBookId(null);
    }
  };


  const renderBook = ({ item }: { item: Book }) => {
    const isDownloading = downloadingBookId === item.id;
    const files = downloadedFiles[item.id] || [];
    const handlePlay = async (uri: string) => {
      await player.playUri(uri);
    };

    return (
      <View style={styles.bookItem}>
        <Text style={styles.bookTitle}>{item.title}</Text>
        <TouchableOpacity onPress={() => handleDownload(item.id)} disabled={isDownloading}>
          {isDownloading ? (
            <ActivityIndicator size="small" color="gray" />
          ) : (
            <MaterialIcons name='download' size={24} color="black" />
          )}
        </TouchableOpacity>
        {files.length > 0 && (
          <View style={styles.filesContainer}>
            {files.map((file) => (
              <Text style={styles.file} key={file}>
                {file.replace(FileSystem.documentDirectory!, "")}
              </Text>
            ))}
          </View>
        )}


        {files.length > 0 && (
          <View style={styles.filesContainer}>
            {files.map((f) => {
              const short = f.replace(FileSystem.documentDirectory!, "");
              const isCurrent = player.currentUri === f;
              return (
                <TouchableOpacity
                  key={f}
                  style={styles.fileRow}
                  onPress={() => handlePlay(f)}
                >
                  <MaterialIcons
                    name={isCurrent && player.isPlaying ? "pause-circle" : "play-circle"}
                    size={22}
                    color="black"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.fileText}>{short}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Mini player UI if current book contains current track */}
        {player.currentUri && files.includes(player.currentUri) && (
          <MiniPlayer
            isPlaying={player.isPlaying}
            position={player.position}
            duration={player.duration}
            onToggle={player.togglePlayPause}
          />
        )}


      </View>
    );
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
      <FlatList
        data={books}
        keyExtractor={(book) => book?.id?.toString()}
        renderItem={renderBook}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  bookItem: {
    borderBottomWidth: 1,
    borderColor: "#eee",
    paddingVertical: 12,
  },
  bookHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bookTitle: { fontSize: 18, color: "black", marginBottom: 6 },
  file: { fontSize: 14, color: "#333" },
  filesContainer: { marginTop: 6, paddingLeft: 8 },
  fileRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  fileText: { fontSize: 14, color: "#333" },
  miniPlayer: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  timeText: { fontSize: 12, color: "#444" },
});
