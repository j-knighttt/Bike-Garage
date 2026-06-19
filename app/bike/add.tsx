import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Body, Button, Card, H1, H2, Row } from '../../src/components/ui';
import { COMPONENT_CATALOG } from '../../src/domain/componentCatalog';
import { defaultComponentsFor } from '../../src/domain/factories';
import { Bike, ComponentCategory } from '../../src/domain/types';
import { useGarageStore } from '../../src/store/useGarageStore';
import { colors, radius, spacing } from '../../src/theme';

const TYPES: { key: Bike['type']; label: string }[] = [
  { key: 'road', label: 'Rennrad' },
  { key: 'gravel', label: 'Gravel' },
  { key: 'mtb', label: 'MTB' },
  { key: 'ebike', label: 'E-Bike' },
  { key: 'commuter', label: 'Stadtrad' },
];

const CONDITION_PRESETS = [
  { label: 'Neuwertig', value: 95 },
  { label: 'Gut', value: 70 },
  { label: 'Mittel', value: 50 },
  { label: 'Stark genutzt', value: 30 },
];

const ALL_CATEGORIES = Object.keys(COMPONENT_CATALOG) as ComponentCategory[];

export default function AddBikeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addComponentTo } = useLocalSearchParams<{ addComponentTo?: string }>();
  const addBike = useGarageStore((s) => s.addBike);
  const addComponent = useGarageStore((s) => s.addComponent);

  // --- Add-component-to-existing-bike mode -------------------------------
  if (addComponentTo) {
    return (
      <AddComponentMode
        bikeId={addComponentTo}
        onDone={(cat, cond) => {
          addComponent(addComponentTo, { category: cat, initialConditionPercent: cond });
          router.back();
        }}
      />
    );
  }

  // --- New bike mode -----------------------------------------------------
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [type, setType] = useState<Bike['type']>('road');
  const [boughtUsed, setBoughtUsed] = useState(false);
  const [startKm, setStartKm] = useState('');
  const [condition, setCondition] = useState(70);
  const [selected, setSelected] = useState<ComponentCategory[]>(defaultComponentsFor('road'));

  const toggle = (cat: ComponentCategory) =>
    setSelected((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));

  const onTypeChange = (t: Bike['type']) => {
    setType(t);
    setSelected(defaultComponentsFor(t));
  };

  const canSave = name.trim().length > 0 && selected.length > 0;

  const onSave = () => {
    const km = parseFloat(startKm.replace(',', '.'));
    const bike = addBike({
      name: name.trim(),
      brand: brand.trim() || undefined,
      model: model.trim() || undefined,
      type,
      boughtUsed,
      startKm: Number.isNaN(km) ? 0 : km,
      purchaseDate: new Date().toISOString(),
      components: selected.map((category) => ({
        category,
        initialConditionPercent: boughtUsed ? condition : 100,
      })),
    });
    router.replace(`/bike/${bike.id}`);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.md }}
    >
      <H1>Neues Fahrrad</H1>

      <Field label="Name" value={name} onChangeText={setName} placeholder="z. B. Mein Rennrad" />
      <Row style={{ gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Field label="Marke" value={brand} onChangeText={setBrand} placeholder="Canyon" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Modell" value={model} onChangeText={setModel} placeholder="Endurace" />
        </View>
      </Row>

      <Body style={styles.label}>Typ</Body>
      <Row style={{ flexWrap: 'wrap', gap: spacing.sm }}>
        {TYPES.map((t) => (
          <Chip key={t.key} label={t.label} active={type === t.key} onPress={() => onTypeChange(t.key)} />
        ))}
      </Row>

      <Field label="Aktueller Kilometerstand" value={startKm} onChangeText={setStartKm} placeholder="0" keyboardType="numeric" />

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Body style={{ fontWeight: '700' }}>Gebraucht gekauft?</Body>
          <Pressable onPress={() => setBoughtUsed((v) => !v)}>
            <Ionicons
              name={boughtUsed ? 'toggle' : 'toggle-outline'}
              size={36}
              color={boughtUsed ? colors.primary : colors.textMuted}
            />
          </Pressable>
        </Row>
        {boughtUsed && (
          <>
            <Body muted style={{ fontSize: 13 }}>Geschätzter Zustand der Teile beim Kauf:</Body>
            <Row style={{ flexWrap: 'wrap', gap: spacing.sm }}>
              {CONDITION_PRESETS.map((p) => (
                <Chip key={p.value} label={`${p.label}`} active={condition === p.value} onPress={() => setCondition(p.value)} />
              ))}
            </Row>
          </>
        )}
      </Card>

      <H2 style={{ marginTop: spacing.sm }}>Komponenten</H2>
      <Body muted style={{ fontSize: 13 }}>Wähle die Teile deines digitalen Zwillings.</Body>
      {ALL_CATEGORIES.map((cat) => {
        const tpl = COMPONENT_CATALOG[cat];
        const active = selected.includes(cat);
        return (
          <Pressable key={cat} onPress={() => toggle(cat)}>
            <Card style={active ? { borderColor: colors.primary } : undefined}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row>
                  <Body style={{ fontSize: 18 }}>{tpl.icon}</Body>
                  <Body style={{ fontWeight: active ? '700' : '400' }}>{tpl.displayName}</Body>
                </Row>
                <Ionicons
                  name={active ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={active ? colors.primary : colors.textMuted}
                />
              </Row>
            </Card>
          </Pressable>
        );
      })}

      <Button title="Fahrrad speichern" onPress={onSave} disabled={!canSave} style={{ marginTop: spacing.md }} />
    </ScrollView>
  );
}

function AddComponentMode({
  bikeId,
  onDone,
}: {
  bikeId: string;
  onDone: (cat: ComponentCategory, condition: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const bike = useGarageStore((s) => s.bikes.find((b) => b.id === bikeId));
  const [cat, setCat] = useState<ComponentCategory | null>(null);
  const [condition, setCondition] = useState(100);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.md }}
    >
      <H1>Komponente hinzufügen</H1>
      {bike && <Body muted>zu „{bike.name}"</Body>}
      {ALL_CATEGORIES.map((c) => {
        const tpl = COMPONENT_CATALOG[c];
        const active = cat === c;
        return (
          <Pressable key={c} onPress={() => setCat(c)}>
            <Card style={active ? { borderColor: colors.primary } : undefined}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row>
                  <Body style={{ fontSize: 18 }}>{tpl.icon}</Body>
                  <Body style={{ fontWeight: active ? '700' : '400' }}>{tpl.displayName}</Body>
                </Row>
                <Ionicons
                  name={active ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={active ? colors.primary : colors.textMuted}
                />
              </Row>
            </Card>
          </Pressable>
        );
      })}
      <Body style={styles.label}>Zustand</Body>
      <Row style={{ flexWrap: 'wrap', gap: spacing.sm }}>
        {[{ label: 'Neu', value: 100 }, ...CONDITION_PRESETS].map((p) => (
          <Chip key={p.value} label={p.label} active={condition === p.value} onPress={() => setCondition(p.value)} />
        ))}
      </Row>
      <Button
        title="Hinzufügen"
        onPress={() => cat && onDone(cat, condition)}
        disabled={!cat}
        style={{ marginTop: spacing.md }}
      />
    </ScrollView>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Body style={styles.label}>{label}</Body>
      <TextInput
        {...props}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Body style={{ color: active ? '#fff' : colors.text, fontWeight: active ? '700' : '400' }}>{label}</Body>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  label: { fontWeight: '700', fontSize: 14 },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
});
