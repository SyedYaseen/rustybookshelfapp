import { Audiobook } from "@/data/db";
import React from 'react';
import { Image, StyleSheet, Text, View } from "react-native";



function BookCard({ book }: { book: Audiobook }) {

    return (
        <View style={styles.card}>
            <Image
                source={{
                    uri: 'https://www.thebookdesigner.com/wp-content/uploads/2023/12/The-Hobbit-Book-Cover-Minimalistic-Mountains.png?channel=Organic&medium=Google%20-%20Search'
                }}
                style={styles.cover}
            />
            <View style={styles.details}>
                <Text style={styles.title}>{book.title}</Text>
                <Text style={styles.author}>{book.author}</Text>
                {book.series && <Text style={styles.series}>{book.series}</Text>}
                {/* {renderActionButton()} */}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        padding: 12,
        marginVertical: 6,
        borderRadius: 8,
    },
    cover: {
        width: 80,
        height: 80,
        borderRadius: 6,
        backgroundColor: '#eee',
    },
    details: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'space-between',
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
    },
    author: {
        fontSize: 14,
        color: '#555',
    },
    series: {
        fontSize: 13,
        fontStyle: 'italic',
        color: '#888',
    },
    button: {
        marginTop: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: '#3b82f6',
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    resumeButton: {
        backgroundColor: '#22c55e',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
    },
});

export default BookCard