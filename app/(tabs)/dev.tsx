import React, { useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { Stack } from 'expo-router'
import { exampleFlow } from '../../lib/db/example_usage'

/**
 * Dev screen to run exampleFlow and show logs.
 *
 * This screen is intended for local development only.
 * - Press "Run exampleFlow" to execute the DB + media example (uses placeholder URI if none provided).
 * - Logs from the run are shown below.
 *
 * Note: exampleFlow interacts with device filesystem and SQLite, so run on a simulator or real device.
 */

export default function DevScreen(): JSX.Element {
  const [logs, setLogs] = useState<string[]>([])
  const [running, setRunning] = useState(false)

  const pushLog = (msg: string) => {
    const time = new Date().toLocaleTimeString()
    setLogs((prev) => [`[${time}] ${msg}`, ...prev].slice(0, 200)) // keep last 200
  }

  const clearLogs = () => {
    setLogs([])
  }

  const runExample = async () => {
    setRunning(true)
    pushLog('Starting exampleFlow...')
    try {
      const result = await exampleFlow() // no sample URI -> uses placeholder flow
      pushLog('exampleFlow completed successfully.')
      if (result && typeof result === 'object') {
        try {
          pushLog(`albumId: ${String(result.albumId ?? 'n/a')}`)
          pushLog(`photoId: ${String(result.photoId ?? 'n/a')}`)
          pushLog(
            `photos.length: ${Array.isArray(result.photos) ? result.photos.length : 'n/a'}`
          )
        } catch {
          // ignore formatting errors
        }
      }
    } catch (err: any) {
      pushLog(`exampleFlow failed: ${String(err?.message ?? err)}`)
    } finally {
      setRunning(false)
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Dev / Example' }} />
      <View style={styles.header}>
        <Text style={styles.title}>Dev: exampleFlow Runner</Text>
        <Text style={styles.subtitle}>
          Run the DB + media example to verify migrations, file save and a basic
          photo insert. Use a simulator or device.
        </Text>
      </View>

      <View style={styles.controls}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={runExample}
          disabled={running}
        >
          <Text style={styles.buttonText}>
            {running ? 'Running...' : 'Run exampleFlow'}
          </Text>
          {running && (
            <ActivityIndicator
              style={styles.indicator}
              size="small"
              color="#fff"
            />
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.buttonSecondary,
            pressed && styles.buttonSecondaryPressed,
          ]}
          onPress={clearLogs}
        >
          <Text style={styles.buttonSecondaryText}>Clear logs</Text>
        </Pressable>
      </View>

      <View style={styles.logContainer}>
        <Text style={styles.logTitle}>Logs</Text>
        <ScrollView
          style={styles.logScroll}
          contentContainerStyle={styles.logContent}
          keyboardShouldPersistTaps="handled"
        >
          {logs.length === 0 ? (
            <Text style={styles.logEmpty}>
              No logs yet. Press &quot;Run exampleFlow&quot;.
            </Text>
          ) : (
            logs.map((line, idx) => (
              <Text key={idx} style={styles.logLine}>
                {line}
              </Text>
            ))
          )}
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Platform: {Platform.OS} — This screen is for development only. Do not
          ship in production builds.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#444' },
  controls: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  button: {
    backgroundColor: '#1f6feb',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: '#fff', fontWeight: '600', marginRight: 8 },
  indicator: { marginLeft: 8 },
  buttonSecondary: {
    marginLeft: 12,
    backgroundColor: '#eee',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  buttonSecondaryPressed: { opacity: 0.8 },
  buttonSecondaryText: { color: '#111', fontWeight: '600' },
  logContainer: { flex: 1, marginTop: 8 },
  logTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  logScroll: {
    backgroundColor: '#0b1220',
    borderRadius: 6,
    padding: 8,
    flex: 1,
  },
  logContent: { flexDirection: 'column-reverse' },
  logLine: {
    color: '#e6eef8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 6,
    fontSize: 12,
  },
  logEmpty: { color: '#9aa4b2', fontStyle: 'italic' },
  footer: { paddingVertical: 8, alignItems: 'center' },
  footerText: { fontSize: 12, color: '#666' },
})
