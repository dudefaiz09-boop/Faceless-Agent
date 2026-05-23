import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ErrorState, ModuleHeader } from '../components/ModuleUi';
import { useAuth } from '../contexts/AuthContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { apiClient } from '../lib/api-client';
import { colors } from '../theme';

type AiStatus = {
  enabled: boolean;
  provider?: string;
};

type AiResponse = {
  id?: string;
  response?: string;
  answer?: string;
  content?: string;
};

type ChatLog = {
  id: string;
  query: string;
  response: string;
};

function getAiResponseText(data: AiResponse) {
  return data.response || data.answer || data.content || 'No response.';
}

async function fetchAiStatus(): Promise<AiStatus> {
  try {
    return await apiClient.request<AiStatus>('/api/ai/status');
  } catch {
    return { enabled: false };
  }
}

export function AiAssistantScreen() {
  const { assignedModules, schoolId } = useAuth();
  const { isOffline } = useNetworkStatus();
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [query, setQuery] = useState('');
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contextModules = useMemo(
    () => ['fees', 'attendance', 'assignments', 'performance', 'library'],
    []
  );

  const refreshStatus = useCallback(async () => {
    setStatusLoaded(false);
    setError(null);
    const data = await fetchAiStatus();
    setStatus(data);
    setStatusLoaded(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void fetchAiStatus().then((data) => {
      if (cancelled) return;
      setStatus(data);
      setStatusLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  const hasAssignedAiModule =
    assignedModules.length === 0 || assignedModules.includes('aiAssistant');
  const aiEnabled = Boolean(status?.enabled && hasAssignedAiModule);
  const aiAvailable = aiEnabled && !isOffline;

  const sendQuery = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed || loading || !aiAvailable) return;

    const logId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setLogs((previous) => [...previous, { id: logId, query: trimmed, response: '' }]);
    setQuery('');
    setLoading(true);
    setError(null);

    try {
      let data: AiResponse;
      try {
        data = await apiClient.request<AiResponse>('/api/ai/context-query', {
          method: 'POST',
          body: JSON.stringify({ query: trimmed, mode: 'chat', modules: contextModules }),
        });
      } catch {
        data = await apiClient.request<AiResponse>('/api/ai/query', {
          method: 'POST',
          body: JSON.stringify({ query: trimmed, mode: 'chat' }),
        });
      }

      setLogs((previous) =>
        previous.map((log) =>
          log.id === logId
            ? { ...log, id: data.id || logId, response: getAiResponseText(data) }
            : log
        )
      );
    } catch (err: unknown) {
      setLogs((previous) => previous.filter((log) => log.id !== logId));
      setError((err as Error).message || 'Failed to get AI response.');
    } finally {
      setLoading(false);
    }
  }, [aiAvailable, contextModules, loading, query]);

  if (!statusLoaded) {
    return (
      <View style={styles.flex}>
        <ModuleHeader title="AI Assistant" subtitle="Role-aware assistant." />
        <View style={styles.centered}>
          <ActivityIndicator color={colors.ai} />
          <Text style={styles.statusText}>Checking AI availability...</Text>
        </View>
      </View>
    );
  }

  if (!aiEnabled) {
    return (
      <View style={styles.flex}>
        <ModuleHeader title="AI Assistant" subtitle="Role-aware assistant." />
        <View style={styles.centered}>
          <Text style={styles.unavailableTitle}>AI Unavailable</Text>
          <Text style={styles.unavailableBody}>
            AI services are not configured for this tenant or your account. Please contact your
            administrator.
          </Text>
          <TouchableOpacity onPress={refreshStatus} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      style={styles.flex}
    >
      <ModuleHeader
        title="AI Assistant"
        subtitle={
          isOffline ? 'Reconnect to ask AI questions.' : 'Ask questions about your work or studies.'
        }
      />
      {error ? <ErrorState message={error} onRetry={sendQuery} /> : null}
      <FlatList
        contentContainerStyle={styles.chatList}
        data={logs}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>How can I help?</Text>
            <Text style={styles.emptyBody}>
              Ask about assignments, attendance, fees, performance, or library resources available
              to your role.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.messageWrapper}>
            <View style={[styles.bubble, styles.userBubble]}>
              <Text style={styles.userText}>{item.query}</Text>
            </View>
            <View style={[styles.bubble, styles.aiBubble]}>
              {item.response ? (
                <Text style={styles.aiText}>{item.response}</Text>
              ) : (
                <ActivityIndicator color={colors.ai} />
              )}
            </View>
          </View>
        )}
      />
      <View style={styles.composer}>
        <TextInput
          editable={!loading && aiAvailable}
          onChangeText={setQuery}
          onSubmitEditing={sendQuery}
          placeholder={isOffline ? 'AI is offline' : 'Ask a question...'}
          placeholderTextColor={colors.muted}
          returnKeyType="send"
          style={styles.input}
          value={query}
        />
        <TouchableOpacity
          disabled={loading || !query.trim() || !aiAvailable}
          onPress={sendQuery}
          style={[
            styles.sendButton,
            (loading || !query.trim() || !aiAvailable) && styles.sendButtonDisabled,
          ]}
        >
          <Text style={styles.sendButtonText}>{loading ? '...' : 'Send'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    marginTop: 6,
  },
  aiText: {
    color: colors.whiteSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  bubble: {
    borderRadius: 18,
    maxWidth: '84%',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  chatList: {
    flexGrow: 1,
    paddingBottom: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  composer: {
    alignItems: 'center',
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textAlign: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  flex: {
    backgroundColor: colors.background,
    flex: 1,
  },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.text,
    flex: 1,
    marginRight: 8,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  messageWrapper: {
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  statusText: {
    color: colors.muted,
    marginTop: 12,
  },
  unavailableBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  unavailableTitle: {
    color: colors.danger,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  userText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default AiAssistantScreen;
