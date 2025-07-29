import { StyleSheet, Text, View } from 'react-native';

export default function MenuTab() {
  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.titleText}>Menu Screen</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.text}>Menu items will appear here</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', // dark background
    padding: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  titleText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: "#FFFFFF",
    fontSize: 16,
  },
});