import { fetchBooks } from '@/data/api';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';


export type Book = {
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


export default function Library() {
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    fetchBooks().then((data) => {
      setBooks(data.books);
      console.log(data.books);
    });
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>

      {books.map((book) => (
        <Text style={{ color: "black", fontSize: 18 }} key={book.title}>{book.title}</Text>
      ))}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 32,
    backgroundColor: "#eee",
    gap: 16,
    overflow: 'hidden',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  font: {
    color: "#FFFFFF",
  }
});
