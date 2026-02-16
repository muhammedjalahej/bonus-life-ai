import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function ChatScreen({ navigation }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const apiLang = language === 'turkish' ? 'turkish' : 'english';

  // Render text with **bold** as actual bold (removes literal **)
  const renderMessageText = (rawText) => {
    if (typeof rawText !== 'string') return rawText;
    const parts = rawText.split(/\*\*/);
    if (parts.length === 1) return <Text style={styles.bubbleText}>{rawText}</Text>;
    return (
      <Text style={styles.bubbleText}>
        {parts.map((segment, i) =>
          i % 2 === 1 ? (
            <Text key={i} style={[styles.bubbleText, styles.bold]}>{segment}</Text>
          ) : (
            segment
          )
        )}
      </Text>
    );
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text }]);
    setLoading(true);
    try {
      const res = await api.chat(text, apiLang, user?.id?.toString() || 'default');
      setMessages((m) => [...m, { role: 'assistant', text: res.response }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', text: 'Error: ' + (e.message || 'Could not get response') }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <FlatList
        data={messages}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            {renderMessageText(item.text)}
          </View>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.placeholder}>Ask about diabetes, diet, or lifestyle. Type a message below.</Text>
        }
      />
      <View style={styles.footer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#64748b"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={send}
          editable={!loading}
        />
        <TouchableOpacity style={[styles.send, loading && styles.sendDisabled]} onPress={send} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sendText}>Send</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a12' },
  list: { padding: 16, paddingBottom: 24 },
  placeholder: { color: '#64748b', textAlign: 'center', marginTop: 24, paddingHorizontal: 24 },
  bubble: { maxWidth: '85%', padding: 12, borderRadius: 12, marginBottom: 8 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#10b981' },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#1e293b' },
  bubbleText: { color: '#fff', fontSize: 15 },
  bold: { fontWeight: '700' },
  footer: { flexDirection: 'row', padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: '#1e293b', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#1e293b', borderRadius: 14, padding: 14, color: '#fff', fontSize: 16, minHeight: 48 },
  send: { backgroundColor: '#10b981', borderRadius: 14, paddingHorizontal: 24, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  sendDisabled: { opacity: 0.7 },
  sendText: { color: '#fff', fontWeight: '600' },
});
