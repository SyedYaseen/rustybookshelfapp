import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
    title: string;
    coverUrl: string;
    isPlaying: boolean;
    onPlayPause: () => void;
    onDownload: () => void;
};

export default function BookCard({
    title,
    coverUrl,
    isPlaying,
    // onPlayPause,
    onDownload,
}: Props) {
    return (
        <View style={styles.card}>
            <Image source={{ uri: coverUrl }} style={styles.cover} resizeMode="cover" />

            <View style={styles.content}>
                <Text numberOfLines={2} style={styles.title}>
                    {title}
                </Text>

                <View style={styles.actions}>
                    <Pressable onPress={onDownload} style={styles.icon}>
                        <FontAwesome name="download" size={24} color="#555" />
                    </Pressable>

                    {/* <Pressable onPress={onPlayPause} style={styles.icon}>
                        <FontAwesome name={isPlaying ? 'pause' : 'play'} size={24} color="#555" />
                    </Pressable> */}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 3,
        alignItems: 'center',
    },
    cover: {
        width: 80,
        height: 110,
        borderRadius: 8,
        marginRight: 12,
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111',
        marginBottom: 8,
    },
    actions: {
        flexDirection: 'row',
        gap: 16,
    },
    icon: {
        padding: 4,
    },
});
