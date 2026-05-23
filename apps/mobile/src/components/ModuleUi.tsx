import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors } from '../theme';

type ModuleAction = {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
};

export const EmptyState = ({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ModuleAction;
}) => (
  <View
    accessibilityRole="summary"
    accessibilityLabel={`${title}. ${body}`}
    style={styles.emptyState}
  >
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyBody}>{body}</Text>
    {action && (
      <TouchableOpacity
        accessibilityLabel={action.accessibilityLabel || action.label}
        accessibilityRole="button"
        onPress={action.onPress}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>{action.label}</Text>
      </TouchableOpacity>
    )}
  </View>
);

export const LoadingState = ({ title = 'Loading module' }: { title?: string }) => (
  <View accessibilityRole="progressbar" accessibilityLabel={title} style={styles.emptyState}>
    <ActivityIndicator color={colors.ai} />
    <Text style={styles.emptyBody}>{title}</Text>
  </View>
);

export const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <View
    accessibilityRole="alert"
    accessibilityLabel={`Could not load data. ${message}`}
    style={styles.emptyState}
  >
    <Text style={styles.errorTitle}>Could not load data</Text>
    <Text style={styles.emptyBody}>{message}</Text>
    <TouchableOpacity
      accessibilityLabel="Retry loading module data"
      accessibilityRole="button"
      style={styles.secondaryButton}
      onPress={onRetry}
    >
      <Text style={styles.secondaryButtonText}>Retry</Text>
    </TouchableOpacity>
  </View>
);

export const StatCard = ({
  title,
  value,
  detail,
  tone = 'primary',
}: {
  title: string;
  value: string;
  detail: string;
  tone?: 'primary' | 'cyan' | 'green' | 'violet' | 'amber' | 'red';
}) => {
  const toneStyle =
    tone === 'green'
      ? styles.statIconGreen
      : tone === 'cyan'
        ? styles.statIconCyan
        : tone === 'violet'
          ? styles.statIconViolet
          : tone === 'amber'
            ? styles.statIconAmber
            : tone === 'red'
              ? styles.statIconRed
              : styles.statIconPrimary;

  return (
    <View
      accessibilityLabel={`${title}: ${value}. ${detail}`}
      accessibilityRole="summary"
      style={styles.statCard}
    >
      <View style={styles.statHeader}>
        <Text style={styles.statLabel}>{title}</Text>
        <View style={[styles.statIcon, toneStyle]} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statDetail}>{detail}</Text>
    </View>
  );
};

export const ModuleHeader = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) => (
  <View style={styles.moduleHeader}>
    <View style={styles.moduleHeaderText}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
    {children}
  </View>
);

export const Card = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) => <View style={[styles.card, style]}>{children}</View>;

export const SearchInput = ({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) => (
  <TextInput
    accessibilityLabel={placeholder}
    autoCapitalize="none"
    onChangeText={onChangeText}
    placeholder={placeholder}
    placeholderTextColor={colors.muted}
    style={styles.searchInput}
    value={value}
  />
);

export const Pill = ({
  label,
  tone = 'blue',
}: {
  label: string;
  tone?: 'blue' | 'green' | 'red' | 'amber' | 'violet';
}) => {
  const style =
    tone === 'green'
      ? styles.pillGreen
      : tone === 'red'
        ? styles.pillRed
        : tone === 'amber'
          ? styles.pillAmber
          : tone === 'violet'
            ? styles.pillViolet
            : styles.pillBlue;
  return (
    <View accessibilityLabel={label} style={[styles.pill, style]}>
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
};

export const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    padding: 24,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  moduleHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  moduleHeaderText: {
    flex: 1,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillAmber: {
    backgroundColor: '#3b2b0c',
  },
  pillBlue: {
    backgroundColor: colors.primarySoft,
  },
  pillGreen: {
    backgroundColor: '#0c2f22',
  },
  pillRed: {
    backgroundColor: '#3a1117',
  },
  pillText: {
    color: colors.ai,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  pillViolet: {
    backgroundColor: '#25164d',
  },
  primaryButton: {
    backgroundColor: colors.ai,
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 44,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#07111f',
    fontWeight: '900',
  },
  searchInput: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    marginBottom: 14,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  secondaryButton: {
    borderColor: '#4f8cff',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 44,
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: '#8bb7ff',
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    marginTop: 4,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  statCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 22,
    flexGrow: 1,
    marginBottom: 12,
    minWidth: '47%',
    padding: 16,
  },
  statDetail: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  statHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statIcon: {
    borderRadius: 16,
    height: 28,
    width: 28,
  },
  statIconAmber: {
    backgroundColor: '#f59e0b',
  },
  statIconCyan: {
    backgroundColor: '#0ea5e9',
  },
  statIconGreen: {
    backgroundColor: '#10b981',
  },
  statIconPrimary: {
    backgroundColor: '#2563eb',
  },
  statIconRed: {
    backgroundColor: '#ef4444',
  },
  statIconViolet: {
    backgroundColor: '#9333ea',
  },
  statLabel: {
    color: '#8ba0bd',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  statValue: {
    color: '#0f172a',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 10,
  },
});
