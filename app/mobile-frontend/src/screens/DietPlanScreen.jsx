import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const DIET_OPTIONS = ['balanced', 'vegetarian', 'non_vegetarian', 'vegan', 'mediterranean', 'low_carb', 'diabetic_friendly'];
const ACTIVITY_OPTIONS = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
const GOAL_OPTIONS = ['diabetes_prevention', 'blood_sugar_control', 'weight_loss', 'weight_gain', 'maintenance', 'gestational_diabetes'];

const initialForm = {
  age: '',
  weight: '',
  height: '',
  gender: 'male',
  dietaryPreference: 'balanced',
  healthConditions: '',
  activityLevel: 'moderate',
  goals: 'diabetes_prevention',
  allergies: '',
  typicalDay: '',
};

export default function DietPlanScreen() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const apiLang = language === 'turkish' ? 'turkish' : 'english';

  const [formData, setFormData] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState('');
  const [planSaved, setPlanSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedPlans, setSavedPlans] = useState([]);

  const update = (field, value) => setFormData((p) => ({ ...p, [field]: value }));

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const me = await api.fetchMe();
        if (me?.dietary_preference) update('dietaryPreference', me.dietary_preference);
        if (me?.allergies) update('allergies', me.allergies);
      } catch {}
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const list = await api.getMyDietPlans(10);
        setSavedPlans(Array.isArray(list) ? list : []);
      } catch {}
    })();
  }, [user?.id]);

  const isNegative = (v) => v !== '' && !isNaN(parseFloat(v)) && parseFloat(v) < 0;
  const negErr = t('dietPlan.negativeError');

  const bmi = formData.weight && formData.height
    ? (parseFloat(formData.weight) / ((parseFloat(formData.height) / 100) ** 2)).toFixed(1)
    : null;
  const bmiCatKey = bmi
    ? (parseFloat(bmi) < 18.5 ? 'underweight' : parseFloat(bmi) <= 24.9 ? 'normal' : parseFloat(bmi) <= 29.9 ? 'overweight' : 'obese')
    : '';
  const bmiCat = bmiCatKey ? t(`dietPlan.${bmiCatKey}`) : '';

  const calories = (() => {
    const w = parseFloat(formData.weight);
    const h = parseFloat(formData.height);
    const a = parseFloat(formData.age);
    if (!w || !h || !a || !formData.gender || !formData.activityLevel) return null;
    const bmr = formData.gender === 'male'
      ? 88.362 + 13.397 * w + 4.799 * h - 5.677 * a
      : 447.593 + 9.247 * w + 3.098 * h - 4.33 * a;
    const mul = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
    return Math.round(bmr * (mul[formData.activityLevel] || 1.55));
  })();

  const valid =
    formData.age && formData.weight && formData.height && formData.gender
    && !isNegative(formData.age) && !isNegative(formData.weight) && !isNegative(formData.height);

  const submit = async () => {
    if (!valid) {
      Alert.alert(t('common.error'), negErr);
      return;
    }
    setError('');
    setLoading(true);
    setPlan(null);
    try {
      const payload = {
        age: parseInt(formData.age, 10),
        weight: parseFloat(formData.weight),
        height: parseFloat(formData.height),
        gender: formData.gender,
        dietaryPreference: formData.dietaryPreference,
        healthConditions: formData.healthConditions || '',
        activityLevel: formData.activityLevel,
        goals: formData.goals,
        allergies: formData.allergies || '',
        typicalDay: formData.typicalDay || '',
        language: apiLang,
      };
      const res = await api.generateDietPlan(payload);
      setPlan(res);
      setPlanSaved(!!user);
      if (user) {
        try {
          const list = await api.getMyDietPlans(10);
          setSavedPlans(Array.isArray(list) ? list : []);
        } catch {}
      }
    } catch (e) {
      setError(e.message || 'Diet plan generation failed');
    } finally {
      setLoading(false);
    }
  };

  const optionLabel = (kind, value) => {
    const key = value.replace(/-/g, '_');
    return t(`dietPlan.${kind}_${key}`);
  };

  const savedPlanGoalLabel = (goal) => {
    if (!goal) return t('dietPlan.title');
    if (GOAL_OPTIONS.includes(goal)) return optionLabel('goal', goal);
    return goal.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const handleSavePlan = async () => {
    if (!plan || !user || planSaved) return;
    setSaving(true);
    try {
      await api.saveDietPlan(plan, formData.goals);
      setPlanSaved(true);
      const list = await api.getMyDietPlans(10);
      setSavedPlans(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const loadSavedPlan = (item) => {
    if (item?.payload) {
      setPlan(item.payload);
      setPlanSaved(true);
      setError('');
    }
  };

  const handleDeletePlan = async (item) => {
    const id = Number(item.id ?? item.diet_plan_id ?? 0);
    if (!id || isNaN(id)) return;
    const previous = [...savedPlans];
    setSavedPlans((prev) => prev.filter((p) => Number(p.id ?? p.diet_plan_id) !== id));
    setError('');
    try {
      await api.deleteDietPlan(id);
    } catch (e) {
      setSavedPlans(previous);
      setError(e.message || 'Delete failed');
    }
  };

  const handleShareGroceryList = () => {
    if (!plan?.grocery_list) return;
    const text = typeof plan.grocery_list === 'string' ? plan.grocery_list : JSON.stringify(plan.grocery_list, null, 2);
    Share.share({ message: text, title: t('dietPlan.groceries') });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>{t('dietPlan.title')}</Text>
      <Text style={styles.subtitle}>{t('dietPlan.subtitle')}</Text>

      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

      {/* Body metrics */}
      <Text style={styles.sectionTitle}>{t('dietPlan.bodyMetrics')}</Text>
      <View style={styles.row2}>
        <View style={styles.half}>
          <Text style={styles.label}>{t('dietPlan.age')} *</Text>
          <TextInput
            style={[styles.input, isNegative(formData.age) && styles.inputError]}
            placeholder="e.g. 35"
            value={formData.age}
            onChangeText={(v) => update('age', v)}
            keyboardType="number-pad"
            placeholderTextColor="#64748b"
          />
        </View>
        <View style={styles.half}>
          <Text style={styles.label}>{t('dietPlan.weight')} *</Text>
          <TextInput
            style={[styles.input, isNegative(formData.weight) && styles.inputError]}
            placeholder="e.g. 70"
            value={formData.weight}
            onChangeText={(v) => update('weight', v)}
            keyboardType="decimal-pad"
            placeholderTextColor="#64748b"
          />
        </View>
      </View>
      <View style={styles.row2}>
        <View style={styles.half}>
          <Text style={styles.label}>{t('dietPlan.height')} *</Text>
          <TextInput
            style={[styles.input, isNegative(formData.height) && styles.inputError]}
            placeholder="e.g. 170"
            value={formData.height}
            onChangeText={(v) => update('height', v)}
            keyboardType="decimal-pad"
            placeholderTextColor="#64748b"
          />
        </View>
        <View style={styles.half}>
          <Text style={styles.label}>{t('dietPlan.gender')} *</Text>
          <View style={styles.optionRow}>
            {['male', 'female'].map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.option, formData.gender === g && styles.optionActive]}
                onPress={() => update('gender', g)}
              >
                <Text style={styles.optionText}>{t(`dietPlan.${g}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Live metrics */}
      {(bmi || calories) && (
        <View style={styles.liveRow}>
          {bmi && (
            <View style={styles.liveCard}>
              <Text style={styles.liveLabel}>{t('dietPlan.bmi')}</Text>
              <Text style={[styles.liveValue, bmiCatKey === 'normal' && styles.liveValueGreen]}>{bmi}</Text>
              <Text style={styles.liveSub}>{bmiCat}</Text>
            </View>
          )}
          {calories && (
            <View style={styles.liveCard}>
              <Text style={styles.liveLabel}>{t('dietPlan.dailyCalories')}</Text>
              <Text style={styles.liveValue}>{calories}</Text>
              <Text style={styles.liveSub}>{t('dietPlan.kcalDay')}</Text>
            </View>
          )}
          <View style={styles.liveCard}>
            <Text style={styles.liveLabel}>{t('dietPlan.goal')}</Text>
            <Text style={[styles.liveValue, styles.liveValueSmall]} numberOfLines={1}>
              {optionLabel('goal', formData.goals)}
            </Text>
          </View>
        </View>
      )}

      {/* Preferences */}
      <Text style={styles.sectionTitle}>{t('dietPlan.preferences')}</Text>
      <Text style={styles.label}>{t('dietPlan.dietType')}</Text>
      <View style={styles.optionWrap}>
        {DIET_OPTIONS.map((val) => (
          <TouchableOpacity
            key={val}
            style={[styles.optionChip, formData.dietaryPreference === val && styles.optionActive]}
            onPress={() => update('dietaryPreference', val)}
          >
            <Text style={[styles.optionChipText, formData.dietaryPreference === val && styles.optionChipTextActive]} numberOfLines={1}>{optionLabel('diet', val)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.label, styles.labelTop]}>{t('dietPlan.activityLevel')}</Text>
      <View style={styles.optionWrap}>
        {ACTIVITY_OPTIONS.map((val) => (
          <TouchableOpacity
            key={val}
            style={[styles.optionChip, formData.activityLevel === val && styles.optionActive]}
            onPress={() => update('activityLevel', val)}
          >
            <Text style={[styles.optionChipText, formData.activityLevel === val && styles.optionChipTextActive]} numberOfLines={1}>{optionLabel('activity', val)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.label, styles.labelTop]}>{t('dietPlan.goalLabel')}</Text>
      <View style={styles.optionWrap}>
        {GOAL_OPTIONS.map((val) => (
          <TouchableOpacity
            key={val}
            style={[styles.optionChip, formData.goals === val && styles.optionActive]}
            onPress={() => update('goals', val)}
          >
            <Text style={[styles.optionChipText, formData.goals === val && styles.optionChipTextActive]} numberOfLines={1}>{optionLabel('goal', val)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Additional info */}
      <Text style={styles.sectionTitle}>{t('dietPlan.additionalInfo')}</Text>
      <View style={styles.field}>
        <Text style={styles.label}>{t('dietPlan.healthConditions')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('dietPlan.placeholderHealth')}
          value={formData.healthConditions}
          onChangeText={(v) => update('healthConditions', v)}
          placeholderTextColor="#64748b"
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>{t('dietPlan.allergies')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('dietPlan.placeholderAllergies')}
          value={formData.allergies}
          onChangeText={(v) => update('allergies', v)}
          placeholderTextColor="#64748b"
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>{t('dietPlan.dailyRoutine')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('dietPlan.placeholderRoutine')}
          value={formData.typicalDay}
          onChangeText={(v) => update('typicalDay', v)}
          placeholderTextColor="#64748b"
        />
      </View>

      <TouchableOpacity
        style={[styles.button, (loading || !valid) && styles.buttonDisabled]}
        onPress={submit}
        disabled={loading || !valid}
        activeOpacity={0.8}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('dietPlan.generate')}</Text>}
      </TouchableOpacity>
      {loading && <Text style={styles.generatingText}>{t('dietPlan.generating')}</Text>}

      {/* My saved plans */}
      {user && savedPlans.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>{t('dietPlan.mySavedPlans')}</Text>
          <View style={styles.savedList}>
            {savedPlans.map((item) => (
              <View key={item.id} style={styles.savedItem}>
                <TouchableOpacity style={styles.savedItemContent} onPress={() => loadSavedPlan(item)} activeOpacity={0.8}>
                  <Text style={styles.savedItemGoal} numberOfLines={1}>{savedPlanGoalLabel(item.goal)}</Text>
                  <Text style={styles.savedItemOverview} numberOfLines={2}>{item.overview}</Text>
                  {item.created_at ? <Text style={styles.savedItemDate}>{new Date(item.created_at).toLocaleDateString()}</Text> : null}
                  <Text style={styles.savedItemUse}>{t('dietPlan.useAgain')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.savedItemDelete}
                  onPress={() => handleDeletePlan(item)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={22} color="#f87171" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Result */}
      {plan && (
        <View style={styles.result}>
          <View style={styles.resultHeader}>
            <View>
              <Text style={styles.resultTitle}>{t('dietPlan.yourPlan')}</Text>
              <Text style={styles.resultSubtitle}>{t('dietPlan.generatedBy')}</Text>
              {planSaved && <Text style={styles.savedBadge}>{t('dietPlan.savedToAccount')}</Text>}
            </View>
            <View style={styles.resultHeaderActions}>
              {plan.grocery_list && (
                <TouchableOpacity style={styles.groceryButton} onPress={handleShareGroceryList} activeOpacity={0.8}>
                  <Ionicons name="list-outline" size={18} color="#e6edf3" />
                  <Text style={styles.groceryButtonText}>{t('dietPlan.shareGroceryList')}</Text>
                </TouchableOpacity>
              )}
              {user && (
                planSaved ? (
                  <View style={styles.savedPill}><Text style={styles.savedPillText}>{t('dietPlan.saved')}</Text></View>
                ) : (
                  <TouchableOpacity style={styles.saveButton} onPress={handleSavePlan} disabled={saving} activeOpacity={0.8}>
                    {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveButtonText}>{t('dietPlan.saveThisPlan')}</Text>}
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>
          {plan.overview && (
            <>
              <Text style={styles.resultSectionTitle}>{t('dietPlan.overview')}</Text>
              <Text style={styles.resultText}>{plan.overview}</Text>
            </>
          )}
          {plan.daily_plan && (
            <>
              <Text style={styles.resultSectionTitle}>{t('dietPlan.dailyMeals')}</Text>
              <Text style={styles.resultText}>{plan.daily_plan}</Text>
            </>
          )}
          {plan.grocery_list && (
            <>
              <Text style={styles.resultSectionTitle}>{t('dietPlan.groceries')}</Text>
              <Text style={styles.resultText}>{plan.grocery_list}</Text>
            </>
          )}
          {plan.important_notes && (
            <>
              <Text style={styles.resultSectionTitle}>{t('dietPlan.importantNotes')}</Text>
              <Text style={styles.resultNotes}>{plan.important_notes}</Text>
            </>
          )}
          {plan.nutritional_info && (
            <View style={styles.nutritionRow}>
              {[
                { label: t('dietPlan.calories'), value: plan.nutritional_info.daily_calories, unit: 'kcal' },
                { label: t('dietPlan.protein'), value: plan.nutritional_info.protein_grams, unit: 'g' },
                { label: t('dietPlan.carbs'), value: plan.nutritional_info.carbs_grams, unit: 'g' },
                { label: t('dietPlan.fat'), value: plan.nutritional_info.fat_grams, unit: 'g' },
              ].filter((n) => n.value != null).map((n, i) => (
                <View key={i} style={styles.nutritionCard}>
                  <Text style={styles.nutritionLabel}>{n.label}</Text>
                  <Text style={styles.nutritionValue}>{n.value}</Text>
                  <Text style={styles.nutritionUnit}>{n.unit}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1419' },
  content: { paddingHorizontal: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#e6edf3', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#8b949e', marginBottom: 20 },
  errorBox: { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  errorText: { color: '#f87171', fontSize: 14 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#8b949e', letterSpacing: 1, textTransform: 'uppercase', marginTop: 20, marginBottom: 10 },
  label: { fontSize: 14, color: '#94a3b8', marginBottom: 6 },
  labelTop: { marginTop: 4 },
  field: { marginBottom: 14 },
  row2: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  half: { flex: 1 },
  input: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  inputError: { borderColor: 'rgba(239,68,68,0.5)' },
  optionRow: { flexDirection: 'row', gap: 8 },
  option: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#1e293b', alignItems: 'center' },
  optionActive: { backgroundColor: '#10b981' },
  optionText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#1e293b', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  optionChipText: { color: '#94a3b8', fontSize: 13 },
  optionChipTextActive: { color: '#fff' },
  liveRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  liveCard: { flex: 1, minWidth: '30%', backgroundColor: '#1e293b', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  liveLabel: { fontSize: 10, color: '#8b949e', fontWeight: '600', letterSpacing: 0.5, marginBottom: 4 },
  liveValue: { fontSize: 18, fontWeight: '800', color: '#e6edf3' },
  liveValueSmall: { fontSize: 12 },
  liveValueGreen: { color: '#10b981' },
  liveSub: { fontSize: 11, color: '#8b949e', marginTop: 2 },
  button: { backgroundColor: '#10b981', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 24, minHeight: 52, justifyContent: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  generatingText: { textAlign: 'center', color: '#8b949e', fontSize: 13, marginTop: 8 },
  result: { marginTop: 28, backgroundColor: '#1e293b', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  resultTitle: { fontSize: 18, fontWeight: '700', color: '#10b981', marginBottom: 4 },
  resultSubtitle: { fontSize: 13, color: '#8b949e', marginBottom: 4 },
  savedBadge: { fontSize: 12, color: '#10b981', marginTop: 4 },
  savedPill: { backgroundColor: 'rgba(16,185,129,0.2)', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  savedPillText: { color: '#10b981', fontSize: 13, fontWeight: '600' },
  saveButton: { backgroundColor: '#10b981', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, minHeight: 40, justifyContent: 'center' },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  resultSectionTitle: { fontSize: 14, fontWeight: '600', color: '#e6edf3', marginTop: 14, marginBottom: 6 },
  savedList: { marginBottom: 20 },
  savedItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  savedItemContent: { flex: 1 },
  savedItemGoal: { fontSize: 15, fontWeight: '600', color: '#e6edf3', marginBottom: 4 },
  savedItemOverview: { fontSize: 13, color: '#8b949e', marginBottom: 4 },
  savedItemDate: { fontSize: 11, color: '#6e7681', marginBottom: 6 },
  savedItemUse: { fontSize: 13, color: '#10b981', fontWeight: '600' },
  savedItemDelete: { padding: 8, marginLeft: 8 },
  resultHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  groceryButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)' },
  groceryButtonText: { color: '#e6edf3', fontSize: 13, fontWeight: '500' },
  resultText: { fontSize: 14, color: '#94a3b8', lineHeight: 22 },
  resultNotes: { fontSize: 14, color: '#94a3b8', lineHeight: 22, fontStyle: 'italic' },
  nutritionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  nutritionCard: { flex: 1, minWidth: '22%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 12, alignItems: 'center' },
  nutritionLabel: { fontSize: 10, color: '#8b949e', fontWeight: '600', marginBottom: 4 },
  nutritionValue: { fontSize: 16, fontWeight: '700', color: '#e6edf3' },
  nutritionUnit: { fontSize: 10, color: '#8b949e', marginTop: 2 },
});
