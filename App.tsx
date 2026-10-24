
import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  StatusBar,
  Alert,
  StyleSheet,
  Platform,
} from "react-native";

const COLORS = {
  primary: "#2563EB",
  background: "#F3F6FC",
  card: "#FFFFFF",
  text: "#172554",
  muted: "#64748B",
  border: "#E2E8F0",
  green: "#059669",
  red: "#DC2626",
  orange: "#D97706",
};

const makeId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const emptySubject = {
  name: "",
  code: "",
  teacher: "",
};

const emptyExam = {
  subjectId: "",
  date: "",
  time: "",
  location: "",
  notes: "",
};

function daysUntil(dateString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return null;

  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  return Math.round((date.getTime() - today.getTime()) / 86400000);
}

function formatDate(dateString) {
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

function PrimaryButton({ title, onPress, color = COLORS.primary }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.primaryButton, { backgroundColor: color }]}
    >
      <Text style={styles.primaryButtonText}>{title}</Text>
    </TouchableOpacity>
  );
}

function Field({ label, value, onChangeText, placeholder, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || ""}
        placeholderTextColor="#94A3B8"
        style={styles.input}
        textAlign="right"
        writingDirection="rtl"
        {...props}
      />
    </View>
  );
}

export default function App() {
  // All data lives in React state: no database or backend.
  const [subjects, setSubjects] = useState([]);
  const [exams, setExams] = useState([]);
  const [tab, setTab] = useState("home");
  const [modal, setModal] = useState("");
  const [subjectForm, setSubjectForm] = useState(emptySubject);
  const [examForm, setExamForm] = useState(emptyExam);
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [editingExamId, setEditingExamId] = useState(null);

  const sortedExams = useMemo(
    () =>
      [...exams].sort((a, b) => {
        const da = daysUntil(a.date);
        const db = daysUntil(b.date);
        return (da ?? Infinity) - (db ?? Infinity);
      }),
    [exams]
  );

  const upcomingExams = sortedExams.filter(
    (exam) => (daysUntil(exam.date) ?? -1) >= 0
  );

  const subjectName = (id) =>
    subjects.find((subject) => subject.id === id)?.name ||
    "مادة محذوفة";

  function openNewSubject() {
    setEditingSubjectId(null);
    setSubjectForm({ ...emptySubject });
    setModal("subject");
  }

  function openEditSubject(subject) {
    setEditingSubjectId(subject.id);
    setSubjectForm({
      name: subject.name,
      code: subject.code,
      teacher: subject.teacher,
    });
    setModal("subject");
  }

  function saveSubject() {
    const name = subjectForm.name.trim();

    if (!name) {
      Alert.alert("تنبيه", "يرجى إدخال اسم المادة.");
      return;
    }

    if (
      subjects.some(
        (s) =>
          s.name.trim().toLowerCase() === name.toLowerCase() &&
          s.id !== editingSubjectId
      )
    ) {
      Alert.alert("تنبيه", "هذه المادة مسجلة مسبقاً.");
      return;
    }

    if (editingSubjectId) {
      setSubjects((prev) =>
        prev.map((s) =>
          s.id === editingSubjectId ? { ...s, ...subjectForm, name } : s
        )
      );
    } else {
      setSubjects((prev) => [
        ...prev,
        { id: makeId(), ...subjectForm, name },
      ]);
    }

    setModal("");
  }

  function deleteSubject(subject) {
    Alert.alert(
      "حذف المادة",
      `هل تريد حذف مادة "${subject.name}" وجميع امتحاناتها؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: () => {
            setSubjects((prev) =>
              prev.filter((s) => s.id !== subject.id)
            );
            setExams((prev) =>
              prev.filter((e) => e.subjectId !== subject.id)
            );
          },
        },
      ]
    );
  }

  function openNewExam() {
    if (subjects.length === 0) {
      Alert.alert("أضف مادة أولاً", "يجب تسجيل مادة قبل إضافة امتحان.");
      setTab("subjects");
      return;
    }

    setEditingExamId(null);
    setExamForm({
      ...emptyExam,
      subjectId: subjects[0].id,
    });
    setModal("exam");
  }

  function openEditExam(exam) {
    setEditingExamId(exam.id);
    setExamForm({
      subjectId: exam.subjectId,
      date: exam.date,
      time: exam.time || "",
      location: exam.location || "",
      notes: exam.notes || "",
    });
    setModal("exam");
  }

  function saveExam() {
    if (!examForm.subjectId || !subjects.some(
      (s) => s.id === examForm.subjectId
    )) {
      Alert.alert("تنبيه", "يرجى اختيار مادة.");
      return;
    }

    const remaining = daysUntil(examForm.date);

    if (remaining === null) {
      Alert.alert(
        "تاريخ غير صحيح",
        "أدخل تاريخاً صحيحاً بالصيغة YYYY-MM-DD، مثل 2026-11-05."
      );
      return;
    }

    if (remaining < 0) {
      Alert.alert("تاريخ غير صحيح", "اختر اليوم أو تاريخاً مستقبلياً.");
      return;
    }

    const examData = {
      ...examForm,
      time: examForm.time.trim(),
      location: examForm.location.trim(),
      notes: examForm.notes.trim(),
    };

    if (editingExamId) {
      setExams((prev) =>
        prev.map((e) =>
          e.id === editingExamId ? { ...e, ...examData } : e
        )
      );
    } else {
      setExams((prev) => [
        ...prev,
        { id: makeId(), ...examData },
      ]);
    }

    setModal("");
  }

  function deleteExam(exam) {
    Alert.alert(
      "حذف الامتحان",
      `هل تريد حذف امتحان ${subjectName(exam.subjectId)}؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: () =>
            setExams((prev) => prev.filter((e) => e.id !== exam.id)),
        },
      ]
    );
  }

  function renderExam(exam) {
    const remaining = daysUntil(exam.date);

    return (
      <View key={exam.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.examIcon}>
            <Text style={styles.examIconText}>📘</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>
              {subjectName(exam.subjectId)}
            </Text>
            <Text style={styles.muted}>
              📅 {formatDate(exam.date)}
              {exam.time ? `  •  ${exam.time}` : ""}
            </Text>
          </View>
          <View
            style={[
              styles.badge,
              {
                backgroundColor:
                  remaining === 0
                    ? "#FEF3C7"
                    : remaining <= 3
                    ? "#FEE2E2"
                    : "#D1FAE5",
              },
            ]}
          >
            <Text
              style={{
                color:
                  remaining <= 3 ? COLORS.red : COLORS.green,
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              {remaining === 0
                ? "اليوم"
                : remaining === 1
                ? "غداً"
                : `بعد ${remaining} يوم`}
            </Text>
          </View>
        </View>

        {!!exam.location && (
          <Text style={styles.detail}>📍 المكان: {exam.location}</Text>
        )}
        {!!exam.notes && (
          <Text style={styles.detail}>📝 {exam.notes}</Text>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => openEditExam(exam)}
            style={styles.editButton}
          >
            <Text style={styles.editText}>تعديل</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => deleteExam(exam)}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteText}>حذف</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderSubject(subject) {
    return (
      <View key={subject.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.examIcon, { backgroundColor: "#DBEAFE" }]}>
            <Text style={styles.examIconText}>📚</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{subject.name}</Text>
            <Text style={styles.muted}>
              {subject.code || "دون رمز"}
              {subject.teacher ? ` • ${subject.teacher}` : ""}
            </Text>
            <Text style={styles.detail}>
              الامتحانات:{" "}
              {exams.filter((e) => e.subjectId === subject.id).length}
            </Text>
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => openEditSubject(subject)}
            style={styles.editButton}
          >
            <Text style={styles.editText}>تعديل</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => deleteSubject(subject)}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteText}>حذف</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderHome() {
    const nextExam = upcomingExams[0];

    return (
      <>
        <View style={styles.hero}>
          <Text style={styles.heroSmall}>أهلاً بك 👋</Text>
          <Text style={styles.heroTitle}>نظّم دراستك بذكاء</Text>
          <Text style={styles.heroSub}>
            خطّط لامتحاناتك وكن مستعداً دائماً
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📚</Text>
            <Text style={styles.statNumber}>{subjects.length}</Text>
            <Text style={styles.statLabel}>المواد</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🗓️</Text>
            <Text style={styles.statNumber}>{upcomingExams.length}</Text>
            <Text style={styles.statLabel}>الامتحانات القادمة</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>✅</Text>
            <Text style={styles.statNumber}>
              {exams.length - upcomingExams.length}
            </Text>
            <Text style={styles.statLabel}>امتحانات سابقة</Text>
          </View>
        </View>

        <PrimaryButton
          title="+ إضافة امتحان جديد"
          onPress={openNewExam}
        />

        <Text style={styles.sectionTitle}>أقرب امتحان</Text>
        {nextExam ? (
          renderExam(nextExam)
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyTitle}>لا توجد امتحانات قادمة</Text>
            <Text style={styles.muted}>
              أضف موادك وامتحاناتك لتبدأ التخطيط.
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>الامتحانات القادمة</Text>
        {upcomingExams.length ? (
          upcomingExams.slice(0, 5).map(renderExam)
        ) : (
          <Text style={styles.muted}>لم تسجل أي امتحان قادم بعد.</Text>
        )}
      </>
    );
  }

  function renderContent() {
    if (tab === "subjects") {
      return (
        <>
          <View style={styles.pageHeading}>
            <Text style={styles.pageTitle}>المواد الدراسية</Text>
            <Text style={styles.muted}>
              عدد المواد: {subjects.length}
            </Text>
          </View>
          <PrimaryButton
            title="+ إضافة مادة جديدة"
            onPress={openNewSubject}
          />
          {subjects.length ? (
            subjects.map(renderSubject)
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📚</Text>
              <Text style={styles.emptyTitle}>لم تضف مواد بعد</Text>
              <Text style={styles.muted}>
                ابدأ بإضافة أول مادة دراسية.
              </Text>
            </View>
          )}
        </>
      );
    }

    if (tab === "exams") {
      return (
        <>
          <View style={styles.pageHeading}>
            <Text style={styles.pageTitle}>جدول الامتحانات</Text>
            <Text style={styles.muted}>
              مرتبة حسب التاريخ
            </Text>
          </View>
          <PrimaryButton
            title="+ إضافة امتحان جديد"
            onPress={openNewExam}
          />
          {sortedExams.length ? (
            sortedExams.map(renderExam)
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🗓️</Text>
              <Text style={styles.emptyTitle}>الجدول فارغ</Text>
              <Text style={styles.muted}>
                أضف امتحاناً ليظهر هنا.
              </Text>
            </View>
          )}
        </>
      );
    }

    return renderHome();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.primary}
      />

      <View style={styles.topBar}>
        <View>
          <Text style={styles.appName}>📘 جدول دراستي</Text>
          <Text style={styles.topSubtitle}>
            خطّط لوقتك، وحقق أهدافك
          </Text>
        </View>
        <Text style={styles.topEmoji}>🎓</Text>
      </View>

      <ScrollView
        style={styles.main}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {renderContent()}
        <Text style={styles.footer}>
          جدول دراستي • بياناتك داخل التطبيق أثناء التشغيل
        </Text>
      </ScrollView>

      <View style={styles.bottomNav}>
        {[
          { id: "home", label: "الرئيسية", icon: "🏠" },
          { id: "subjects", label: "المواد", icon: "📚" },
          { id: "exams", label: "الامتحانات", icon: "🗓️" },
        ].map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.navItem}
            onPress={() => setTab(item.id)}
          >
            <Text style={styles.navIcon}>{item.icon}</Text>
            <Text
              style={[
                styles.navLabel,
                tab === item.id && styles.navLabelActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Modal
        visible={modal !== ""}
        animationType="slide"
        transparent
        onRequestClose={() => setModal("")}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {modal === "subject"
                    ? editingSubjectId
                      ? "تعديل المادة"
                      : "إضافة مادة جديدة"
                    : editingExamId
                    ? "تعديل الامتحان"
                    : "إضافة امتحان جديد"}
                </Text>
                <TouchableOpacity onPress={() => setModal("")}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              {modal === "subject" ? (
                <>
                  <Field
                    label="اسم المادة *"
                    value={subjectForm.name}
                    onChangeText={(v) =>
                      setSubjectForm((p) => ({ ...p, name: v }))
                    }
                    placeholder="مثال: البرمجة 1"
                    maxLength={80}
                  />
                  <Field
                    label="رمز المادة"
                    value={subjectForm.code}
                    onChangeText={(v) =>
                      setSubjectForm((p) => ({ ...p, code: v }))
                    }
                    placeholder="مثال: CS101"
                    maxLength={30}
                  />
                  <Field
                    label="اسم المدرس"
                    value={subjectForm.teacher}
                    onChangeText={(v) =>
                      setSubjectForm((p) => ({ ...p, teacher: v }))
                    }
                    placeholder="أدخل اسم المدرس"
                    maxLength={80}
                  />
                  <PrimaryButton
                    title={editingSubjectId ? "حفظ التعديلات" : "حفظ المادة"}
                    onPress={saveSubject}
                  />
                </>
              ) : modal === "exam" ? (
                <>
                  <Text style={styles.label}>اختر المادة *</Text>
                  <View style={styles.subjectChoices}>
                    {subjects.map((subject) => (
                      <TouchableOpacity
                        key={subject.id}
                        onPress={() =>
                          setExamForm((p) => ({
                            ...p,
                            subjectId: subject.id,
                          }))
                        }
                        style={[
                          styles.subjectChoice,
                          examForm.subjectId === subject.id &&
                            styles.subjectChoiceActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.choiceText,
                            examForm.subjectId === subject.id &&
                              styles.choiceTextActive,
                          ]}
                        >
                          {subject.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Field
                    label="تاريخ الامتحان *"
                    value={examForm.date}
                    onChangeText={(v) =>
                      setExamForm((p) => ({ ...p, date: v.trim() }))
                    }
                    placeholder="YYYY-MM-DD مثال: 2026-11-05"
                    keyboardType="numbers-and-punctuation"
                    maxLength={10}
                  />
                  <Text style={styles.hint}>
                    استخدم السنة-الشهر-اليوم، مثل 2026-11-05.
                  </Text>

                  <Field
                    label="الوقت"
                    value={examForm.time}
                    onChangeText={(v) =>
                      setExamForm((p) => ({ ...p, time: v }))
                    }
                    placeholder="مثال: 09:00 صباحاً"
                    maxLength={40}
                  />
                  <Field
                    label="مكان الامتحان"
                    value={examForm.location}
                    onChangeText={(v) =>
                      setExamForm((p) => ({ ...p, location: v }))
                    }
                    placeholder="مثال: القاعة 2"
                    maxLength={100}
                  />
                  <Field
                    label="ملاحظات"
                    value={examForm.notes}
                    onChangeText={(v) =>
                      setExamForm((p) => ({ ...p, notes: v }))
                    }
                    placeholder="الفصول المطلوبة أو تعليمات المدرس"
                    multiline
                    numberOfLines={3}
                    maxLength={500}
                  />
                  <PrimaryButton
                    title={editingExamId ? "حفظ التعديلات" : "حفظ الامتحان"}
                    onPress={saveExam}
                  />
                </>
              ) : null}

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModal("")}
              >
                <Text style={styles.cancelText}>إلغاء</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === "android" ? 0 : 0,
  },
  topBar: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 17,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  appName: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "right",
  },
  topSubtitle: {
    color: "#DBEAFE",
    fontSize: 12,
    textAlign: "right",
    marginTop: 4,
  },
  topEmoji: { fontSize: 32 },
  main: { flex: 1 },
  content: { padding: 16, paddingBottom: 28 },
  hero: {
    backgroundColor: "#DBEAFE",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  heroSmall: {
    color: COLORS.primary,
    fontSize: 14,
    textAlign: "right",
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: 23,
    fontWeight: "800",
    textAlign: "right",
    marginTop: 8,
  },
  heroSub: {
    color: COLORS.muted,
    fontSize: 13,
    textAlign: "right",
    marginTop: 8,
  },
  statsRow: {
    flexDirection: "row-reverse",
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 15,
    paddingVertical: 14,
    paddingHorizontal: 5,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIcon: { fontSize: 21 },
  statNumber: {
    color: COLORS.primary,
    fontSize: 23,
    fontWeight: "800",
    marginTop: 5,
  },
  statLabel: {
    color: COLORS.muted,
    fontSize: 10,
    textAlign: "center",
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 13,
    minHeight: 49,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "right",
    marginTop: 13,
    marginBottom: 12,
  },
  pageHeading: {
    marginBottom: 15,
    alignItems: "flex-end",
  },
  pageTitle: {
    color: COLORS.text,
    fontSize: 23,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 5,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  examIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  examIconText: { fontSize: 23 },
  flex: { flex: 1 },
  cardTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 6,
  },
  muted: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: "right",
    lineHeight: 19,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  detail: {
    color: COLORS.muted,
    fontSize: 13,
    textAlign: "right",
    marginTop: 10,
  },
  actions: {
    flexDirection: "row-reverse",
    gap: 9,
    marginTop: 14,
  },
  editButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#93C5FD",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  editText: { color: COLORS.primary, fontWeight: "700" },
  deleteButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  deleteText: { color: COLORS.red, fontWeight: "700" },
  emptyCard: {
    backgroundColor: COLORS.card,
    padding: 24,
    alignItems: "center",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  emptyIcon: { fontSize: 38, marginBottom: 12 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 8,
  },
  bottomNav: {
    flexDirection: "row-reverse",
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 9,
    paddingBottom: 8,
  },
  navItem: { flex: 1, alignItems: "center", paddingVertical: 3 },
  navIcon: { fontSize: 21 },
  navLabel: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 4,
    fontWeight: "600",
  },
  navLabelActive: { color: COLORS.primary, fontWeight: "800" },
  footer: {
    color: COLORS.muted,
    textAlign: "center",
    fontSize: 11,
    marginTop: 18,
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 26,
    maxHeight: "92%",
  },
  modalHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "right",
  },
  closeText: { color: COLORS.muted, fontSize: 22, padding: 4 },
  field: { marginBottom: 15 },
  label: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 14,
    minHeight: 47,
    textAlignVertical: "center",
  },
  hint: {
    color: COLORS.muted,
    fontSize: 11,
    textAlign: "right",
    marginTop: -9,
    marginBottom: 14,
  },
  subjectChoices: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 17,
  },
  subjectChoice: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 13,
    backgroundColor: "#F8FAFC",
  },
  subjectChoiceActive: {
    backgroundColor: "#DBEAFE",
    borderColor: COLORS.primary,
  },
  choiceText: { color: COLORS.text, fontSize: 13 },
  choiceTextActive: { color: COLORS.primary, fontWeight: "800" },
  cancelButton: {
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    padding: 14,
    alignItems: "center",
    marginTop: 2,
  },
  cancelText: { color: COLORS.text, fontWeight: "700" },
});