import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Recommendation } from '../domain/types';
import { useGarageStore } from '../store/useGarageStore';
import { colors, spacing } from '../theme';
import { Body, Button, Card, Row, UrgencyBadge, WearBar } from './ui';

export function RecommendationCard({
  rec,
  bikeName,
}: {
  rec: Recommendation;
  bikeName?: string;
}) {
  const router = useRouter();
  const replaceComponent = useGarageStore((s) => s.replaceComponent);
  const markCareDone = useGarageStore((s) => s.markCareDone);
  const markServiceDone = useGarageStore((s) => s.markServiceDone);

  const onDone = () => {
    if (rec.componentId) replaceComponent(rec.bikeId, rec.componentId);
    else if (rec.careKind) markCareDone(rec.bikeId, rec.careKind);
    else if (rec.serviceIntervalId) markServiceDone(rec.bikeId, rec.serviceIntervalId);
  };

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Body style={{ fontWeight: '700', flexShrink: 1 }}>{rec.title}</Body>
        <UrgencyBadge urgency={rec.urgency} />
      </Row>
      {bikeName && <Body muted>{bikeName}</Body>}
      <WearBar progress={rec.progress} />
      <Body muted>{rec.detail}</Body>
      <Row style={{ justifyContent: 'space-between', marginTop: spacing.xs }}>
        <Row>
          <Ionicons
            name={rec.diy ? 'home-outline' : 'business-outline'}
            size={14}
            color={colors.textMuted}
          />
          <Body muted style={{ fontSize: 13 }}>
            {rec.diy ? 'Selbst machbar' : 'Werkstatt empfohlen'}
            {rec.warrantyRelevant ? ' · Garantie' : ''}
          </Body>
        </Row>
        <Body muted style={{ fontSize: 13 }}>{rec.dueIn}</Body>
      </Row>
      <Row style={{ marginTop: spacing.xs, gap: spacing.sm }}>
        <Button title="Erledigt ✓" variant="secondary" onPress={onDone} style={{ flex: 1 }} />
        {!rec.diy && (
          <Button
            title="Werkstatt finden"
            variant="ghost"
            onPress={() => router.push('/services')}
            style={{ flex: 1 }}
          />
        )}
      </Row>
    </Card>
  );
}
