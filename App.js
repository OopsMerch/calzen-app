import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  Modal, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';

const BACKEND_URL = "https://api.oops-merch.ru";

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState('female');
  const [activity, setActivity] = useState(1.2);
  const [goal, setGoal] = useState('lose');

  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cameraPermission, setCameraPermission] = useState(null);

  const [selectedLogId, setSelectedLogId] = useState(null);
  const [correctionText, setCorrectionText] = useState('');

  const colors = {
    bg: theme === 'dark' ? '#121212' : '#F7F7F9',
    card: theme === 'dark' ? '#1E1E1E' : '#FFFFFF',
    text: theme === 'dark' ? '#FFFFFF' : '#1A1A1A',
    subText: theme === 'dark' ? '#A0A0A0' : '#707070',
    accent: '#E67E22',
    border: theme === 'dark' ? '#2C2C2C' : '#E0E0E0',
    protein: '#E74C3C',
    fat: '#F1C40F',
    carbs: '#3498DB'
  };

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setCameraPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    if (user) {
      fetchLogs();
    } else {
      setShowProfileModal(true);
    }
  }, [user, selectedDate]);

  const fetchLogs = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/logs/${user.id}/${selectedDate}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (e) {
      console.log("Error loading logs", e);
    }
  };

  const handleSaveProfile = async () => {
    if (!username || !age || !weight || !height) {
      Alert.alert("Ошибка", "Заполните все разделы анкеты.");
      return;
    }
    const payload = {
      username,
      age: parseInt(age),
      weight: parseFloat(weight),
      height: parseFloat(height),
      gender,
      activity_level: parseFloat(activity),
      goal
    };

    try {
      const res = await fetch(`${BACKEND_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.status === 'success') {
        setUser({ id: data.user_id, username, targets: data.targets });
        setShowProfileModal(false);
      }
    } catch (e) {
      Alert.alert("Ошибка подключения", "Бэкенд недоступен по указанному адресу.");
    }
  };

  const handleSendText = async () => {
    if (!inputText.trim()) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/analyze/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          text: inputText,
          date: selectedDate
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setInputText('');
        setShowAddModal(false);
        fetchLogs();
      } else {
        Alert.alert("Ошибка", data.message || "Не удалось распознать.");
      }
    } catch (e) {
      Alert.alert("Ошибка", "Произошла ошибка при отправке запроса.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePickImage = async (useCamera = false) => {
    let result;
    if (useCamera) {
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
    }

    if (!result.canceled && result.assets && result.assets.length > 0) {
      uploadPhoto(result.assets[0].uri);
    }
  };

  const uploadPhoto = async (uri) => {
    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append('user_id', user.id.toString());
    formData.append('date', selectedDate);
    formData.append('file', {
      uri,
      name: 'food_capture.jpg',
      type: 'image/jpeg'
    });

    try {
      const res = await fetch(`${BACKEND_URL}/api/analyze/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData,
      });
      const data = await res.json();
      if (data.status === 'success') {
        setShowAddModal(false);
        fetchLogs();
      } else {
        Alert.alert("Ошибка", data.message || "Блюдо не найдено.");
      }
    } catch (e) {
      Alert.alert("Ошибка", "Не удалось загрузить снимок.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!correctionText.trim()) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_id: selectedLogId,
          correction_text: correctionText
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setCorrectionText('');
        setShowEditModal(false);
        fetchLogs();
      }
    } catch (e) {
      Alert.alert("Ошибка", "Не удалось пересчитать.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const totalConsumed = logs.reduce((acc, log) => {
    acc.calories += log.calories || 0;
    acc.protein += log.protein || 0;
    acc.fat += log.fat || 0;
    acc.carbs += log.carbs || 0;
    return acc;
  }, { calories: 0, protein: 0, fat: 0, carbs: 0 });

  const targetCal = user?.targets?.calories || 2000;
  const targetProt = user?.targets?.protein || 120;
  const targetFat = user?.targets?.fat || 65;
  const targetCarb = user?.targets?.carbs || 230;

  const leftCal = Math.max(0, targetCal - totalConsumed.calories);
  const strokeDashoffset = 180 - (180 * Math.min(1, totalConsumed.calories / targetCal));

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.logoText, { color: colors.text }]}>CalZen <Text style={{color: colors.accent}}>AI</Text></Text>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <TouchableOpacity onPress={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={styles.iconBtn}>
            <Text style={{fontSize: 20}}>{theme === 'dark' ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowProfileModal(true)} style={styles.iconBtn}>
            <Text style={{fontSize: 20}}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.calendarContainer}>
        {[-3, -2, -1, 0].map(offset => {
          const d = new Date();
          d.setDate(d.getDate() + offset);
          const dStr = d.toISOString().split('T')[0];
          const isSelected = selectedDate === dStr;
          return (
            <TouchableOpacity 
              key={offset} 
              onPress={() => setSelectedDate(dStr)} 
              style={[styles.dateCard, { backgroundColor: isSelected ? colors.accent : colors.card, borderColor: colors.border }]}
            >
              <Text style={[styles.dateText, { color: isSelected ? '#fff' : colors.text }]}>{d.getDate()}</Text>
              <Text style={[styles.dateSubText, { color: isSelected ? '#eee' : colors.subText }]}>
                {d.toLocaleDateString('ru-RU', { weekday: 'short' })}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{paddingBottom: 100}} showsVerticalScrollIndicator={false}>
        <View style={[styles.mainCard, { backgroundColor: colors.card }]}>
          <View style={{alignItems: 'center', justifyContent: 'center', height: 160}}>
            <Svg width="200" height="200" viewBox="0 0 100 100">
              <Circle
                cx="50"
                cy="50"
                r="40"
                stroke={theme === 'dark' ? '#2c2c2c' : '#E0E0E0'}
                strokeWidth="8"
                fill="none"
                strokeDasharray="180 360"
                rotation="180"
                origin="50, 50"
                strokeLinecap="round"
              />
              <Circle
                cx="50"
                cy="50"
                r="40"
                stroke={colors.accent}
                strokeWidth="8"
                fill="none"
                strokeDasharray="180 360"
                strokeDashoffset={strokeDashoffset}
                rotation="180"
                origin="50, 50"
                strokeLinecap="round"
              />
            </Svg>
            <View style={styles.calTextContainer}>
              <Text style={[styles.calCount, { color: colors.text }]}>{leftCal}</Text>
              <Text style={[styles.calSub, { color: colors.subText }]}>ккал осталось</Text>
            </View>
          </View>

          <View style={styles.macrosContainer}>
            <View style={styles.macroColumn}>
              <Text style={[styles.macroLabel, { color: colors.text }]}>Белки</Text>
              <Text style={[styles.macroVal, { color: colors.protein }]}>{totalConsumed.protein}/{targetProt}г</Text>
              <View style={styles.macroProgressBg}>
                <View style={[styles.macroProgressFill, { width: `${Math.min(100, (totalConsumed.protein / targetProt) * 100)}%`, backgroundColor: colors.protein }]} />
              </View>
            </View>
            <View style={styles.macroColumn}>
              <Text style={[styles.macroLabel, { color: colors.text }]}>Жиры</Text>
              <Text style={[styles.macroVal, { color: colors.fat }]}>{totalConsumed.fat}/{targetFat}г</Text>
              <View style={styles.macroProgressBg}>
                <View style={[styles.macroProgressFill, { width: `${Math.min(100, (totalConsumed.fat / targetFat) * 100)}%`, backgroundColor: colors.fat }]} />
              </View>
            </View>
            <View style={styles.macroColumn}>
              <Text style={[styles.macroLabel, { color: colors.text }]}>Углев.</Text>
              <Text style={[styles.macroVal, { color: colors.carbs }]}>{totalConsumed.carbs}/{targetCarb}г</Text>
              <View style={styles.macroProgressBg}>
                <View style={[styles.macroProgressFill, { width: `${Math.min(100, (totalConsumed.carbs / targetCarb) * 100)}%`, backgroundColor: colors.carbs }]} />
              </View>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>История приемов пищи</Text>
        {logs.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.subText }]}>Записей не добавлено.</Text>
        ) : (
          logs.map((log) => (
            <TouchableOpacity 
              key={log.id} 
              onLongPress={() => {
                setSelectedLogId(log.id);
                setShowEditModal(true);
              }}
              style={[styles.foodCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                <Text style={[styles.foodTitle, { color: colors.text }]}>{log.title}</Text>
                <Text style={[styles.foodCalories, { color: colors.accent }]}>{log.calories} ккал</Text>
              </View>
              <View style={{flexDirection: 'row', marginTop: 4}}>
                <Text style={[styles.foodMacroText, { color: colors.protein }]}>Б: {log.protein}г </Text>
                <Text style={[styles.foodMacroText, { color: colors.fat }]}>Ж: {log.fat}г </Text>
                <Text style={[styles.foodMacroText, { color: colors.carbs }]}>У: {log.carbs}г</Text>
              </View>
              {log.score && (
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreBadge}>⭐️ {log.score}</Text>
                  <Text style={[styles.scoreDesc, { color: colors.subText }]} numberOfLines={1}>{log.score_desc}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.fabBtn}>
        <Text style={styles.fabBtnText}>+</Text>
      </TouchableOpacity>

      {/* МОДАЛЬНОЕ ОКНО: НАСТРОЙКИ ПРОФИЛЯ */}
      <Modal visible={showProfileModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Ваш Профиль</Text>
            <ScrollView style={{width: '100%'}}>
              <TextInput 
                placeholder="Имя пользователя" 
                placeholderTextColor={colors.subText}
                value={username} 
                onChangeText={setUsername} 
                style={[styles.input, { color: colors.text, borderColor: colors.border }]} 
              />
              <TextInput 
                placeholder="Возраст" 
                placeholderTextColor={colors.subText}
                value={age} 
                keyboardType="numeric"
                onChangeText={setAge} 
                style={[styles.input, { color: colors.text, borderColor: colors.border }]} 
              />
              <TextInput 
                placeholder="Вес (кг)" 
                placeholderTextColor={colors.subText}
                value={weight} 
                keyboardType="numeric"
                onChangeText={setWeight} 
                style={[styles.input, { color: colors.text, borderColor: colors.border }]} 
              />
              <TextInput 
                placeholder="Рост (см)" 
                placeholderTextColor={colors.subText}
                value={height} 
                keyboardType="numeric"
                onChangeText={setHeight} 
                style={[styles.input, { color: colors.text, borderColor: colors.border }]} 
              />
              
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Пол</Text>
              <View style={styles.selectorRow}>
                {['male', 'female'].map(g => (
                  <TouchableOpacity 
                    key={g} 
                    onPress={() => setGender(g)} 
                    style={[styles.selectorBtn, { backgroundColor: gender === g ? colors.accent : colors.border }]}
                  >
                    <Text style={{color: '#fff'}}>{g === 'male' ? 'Мужской' : 'Женский'}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: colors.text }]}>Уровень активности</Text>
              {[
                { label: 'Малоподвижный', val: 1.2 },
                { label: 'Умеренная активность', val: 1.55 },
                { label: 'Высокая активность', val: 1.9 }
              ].map(item => (
                <TouchableOpacity 
                  key={item.val} 
                  onPress={() => setActivity(item.val)}
                  style={[styles.activityOption, { borderColor: activity === item.val ? colors.accent : colors.border }]}
                >
                  <Text style={{color: colors.text}}>{item.label}</Text>
                </TouchableOpacity>
              ))}

              <Text style={[styles.fieldLabel, { color: colors.text }]}>Цель</Text>
              <View style={styles.selectorRow}>
                {[
                  { key: 'lose', text: 'Похудение' },
                  { key: 'maintain', text: 'Удержание' },
                  { key: 'gain', text: 'Набор' }
                ].map(g => (
                  <TouchableOpacity 
                    key={g.key} 
                    onPress={() => setGoal(g.key)} 
                    style={[styles.selectorBtn, { backgroundColor: goal === g.key ? colors.accent : colors.border }]}
                  >
                    <Text style={{color: '#fff', fontSize: 12}}>{g.text}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity onPress={handleSaveProfile} style={styles.submitBtn}>
              <Text style={styles.submitBtnText}>Расчитать и Сохранить</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* МОДАЛЬНОЕ ОКНО: ДОБАВИТЬ ЕДУ */}
      <Modal visible={showAddModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Анализ блюда</Text>
            
            <View style={{width: '100%'}}>
              <TextInput 
                placeholder="Напишите, что вы съели..." 
                placeholderTextColor={colors.subText}
                multiline
                numberOfLines={4}
                value={inputText}
                onChangeText={setInputText}
                style={[styles.textArea, { color: colors.text, borderColor: colors.border }]}
              />

              <TouchableOpacity onPress={handleSendText} style={styles.submitBtn}>
                <Text style={styles.submitBtnText}>Распознать текст</Text>
              </TouchableOpacity>

              <View style={styles.orDivider}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={{color: colors.subText, marginHorizontal: 10}}>или</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity onPress={() => handlePickImage(true)} style={[styles.actionBtn, { borderColor: colors.border }]}>
                  <Text style={{fontSize: 24}}>📸</Text>
                  <Text style={{color: colors.text, fontSize: 11, marginTop: 4}}>Камера</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handlePickImage(false)} style={[styles.actionBtn, { borderColor: colors.border }]}>
                  <Text style={{fontSize: 24}}>🖼️</Text>
                  <Text style={{color: colors.text, fontSize: 11, marginTop: 4}}>Галерея</Text>
                </TouchableOpacity>
              </View>
            </View>

            {isAnalyzing && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={{color: '#fff', marginTop: 8}}>Вычисление КБЖУ...</Text>
              </View>
            )}

            <TouchableOpacity onPress={() => setShowAddModal(false)} style={[styles.closeBtn, { marginTop: 15 }]}>
              <Text style={{color: colors.subText}}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* МОДАЛЬНОЕ ОКНО: РЕДАКТИРОВАНИЕ */}
      <Modal visible={showEditModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Изменить запись</Text>
            <TextInput 
              placeholder="Что исправить? (например: удали бекон, сделай вес 120г)" 
              placeholderTextColor={colors.subText}
              multiline
              numberOfLines={3}
              value={correctionText}
              onChangeText={setCorrectionText}
              style={[styles.textArea, { color: colors.text, borderColor: colors.border }]}
            />

            <TouchableOpacity onPress={handleEditSubmit} style={styles.submitBtn}>
              <Text style={styles.submitBtnText}>Внести изменения</Text>
            </TouchableOpacity>

            {isAnalyzing && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={{color: '#fff', marginTop: 8}}>Пересчет ИИ...</Text>
              </View>
            )}

            <TouchableOpacity onPress={() => setShowEditModal(false)} style={[styles.closeBtn, { marginTop: 15 }]}>
              <Text style={{color: colors.subText}}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1 },
  logoText: { fontSize: 22, fontWeight: 'bold' },
  iconBtn: { marginLeft: 15, padding: 5 },
  calendarContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginVertical: 15 },
  dateCard: { width: '22%', paddingVertical: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  dateText: { fontSize: 16, fontWeight: 'bold' },
  dateSubText: { fontSize: 11, marginTop: 2 },
  mainCard: { marginHorizontal: 20, padding: 20, borderRadius: 20, alignItems: 'center' },
  calTextContainer: { position: 'absolute', alignItems: 'center', top: 50 },
  calCount: { fontSize: 32, fontWeight: 'bold' },
  calSub: { fontSize: 12 },
  macrosContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 },
  macroColumn: { width: '30%', alignItems: 'center' },
  macroLabel: { fontSize: 12, fontWeight: '600' },
  macroVal: { fontSize: 13, fontWeight: 'bold', marginVertical: 4 },
  macroProgressBg: { width: '100%', height: 6, backgroundColor: '#333333', borderRadius: 3, overflow: 'hidden' },
  macroProgressFill: { height: '100%', borderRadius: 3 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 20, marginTop: 25, marginBottom: 10 },
  emptyText: { marginHorizontal: 20, fontSize: 13 },
  foodCard: { marginHorizontal: 20, padding: 15, borderRadius: 15, borderWidth: 1, marginBottom: 10 },
  foodTitle: { fontSize: 15, fontWeight: 'bold' },
  foodCalories: { fontSize: 15, fontWeight: '700' },
  foodMacroText: { fontSize: 12 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, borderTopWidth: 0.5, borderTopColor: '#333', paddingTop: 8 },
  scoreBadge: { color: '#E74C3C', fontWeight: 'bold', marginRight: 8, fontSize: 12 },
  scoreDesc: { fontSize: 11, flex: 1 },
  fabBtn: { position: 'absolute', bottom: 30, right: 30, backgroundColor: '#E67E22', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabBtnText: { color: '#fff', fontSize: 32, lineHeight: 34 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', borderRadius: 20, padding: 20, alignItems: 'center', maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  input: { width: '100%', borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 },
  textArea: { width: '100%', borderWidth: 1, borderRadius: 10, padding: 12, height: 100, textAlignVertical: 'top', marginBottom: 15 },
  fieldLabel: { alignSelf: 'flex-start', fontWeight: '600', marginTop: 10, marginBottom: 5 },
  selectorRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 15 },
  selectorBtn: { flex: 1, marginHorizontal: 5, padding: 10, borderRadius: 10, alignItems: 'center' },
  activityOption: { width: '100%', padding: 10, borderWidth: 1, borderRadius: 10, marginBottom: 8 },
  submitBtn: { backgroundColor: '#E67E22', width: '100%', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: '#fff', fontWeight: 'bold' },
  closeBtn: { padding: 10 },
  orDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 15 },
  dividerLine: { flex: 1, height: 1 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  actionBtn: { width: '40%', borderWidth: 1, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  loadingContainer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', borderRadius: 20 }
});