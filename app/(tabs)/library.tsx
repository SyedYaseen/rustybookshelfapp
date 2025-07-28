import { downloadAndUnzip, fetchBookFilesData, fetchBooks, getProgress, removeLocalBook } from '@/data/api';
import { Audiobook, FileRow, getFileProgress, getFilesForBook, markBookDownloaded, upsertAudiobooks, upsertFiles } from '@/data/db';
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
      setDownloadedFiles((prev) => ({ ...prev, [bookId]: fileRows }));
      markBookDownloaded(bookId, `${ROOT}${bookId}/`)
    } catch (err) {
      console.error(`Failed to download ${bookId}:`, err);
    } finally {
      setDownloadingBookId(null);
    }
  };

  const handleDelete = async (bookId: number) => {
    try {
      await removeLocalBook(bookId)
      setDownloadedFiles(prev => {
        const updated = { ...prev };
        delete updated[bookId];
        return updated;
      })
    } catch (err) {
      console.error(`Failed to delete ${bookId}:`, err);
    }
  }

  const renderBook = ({ item }: { item: Audiobook }) => {

    const isDownloading = downloadingBookId === item.id;
    const files = downloadedFiles[item.id] || [];
    const handlePlay = async (uri: string, file_id: number) => {
      const lastPosServer = await getProgress(1, item.id, file_id); // get saved progress
      const lastPosLcl = await getFileProgress(item.id, file_id)
      const lastPos = Math.max(lastPosServer, lastPosLcl)
      console.log("Last posiion", lastPosServer, lastPosLcl, lastPos)
      await player.playUri(uri, item.id, file_id, lastPos);
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
              const short = f.local_path?.replace(FileSystem.documentDirectory!, "");
              const isCurrent = player.currentUri === f.local_path;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={styles.fileRow}
                  onPress={() => handlePlay(f.local_path as string, f.id)}
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

        {player.currentUri && files.some(f => f.local_path === player.currentUri)
          && (
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
