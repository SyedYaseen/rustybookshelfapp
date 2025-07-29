import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Button, StyleSheet, TextInput, View } from 'react-native';

export default function Login() {
    const router = useRouter();
    const [server, setServer] = useState('http://192.168.1.3:3000');
    const [username, setUsername] = useState('valerie');
    const [password, setPassword] = useState('mypassword');

    const handleLogin = async () => {
        try {
            console.log(`${server}/api/login`, username, password)
            const res = await fetch(`${server}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (!res.ok) throw new Error('Login failed');

            const data = await res.json();
            await AsyncStorage.setItem('token', data.token);
            await AsyncStorage.setItem('server', server);
            router.replace('/');
        } catch (err: any) {
            alert(err.message);
        }
    };

    return (
        <View style={styles.container}>
            <TextInput placeholder="Server Address" value={server} onChangeText={setServer} style={styles.input} />
            <TextInput placeholder="Email" value={username} onChangeText={setUsername} style={styles.input} autoCapitalize="none" />
            <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
            <Button title="Login" onPress={handleLogin} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20, flex: 1, justifyContent: 'center' },
    input: { borderWidth: 1, marginBottom: 12, padding: 10, borderRadius: 5, color: '#FFFFFF' }
});
