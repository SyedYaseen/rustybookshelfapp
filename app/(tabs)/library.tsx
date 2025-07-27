import { downloadAndUnzip, fetchBookFilesData, fetchBooks, getProgress, listFilesRecursively, removeLocalBook } from '@/data/api';
import { Audiobook, FileRow, markBookDownloaded, upsertAudiobooks, upsertFiles } from '@/data/db';
import { useAudioPlayer } from '@/hooks/useAudioplayer';
import { MaterialIcons } from '@expo/vector-icons';
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type BooksResponse = {
  books: Audiobook[];
  count: number;
  message: string;
};

const AUDIO_EXTS = [".mp3", ".m4b", ".m4a", ".aac", ".wav", ".ogg"];
const ROOT = FileSystem.documentDirectory + "audiobooks/";
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
  const [books, setBooks] = useState<Audiobook[]>([]);
  const [files, setFiles] = useState<string[]>([]);

  const [downloadingBookId, setDownloadingBookId] = useState<number | null>(null);
  const [downloadedFiles, setDownloadedFiles] = useState<Record<number, string[]>>({});
  const player = useAudioPlayer();

  useEffect(() => {
    fetchBooks().then(async (data) => {
      setBooks(data.books);
      await upsertAudiobooks(data.books)

      data?.books.forEach(async b => {
        const destPath = `${ROOT}${b.id}/`;
        listFilesRecursively(destPath).then(files => {
          setDownloadedFiles((prev) => ({ ...prev, [b.id]: files }));
        })
      })
    });

    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

  }, []);

  const handleDownload = async (bookId: number) => {
    try {
      setDownloadingBookId(bookId);
      const { data } = await fetchBookFilesData(bookId)
      const fileRows: FileRow[] = data
      const { files } = await downloadAndUnzip(bookId);
      fileRows?.map(fr => {
        fr.local_path = files.find(f => fr.file_path && f.endsWith(fr.file_path))
      })

      await upsertFiles(fileRows)
      setDownloadedFiles((prev) => ({ ...prev, [bookId]: files }));
      markBookDownloaded(bookId, `${ROOT}${bookId}/`)
    } catch (err) {
      console.error(`Failed to download ${bookId}:`, err);
    } finally {
      setDownloadingBookId(null);
    }
  };

  const handleDelete = async (bookId: number) => {
    try {
      setDownloadedFiles(prev => {
        const updated = { ...prev };
        delete updated[bookId];
        return updated;
      })

      await removeLocalBook(bookId)
    } catch (err) {
      console.error(`Failed to download ${bookId}:`, err);
    }
  }

  const renderBook = ({ item }: { item: Audiobook }) => {
    const isDownloading = downloadingBookId === item.id;
    const files = downloadedFiles[item.id] || [];
    const handlePlay = async (uri: string) => {
      const lastPos = await getProgress(1, item.id, 1); // update correct fileId
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

        <TouchableOpacity onPress={() => handleDelete(item.id)}>
          <MaterialIcons name='delete' size={24} color="red" />
        </TouchableOpacity>

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
